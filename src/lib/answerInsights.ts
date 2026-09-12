import type { TranscriptTurn } from './agoraTranscript'

/**
 * Content-side insights, derived entirely from data already in Mongo:
 * the generated `expectedAnswer`, the candidate's `answer`, the stored
 * `jobDesc`, and the resume-derived `projectContext` / `workExDetails`.
 *
 * None of this needs an extra LLM call — it is term overlap, which is
 * transparent and cheap. The trade-off is that it matches wording rather than
 * meaning: a candidate who explains a concept in entirely different words reads
 * as a miss. Labelled in the UI as "mentioned", never as "understood".
 */

const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','than','that','this','these','those',
  'is','are','was','were','be','been','being','am','do','does','did','doing',
  'have','has','had','having','will','would','should','could','can','may','might',
  'for','of','to','in','on','at','by','with','from','as','it','its','you','your',
  'we','our','they','their','he','she','his','her','i','me','my','us','them',
  'not','no','yes','so','such','very','more','most','some','any','all','each',
  'about','into','over','under','also','just','only','how','what','when','where',
  'which','who','whom','why','there','here','been','because','while','after',
  'before','between','through','during','up','down','out','off','again','further',
  'use','using','used','make','makes','made','get','gets','got','like','well',
  'good','great','really','much','many','one','two','lot','thing','things','way',
  // Job-description and resume boilerplate. Without these, coverage reports get
  // dominated by filler like "requires" and "experience" instead of real skills.
  'require','requires','required','requirements','experience','experienced',
  'years','year','ability','able','strong','familiar','familiarity','preferred',
  'plus','responsibilities','responsible','role','candidate','candidates','work',
  'working','team','teams','skills','knowledge','understanding','including',
  'etc','ideal','looking','join','help','build','building','develop','developing',
  'across','within','ensure','ensuring','support','various','related','proven',
  'excellent','solid','deep','hands',
])

const MIN_TERM_LENGTH = 4

/** Distinctive terms from a block of text, lowercased and de-duplicated. */
export function keyTerms(text: string, limit = 40): string[] {
  const counts = new Map<string, number>()
  for (const word of text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)) {
    const term = word.replace(/^[.\-]+|[.\-]+$/g, '')
    if (term.length < MIN_TERM_LENGTH) continue
    if (STOPWORDS.has(term)) continue
    counts.set(term, (counts.get(term) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term)
}

function mentions(haystack: string, term: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(haystack)
}

export type Coverage = {
  covered: string[]
  missed: string[]
  /** 0–1 share of expected terms that appeared. */
  ratio: number
}

/** Which distinctive terms from `expected` show up in `actual`. */
export function coverage(expected: string, actual: string): Coverage {
  const terms = keyTerms(expected, 12)
  const covered: string[] = []
  const missed: string[] = []
  for (const term of terms) {
    if (mentions(actual, term)) covered.push(term)
    else missed.push(term)
  }
  return {
    covered,
    missed,
    ratio: terms.length === 0 ? 0 : covered.length / terms.length,
  }
}

export type QuestionCoverage = Coverage & {
  index: number
  question: string
}

export function perQuestionCoverage(
  questions: { question: string; expectedAnswer: string }[],
  answers: { answer: string }[],
): QuestionCoverage[] {
  return questions.map((q, i) => ({
    index: i + 1,
    question: q.question,
    ...coverage(q.expectedAnswer ?? '', answers[i]?.answer ?? ''),
  }))
}

/** Terms from the job description that the candidate actually said. */
export function jobDescriptionCoverage(
  jobDesc: string,
  allAnswers: string,
): Coverage {
  const terms = keyTerms(jobDesc, 20)
  const covered = terms.filter((t) => mentions(allAnswers, t))
  const missed = terms.filter((t) => !mentions(allAnswers, t))
  return {
    covered,
    missed,
    ratio: terms.length === 0 ? 0 : covered.length / terms.length,
  }
}

export type ResumeItem = {
  label: string
  mentioned: boolean
  matchedTerms: string[]
}

/**
 * Did the candidate actually draw on their own resume?
 *
 * An item counts as referenced when at least two of its distinctive terms
 * appear — one is too easily a coincidence ("service", "data").
 */
export function resumeUtilisation(
  items: string[],
  allAnswers: string,
): ResumeItem[] {
  return (items ?? [])
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .map((item) => {
      const terms = keyTerms(item, 8)
      const matchedTerms = terms.filter((t) => mentions(allAnswers, t))
      return {
        label: item.length > 110 ? `${item.slice(0, 110)}…` : item,
        mentioned: matchedTerms.length >= 2,
        matchedTerms,
      }
    })
}

export type AnswerHealth = {
  index: number
  question: string
  words: number
  status: 'skipped' | 'thin' | 'ok'
}

const THIN_WORD_THRESHOLD = 25

export function answerHealth(
  questions: { question: string }[],
  answers: { answer: string }[],
): AnswerHealth[] {
  return questions.map((q, i) => {
    const text = (answers[i]?.answer ?? '').trim()
    const words = text ? text.split(/\s+/).length : 0
    return {
      index: i + 1,
      question: q.question,
      words,
      status: words === 0 ? 'skipped' : words < THIN_WORD_THRESHOLD ? 'thin' : 'ok',
    }
  })
}

export function interruptionCount(transcript?: TranscriptTurn[]): number {
  if (!transcript) return 0
  return transcript.filter((t) => t.interrupted).length
}
