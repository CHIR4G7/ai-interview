import type { TranscriptTurn } from './agoraTranscript'

/**
 * Delivery metrics — *how* the candidate answered, as opposed to the graded
 * content of what they said.
 *
 * Everything here is derived from the stored transcript. Durations come from
 * speech-recognition timestamps, so they are close but not exact: a turn's span
 * is measured from its first recognised fragment to its last, which slightly
 * undercounts the tail of the final word. Treat them as estimates and label
 * them that way in the UI.
 */

/** Unambiguous disfluencies. Counting these is uncontroversial. */
export const FILLERS = ['um', 'uh', 'erm', 'er', 'ah', 'hmm', 'mmm', 'uhm']

/**
 * Crutch words. Kept separate from fillers on purpose: "like" and "actually"
 * have legitimate uses, so counting them as errors would be misleading.
 * Surfaced as "worth noticing", not as mistakes.
 */
export const CRUTCHES = [
  'like',
  'you know',
  'basically',
  'actually',
  'literally',
  'sort of',
  'kind of',
  'i mean',
  'right',
]

export type PhraseCount = { phrase: string; count: number }

export type AnswerMetric = {
  /** 1-based position in the conversation. */
  index: number
  words: number
  seconds: number
  wpm: number | null
  /** Silence between the interviewer finishing and this answer starting. */
  thinkingSeconds: number | null
  fillers: number
  crutches: number
  text: string
}

export type DeliveryMetrics = {
  answerCount: number
  totalWords: number
  speakingSeconds: number
  wordsPerMinute: number | null
  fillerCount: number
  fillersPerMinute: number | null
  fillerBreakdown: PhraseCount[]
  crutchCount: number
  crutchBreakdown: PhraseCount[]
  /** Candidate's share of total speaking time, 0–1. */
  talkRatio: number | null
  medianThinkingSeconds: number | null
  answers: AnswerMetric[]
}

function wordsIn(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/** Counts whole-word / whole-phrase occurrences, so "unlike" never matches "like". */
export function countPhrases(text: string, phrases: string[]): PhraseCount[] {
  const haystack = ` ${text.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ')} `
  const out: PhraseCount[] = []
  for (const phrase of phrases) {
    const needle = ` ${phrase} `
    let count = 0
    let from = 0
    for (;;) {
      const at = haystack.indexOf(needle, from)
      if (at === -1) break
      count += 1
      // Step by one so overlapping runs ("um um um") are all counted.
      from = at + 1
    }
    if (count > 0) out.push({ phrase, count })
  }
  return out.sort((a, b) => b.count - a.count)
}

function durationSeconds(turn: TranscriptTurn): number {
  if (turn.createdAt == null || turn.endedAt == null) return 0
  return Math.max(0, (turn.endedAt - turn.createdAt) / 1000)
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export function computeDeliveryMetrics(
  turns: TranscriptTurn[],
): DeliveryMetrics {
  const settled = turns.filter((t) => !t.live && t.text.trim().length > 0)

  const answers: AnswerMetric[] = []
  let interviewerSeconds = 0
  let lastInterviewerEnd: number | null = null

  for (const turn of settled) {
    if (turn.speaker === 'interviewer') {
      interviewerSeconds += durationSeconds(turn)
      lastInterviewerEnd = turn.endedAt ?? null
      continue
    }

    const seconds = durationSeconds(turn)
    const words = wordsIn(turn.text)
    const thinking =
      lastInterviewerEnd != null && turn.createdAt != null
        ? Math.max(0, (turn.createdAt - lastInterviewerEnd) / 1000)
        : null

    answers.push({
      index: answers.length + 1,
      words: words.length,
      seconds,
      wpm: seconds > 0 ? Math.round((words.length / seconds) * 60) : null,
      thinkingSeconds: thinking,
      fillers: countPhrases(turn.text, FILLERS).reduce((n, p) => n + p.count, 0),
      crutches: countPhrases(turn.text, CRUTCHES).reduce(
        (n, p) => n + p.count,
        0,
      ),
      text: turn.text,
    })
    // Consumed — a second answer to the same question has no new thinking gap.
    lastInterviewerEnd = null
  }

  const allCandidateText = answers.map((a) => a.text).join(' ')
  const totalWords = answers.reduce((n, a) => n + a.words, 0)
  const speakingSeconds = answers.reduce((n, a) => n + a.seconds, 0)

  const fillerBreakdown = countPhrases(allCandidateText, FILLERS)
  const crutchBreakdown = countPhrases(allCandidateText, CRUTCHES)
  const fillerCount = fillerBreakdown.reduce((n, p) => n + p.count, 0)
  const crutchCount = crutchBreakdown.reduce((n, p) => n + p.count, 0)

  const totalSpeaking = speakingSeconds + interviewerSeconds

  return {
    answerCount: answers.length,
    totalWords,
    speakingSeconds,
    wordsPerMinute:
      speakingSeconds > 0
        ? Math.round((totalWords / speakingSeconds) * 60)
        : null,
    fillerCount,
    fillersPerMinute:
      speakingSeconds > 0
        ? Number(((fillerCount / speakingSeconds) * 60).toFixed(1))
        : null,
    fillerBreakdown,
    crutchCount,
    crutchBreakdown,
    talkRatio: totalSpeaking > 0 ? speakingSeconds / totalSpeaking : null,
    medianThinkingSeconds: median(
      answers
        .map((a) => a.thinkingSeconds)
        .filter((v): v is number => v != null),
    ),
    answers,
  }
}

/** Target bands used to turn a raw number into plain-language guidance. */
export type Verdict = 'good' | 'low' | 'high'

export function paceVerdict(wpm: number | null): Verdict | null {
  if (wpm == null) return null
  if (wpm < 110) return 'low'
  if (wpm > 170) return 'high'
  return 'good'
}

export function fillerVerdict(perMinute: number | null): Verdict | null {
  if (perMinute == null) return null
  return perMinute > 4 ? 'high' : 'good'
}

export function thinkingVerdict(seconds: number | null): Verdict | null {
  if (seconds == null) return null
  if (seconds > 8) return 'high'
  return 'good'
}
