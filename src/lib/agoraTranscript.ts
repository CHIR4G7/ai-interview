import {
  TurnStatus,
  type AgentTranscription,
  type TranscriptHelperItem,
  type UserTranscription,
} from 'agora-agent-client-toolkit'

export type TranscriptItem = TranscriptHelperItem<
  Partial<UserTranscription | AgentTranscription>
>

export type TranscriptTurn = {
  key: string
  turnId: number
  /** Who spoke: the candidate or the AI interviewer. */
  speaker: 'candidate' | 'interviewer'
  text: string
  createdAt?: number
  interrupted: boolean
  /** Still being spoken — rendered as a live, dimmed bubble. */
  live: boolean
}

/** The toolkit's sentinel uid for the local speaker (SELF_USER_ID = 0). */
const SELF_UID = '0'

/**
 * Some ASR/TTS providers emit punctuation with no trailing space
 * (e.g. "Hello.World"), which reads badly and confuses answer grading.
 */
export function normalizeTranscriptSpacing(text: string): string {
  return text
    .replace(/([.!?])([A-Za-z])/g, '$1 $2')
    .replace(/,([A-Za-z])/g, ', $1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Agora timestamps arrive in seconds from some RTM payloads and milliseconds
 * from RTC events. Anything past 1e12 is already milliseconds.
 */
export function normalizeTimestampMs(timestamp: number): number {
  return timestamp > 1e12 ? timestamp : timestamp * 1000
}

/**
 * Decide who spoke.
 *
 * `metadata.object` is authoritative — the toolkit copies the raw message type
 * ('user.transcription' / 'assistant.transcription') onto every item. We prefer
 * it over uid comparison because the uid path is fragile: the toolkit rewrites
 * local speech to the sentinel uid "0", and whether that arrives as the string
 * "0" or the number 0 varies by render mode.
 */
function resolveSpeaker(item: TranscriptItem): 'candidate' | 'interviewer' {
  const object = item.metadata?.object
  if (object === 'user.transcription') return 'candidate'
  if (object === 'assistant.transcription') return 'interviewer'
  // Fall back to the uid sentinel, compared loosely so a numeric 0 still matches.
  return String(item.uid) === SELF_UID ? 'candidate' : 'interviewer'
}

/**
 * Whether this turn is still in progress.
 *
 * User transcription items carry `final` rather than `turn_status`, so the
 * toolkit leaves `status` undefined on them. Treating undefined as "in
 * progress" would hide every candidate answer; we key off `final` instead and
 * only fall back to `status` for agent turns.
 */
function isLive(item: TranscriptItem): boolean {
  const meta = item.metadata
  if (meta && 'final' in meta && typeof meta.final === 'boolean') {
    return !meta.final
  }
  return item.status === TurnStatus.IN_PROGRESS
}

/**
 * Normalises punctuation. Speaker resolution no longer depends on uid, so we
 * deliberately do not rewrite uids here any more.
 */
export function normalizeTranscript(transcript: TranscriptItem[]): TranscriptItem[] {
  return transcript.map((item) => ({
    ...item,
    text:
      typeof item.text === 'string'
        ? normalizeTranscriptSpacing(item.text)
        : item.text,
  }))
}

/**
 * The full conversation in order, including the turn currently being spoken.
 *
 * Everything is returned in one list rather than splitting settled turns from
 * an in-progress one: with two speakers, both can have a live turn at the same
 * time, and picking a single "current" item silently drops the other.
 */
export function toTurns(transcript: TranscriptItem[]): TranscriptTurn[] {
  return transcript
    .map((item) => {
      const speaker = resolveSpeaker(item)
      return {
        key: `${speaker}-${item.turn_id}-${item.stream_id ?? 0}`,
        turnId: item.turn_id,
        speaker,
        text: typeof item.text === 'string' ? item.text : '',
        createdAt:
          typeof item._time === 'number'
            ? normalizeTimestampMs(item._time)
            : undefined,
        interrupted: item.status === TurnStatus.INTERRUPTED,
        live: isLive(item),
      }
    })
    .filter((turn) => turn.text.trim().length > 0)
    .sort((a, b) => {
      if (a.turnId !== b.turnId) return a.turnId - b.turnId
      // Within a turn the candidate speaks before the interviewer replies.
      if (a.speaker === b.speaker) return 0
      return a.speaker === 'candidate' ? -1 : 1
    })
}

/** Settled candidate answers, oldest first — what gets graded. */
export function candidateAnswers(turns: TranscriptTurn[]): string[] {
  return turns
    .filter((t) => t.speaker === 'candidate' && !t.live)
    .map((t) => t.text)
}
