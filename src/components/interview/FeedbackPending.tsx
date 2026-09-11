'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Shown while inngest `generateInsights` is still scoring the answers.
 *
 * It polls by refreshing the server component, so the real feedback appears on
 * its own once grading lands — the user does not have to guess when to reload.
 */
const POLL_INTERVAL_MS = 5000

const FeedbackPending = ({
  interviewId,
  hasAnswers,
}: {
  interviewId: string
  hasAnswers: boolean
}) => {
  const router = useRouter()
  const [waited, setWaited] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setWaited((prev) => prev + POLL_INTERVAL_MS / 1000)
      router.refresh()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [router])

  // Grading normally lands within a few seconds; past a minute something is
  // more likely wrong than slow, so stop implying it is imminent.
  const takingLong = waited >= 60

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-5 py-20 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-blue-500 opacity-20 blur-xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-blue-500 text-white shadow-lg">
          <Loader2 size={24} className="animate-spin" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-3xl font-extrabold text-transparent">
          {hasAnswers ? 'Scoring your answers' : 'Feedback not ready yet'}
        </h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          {hasAnswers
            ? 'Your answers are being graded against what a strong response looks like. This page updates itself the moment your report is ready.'
            : "We haven't received answers for this interview yet. Once you complete it, your feedback will appear here."}
        </p>
      </div>

      {takingLong && (
        <div className="rounded-xl border-2 border-yellow-300 bg-yellow-100 px-4 py-3 text-sm text-yellow-900">
          This is taking longer than usual. The grading job may have failed —
          try reloading, and if it stays empty the interview may need to be
          retaken.
        </div>
      )}

      <div className="flex flex-row items-center gap-3">
        <Button asChild variant="outline">
          <Link href="/" className="flex flex-row items-center gap-2">
            <ArrowLeft size={15} />
            Back to interviews
          </Link>
        </Button>
        <Button
          variant="outline"
          onClick={() => router.refresh()}
          className="flex flex-row items-center gap-2"
        >
          <RefreshCw size={15} />
          Check now
        </Button>
      </div>
    </main>
  )
}

export default FeedbackPending
