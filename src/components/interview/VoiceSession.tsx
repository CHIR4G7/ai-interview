'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  useJoin,
  usePublish,
  useLocalMicrophoneTrack,
  useRTCClient,
  useRemoteUsers,
  useClientEvent,
  RemoteUser,
} from 'agora-rtc-react'
import {
  AgoraVoiceAI,
  AgoraVoiceAIEvents,
  TranscriptHelperMode,
} from 'agora-agent-client-toolkit'
import type { RTMClient } from 'agora-rtm'
import { Mic, MicOff } from 'lucide-react'
import { AGENT_RTC_UID } from '@/lib/agora'
import {
  normalizeTranscript,
  toTurns,
  type TranscriptItem,
  type TranscriptTurn,
} from '@/lib/agoraTranscript'
import InterviewerOrb, { type InterviewerState } from './InterviewerOrb'
import CameraPanel from './CameraPanel'
import { useLocalSpeech } from '@/lib/useLocalSpeech'
import { mergeTranscript, type StampedTurn } from '@/lib/mergeTranscript'
import TypewriterText from './TypewriterText'

export type AgoraSessionData = {
  token: string
  uid: string
  channel: string
}

type Props = {
  agoraData: AgoraSessionData
  rtmClient: RTMClient
  onTranscriptChange?: (turns: TranscriptTurn[]) => void
}

const formatClock = (totalSeconds: number) => {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const VoiceSession = ({ agoraData, rtmClient, onTranscriptChange }: Props) => {
  const client = useRTCClient()
  const remoteUsers = useRemoteUsers()

  // StrictMode double-invokes effects in development. Without this guard the
  // join and mic-track hooks initialise twice, producing duplicate clients and
  // tracks that are very hard to recover from. The first (fake) mount's timer is
  // cancelled synchronously; only the second, real mount's timer survives.
  const [isReady, setIsReady] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setIsReady(true), 0)
    return () => clearTimeout(id)
  }, [])

  const [micOn, setMicOn] = useState(true)
  const [micLevel, setMicLevel] = useState(0)
  const [agentJoined, setAgentJoined] = useState(false)
  const [connectionState, setConnectionState] = useState('CONNECTING')
  const [activity, setActivity] = useState({
    listening: false,
    thinking: false,
    speaking: false,
  })
  const [rawTranscript, setRawTranscript] = useState<TranscriptItem[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [sessionError, setSessionError] = useState<string | null>(null)
  // Wall-clock times the interviewer began speaking. Agora has no
  // question-level signal, so these transitions mark where one answer block
  // ends and the next begins.
  const [boundaries, setBoundaries] = useState<number[]>([])

  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isReady)

  useJoin(
    {
      appid: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
      channel: agoraData.channel,
      token: agoraData.token,
      uid: Number(agoraData.uid),
    },
    isReady,
  )

  usePublish([localMicrophoneTrack], isReady && !!localMicrophoneTrack)

  useClientEvent(client, 'user-joined', (user) => {
    if (String(user.uid) === String(AGENT_RTC_UID)) setAgentJoined(true)
  })
  useClientEvent(client, 'user-left', (user) => {
    if (String(user.uid) === String(AGENT_RTC_UID)) setAgentJoined(false)
  })
  useClientEvent(client, 'connection-state-change', (curState) => {
    setConnectionState(curState)
  })

  // Session clock.
  useEffect(() => {
    const id = setInterval(() => setElapsed((prev) => prev + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Muting toggles the track's enabled flag rather than creating/destroying the
  // track — tearing it down would break the publish contract owned by usePublish.
  useEffect(() => {
    if (!localMicrophoneTrack) return
    localMicrophoneTrack.setEnabled(micOn)
  }, [micOn, localMicrophoneTrack])

  // Live input level. On a voice-only call the candidate has no other way to
  // tell whether their mic is actually being picked up.
  useEffect(() => {
    if (!localMicrophoneTrack || !micOn) {
      setMicLevel(0)
      return
    }
    const id = setInterval(() => {
      setMicLevel(localMicrophoneTrack.getVolumeLevel())
    }, 120)
    return () => clearInterval(id)
  }, [localMicrophoneTrack, micOn])

  // The toolkit binds to the RTC and RTM engines and must only be initialised
  // once the RTC join has actually succeeded — initialising earlier drops
  // subscriptions and the transcript never arrives.
  // AgoraVoiceAI is a process-wide SINGLETON and `destroy()` acts on that static
  // instance, not on the object you call it on: it nulls both engines and calls
  // removeAllEventListeners(). So a destroy triggered by one mount silently kills
  // the session another mount is using — which under StrictMode (init resolving
  // after its own cleanup has run) leaves the channel connected but permanently
  // silent: no transcripts, no agent state.
  //
  // Guard with a ref that survives StrictMode's simulated unmount so init runs
  // exactly once, and only destroy when this component is genuinely going away.
  const voiceAIRef = useRef<AgoraVoiceAI | null>(null)
  const initStartedRef = useRef(false)

  useEffect(() => {
    if (!isReady || initStartedRef.current) return
    initStartedRef.current = true

    const run = async () => {
      try {
        const voiceAI = await AgoraVoiceAI.init({
          rtcEngine: client,
          rtmEngine: rtmClient,
          renderMode: TranscriptHelperMode.AUTO,
          enableLog: process.env.NODE_ENV === 'development',
        })
        voiceAIRef.current = voiceAI

        voiceAI.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (transcription) => {
          if (process.env.NODE_ENV === 'development') {
            console.debug(
              '[transcript]',
              transcription.map((t) => ({
                uid: t.uid,
                turn_id: t.turn_id,
                status: t.status,
                object: t.metadata?.object,
                text: t.text,
              })),
            )
          }
          setRawTranscript([...transcription])
        })
        voiceAI.on(AgoraVoiceAIEvents.AGENT_LISTENING_CHANGED, (_uid, on) =>
          setActivity((prev) => ({ ...prev, listening: on })),
        )
        voiceAI.on(AgoraVoiceAIEvents.AGENT_THINKING_CHANGED, (_uid, on) =>
          setActivity((prev) => ({ ...prev, thinking: on })),
        )
        voiceAI.on(AgoraVoiceAIEvents.AGENT_SPEAKING_CHANGED, (_uid, on) => {
          setActivity((prev) => ({ ...prev, speaking: on }))
          if (on) setBoundaries((prev) => [...prev, Date.now()])
        })

        // Explicit end-of-turn from Agora — the most accurate boundary we get.
        voiceAI.on(AgoraVoiceAIEvents.AGENT_TURN_FINISHED, () => {
          setBoundaries((prev) => [...prev, Date.now()])
        })

        // Surface pipeline failures instead of showing an idle orb forever.
        voiceAI.on(AgoraVoiceAIEvents.AGENT_ERROR, (_uid, err) => {
          console.error('[agent-error]', err)
          setSessionError('The interviewer hit an error. Try ending and restarting.')
        })
        voiceAI.on(AgoraVoiceAIEvents.MESSAGE_ERROR, (...args) =>
          console.error('[message-error]', ...args),
        )
        voiceAI.on(AgoraVoiceAIEvents.MESSAGE_SAL_STATUS, (...args) =>
          console.warn('[sal-status]', ...args),
        )

        if (process.env.NODE_ENV === 'development') {
          console.debug('[voiceAI] initialised', AgoraVoiceAI.getState?.())
        }
      } catch (err) {
        console.error('Failed to initialise AgoraVoiceAI:', err)
        setSessionError('Could not connect the transcript channel.')
        initStartedRef.current = false
      }
    }

    run()
  }, [isReady, client, rtmClient])

  // Teardown only on real unmount, never from inside the init effect.
  useEffect(() => {
    return () => {
      voiceAIRef.current?.destroy()
      voiceAIRef.current = null
      initStartedRef.current = false
    }
  }, [])

  // ---- Source A: Agora (the interviewer's words) ----
  const agentTurns = useMemo(
    () => toTurns(normalizeTranscript(rawTranscript)),
    [rawTranscript],
  )

  // Agora turns carry no reliable wall-clock time, so stamp each one when it is
  // first observed. That gives a shared ordering basis with local speech.
  const seenAtRef = useRef<Map<string, number>>(new Map())
  const stampedAgentTurns: StampedTurn[] = useMemo(() => {
    const seen = seenAtRef.current
    return agentTurns.map((turn) => {
      if (!seen.has(turn.key)) seen.set(turn.key, Date.now())
      return { ...turn, at: turn.createdAt ?? seen.get(turn.key)! }
    })
  }, [agentTurns])

  // ---- Source B: the browser, for the candidate's own words ----
  // Driven by the same microphone the Agora track publishes from; recognition
  // captures its own audio, so both run off one physical input.
  const {
    supported: speechSupported,
    segments: localSegments,
    interim,
    error: speechError,
  } = useLocalSpeech(micOn)

  const useLocalForCandidate = speechSupported && !speechError

  const turns = useMemo(() => {
    const withInterim = interim.trim()
      ? [
          ...localSegments,
          { id: 'interim', text: interim, at: Date.now(), final: false },
        ]
      : localSegments
    return mergeTranscript(stampedAgentTurns, withInterim, {
      useLocalForCandidate,
      boundaries,
    })
  }, [stampedAgentTurns, localSegments, interim, useLocalForCandidate, boundaries])

  useEffect(() => {
    onTranscriptChange?.(turns)
  }, [turns, onTranscriptChange])

  // Transport problems take priority over agent-level state, so the orb never
  // claims to be listening while the connection is actually degraded.
  const interviewerState: InterviewerState = useMemo(() => {
    if (connectionState === 'DISCONNECTED' || connectionState === 'DISCONNECTING')
      return 'disconnected'
    if (connectionState === 'CONNECTING' || connectionState === 'RECONNECTING')
      return 'connecting'
    if (!agentJoined) return 'connecting'
    if (activity.speaking) return 'speaking'
    if (activity.thinking) return 'thinking'
    if (activity.listening) return 'listening'
    return 'idle'
  }, [connectionState, agentJoined, activity])

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  // Only follow the conversation when the candidate is already at the bottom,
  // so scrolling back to re-read an earlier question doesn't yank them away.
  const isPinnedRef = useRef(true)
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    isPinnedRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }, [])

  useEffect(() => {
    if (isPinnedRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [turns.length, turns[turns.length - 1]?.text])

  const answeredCount = turns.filter(
    (t) => t.speaker === 'candidate' && !t.live,
  ).length

  return (
    <div className="flex w-full flex-col gap-4">
      {/* The agent publishes audio only; RemoteUser plays it back. */}
      {remoteUsers.map((user) => (
        <RemoteUser key={user.uid} user={user} playAudio playVideo={false} />
      ))}

      {sessionError && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          {sessionError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        {/* ---------- left rail: presence + controls ---------- */}
        <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
          <InterviewerOrb state={interviewerState} />

          <CameraPanel />

          <div className="flex flex-row items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm">
            <span className="text-neutral-500">Elapsed</span>
            <span className="font-mono font-semibold tabular-nums text-neutral-900">
              {formatClock(elapsed)}
            </span>
          </div>

          <div className="flex flex-row items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm">
            <span className="text-neutral-500">Answers given</span>
            <span className="font-semibold text-neutral-900">
              {answeredCount}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setMicOn((prev) => !prev)}
              className={`flex w-full flex-row items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                micOn
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {micOn ? <Mic size={17} /> : <MicOff size={17} />}
              {micOn ? 'Mic on' : 'Muted'}
            </button>

            {/* Input level meter */}
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-[width] duration-150"
                style={{
                  width: `${Math.min(100, Math.round(micLevel * 140))}%`,
                }}
              />
            </div>
            <span className="text-center text-[11px] text-neutral-400">
              {micOn
                ? 'Speak normally — you can interrupt the interviewer'
                : 'The interviewer cannot hear you'}
            </span>

            {/* One mic, two consumers: the Agora track the agent hears, and
                local recognition that renders your words on screen. */}
            {!useLocalForCandidate && (
              <span className="rounded-lg bg-yellow-50 px-2 py-1.5 text-center text-[11px] text-yellow-800">
                {speechError
                  ? speechError
                  : 'Live captions of your answers need Chrome or Edge. Your answers are still recorded.'}
              </span>
            )}
          </div>
        </div>

        {/* ---------- right: transcript ---------- */}
        <div className="flex min-h-[46vh] flex-col rounded-2xl border border-neutral-200 bg-white">
          <div className="flex flex-row items-center justify-between border-b border-neutral-100 px-5 py-3">
            <span className="text-sm font-semibold text-neutral-900">
              Live transcript
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                interviewerState === 'disconnected'
                  ? 'bg-red-50 text-red-700'
                  : agentJoined
                    ? 'bg-green-50 text-green-700'
                    : 'bg-yellow-50 text-yellow-700'
              }`}
            >
              {interviewerState === 'disconnected'
                ? 'Disconnected'
                : agentJoined
                  ? 'Connected'
                  : 'Waiting…'}
            </span>
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-5 py-4"
            style={{ maxHeight: '52vh' }}
          >
            {turns.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
                <span className="text-sm font-medium text-neutral-600">
                  Waiting for your interviewer to begin
                </span>
                <span className="max-w-xs text-xs text-neutral-400">
                  They will greet you and ask the first question. Everything
                  said appears here.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {turns.map((turn) => (
                  <TranscriptBubble key={turn.key} turn={turn} />
                ))}
                <div ref={endRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const TranscriptBubble = ({ turn }: { turn: TranscriptTurn }) => {
  const isCandidate = turn.speaker === 'candidate'
  const live = turn.live
  return (
    <div
      className={`flex w-full flex-col gap-1 ${
        isCandidate ? 'items-end' : 'items-start'
      }`}
    >
      <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        {isCandidate ? 'You' : 'Interviewer'}
      </span>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isCandidate
            ? 'rounded-br-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white'
            : 'rounded-bl-sm border border-neutral-200 bg-neutral-50 text-neutral-800'
        } ${live ? 'opacity-70' : ''}`}
      >
        <TypewriterText text={turn.text} />
        {turn.interrupted && (
          <span className="ml-1.5 text-[11px] italic opacity-60">
            (interrupted)
          </span>
        )}
      </div>
    </div>
  )
}

export default VoiceSession
