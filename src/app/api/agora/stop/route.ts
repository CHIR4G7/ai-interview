import { NextResponse } from 'next/server'
import { AgoraClient, Area } from 'agora-agents'
import { auth } from '@/app/auth'

/**
 * The stop route is called from several places (submit, unmount, back button),
 * so a stop that arrives after the agent is already going away is a success,
 * not an error.
 */
function isAgentAlreadyStoppingOrStopped(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const maybeErr = error as {
    statusCode?: number
    body?: { detail?: string; reason?: string }
    message?: string
  }

  if (maybeErr.statusCode === 404) return true

  const reason = maybeErr.body?.reason?.toLowerCase()
  const detail =
    maybeErr.body?.detail?.toLowerCase() ??
    maybeErr.message?.toLowerCase() ??
    ''

  return (
    reason === 'invalidrequest' &&
    detail.includes('already in the process of shutting down')
  )
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agentId } = await request.json()
    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 },
      )
    }

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID
    const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE
    if (!appId || !appCertificate) {
      throw new Error('Missing Agora configuration')
    }

    const agoraClient = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    })

    try {
      await agoraClient.stopAgent(agentId)
    } catch (error) {
      if (isAgentAlreadyStoppingOrStopped(error)) {
        return NextResponse.json({ success: true, state: 'already-stopping' })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error stopping interview agent:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to stop agent',
      },
      { status: 500 },
    )
  }
}
