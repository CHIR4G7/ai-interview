/**
 * Guards around the grading LLM's output.
 *
 * The model is asked for 0–10 scores but nothing stopped it returning 15, and
 * whatever it returned was written straight to Mongo and rendered as "15/10".
 * Model output is untrusted input: clamp it here rather than hoping the prompt
 * holds.
 */

export const PARAMETER_KEYS = [
  'depthOfKnowledge',
  'impactOrientedMindset',
  'architecturalFlexibility',
  'problemSolvingAndDebuggingSkills',
  'collaborationAndCommunication',
] as const

export type ParameterScores = Record<(typeof PARAMETER_KEYS)[number], number>

export type Insights = {
  overallScore: number
  parameterScores: ParameterScores
  adviceForImprovement: { question: string; advice: string }[]
  perQuestionScores: { question: string; score: number }[]
  overallVerdict: string
}

/** Coerces anything to a number in [0, 10]. Non-numbers become 0. */
export function clampScore(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10))
}

/** True when the candidate did not meaningfully answer. */
export function isBlankAnswer(answer: unknown): boolean {
  return typeof answer !== 'string' || answer.trim().length === 0
}

export type QnA = { question: string; expectedAnswer: string; answer: string }

/**
 * Builds the grading payload.
 *
 * Driven by `questions`, not `answers` — the old code looped over
 * `answers.length`, so a shorter answers array silently dropped questions and a
 * missing one threw.
 *
 * Unanswered questions are sent with an explicit sentinel rather than an empty
 * string. An empty `answer` sitting next to a fully written `expectedAnswer`
 * invites the model to grade the expected answer instead of the candidate's.
 */
export const NO_ANSWER = '[NO ANSWER GIVEN — the candidate did not respond]'

export function buildQnA(
  questions: { question?: string; expectedAnswer?: string }[] = [],
  answers: { answer?: string }[] = [],
): QnA[] {
  return (questions ?? []).map((q, i) => {
    const raw = answers?.[i]?.answer
    return {
      question: q?.question ?? '',
      expectedAnswer: q?.expectedAnswer ?? '',
      answer: isBlankAnswer(raw) ? NO_ANSWER : (raw as string).trim(),
    }
  })
}

export function answeredCount(qna: QnA[]): number {
  return qna.filter((q) => q.answer !== NO_ANSWER).length
}

/**
 * Forces the model's response into the documented shape and range.
 * Anything missing or out of range is replaced rather than trusted.
 */
export function sanitizeInsights(raw: unknown, qna: QnA[]): Insights {
  const obj = (raw ?? {}) as Record<string, unknown>

  const parameterScores = {} as ParameterScores
  const rawParams = (obj.parameterScores ?? {}) as Record<string, unknown>
  for (const key of PARAMETER_KEYS) {
    parameterScores[key] = clampScore(rawParams[key])
  }

  // Align per-question scores to the questions we actually asked, and force an
  // unanswered question to 0 no matter what the model said about it.
  const rawPerQuestion = Array.isArray(obj.perQuestionScores)
    ? (obj.perQuestionScores as Record<string, unknown>[])
    : []
  const perQuestionScores = qna.map((q, i) => ({
    question: q.question,
    score:
      q.answer === NO_ANSWER ? 0 : clampScore(rawPerQuestion[i]?.score),
  }))

  const rawAdvice = Array.isArray(obj.adviceForImprovement)
    ? (obj.adviceForImprovement as Record<string, unknown>[])
    : []
  const adviceForImprovement = qna.map((q, i) => ({
    question: q.question,
    advice:
      q.answer === NO_ANSWER
        ? 'You did not answer this question. Even a short, structured attempt scores better than silence.'
        : typeof rawAdvice[i]?.advice === 'string'
          ? (rawAdvice[i].advice as string)
          : '',
  }))

  // If nothing was answered the overall score cannot be anything but zero,
  // whatever the model claims.
  const answered = answeredCount(qna)
  const overallScore =
    answered === 0 ? 0 : clampScore(obj.overallScore)

  const overallVerdict =
    answered === 0
      ? 'No answers were recorded for this interview, so there is nothing to score. Retake it and speak your answers out loud.'
      : typeof obj.overallVerdict === 'string'
        ? obj.overallVerdict
        : ''

  return {
    overallScore,
    parameterScores:
      answered === 0
        ? (Object.fromEntries(
            PARAMETER_KEYS.map((k) => [k, 0]),
          ) as ParameterScores)
        : parameterScores,
    adviceForImprovement,
    perQuestionScores,
    overallVerdict,
  }
}
