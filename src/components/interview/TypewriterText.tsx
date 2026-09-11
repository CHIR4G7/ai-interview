'use client'
import React, { useEffect, useRef, useState } from 'react'

/**
 * Reveals transcript text progressively.
 *
 * Two properties matter for a live transcript, as opposed to a decorative
 * typewriter:
 *
 * 1. It never restarts. Text grows as speech is recognised, so the reveal
 *    continues from where it was rather than replaying from the first character
 *    every time a word lands.
 * 2. It catches up. If the backlog grows (a long answer arriving at once), the
 *    reveal speeds up instead of falling further and further behind what was
 *    actually said.
 */
const BASE_CHARS_PER_TICK = 2
const TICK_MS = 16

const TypewriterText = ({
  text,
  enabled = true,
}: {
  text: string
  enabled?: boolean
}) => {
  const [revealed, setRevealed] = useState(enabled ? 0 : text.length)
  const frameRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!enabled) {
      setRevealed(text.length)
      return
    }
    if (typeof window !== 'undefined') {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) {
        setRevealed(text.length)
        return
      }
    }

    frameRef.current = setInterval(() => {
      setRevealed((current) => {
        if (current >= text.length) return current
        const backlog = text.length - current
        // Scale with backlog so a burst of text doesn't lag behind the speaker.
        const step = Math.max(
          BASE_CHARS_PER_TICK,
          Math.ceil(backlog / 18),
        )
        return Math.min(text.length, current + step)
      })
    }, TICK_MS)

    return () => {
      if (frameRef.current) clearInterval(frameRef.current)
      frameRef.current = null
    }
  }, [text, enabled])

  // If the text shrank (a correction from the recogniser), don't show a stale
  // longer prefix.
  const safeRevealed = Math.min(revealed, text.length)

  return (
    <>
      {text.slice(0, safeRevealed)}
      {safeRevealed < text.length && (
        <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-current opacity-60" />
      )}
    </>
  )
}

export default TypewriterText
