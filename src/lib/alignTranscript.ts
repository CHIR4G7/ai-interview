import type { TranscriptTurn } from './agoraTranscript'
import type { Question } from '@/types/interview'

/**
 * Maps a free-flowing voice transcript onto the stored question list.
 *
 * The feedback pipeline (inngest `generateInsights`) reads `answers[i].answer`
 * positionally against `questions[i]`, so the output MUST be the same length
 * and order as `questions` — a flat list of what the candidate said is not
 * enough.
 *
 * Strategy: the interviewer is instructed to ask the questions in order, so we
 * locate each question by matching interviewer turns against the question text,
 * then attribute every candidate turn that follows to that question. Matching
 * only ever looks forward, so a later restatement can't rewind the alignment.
 *
 * This is preferred over asking the agent to emit machine-readable markers
 * between questions: markers depend on the LLM complying every single time, and
 * a single missed marker silently shifts every subsequent answer by one.
 */

const MIN_TOKEN_LENGTH = 3
const MATCH_THRESHOLD = 0.45

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= MIN_TOKEN_LENGTH),
  )
}

/** Fraction of the question's distinctive words present in the spoken turn. */
function similarity(spokenTokens: Set<string>, questionTokens: Set<string>) {
  if (questionTokens.size === 0) return 0
  let hits = 0
  for (const token of questionTokens) {
    if (spokenTokens.has(token)) hits += 1
  }
  return hits / questionTokens.size
}

export type AlignedAnswer = { answer: string }

export function alignAnswersToQuestions(
  turns: TranscriptTurn[],
  questions: Question[],
): AlignedAnswer[] {
  const answers: string[][] = questions.map(() => [])
  const questionTokens = questions.map((q) => tokenize(q.question ?? ''))

  let currentIndex = -1
  let lastMatched = -1
  let matchedAny = false

  for (const turn of turns) {
    // Ignore the turn still being spoken — its text is incomplete.
    if (turn.live) continue

    if (turn.speaker === 'interviewer') {
      const spoken = tokenize(turn.text)
      let bestIndex = -1
      let bestScore = 0

      // Only look at questions we haven't reached yet, preserving order.
      for (let j = lastMatched + 1; j < questions.length; j++) {
        const score = similarity(spoken, questionTokens[j])
        if (score > bestScore) {
          bestScore = score
          bestIndex = j
        }
      }

      if (bestIndex !== -1 && bestScore >= MATCH_THRESHOLD) {
        currentIndex = bestIndex
        lastMatched = bestIndex
        matchedAny = true
      }
      continue
    }

    // Candidate turn: attribute to whichever question is currently open.
    // Anything said before the first question (greetings, "I'm ready") is
    // deliberately dropped.
    if (currentIndex >= 0) {
      answers[currentIndex].push(turn.text)
    }
  }

  // Fallback: if the interviewer paraphrased heavily enough that nothing
  // matched, fall back to assigning candidate turns to questions in order.
  // Worse than the matched path, but far better than submitting nothing.
  if (!matchedAny) {
    const spoken = turns.filter((t) => t.speaker === 'candidate' && !t.live)
    spoken.forEach((turn, i) => {
      if (i < answers.length) answers[i].push(turn.text)
    })
  }

  return answers.map((parts) => ({ answer: parts.join(' ').trim() }))
}

/**
 * True when the candidate actually said something worth grading.
 *
 * Deliberately stricter than "any non-empty string": a single "yes" picked up
 * before the candidate gave up is not an interview, and submitting it spends a
 * grading call on noise. Three words total is a low bar that still filters
 * accidental submissions.
 */
const MIN_TOTAL_WORDS = 3

export function hasAnyAnswer(answers: AlignedAnswer[]) {
  const totalWords = answers.reduce(
    (n, a) => n + (a.answer.trim() ? a.answer.trim().split(/\s+/).length : 0),
    0,
  )
  return totalWords >= MIN_TOTAL_WORDS
}
