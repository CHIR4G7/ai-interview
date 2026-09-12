import React from 'react'
import Link from 'next/link'
import { InterviewCardProps } from '@/types/interview'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Mic,
  Loader2,
  Building2,
  CalendarDays,
  ArrowRight,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'

function capitalizeFirstWord(str: string) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-green-50 text-green-700 border-green-200',
  ready: 'bg-blue-50 text-blue-700 border-blue-200',
}

const InterviewCard = ({ interview }: InterviewCardProps) => {
  const created = new Date(interview.createdAt)
  const formatted = created.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const skills = interview.skills ?? []
  const shown = skills.slice(0, 4)
  const remaining = skills.length - shown.length

  const status = interview.status ?? 'ready'
  const isCompleted = status === 'completed'
  const gradingPending = isCompleted && !interview.insightsReady

  return (
    <div className="group flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-900/5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-row items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-bold leading-tight text-neutral-900">
              {interview.jobTitle}
            </span>
            <span className="flex flex-row items-center gap-1.5 text-sm text-neutral-500">
              <Building2 size={13} className="shrink-0 text-neutral-400" />
              {capitalizeFirstWord(interview.companyName)}
            </span>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 capitalize ${STATUS_STYLE[status] ?? 'bg-neutral-50 text-neutral-600'}`}
          >
            {status}
          </Badge>
        </div>

        <div className="flex flex-row flex-wrap gap-1.5">
          {shown.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600"
            >
              {skill}
            </span>
          ))}
          {remaining > 0 && (
            <Dialog>
              <DialogTrigger className="rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50">
                +{remaining} more
              </DialogTrigger>
              <DialogContent>
                <DialogHeader className="flex flex-col gap-2">
                  <DialogTitle>Skills for this interview</DialogTitle>
                  <DialogDescription className="flex flex-wrap gap-1.5 pt-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex flex-row items-center justify-between border-t border-neutral-100 pt-3">
        <span className="flex flex-row items-center gap-1.5 text-[11px] text-neutral-400">
          <CalendarDays size={12} />
          {formatted}
        </span>

        {isCompleted ? (
          gradingPending ? (
            <span className="flex flex-row items-center gap-1.5 text-xs font-medium text-neutral-400">
              <Loader2 size={13} className="animate-spin" />
              Scoring…
            </span>
          ) : (
            <Link
              href={`/interview/${interview._id}/feedback`}
              className="flex flex-row items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              <FileText size={13} />
              View feedback
            </Link>
          )
        ) : (
          <Link
            href={`/interview/${interview._id}/perform`}
            className="flex flex-row items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform group-hover:scale-[1.03]"
          >
            <Mic size={13} />
            Start
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </div>
  )
}

export default InterviewCard
