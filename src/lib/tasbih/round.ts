import type { DhikrSequenceStep } from "@/types"

/**
 * Round bookkeeping for the tasbih counter, kept out of React so the rollover
 * and sequence rules can be tested directly (see round.test.ts). The store in
 * hooks/useTasbih.ts holds this shape and calls these functions.
 */
export interface RoundState {
  activeId: string
  /** Count the current round runs to. */
  target: number
  /** Progress inside the current round, always 0 ≤ count < target. */
  count: number
  /** Completed rounds, per dhikr id. */
  rounds: Record<string, number>
  /** Every tap ever, per dhikr id. */
  lifetime: Record<string, number>
  /** Taps since this visit started; deliberately not persisted. */
  sessionTotal: number
  /** When on, finishing a round moves to the next leg of the sequence. */
  sequenceMode: boolean
}

export interface AdvanceResult {
  state: RoundState
  /** The target just completed, or null while the round is still open. */
  completed: number | null
}

/** A target of 0 or less would make every tap "complete" a round forever. */
function safeTarget(target: number): number {
  return Number.isFinite(target) && target >= 1 ? Math.floor(target) : 1
}

function bump(counts: Record<string, number>, id: string, by: number): Record<string, number> {
  return { ...counts, [id]: Math.max(0, (counts[id] ?? 0) + by) }
}

/**
 * Count one. When the tap fills the round, the round counter goes up, the count
 * returns to 0, and — in sequence mode — the active dhikr moves to the next leg.
 */
export function advance(state: RoundState, sequence: DhikrSequenceStep[]): AdvanceResult {
  const target = safeTarget(state.target)
  const next = state.count + 1

  const counted: RoundState = {
    ...state,
    target,
    count: next,
    lifetime: bump(state.lifetime, state.activeId, 1),
    sessionTotal: state.sessionTotal + 1,
  }

  if (next < target) return { state: counted, completed: null }

  const finished: RoundState = {
    ...counted,
    count: 0,
    rounds: bump(state.rounds, state.activeId, 1),
  }

  if (!state.sequenceMode || sequence.length === 0) {
    return { state: finished, completed: target }
  }

  // An active dhikr outside the sequence (the reader picked one by hand and then
  // switched sequence mode on) enters at the first leg rather than being skipped.
  const current = sequence.findIndex((step) => step.id === state.activeId)
  const step = sequence[(current + 1) % sequence.length]

  return {
    state: { ...finished, activeId: step.id, target: safeTarget(step.target) },
    completed: target,
  }
}

/**
 * Take one back. A finished round is not reopened: at count 0 this is a no-op,
 * so undo can never un-count a round or reach back into the previous dhikr.
 */
export function undo(state: RoundState): RoundState {
  if (state.count <= 0) return state
  return {
    ...state,
    count: state.count - 1,
    lifetime: bump(state.lifetime, state.activeId, -1),
    sessionTotal: Math.max(0, state.sessionTotal - 1),
  }
}
