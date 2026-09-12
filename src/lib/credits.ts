import { ObjectId } from 'mongodb'
import client from '@/lib/db'

/**
 * Credit accounting.
 *
 * The previous logic read the user, then wrote `credits - 1` in a separate
 * call. Two concurrent creates both read the same value and both wrote the same
 * decrement, so one interview was free. Worse, the interview was inserted
 * *before* the balance was checked, and `if (user.credits)` is falsy at 0 — so
 * a user with no credits got an interview every time and simply skipped the
 * decrement.
 *
 * Everything here goes through a single conditional update instead: the filter
 * carries the balance requirement, so the check and the decrement cannot be
 * separated by another request.
 */

export const STARTING_CREDITS = 3

export type SpendResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: 'no-credits' | 'no-user' }

/**
 * Atomically takes one credit. Returns `no-credits` without modifying anything
 * when the balance is already zero.
 */
export async function spendCredit(userId: string): Promise<SpendResult> {
  let objectId: ObjectId
  try {
    objectId = new ObjectId(userId)
  } catch {
    return { ok: false, reason: 'no-user' }
  }

  const db = client.db()

  // `credits: { $gt: 0 }` is the guard. If it does not match, nothing is
  // written and we know the balance was exhausted.
  const updated = await db.collection('users').findOneAndUpdate(
    { _id: objectId, credits: { $gt: 0 } },
    { $inc: { credits: -1 } },
    { returnDocument: 'after' },
  )

  if (updated) {
    return { ok: true, remaining: Number(updated.credits) || 0 }
  }

  const exists = await db.collection('users').findOne(
    { _id: objectId },
    { projection: { _id: 1 } },
  )
  return { ok: false, reason: exists ? 'no-credits' : 'no-user' }
}

/**
 * Gives a credit back. Used when the work a credit paid for could not be
 * created, so a failed request never silently costs the user.
 */
export async function refundCredit(userId: string): Promise<void> {
  try {
    await client
      .db()
      .collection('users')
      .updateOne({ _id: new ObjectId(userId) }, { $inc: { credits: 1 } })
  } catch (err) {
    console.error('Failed to refund credit for', userId, err)
  }
}

export async function getCredits(userId: string): Promise<number> {
  try {
    const user = await client
      .db()
      .collection('users')
      .findOne({ _id: new ObjectId(userId) }, { projection: { credits: 1 } })
    return Number(user?.credits) || 0
  } catch {
    return 0
  }
}
