import React from 'react'
import { CircleCheck, CircleX, CircleAlert, FileUser, Target } from 'lucide-react'
import DonutChart from './DonutChart'
import {
  perQuestionCoverage,
  jobDescriptionCoverage,
  resumeUtilisation,
  answerHealth,
  interruptionCount,
} from '@/lib/answerInsights'
import type { TranscriptTurn } from '@/lib/agoraTranscript'

type Props = {
  questions: { question: string; expectedAnswer: string }[]
  answers: { answer: string }[]
  jobDesc?: string
  projectContext?: string[]
  workExDetails?: string[]
  transcript?: TranscriptTurn[]
  perQuestionScores?: { question: string; score: number }[]
}

const Section = ({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
    <div className="flex flex-row items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
        <Icon size={16} />
      </span>
      <div className="flex flex-col">
        <span className="text-base font-bold text-neutral-900">{title}</span>
        <span className="text-xs leading-relaxed text-neutral-500">
          {subtitle}
        </span>
      </div>
    </div>
    {children}
  </div>
)

const Chip = ({ text, hit }: { text: string; hit: boolean }) => (
  <span
    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
      hit
        ? 'border-green-200 bg-green-50 text-green-700'
        : 'border-neutral-200 bg-neutral-50 text-neutral-500 line-through'
    }`}
  >
    {text}
  </span>
)

const ContentInsights = ({
  questions,
  answers,
  jobDesc,
  projectContext,
  workExDetails,
  transcript,
  perQuestionScores,
}: Props) => {
  const allAnswers = (answers ?? []).map((a) => a?.answer ?? '').join(' ')
  const qCoverage = perQuestionCoverage(questions ?? [], answers ?? [])
  const jd = jobDescriptionCoverage(jobDesc ?? '', allAnswers)
  const resume = resumeUtilisation(
    [...(projectContext ?? []), ...(workExDetails ?? [])],
    allAnswers,
  )
  const health = answerHealth(questions ?? [], answers ?? [])
  const interruptions = interruptionCount(transcript)

  const skipped = health.filter((h) => h.status === 'skipped')
  const thin = health.filter((h) => h.status === 'thin')
  const resumeUsed = resume.filter((r) => r.mentioned)

  const totalCovered = qCoverage.reduce((n, q) => n + q.covered.length, 0)
  const totalMissed = qCoverage.reduce((n, q) => n + q.missed.length, 0)
  const overallPct =
    totalCovered + totalMissed === 0
      ? 0
      : Math.round((totalCovered / (totalCovered + totalMissed)) * 100)

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- 1. Answer health ---------- */}
      {(skipped.length > 0 || thin.length > 0) && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-yellow-300 bg-yellow-50 p-5">
          <span className="text-base font-bold text-yellow-900">
            Gaps in this interview
          </span>
          <div className="flex flex-col gap-2">
            {skipped.map((h) => (
              <div key={h.index} className="flex flex-row gap-2 text-sm text-yellow-900">
                <CircleX size={15} className="mt-0.5 shrink-0" />
                <span>
                  <span className="font-semibold">Question {h.index} was not answered.</span>{' '}
                  {h.question}
                </span>
              </div>
            ))}
            {thin.map((h) => (
              <div key={h.index} className="flex flex-row gap-2 text-sm text-yellow-900">
                <CircleAlert size={15} className="mt-0.5 shrink-0" />
                <span>
                  <span className="font-semibold">
                    Question {h.index} got only {h.words} words.
                  </span>{' '}
                  Short answers rarely show depth.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- 2. Expected-answer coverage ---------- */}
      <Section
        icon={Target}
        title="What a strong answer contained"
        subtitle="Key points from the model answer, and whether you mentioned them. This matches wording, not meaning — explaining a concept in different words can read as a miss."
      >
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="flex shrink-0 flex-col items-center gap-1">
            <DonutChart
              covered={totalCovered}
              missed={totalMissed}
              centreLabel={`${overallPct}%`}
            />
            <span className="text-xs text-neutral-500">
              {totalCovered} of {totalCovered + totalMissed} points
            </span>
          </div>

          <div className="flex w-full flex-col gap-3">
            {qCoverage.map((q) => (
              <div key={q.index} className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-neutral-700">
                  Q{q.index} · {Math.round(q.ratio * 100)}% covered
                </span>
                <div className="flex flex-row flex-wrap gap-1.5">
                  {q.covered.map((t) => (
                    <Chip key={`c-${t}`} text={t} hit />
                  ))}
                  {q.missed.map((t) => (
                    <Chip key={`m-${t}`} text={t} hit={false} />
                  ))}
                  {q.covered.length + q.missed.length === 0 && (
                    <span className="text-xs italic text-neutral-400">
                      No key points extracted for this question.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ---------- 3. Resume utilisation ---------- */}
      {resume.length > 0 && (
        <Section
          icon={FileUser}
          title="Did you use your own experience?"
          subtitle="Projects and work history from your resume, and whether you drew on them. Unused material is usually the fastest win in a real interview."
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-1">
              <DonutChart
                covered={resumeUsed.length}
                missed={resume.length - resumeUsed.length}
                centreLabel={`${resumeUsed.length}/${resume.length}`}
              />
              <span className="text-xs text-neutral-500">referenced</span>
            </div>
            <ul className="flex w-full flex-col gap-2">
              {resume.map((r, i) => (
                <li key={i} className="flex flex-row gap-2 text-sm">
                  {r.mentioned ? (
                    <CircleCheck size={15} className="mt-0.5 shrink-0 text-green-600" />
                  ) : (
                    <CircleX size={15} className="mt-0.5 shrink-0 text-neutral-300" />
                  )}
                  <span className={r.mentioned ? 'text-neutral-800' : 'text-neutral-400'}>
                    {r.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/* ---------- 4. Job description coverage ---------- */}
      {jd.covered.length + jd.missed.length > 0 && (
        <Section
          icon={Target}
          title="Job description coverage"
          subtitle="Terms the job description emphasises, and whether they came up in your answers."
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-1">
              <DonutChart
                covered={jd.covered.length}
                missed={jd.missed.length}
                centreLabel={`${Math.round(jd.ratio * 100)}%`}
              />
            </div>
            <div className="flex w-full flex-row flex-wrap gap-1.5">
              {jd.covered.map((t) => (
                <Chip key={`jc-${t}`} text={t} hit />
              ))}
              {jd.missed.map((t) => (
                <Chip key={`jm-${t}`} text={t} hit={false} />
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ---------- 5. Per-question scores ---------- */}
      {perQuestionScores && perQuestionScores.length > 0 && (
        <Section
          icon={Target}
          title="Score per question"
          subtitle="Where the overall score came from."
        >
          <div className="flex flex-col gap-2.5">
            {perQuestionScores.map((p, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex flex-row items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700">
                    Q{i + 1}
                  </span>
                  <span className="font-bold text-neutral-900">
                    {p.score}/10
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full rounded-full ${
                      p.score < 4
                        ? 'bg-red-400'
                        : p.score < 7
                          ? 'bg-yellow-400'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, p.score * 10)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {interruptions > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          You spoke over the interviewer{' '}
          <span className="font-bold">{interruptions}</span>{' '}
          {interruptions === 1 ? 'time' : 'times'}. Occasional overlap is normal
          in conversation; frequent overlap reads as impatience.
        </div>
      )}
    </div>
  )
}

export default ContentInsights
