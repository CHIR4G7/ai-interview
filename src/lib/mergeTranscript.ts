import type { TranscriptTurn } from './agoraTranscript'

/** A finalised (or in-flight) chunk from the browser's SpeechRecognition. */
export type LocalSegment = {
  id: string
  text: string
  /** Wall-clock ms when this chunk was produced — used to interleave. */
  at: number
  final: boolean
}

/** An agent turn stamped with when we first observed it. */
export type StampedTurn = TranscriptTurn & { at: number }

export type MergeOptions = {
  useLocalForCandidate: boolean
  /**
   * Wall-clock times at which the interviewer started speaking.
   *
   * Agora exposes turn-level signals (`turn_id`, AGENT_TURN_FINISHED, speaking
   * state) but nothing question-level, so these transitions are the best
   * available marker for "a new question was asked". Everything the candidate
   * says after a boundary belongs to a new answer block.
   */
  boundaries?: number[]
  /**
   * Fallback split. If the agent's speaking events never arrive, a long pause
   * still starts a new block rather than growing one block forever.
   */
  maxGapMs?: number
}

const DEFAULT_MAX_GAP_MS = 6000

/** How many interviewer turns have begun before this moment. */
function epochFor(at: number, boundaries: number[]) {
  let count = 0
  for (const boundary of boundaries) {
    if (boundary <= at) count += 1
  }
  return count
}

type Grouped = StampedTurn & { groupKey: string }

/**
 * Combines the two transcript sources into one ordered conversation, split into
 * one block per answer.
 *
 * The interviewer's words can only come from Agora. The candidate's words come
 * from the browser's local SpeechRecognition, which is more reliable here and
 * needs no round trip. When local speech drives the candidate side we drop
 * Agora's candidate turns, otherwise the same sentence renders twice.
 */
export function mergeTranscript(
  agentTurns: StampedTurn[],
  localSegments: LocalSegment[],
  {
    useLocalForCandidate,
    boundaries = [],
    maxGapMs = DEFAULT_MAX_GAP_MS,
  }: MergeOptions,
): TranscriptTurn[] {
  // Interviewer turns group by Agora's own turn_id — a new turn_id is a new
  // question, so consecutive turns never bleed into one another.
  const interviewer: Grouped[] = agentTurns
    .filter((t) => t.speaker === 'interviewer')
    .map((t) => ({ ...t, groupKey: `i-${t.turnId}` }))

  let candidate: Grouped[]

  if (useLocalForCandidate) {
    let gapGroup = 0
    let previousAt: number | null = null
    candidate = localSegments.map((seg) => {
      if (previousAt !== null && seg.at - previousAt > maxGapMs) gapGroup += 1
      previousAt = seg.at
      return {
        key: `local-${seg.id}`,
        turnId: epochFor(seg.at, boundaries),
        speaker: 'candidate' as const,
        text: seg.text,
        createdAt: seg.at,
        interrupted: false,
        live: !seg.final,
        at: seg.at,
        groupKey: `c-${epochFor(seg.at, boundaries)}-${gapGroup}`,
      }
    })
  } else {
    candidate = agentTurns
      .filter((t) => t.speaker === 'candidate')
      .map((t) => ({ ...t, groupKey: `c-${t.turnId}` }))
  }

  const ordered = [...interviewer, ...candidate].sort((a, b) => a.at - b.at)

  // Coalesce only within a group, so one answer is one block and the next
  // question starts a fresh one.
  const merged: (TranscriptTurn & { groupKey: string })[] = []
  for (const turn of ordered) {
    const previous = merged[merged.length - 1]
    if (previous && previous.groupKey === turn.groupKey) {
      previous.text = `${previous.text} ${turn.text}`.replace(/\s+/g, ' ').trim()
      previous.live = turn.live
      previous.interrupted = previous.interrupted || turn.interrupted
      continue
    }
    merged.push({
      key: turn.key,
      turnId: turn.turnId,
      speaker: turn.speaker,
      text: turn.text,
      createdAt: turn.createdAt,
      interrupted: turn.interrupted,
      live: turn.live,
      groupKey: turn.groupKey,
    })
  }

  return merged
    .filter((t) => t.text.trim().length > 0)
    .map(({ groupKey, ...turn }) => turn)
}
