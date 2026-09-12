import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, FileText, MessagesSquare, LineChart, Coins } from 'lucide-react'
import { auth } from '../auth'
import { getCredits } from '@/lib/credits'
import { Button } from '@/components/ui/button'
import Createform from './form'

const steps = [
  {
    icon: FileText,
    title: 'Describe the role',
    body: 'Paste the job description and add the skills it calls for. Upload your resume and we fill most of this in for you.',
  },
  {
    icon: MessagesSquare,
    title: 'We write the questions',
    body: 'Generated for this specific company and role using your projects and work history — not a generic list.',
  },
  {
    icon: LineChart,
    title: 'Take it out loud',
    body: 'A voice interviewer asks them one at a time, then scores your answers and how you delivered them.',
  },
]

const CreatePage = async () => {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) redirect('/login')

  // Read the live balance rather than trusting the session, which can be stale.
  const credits = await getCredits(userId)

  return (
    <main className="relative w-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-blue-50/70 via-purple-50/40 to-transparent"
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-10 lg:px-8">
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="flex w-fit flex-row items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            <ArrowLeft size={15} />
            Back to interviews
          </Link>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
              Create a new{' '}
              <span className="bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
                interview
              </span>
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-neutral-600">
              Tell us about the role and we will build an interview around it.
              This uses one credit.
            </p>
          </div>
        </div>

        {credits <= 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Coins size={22} />
            </span>
            <div className="flex flex-col gap-1.5">
              <span className="text-lg font-bold text-amber-900">
                You are out of interview credits
              </span>
              <span className="max-w-md text-sm leading-relaxed text-amber-800">
                Each interview uses one credit. You have used all of yours, so
                new interviews are paused for now — your past interviews and
                feedback are all still available.
              </span>
            </div>
            <div className="mt-1 flex flex-row gap-2">
              <Button asChild variant="outline">
                <Link href="/">Back to interviews</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/profile">View your profile</Link>
              </Button>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-row items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              <Coins size={14} className="text-amber-500" />
              <span>
                <strong className="text-neutral-900">{credits}</strong> credit
                {credits === 1 ? '' : 's'} left. This interview uses one.
              </span>
            </div>
            <Createform />
          </div>

          <aside className="flex h-fit flex-col gap-3 lg:sticky lg:top-24">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white/70 p-4 backdrop-blur"
              >
                <div className="flex flex-row items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                    <step.icon size={15} />
                  </span>
                  <span className="text-sm font-bold text-neutral-900">
                    {i + 1}. {step.title}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-neutral-500">
                  {step.body}
                </p>
              </div>
            ))}
          </aside>
        </div>
        )}
      </div>
    </main>
  )
}

export default CreatePage
