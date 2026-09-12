'use server'
import { ObjectId } from 'mongodb'
import { auth } from '@/app/auth'
import client from '@/lib/db'
import type { TranscriptTurn } from '@/lib/agoraTranscript'
import { computeDeliveryMetrics } from '@/lib/deliveryMetrics'

export type StoredResume = {
  projectContext: string[]
  workExDetails: string[]
  skills: string[]
  updatedAt?: Date
}

export type AttemptSummary = {
  interviewId: string
  jobTitle: string
  companyName: string
  skills: string[]
  createdAt: number
  overallScore: number | null
  parameterScores: Record<string, number> | null
  /** Null when the interview was text-based or predates transcript storage. */
  wpm: number | null
  fillersPerMinute: number | null
  medianThinkingSeconds: number | null
}

export type ProfileData = {
  name: string
  email: string
  credits: number
  memberSince: number | null
  hasGoogle: boolean
  resume: StoredResume | null
  attempts: AttemptSummary[]
  totalInterviews: number
  completedInterviews: number
}

/**
 * Everything the profile page needs, in three queries rather than one per
 * interview: the user, their interviews, then the question docs for those
 * interviews in a single `$in`.
 */
export async function getProfile(): Promise<ProfileData | null> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null

  const db = client.db()

  let user
  try {
    user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
  } catch {
    return null
  }
  if (!user) return null

  const interviews = await db
    .collection('interviews')
    .find({ userId })
    .sort({ createdAt: 1 })
    .toArray()

  const ids = interviews.map((i) => String(i._id))
  const questionDocs = ids.length
    ? await db
        .collection('questions')
        .find({ interviewId: { $in: ids } })
        .toArray()
    : []
  const byInterview = new Map(questionDocs.map((q) => [q.interviewId, q]))

  const attempts: AttemptSummary[] = interviews.map((interview) => {
    const doc = byInterview.get(String(interview._id))
    const extracted = doc?.extracted
    const transcript = doc?.transcript as TranscriptTurn[] | undefined

    let wpm: number | null = null
    let fillersPerMinute: number | null = null
    let medianThinkingSeconds: number | null = null

    if (Array.isArray(transcript) && transcript.length > 0) {
      const m = computeDeliveryMetrics(transcript)
      wpm = m.wordsPerMinute
      fillersPerMinute = m.fillersPerMinute
      medianThinkingSeconds = m.medianThinkingSeconds
    }

    return {
      interviewId: String(interview._id),
      jobTitle: (interview.jobTitle as string) ?? 'Interview',
      companyName: (interview.companyName as string) ?? '',
      skills: (interview.skills as string[]) ?? [],
      createdAt: Number(interview.createdAt) || 0,
      overallScore:
        typeof extracted?.overallScore === 'number'
          ? extracted.overallScore
          : null,
      parameterScores: extracted?.parameterScores ?? null,
      wpm,
      fillersPerMinute,
      medianThinkingSeconds,
    }
  })

  return {
    name: (user.name as string) ?? '',
    email: (user.email as string) ?? '',
    credits: Number(user.credits) || 0,
    memberSince: user.createdAt ? new Date(user.createdAt).getTime() : null,
    hasGoogle: Boolean(user.googleId),
    resume: (user.resume as StoredResume) ?? null,
    attempts,
    totalInterviews: interviews.length,
    completedInterviews: interviews.filter((i) => i.status === 'completed')
      .length,
  }
}

/**
 * Stores the parsed resume against the user so it can be reused.
 *
 * Previously the resume was parsed with a Gemini call on every single interview
 * creation and only ever written onto that interview — there was no such thing
 * as "my resume". Saving it here removes both the repeated upload and the
 * repeated LLM spend.
 */
export async function saveResume(resume: StoredResume) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error('Unauthorized')

  const db = client.db()
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        resume: {
          projectContext: resume.projectContext ?? [],
          workExDetails: resume.workExDetails ?? [],
          skills: resume.skills ?? [],
          updatedAt: new Date(),
        },
      },
    },
  )
  return { ok: true }
}

/** Used by the create form to pre-fill from the saved resume. */
export async function getSavedResume(): Promise<StoredResume | null> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null
  const db = client.db()
  const user = await db
    .collection('users')
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { resume: 1 } },
    )
  return (user?.resume as StoredResume) ?? null
}
