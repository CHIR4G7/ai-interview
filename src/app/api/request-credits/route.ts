import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { auth } from '@/app/auth'
import client from '@/lib/db'

const OWNER_EMAIL = 'scheater027@gmail.com'
/** One request per user per 12 hours, so the inbox cannot be flooded. */
const COOLDOWN_MS = 12 * 60 * 60 * 1000
const MAX_MESSAGE_LENGTH = 1000

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Sends the notification via Resend's HTTP API.
 *
 * Deliberately no new dependency — this is one fetch. Returns false rather than
 * throwing when unconfigured, because the request is already saved to Mongo by
 * then and losing it would be worse than not emailing.
 */
async function sendEmail(subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — credit request saved but no email sent.')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.CREDIT_REQUEST_FROM ?? 'AI Interview <onboarding@resend.dev>',
        to: [OWNER_EMAIL],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      console.error('Resend rejected the email:', res.status, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to send credit request email:', err)
    return false
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  const userEmail = session?.user?.email
  if (!userId || !userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let message = ''
  try {
    const body = await request.json()
    message = typeof body?.message === 'string' ? body.message.trim() : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    message = message.slice(0, MAX_MESSAGE_LENGTH)
  }

  const db = client.db()

  const recent = await db.collection('creditRequests').findOne(
    { userId, createdAt: { $gt: new Date(Date.now() - COOLDOWN_MS) } },
    { projection: { _id: 1 } },
  )
  if (recent) {
    return NextResponse.json(
      {
        error:
          'You already sent a request recently. We will get back to you soon.',
      },
      { status: 429 },
    )
  }

  let credits = 0
  try {
    const user = await db
      .collection('users')
      .findOne({ _id: new ObjectId(userId) }, { projection: { credits: 1, name: 1 } })
    credits = Number(user?.credits) || 0
  } catch {
    /* non-fatal */
  }

  // Persist first. The email is best-effort; the record is the source of truth.
  const record = await db.collection('creditRequests').insertOne({
    userId,
    email: userEmail,
    name: session?.user?.name ?? '',
    message,
    creditsAtRequest: credits,
    createdAt: new Date(),
    emailed: false,
  })

  const emailed = await sendEmail(
    `Credit request from ${userEmail}`,
    `<div style="font-family:system-ui,sans-serif;line-height:1.6">
      <h2 style="margin:0 0 12px">More credits requested</h2>
      <p style="margin:0 0 4px"><strong>User:</strong> ${escapeHtml(session?.user?.name ?? '—')}</p>
      <p style="margin:0 0 4px"><strong>Email:</strong> ${escapeHtml(userEmail)}</p>
      <p style="margin:0 0 4px"><strong>Credits remaining:</strong> ${credits}</p>
      <p style="margin:16px 0 4px"><strong>Message:</strong></p>
      <blockquote style="margin:0;padding:10px 14px;background:#f5f5f5;border-left:3px solid #6366f1;white-space:pre-wrap">${
        message ? escapeHtml(message) : '<em>No message provided.</em>'
      }</blockquote>
    </div>`,
  )

  if (emailed) {
    await db
      .collection('creditRequests')
      .updateOne({ _id: record.insertedId }, { $set: { emailed: true } })
  }

  // The user's request is recorded either way, so this is a success from their
  // point of view even when the mail provider is not configured.
  return NextResponse.json({ ok: true, emailed })
}
