'use client'
import React, { useEffect, useState } from 'react'
import { Mic, Sparkles, CircleCheck } from 'lucide-react'

const BARS = [0.35, 0.7, 0.45, 0.95, 0.6, 0.85, 0.4, 0.75, 0.5, 0.9, 0.3, 0.65]

const ANSWER =
  'I led the migration of our payments service to a queue-based architecture, which cut checkout timeouts by about 40%.'

/**
 * A non-interactive mock of the live interview screen, used as the hero visual.
 * Purely decorative — it types out a canned answer on a loop.
 */
const InterviewPreview = () => {
  const [count, setCount] = useState(ANSWER.length)

  useEffect(() => {
    // Respect reduced-motion by leaving the full sentence in place.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    setCount(0)
    let i = 0
    const id = setInterval(() => {
      i = i >= ANSWER.length ? 0 : i + 1
      setCount(i)
    }, 45)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative">
      {/* soft gradient glow behind the card */}
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-blue-500/20 via-purple-500/20 to-red-500/10 blur-2xl" />

      <div
        className="lp-rise rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-xl shadow-neutral-900/5 backdrop-blur"
        style={{ animationDelay: '150ms' }}
      >
        <div className="flex flex-row items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex flex-row items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <span className="text-xs font-medium text-neutral-500">
            Backend Engineer · Round 2
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Question 3 of 8
            </span>
            <p className="mt-1.5 text-[15px] font-medium leading-snug text-neutral-800">
              Tell me about a system you scaled under real production pressure.
              What broke first?
            </p>
          </div>

          <div className="rounded-xl bg-neutral-50 p-3.5">
            <p className="min-h-[3.5rem] text-sm leading-relaxed text-neutral-600">
              {ANSWER.slice(0, count)}
              <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-blue-500" />
            </p>
          </div>

          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md shadow-blue-500/30">
                <Mic size={16} />
              </span>
              <div className="flex h-8 flex-row items-end gap-[3px]">
                {BARS.map((h, i) => (
                  <span
                    key={i}
                    className="lp-bar w-[3px] rounded-full bg-gradient-to-t from-blue-500 to-purple-500"
                    style={{
                      height: `${h * 100}%`,
                      animationDuration: `${0.9 + (i % 4) * 0.18}s`,
                      animationDelay: `${(i % 5) * 0.12}s`,
                    }}
                  />
                ))}
              </div>
            </div>
            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
              Listening
            </span>
          </div>
        </div>
      </div>

      {/* floating feedback chip */}
      <div
        className="lp-rise-left absolute -bottom-10 left-1 hidden lg:-left-10 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg sm:block"
        style={{ animationDelay: '550ms' }}
      >
        <div className="flex flex-row items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <Sparkles size={15} />
          </span>
          <div className="flex flex-col">
            <span className="text-xs text-neutral-500">Overall score</span>
            <span className="text-sm font-bold text-neutral-900">
              82<span className="text-neutral-400">/100</span>
            </span>
          </div>
        </div>
      </div>

      <div
        className="lp-rise-right absolute -top-5 -right-4 hidden rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-lg sm:flex"
        style={{ animationDelay: '700ms' }}
      >
        <div className="flex flex-row items-center gap-2">
          <CircleCheck size={15} className="text-green-600" />
          <span className="text-xs font-medium text-neutral-700">
            Tailored to your resume
          </span>
        </div>
      </div>
    </div>
  )
}

export default InterviewPreview
