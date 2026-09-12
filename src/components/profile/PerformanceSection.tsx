'use client'
import React, { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import TrendChart from './TrendChart'
import Chart from '@/components/Chart'
import type { AttemptSummary } from '@/app/profile/actions'

const PARAMS = [
  'depthOfKnowledge',
  'impactOrientedMindset',
  'architecturalFlexibility',
  'problemSolvingAndDebuggingSkills',
  'collaborationAndCommunication',
]

const PRETTY: Record<string, string> = {
  depthOfKnowledge: 'Depth of knowledge',
  impactOrientedMindset: 'Impact mindset',
  architecturalFlexibility: 'Architectural flexibility',
  problemSolvingAndDebuggingSkills: 'Problem solving',
  collaborationAndCommunication: 'Collaboration',
}

const Card = ({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
    <div className="flex flex-col">
      <span className="text-sm font-bold text-neutral-900">{title}</span>
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </div>
    {children}
  </div>
)

const PerformanceSection = ({ attempts }: { attempts: AttemptSummary[] }) => {
  const graded = useMemo(
    () => attempts.filter((a) => a.overallScore != null),
    [attempts],
  )
  const withDelivery = useMemo(
    () => attempts.filter((a) => a.wpm != null || a.fillersPerMinute != null),
    [attempts],
  )

  // Averaging the parameter scores across every graded attempt gives a far more
  // stable read on strengths than any single interview.
  const paramAverages = useMemo(() => {
    const sums: Record<string, { total: number; n: number }> = {}
    for (const a of graded) {
      if (!a.parameterScores) continue
      for (const key of PARAMS) {
        const v = a.parameterScores[key]
        if (typeof v !== 'number') continue
        sums[key] ??= { total: 0, n: 0 }
        sums[key].total += v
        sums[key].n += 1
      }
    }
    return PARAMS.map((key) => ({
      key,
      value: sums[key]?.n ? sums[key].total / sums[key].n : null,
    }))
  }, [graded])

  const scoredParams = paramAverages.filter((p) => p.value != null)
  const best = [...scoredParams].sort((a, b) => b.value! - a.value!)[0]
  const weakest = [...scoredParams].sort((a, b) => a.value! - b.value!)[0]

  // A trend needs at least two points to mean anything.
  if (graded.length < 2) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-14 text-center">
        <TrendingUp size={22} className="text-neutral-400" />
        <span className="text-base font-semibold text-neutral-800">
          {graded.length === 0
            ? 'No graded interviews yet'
            : 'One interview down'}
        </span>
        <span className="max-w-md text-sm text-neutral-500">
          {graded.length === 0
            ? 'Finish an interview and your scores will start building a history here.'
            : 'Take one more and this page will start showing whether you are improving.'}
        </span>
      </div>
    )
  }

  const labels = graded.map((_, i) => `#${i + 1}`)
  const latest = graded[graded.length - 1].overallScore!
  const first = graded[0].overallScore!
  const delta = latest - first

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Overall score"
          hint={`${graded.length} graded interviews`}
        >
          <TrendChart
            labels={labels}
            data={graded.map((a) => a.overallScore)}
            color="#3b82f6"
            suggestedMin={0}
            suggestedMax={10}
          />
          <span
            className={`text-xs font-medium ${
              delta > 0
                ? 'text-green-700'
                : delta < 0
                  ? 'text-red-600'
                  : 'text-neutral-500'
            }`}
          >
            {delta > 0
              ? `Up ${delta.toFixed(1)} points since your first attempt`
              : delta < 0
                ? `Down ${Math.abs(delta).toFixed(1)} points since your first attempt`
                : 'Level with your first attempt'}
          </span>
        </Card>

        <Card
          title="Strengths across all interviews"
          hint="Each parameter averaged over every graded attempt"
        >
          <div className="h-48 w-full">
            <Chart
              data={scoredParams.map((p) => Number(p.value!.toFixed(1)))}
              labels={scoredParams.map((p) => p.key)}
            />
          </div>
          {best && weakest && best.key !== weakest.key && (
            <span className="text-xs text-neutral-600">
              Strongest: <strong>{PRETTY[best.key] ?? best.key}</strong> ·
              Weakest: <strong>{PRETTY[weakest.key] ?? weakest.key}</strong>
            </span>
          )}
        </Card>
      </div>

      {withDelivery.length >= 2 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card
            title="Filler words per minute"
            hint="Lower is better. Under ~4 goes unnoticed."
          >
            <TrendChart
              labels={withDelivery.map((_, i) => `#${i + 1}`)}
              data={withDelivery.map((a) => a.fillersPerMinute)}
              color="#a855f7"
            />
          </Card>
          <Card
            title="Speaking pace"
            hint="Target band is roughly 110–170 wpm."
          >
            <TrendChart
              labels={withDelivery.map((_, i) => `#${i + 1}`)}
              data={withDelivery.map((a) => a.wpm)}
              color="#22c55e"
            />
          </Card>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
          Delivery trends (pace, filler words, thinking time) appear once you
          have completed two or more voice interviews.
        </div>
      )}
    </div>
  )
}

export default PerformanceSection
