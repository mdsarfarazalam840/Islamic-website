/**
 * How many beads to draw for a target, and what each one is worth.
 *
 * A real tasbih has 33 or 99 beads; on screen anything past ~34 dots stops being
 * countable and starts being noise, so longer targets are drawn as a strand where
 * one bead stands for several counts. A bead count that divides the target evenly
 * is preferred so "1 bead = 4" is exact rather than approximate.
 */
const MAX_BEADS = 34
const MIN_GROUPED_BEADS = 10

export interface BeadLayout {
  beads: number
  /** Counts represented by one bead. */
  per: number
}

export function beadLayout(target: number): BeadLayout {
  const total = Number.isFinite(target) ? Math.max(1, Math.floor(target)) : 1
  if (total <= MAX_BEADS) return { beads: total, per: 1 }

  for (let beads = MAX_BEADS; beads >= MIN_GROUPED_BEADS; beads--) {
    if (total % beads === 0) return { beads, per: total / beads }
  }

  // Prime-ish target (e.g. 47): no exact split exists, so round the bead value up
  // and drop whichever beads that makes redundant.
  const per = Math.ceil(total / MAX_BEADS)
  return { beads: Math.ceil(total / per), per }
}

/** How full bead `index` is, 0 to 1, at the given count. */
export function beadFill(index: number, count: number, per: number): number {
  const filled = count / per - index
  return Math.min(1, Math.max(0, filled))
}
