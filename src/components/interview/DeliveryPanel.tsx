import React from 'react'
import { Gauge, MessageSquareDashed, Timer, Mic } from 'lucide-react'
import {
  computeDeliveryMetrics,
  paceVerdict,
  fillerVerdict,
  thinkingVerdict,
  type DeliveryMetrics,
  type Verdict,
} from '@/lib/deliveryMetrics'
import type { TranscriptTurn } from '@/lib/agoraTranscript'

const TONE: Record<Verdict, string> = {
  good: 'bg-green-50 text-green-700 border-green-200',
  low: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  high: 'bg-yellow-50 text-yellow-800 border-yellow-200',
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  unit,
  verdict,
  note,
}: {
  icon: React.ElementType
  label: string
  value: string
  unit?: string
  verdict: Verdict | null
  note: string
}) => (
  <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
    <div className="flex flex-row items-center justify-between">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
        <Icon size={16} />
      </span>
      {verdict && (
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE[verdict]}`}
        >
          {verdict === 'good'
            ? 'On target'
            : verdict === 'low'
              ? 'Below target'
              : 'Above target'}
        </span>
      )}
    </div>
    <div className="flex flex-row items-baseline gap-1">
      <span className="text-2xl font-extrabold text-neutral-900">{value}</span>
      {unit && <span className="text-sm text-neutral-500">{unit}</span>}
    </div>
    <span className="text-sm font-semibold text-neutral-800">{label}</span>
    <span className="text-xs leading-relaxed text-neutral-500">{note}</span>
  </div>
)

const DeliveryPanel = ({ transcript }: { transcript?: TranscriptTurn[] }) => {
  if (!transcript || transcript.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-14 text-center">
        <span className="text-base font-semibold text-neutral-800">
          No delivery data for this interview
        </span>
        <span className="max-w-md text-sm text-neutral-500">
          Pace, filler words and thinking time are measured from the spoken
          transcript, so they are only available for voice interviews taken
          after this feature was added.
        </span>
      </div>
    )
  }

  const m: DeliveryMetrics = computeDeliveryMetrics(transcript)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Gauge}
          label="Speaking pace"
          value={m.wordsPerMinute?.toString() ?? '—'}
          unit="wpm"
          verdict={paceVerdict(m.wordsPerMinute)}
          note="Interviewers follow best around 110–170 words per minute. Rushing usually reads as nerves."
        />
        <StatCard
          icon={MessageSquareDashed}
          label="Filler words"
          value={m.fillerCount.toString()}
          unit={m.fillersPerMinute != null ? `(${m.fillersPerMinute}/min)` : ''}
          verdict={fillerVerdict(m.fillersPerMinute)}
          note='Counts clear disfluencies only — "um", "uh", "er". Under about 4 per minute goes unnoticed.'
        />
        <StatCard
          icon={Timer}
          label="Thinking time"
          value={
            m.medianThinkingSeconds != null
              ? m.medianThinkingSeconds.toFixed(1)
              : '—'
          }
          unit="s median"
          verdict={thinkingVerdict(m.medianThinkingSeconds)}
          note="Pause before answering. A few seconds is composed; much longer suggests being caught off guard."
        />
        <StatCard
          icon={Mic}
          label="You spoke"
          value={
            m.talkRatio != null ? `${Math.round(m.talkRatio * 100)}` : '—'
          }
          unit="% of the time"
          verdict={null}
          note="In a strong interview the candidate does most of the talking."
        />
      </div>

      {m.crutchCount > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
          <span className="text-sm font-semibold text-neutral-800">
            Crutch words worth noticing
          </span>
          <span className="text-xs text-neutral-500">
            These have legitimate uses, so they are not counted as mistakes —
            but heavy repetition is distracting.
          </span>
          <div className="mt-1 flex flex-row flex-wrap gap-2">
            {m.crutchBreakdown.map((c) => (
              <span
                key={c.phrase}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-700"
              >
                &ldquo;{c.phrase}&rdquo; × {c.count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <span className="text-sm font-semibold text-neutral-800">
          Answer by answer
        </span>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-[11px] uppercase tracking-wider text-neutral-400">
                <th className="py-2 pr-3 font-semibold">#</th>
                <th className="py-2 pr-3 font-semibold">Length</th>
                <th className="py-2 pr-3 font-semibold">Words</th>
                <th className="py-2 pr-3 font-semibold">Pace</th>
                <th className="py-2 pr-3 font-semibold">Paused</th>
                <th className="py-2 font-semibold">Fillers</th>
              </tr>
            </thead>
            <tbody>
              {m.answers.map((a) => (
                <tr key={a.index} className="border-b border-neutral-50">
                  <td className="py-2 pr-3 font-semibold text-neutral-900">
                    {a.index}
                  </td>
                  <td className="py-2 pr-3 text-neutral-600">
                    {a.seconds > 0 ? `${Math.round(a.seconds)}s` : '—'}
                  </td>
                  <td className="py-2 pr-3 text-neutral-600">{a.words}</td>
                  {/* Out-of-band values are highlighted so the row scans as
                      guidance rather than as a wall of numbers. */}
                  <td
                    className={`py-2 pr-3 ${
                      paceVerdict(a.wpm) && paceVerdict(a.wpm) !== 'good'
                        ? 'font-semibold text-yellow-700'
                        : 'text-neutral-600'
                    }`}
                  >
                    {a.wpm != null ? `${a.wpm} wpm` : '—'}
                  </td>
                  <td
                    className={`py-2 pr-3 ${
                      thinkingVerdict(a.thinkingSeconds) === 'high'
                        ? 'font-semibold text-yellow-700'
                        : 'text-neutral-600'
                    }`}
                  >
                    {a.thinkingSeconds != null
                      ? `${a.thinkingSeconds.toFixed(1)}s`
                      : '—'}
                  </td>
                  <td
                    className={`py-2 ${
                      a.seconds > 0 && (a.fillers / a.seconds) * 60 > 4
                        ? 'font-semibold text-yellow-700'
                        : 'text-neutral-600'
                    }`}
                  >
                    {a.fillers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-neutral-400">
        Timings are estimated from speech-recognition timestamps and are
        approximate. Background noise and microphone quality affect them.
      </p>
    </div>
  )
}

export default DeliveryPanel
