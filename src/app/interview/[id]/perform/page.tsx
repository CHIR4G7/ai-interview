import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Building2, Briefcase } from 'lucide-react'
import { auth } from '@/app/auth'
import { getInterviewDetails, getQuestions } from './actions'
import VoiceInterview from '@/components/interview/VoiceInterview'

interface PageProps {
  params: Promise<{ id: string }>
}

function capitalizeFirstWord(str: string) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const PerformPage = async ({ params }: PageProps) => {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const id = (await params).id as string
  const interview = await getInterviewDetails(id)
  const det = await getQuestions(id)

  const jobTitle = interview?.jobTitle as string | undefined
  const companyName = capitalizeFirstWord(interview?.companyName ?? '')

  return (
    <main className="relative min-h-[calc(100vh-4rem)] w-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-blue-50/60 via-purple-50/40 to-transparent"
      />

      <div className="mx-auto w-full max-w-5xl px-5 py-8 lg:px-8">
        {/* ---------- header ---------- */}
        <div className="mb-6 flex flex-col gap-4">
          <Link
            href={`/interview/${id}`}
            className="flex w-fit flex-row items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            <ArrowLeft size={15} />
            Back to interview
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
                Mock{' '}
                <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                  interview
                </span>
              </h1>
              <div className="flex flex-row flex-wrap items-center gap-2">
                {jobTitle && (
                  <span className="flex flex-row items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700">
                    <Briefcase size={13} className="text-neutral-400" />
                    {jobTitle}
                  </span>
                )}
                {companyName && (
                  <span className="flex flex-row items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700">
                    <Building2 size={13} className="text-neutral-400" />
                    {companyName}
                  </span>
                )}
              </div>
            </div>

            <span className="w-fit rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1 text-xs font-semibold text-white">
              Voice mode
            </span>
          </div>
        </div>

        {/* ---------- body ---------- */}
        <div className="rounded-2xl border border-neutral-200 bg-white/70 shadow-sm backdrop-blur">
          {det !== null ? (
            <VoiceInterview
              interviewId={id}
              jobTitle={jobTitle}
              companyName={companyName}
              questionCount={det?.questions?.length}
              questions={det?.questions ?? []}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
              <span className="text-lg font-semibold text-neutral-900">
                Your interview isn&apos;t ready yet
              </span>
              <span className="max-w-sm text-sm text-neutral-500">
                We&apos;re still generating questions for this role. Check back
                in a few minutes.
              </span>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default PerformPage
