import { NextRequest, NextResponse } from 'next/server'
import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  ExpiresIn,
  MiniMaxTTS,
  OpenAI,
} from 'agora-agents'
import { ObjectId } from 'mongodb'
import { auth } from '@/app/auth'
import client from '@/lib/db'
import { AGENT_RTC_UID } from '@/lib/agora'
import { buildInterviewerPrompt, buildGreeting } from '@/lib/interviewPrompt'
import { Question } from '@/types/interview'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { interviewId, channelName, requesterId } = await request.json()

    if (!interviewId || !channelName || !requesterId) {
      return NextResponse.json(
        { error: 'interviewId, channelName and requesterId are required' },
        { status: 400 },
      )
    }

    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID')
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE')

    const db = client.db()

    // Starting an agent is billable, so confirm this user actually owns the
    // interview before doing it — otherwise any signed-in user could spin up
    // agents against arbitrary interview ids.
    let interview
    try {
      interview = await db
        .collection('interviews')
        .findOne({ _id: new ObjectId(interviewId as string) })
    } catch {
      return NextResponse.json(
        { error: 'Invalid interview id' },
        { status: 400 },
      )
    }

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 },
      )
    }
    if (interview.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const questionDoc = await db
      .collection('questions')
      .findOne({ interviewId: interviewId })

    const questions = (questionDoc?.questions ?? []) as Question[]
    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'Questions are not ready for this interview yet' },
        { status: 409 },
      )
    }

    const interviewContext = {
      jobTitle: interview.jobTitle as string | undefined,
      companyName: interview.companyName as string | undefined,
      jobDesc: interview.jobDesc as string | undefined,
      skills: interview.skills as string[] | undefined,
    }

    const instructions = buildInterviewerPrompt(interviewContext, questions)
    const greeting = buildGreeting(interviewContext)

    // area: switch to Area.EU / Area.AP if you move the deployment region.
    const agoraClient = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    })

    const agent = new Agent({
      client: agoraClient,
      instructions,
      greeting,
      failureMessage: 'Give me one moment.',
      maxHistory: 50,
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              interrupt_duration_ms: 160,
              prefix_padding_ms: 300,
            },
          },
          end_of_speech: {
            mode: 'vad',
            // Candidates pause mid-thought far more than chat users do, so allow
            // a longer silence before treating the turn as finished.
            vad_config: { silence_duration_ms: 900 },
          },
        },
      },
      // enable_rtm plus data_channel:'rtm' are what deliver transcripts to the
      // browser. Drop either one and the interview runs but records nothing.
      advancedFeatures: { enable_rtm: true },
      parameters: {
        audio_scenario: 'chorus',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(new DeepgramSTT({ model: 'nova-3', language: 'en' }))
      .withLlm(
        new OpenAI({
          model: 'gpt-4o-mini',
          greetingMessage: greeting,
          failureMessage: 'Give me one moment.',
          maxHistory: 15,
          params: { max_tokens: 1024, temperature: 0.7, top_p: 0.95 },
        }),
      )
      .withTts(
        new MiniMaxTTS({
          model: 'speech_2_6_turbo',
          voiceId: 'English_captivating_female1',
        }),
      )

    const agentSession = agent.createSession({
      channel: channelName,
      agentUid: String(AGENT_RTC_UID),
      // Restricts the agent to this candidate's audio only.
      remoteUids: [String(requesterId)],
      // Hard stop if the candidate walks away without ending the session.
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
      debug: false,
    })

    const agentId = await agentSession.start()

    return NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    })
  } catch (error) {
    console.error('Error starting interview agent:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to start agent',
      },
      { status: 500 },
    )
  }
}
