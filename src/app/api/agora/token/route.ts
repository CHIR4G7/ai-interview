import { NextRequest, NextResponse } from 'next/server'
import { RtcTokenBuilder, RtcRole } from 'agora-token'
import { auth } from '@/app/auth'
import { buildChannelName } from '@/lib/agora'

const EXPIRATION_TIME_IN_SECONDS = 3600

/**
 * Mints a combined RTC + RTM token.
 *
 * IMPORTANT: this must stay `buildTokenWithRtm`, not `buildTokenWithUid`.
 * An RTC-only token still lets the browser join the channel and hear the agent,
 * so the failure looks like "everything works but no transcript ever arrives" —
 * RTM login fails silently and the whole transcript pipeline is dead.
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID
  const APP_CERTIFICATE = process.env.NEXT_AGORA_APP_CERTIFICATE

  if (!APP_ID || !APP_CERTIFICATE) {
    return NextResponse.json(
      {
        error:
          'Agora credentials are not set. Add NEXT_PUBLIC_AGORA_APP_ID and NEXT_AGORA_APP_CERTIFICATE.',
      },
      { status: 500 },
    )
  }

  const { searchParams } = new URL(request.url)
  const interviewId = searchParams.get('interviewId')

  // On renewal the client passes back the uid/channel it actually joined with,
  // so the refreshed token matches the live session.
  const uidParam = searchParams.get('uid')
  const parsedUid = uidParam ? parseInt(uidParam, 10) : Number.NaN
  const uid =
    Number.isNaN(parsedUid) || parsedUid <= 0
      ? Math.floor(Math.random() * 9_999_000) + 1000
      : parsedUid

  const channelName =
    searchParams.get('channel') || buildChannelName(interviewId ?? 'adhoc')

  const expirationTime =
    Math.floor(Date.now() / 1000) + EXPIRATION_TIME_IN_SECONDS

  try {
    const token = RtcTokenBuilder.buildTokenWithRtm(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid.toString(),
      RtcRole.PUBLISHER,
      expirationTime,
      expirationTime,
    )

    return NextResponse.json({
      token,
      uid: uid.toString(),
      channel: channelName,
    })
  } catch (error) {
    console.error('Error generating Agora token:', error)
    return NextResponse.json(
      { error: 'Failed to generate Agora token' },
      { status: 500 },
    )
  }
}
