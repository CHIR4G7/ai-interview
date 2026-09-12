'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { RTMClient } from 'agora-rtm'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Mic, CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import InfoDivs from '@/components/InfoDivs'
import { LoaderFive } from '@/components/ui/loader'
import type { TranscriptTurn } from '@/lib/agoraTranscript'
import type { AgoraSessionData } from './VoiceSession'
import { alignAnswersToQuestions, hasAnyAnswer } from '@/lib/alignTranscript'
import { setAnswers } from '@/app/interview/[id]/perform/actions'
import type { Question } from '@/types/interview'

// agora-rtc-sdk-ng touches browser globals at import time, so both the provider
// and the session component must stay out of the server bundle.
const AgoraProvider = dynamic(
  async () => {
    const { AgoraRTCProvider, default: AgoraRTC } = await import(
      'agora-rtc-react'
    )
    return {
      default: function AgoraProviders({
        children,
      }: {
        children: React.ReactNode
      }) {
        // useRef (not useMemo) — under StrictMode useMemo runs twice and would
        // create two RTC clients for one session.
        const clientRef = useRef<ReturnType<typeof AgoraRTC.createClient> | null>(
          null,
        )
        if (!clientRef.current) {
          clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
        }
        return (
          <AgoraRTCProvider client={clientRef.current}>
            {children}
          </AgoraRTCProvider>
        )
      },
    }
  },
  { ssr: false },
)

const VoiceSession = dynamic(() => import('./VoiceSession'), { ssr: false })

type Props = {
  interviewId: string
  jobTitle?: string
  companyName?: string
  questionCount?: number
  questions?: Question[]
}

const VoiceInterview = ({
  interviewId,
  jobTitle,
  companyName,
  questionCount,
  questions,
}: Props) => {
  const [agoraData, setAgoraData] = useState<AgoraSessionData | null>(null)
  const [rtmClient, setRtmClient] = useState<RTMClient | null>(null)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [agentJoinError, setAgentJoinError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  const [turns, setTurns] = useState<TranscriptTurn[]>([])
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  // handleEnd reads the latest transcript without taking `turns` as a dep,
  // which would rebuild the callback on every single transcript update.
  const turnsRef = useRef<TranscriptTurn[]>([])
  useEffect(() => {
    turnsRef.current = turns
  }, [turns])

  // Read by the unmount cleanup, which must not re-run when the id changes.
  const agentIdRef = useRef<string | null>(null)
  useEffect(() => {
    agentIdRef.current = agentId
  }, [agentId])

  const stopAgent = useCallback(async (id: string) => {
    try {
      await fetch('/api/agora/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: id }),
      })
    } catch (err) {
      console.error('Failed to stop agent:', err)
    }
  }, [])

  const handleStart = async () => {
    setIsLoading(true)
    setError(null)
    setAgentJoinError(false)

    try {
      // 1. Token first — both the agent invite and RTM login depend on it.
      const tokenRes = await fetch(
        `/api/agora/token?interviewId=${encodeURIComponent(interviewId)}`,
      )
      const tokenData = await tokenRes.json()
      if (!tokenRes.ok) {
        throw new Error(tokenData?.error || 'Failed to generate Agora token')
      }

      // 2. Invite and RTM run in parallel. RTM must be logged in and subscribed
      //    before the session mounts, or the toolkit misses early transcripts.
      const [agent, rtm] = await Promise.all([
        fetch('/api/agora/invite-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interviewId,
            channelName: tokenData.channel,
            requesterId: tokenData.uid,
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const body = await res.json().catch(() => null)
              console.error('Agent invite failed:', body)
              setAgentJoinError(true)
              return null
            }
            return res.json()
          })
          .catch((err) => {
            console.error('Agent invite failed:', err)
            setAgentJoinError(true)
            return null
          }),

        (async () => {
          const { default: AgoraRTM } = await import('agora-rtm')
          const rtm: RTMClient = new AgoraRTM.RTM(
            process.env.NEXT_PUBLIC_AGORA_APP_ID!,
            tokenData.uid,
          )
          await rtm.login({ token: tokenData.token })
          await rtm.subscribe(tokenData.channel)
          return rtm
        })(),
      ])

      setRtmClient(rtm)
      setAgentId(agent?.agent_id ?? null)
      setAgoraData({
        token: tokenData.token,
        uid: tokenData.uid,
        channel: tokenData.channel,
      })
      setStarted(true)
    } catch (err) {
      console.error('Error starting voice interview:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Could not start the interview. Please try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnd = useCallback(async () => {
    setSubmitting(true)

    // Stop the billable agent first — submission must never keep it alive.
    if (agentIdRef.current) {
      await stopAgent(agentIdRef.current)
      agentIdRef.current = null
      setAgentId(null)
    }

    // Align the transcript onto the stored questions and hand it to the same
    // pipeline the text interview uses: /api/setanswers persists the answers and
    // marks the interview completed, then inngest `app/generateInsights` grades
    // them. Without this the voice route produced a transcript and nothing else.
    try {
      const aligned = alignAnswersToQuestions(turnsRef.current, questions ?? [])
      if (hasAnyAnswer(aligned)) {
        toast('Submitting your answers')
        // Settled turns only — a half-spoken turn would skew pace and duration.
        const transcript = turnsRef.current.filter((t) => !t.live)
        await setAnswers(aligned, interviewId, transcript)
        toast.success('Answers submitted — generating your feedback')
      } else {
        toast('Interview ended. No answers were recorded, so nothing was sent for analysis.')
      }
    } catch (err) {
      console.error('Failed to submit voice answers:', err)
      toast.error('Could not submit your answers for analysis')
    }

    // Leaving the channel and closing the mic track is owned by the
    // agora-rtc-react hooks; unmounting the session is what releases them.
    rtmClient?.logout().catch((err) => console.error('RTM logout error:', err))
    setRtmClient(null)
    setStarted(false)
    setAgoraData(null)
    setSubmitting(false)

    router.push('/')
  }, [rtmClient, stopAgent, questions, interviewId, router])

  // Safety net: never leave a billable agent running if the user navigates away.
  useEffect(() => {
    return () => {
      if (agentIdRef.current) {
        void stopAgent(agentIdRef.current)
        agentIdRef.current = null
      }
    }
  }, [stopAgent])

  if (!started) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-4 py-10">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 opacity-20 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg">
            <Mic size={26} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Ready for your{' '}
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              voice interview
            </span>
            ?
          </h2>
          <p className="text-sm leading-relaxed text-neutral-600">
            {jobTitle ? (
              <>
                You&apos;ll be interviewed for the{' '}
                <span className="font-semibold text-neutral-800">
                  {jobTitle}
                </span>
                {companyName ? (
                  <>
                    {' '}
                    role at{' '}
                    <span className="font-semibold text-neutral-800">
                      {companyName}
                    </span>
                  </>
                ) : (
                  ' role'
                )}
                .
              </>
            ) : (
              'Your interviewer will ask questions one at a time.'
            )}
          </p>
        </div>

        <div className="grid w-full grid-cols-3 gap-2">
          <PreCallStat
            label="Questions"
            value={questionCount ? String(questionCount) : '—'}
          />
          <PreCallStat label="Format" value="Spoken" />
          <PreCallStat label="Est. time" value="~15 min" />
        </div>

        <ul className="flex w-full flex-col gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          {[
            'Your interviewer speaks first — just answer out loud when they finish.',
            'You can interrupt them at any time, like a real call.',
            'Find a quiet room. Background noise makes answers harder to transcribe.',
            'A live transcript shows what was heard, so you can check as you go.',
          ].map((tip) => (
            <li key={tip} className="flex flex-row gap-2.5 text-sm text-neutral-600">
              <CircleCheck
                size={15}
                className="mt-0.5 shrink-0 text-green-600"
              />
              {tip}
            </li>
          ))}
        </ul>

        {error && <InfoDivs type="alert" message={error} />}

        <div className="flex w-full flex-col items-center gap-3">
          <Button
            onClick={handleStart}
            disabled={isLoading}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-base font-semibold shadow-lg shadow-blue-600/25"
          >
            {isLoading ? 'Connecting…' : 'Start voice interview'}
          </Button>
          {isLoading ? (
            <LoaderFive text="Setting up your interviewer" />
          ) : (
            <span className="text-xs text-neutral-400">
              Your browser will ask for microphone access.
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4 p-4">
      {agentJoinError && (
        <InfoDivs
          type="warning"
          message="The interviewer could not be reached. You are connected, but no one will ask questions — please end and retry."
        />
      )}

      {agoraData && rtmClient && (
        <AgoraProvider>
          <VoiceSession
            agoraData={agoraData}
            rtmClient={rtmClient}
            onTranscriptChange={setTurns}
          />
        </AgoraProvider>
      )}

      <div className="flex flex-row items-center justify-between border-t border-neutral-200 pt-4">
        {/* TODO: map `turns` onto the stored questions and POST to
            /api/setanswers so the existing Inngest feedback job can grade them. */}
        <span className="text-xs text-neutral-400">
          {turns.length} turn{turns.length === 1 ? '' : 's'} recorded
        </span>

        {confirmingEnd ? (
          <div className="flex flex-row items-center gap-2">
            <span className="text-sm text-neutral-600">End the interview?</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmingEnd(false)}
            >
              Keep going
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEnd}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Yes, end it'}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setConfirmingEnd(true)}
          >
            End interview
          </Button>
        )}
      </div>
    </div>
  )
}

const PreCallStat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col items-center gap-0.5 rounded-xl border border-neutral-200 bg-white px-2 py-3">
    <span className="text-base font-bold text-neutral-900">{value}</span>
    <span className="text-[11px] uppercase tracking-wider text-neutral-400">
      {label}
    </span>
  </div>
)

export default VoiceInterview
