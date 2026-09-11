'use client'
import React from 'react'
import Link from 'next/link'
import Marquee from 'react-fast-marquee'
import {
  FileText,
  MessagesSquare,
  LineChart,
  ArrowRight,
  Mic,
  Building2,
  Target,
  ShieldCheck,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import InterviewPreview from './InterviewPreview'

const roles = [
  'Software Engineer',
  'Data Analyst',
  'Product Manager',
  'Backend Engineer',
  'ML Engineer',
  'DevOps Engineer',
  'Frontend Engineer',
  'Business Analyst',
  'QA Engineer',
  'Data Scientist',
]

const steps = [
  {
    icon: FileText,
    title: 'Drop in your resume and the JD',
    body: 'We parse your projects, work experience and skills, then read the job description the way a hiring manager would.',
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    icon: MessagesSquare,
    title: 'Sit through a real interview',
    body: 'Questions are generated for that exact role and company — not a generic list. Speak your answers out loud, camera on, just like the real thing.',
    accent: 'from-purple-500 to-blue-500',
  },
  {
    icon: LineChart,
    title: 'Get feedback that actually stings',
    body: 'Per-question scoring against what a strong answer looks like, plus the gaps you keep repeating. Track it across every attempt.',
    accent: 'from-red-500 to-purple-500',
  },
]

const features = [
  {
    icon: Target,
    title: 'Company-aware questions',
    body: 'An interview for a fintech backend role should not sound like one for an agency frontend role. Ours do not.',
    tint: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Mic,
    title: 'Speak, do not type',
    body: 'Answer with your voice. Interviews are won out loud, so practice should be too.',
    tint: 'bg-purple-50 text-purple-600',
  },
  {
    icon: ShieldCheck,
    title: 'Graded against a model answer',
    body: 'Every question ships with what a strong response contains, so the score means something.',
    tint: 'bg-green-50 text-green-600',
  },
  {
    icon: Clock,
    title: 'Ready in under a minute',
    body: 'Paste a job description, hit create, and your interview is waiting by the time you have made coffee.',
    tint: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Building2,
    title: 'Built for the round you have on Friday',
    body: 'Run the same role twice, three times. Watch the second attempt land better than the first.',
    tint: 'bg-rose-50 text-rose-600',
  },
  {
    icon: LineChart,
    title: 'Progress you can see',
    body: 'Scores charted across attempts, so improvement is a line and not a feeling.',
    tint: 'bg-cyan-50 text-cyan-600',
  },
]

const LandingPage = () => {
  return (
    <main className="relative w-full overflow-hidden">
      {/* ---------- ambient background ---------- */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:36px_36px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[34rem] w-[62rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-red-400/10 blur-3xl"
      />

      {/* ---------- hero ---------- */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-20 sm:pt-20 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col gap-6">
            <div className="lp-rise">
              <span className="inline-flex flex-row items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-neutral-600 shadow-sm backdrop-blur">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                </span>
                Free credits on signup — no card needed
              </span>
            </div>

            <h1
              className="lp-rise text-4xl font-extrabold leading-[1.08] tracking-tight text-neutral-900 sm:text-5xl lg:text-[3.4rem]"
              style={{ animationDelay: '90ms' }}
            >
              Practice for interviews and{' '}
              <span className="bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
                ace the real ones.
              </span>
            </h1>

            <p
              className="lp-rise max-w-xl text-[17px] leading-relaxed text-neutral-600"
              style={{ animationDelay: '180ms' }}
            >
              Upload your resume, paste the job description, and get a mock
              interview built for that specific role and company. Answer out
              loud. Get scored on what you actually said.
            </p>

            <div
              className="lp-rise flex flex-col gap-3 sm:flex-row sm:items-center"
              style={{ animationDelay: '270ms' }}
            >
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-7 text-base font-semibold shadow-lg shadow-blue-600/25 transition-transform hover:scale-[1.02] hover:from-blue-600 hover:to-purple-600"
              >
                <Link href="/signup" className="flex flex-row items-center gap-2">
                  Start a free interview
                  <ArrowRight size={17} />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-neutral-300 px-7 text-base font-medium"
              >
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>

            <div
              className="lp-rise mt-2 flex flex-row flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-500"
              style={{ animationDelay: '360ms' }}
            >
              <span className="flex flex-row items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-neutral-400" />
                Resume-aware questions
              </span>
              <span className="flex flex-row items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-neutral-400" />
                Voice answers
              </span>
              <span className="flex flex-row items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-neutral-400" />
                Scored feedback
              </span>
            </div>
          </div>

          <div className="lg:pl-4">
            <InterviewPreview />
          </div>
        </div>
      </section>

      {/* ---------- roles marquee ---------- */}
      <section className="border-y border-neutral-200 bg-neutral-50 py-5">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Interviews generated for roles like
        </p>
        <Marquee speed={38} gradient gradientColor="#fafafa" gradientWidth={80}>
          {roles.map((role) => (
            <span
              key={role}
              className="mx-3 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700"
            >
              {role}
            </span>
          ))}
        </Marquee>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 lg:px-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            How it works
          </span>
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            Three steps between you and a{' '}
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              much better Friday
            </span>
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="lp-reveal group relative flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg hover:shadow-neutral-900/5"
            >
              <div className="flex flex-row items-center justify-between">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${step.accent} text-white shadow-md`}
                >
                  <step.icon size={19} />
                </span>
                <span className="text-4xl font-extrabold text-neutral-100 transition-colors group-hover:text-neutral-200">
                  0{i + 1}
                </span>
              </div>
              <h3 className="text-lg font-bold leading-snug text-neutral-900">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-neutral-600">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section className="border-t border-neutral-200 bg-neutral-50/60">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 lg:px-8">
          <div className="flex flex-col gap-3 md:max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Why this and not a question list
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
              Generic prep gets you{' '}
              <span className="bg-gradient-to-r from-red-500 to-purple-500 bg-clip-text text-transparent">
                generic results
              </span>
            </h2>
            <p className="text-[16px] leading-relaxed text-neutral-600">
              Reading the top 50 questions for your role is not practice. Being
              asked something you did not prepare for, out loud, with a timer
              running — that is practice.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="lp-reveal flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${feature.tint}`}
                >
                  <feature.icon size={17} />
                </span>
                <h3 className="text-[15px] font-bold text-neutral-900">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-neutral-600">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- closing CTA ---------- */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-neutral-900 px-6 py-14 text-center sm:px-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-red-500/30 blur-3xl"
          />
          <div className="relative flex flex-col items-center gap-5">
            <h2 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              The interview is going to happen either way.
            </h2>
            <p className="max-w-xl text-[16px] leading-relaxed text-neutral-300">
              Might as well not do it for the first time on the day it counts.
              Your first few interviews are on us.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-2 h-12 rounded-xl bg-white px-8 text-base font-semibold text-neutral-900 shadow-lg transition-transform hover:scale-[1.02] hover:bg-neutral-100"
            >
              <Link href="/signup" className="flex flex-row items-center gap-2">
                Create your first interview
                <ArrowRight size={17} />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default LandingPage
