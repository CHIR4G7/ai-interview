'use client'
import React from 'react'
import { Loader2, Mic, Volume2, WifiOff } from 'lucide-react'

export type InterviewerState =
  | 'connecting'
  | 'speaking'
  | 'thinking'
  | 'listening'
  | 'idle'
  | 'disconnected'

const COPY: Record<InterviewerState, string> = {
  connecting: 'Connecting…',
  speaking: 'Speaking',
  thinking: 'Thinking',
  listening: 'Listening',
  idle: 'Ready',
  disconnected: 'Disconnected',
}

const RING: Record<InterviewerState, string> = {
  connecting: 'from-neutral-300 to-neutral-400',
  speaking: 'from-blue-500 to-purple-500',
  thinking: 'from-purple-500 to-fuchsia-500',
  listening: 'from-green-500 to-emerald-500',
  idle: 'from-blue-400 to-purple-400',
  disconnected: 'from-neutral-300 to-neutral-400',
}

/**
 * Visual presence for the AI interviewer. The state comes from the agent's own
 * RTM activity events, so the candidate can tell whether they are being heard,
 * whether the interviewer is thinking, or whether the connection dropped —
 * which a voice-only call otherwise gives no feedback about at all.
 */
const InterviewerOrb = ({ state }: { state: InterviewerState }) => {
  const isSpeaking = state === 'speaking'
  const isThinking = state === 'thinking'

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-40 w-40 items-center justify-center">
        {isSpeaking && (
          <>
            <span
              className={`vi-ripple absolute h-32 w-32 rounded-full bg-gradient-to-br ${RING[state]} opacity-40`}
            />
            <span
              className={`vi-ripple absolute h-32 w-32 rounded-full bg-gradient-to-br ${RING[state]} opacity-40`}
              style={{ animationDelay: '0.6s' }}
            />
          </>
        )}

        <span
          className={`absolute h-32 w-32 rounded-full bg-gradient-to-br ${RING[state]} opacity-20 blur-xl`}
        />

        <div
          className={`relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br ${RING[state]} text-white shadow-lg ${
            isThinking ? 'vi-pulse' : ''
          }`}
        >
          {state === 'connecting' ? (
            <Loader2 size={30} className="animate-spin" />
          ) : state === 'disconnected' ? (
            <WifiOff size={30} />
          ) : state === 'listening' ? (
            <Mic size={30} />
          ) : (
            <Volume2 size={30} />
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-semibold text-neutral-900">
          Your interviewer
        </span>
        <span className="text-xs font-medium text-neutral-500">
          {COPY[state]}
        </span>
      </div>
    </div>
  )
}

export default InterviewerOrb
