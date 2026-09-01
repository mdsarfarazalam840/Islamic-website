import assert from "node:assert/strict"
import test from "node:test"
import type { DhikrSequenceStep } from "@/types"
import { advance, undo, type RoundState } from "@/lib/tasbih/round"
import { TASBIH_FATIMAH_SEQUENCE } from "@/lib/tasbih/dhikr"

function state(extra: Partial<RoundState> = {}): RoundState {
  return {
    activeId: "subhanallah",
    target: 33,
    count: 0,
    rounds: {},
    lifetime: {},
    sessionTotal: 0,
    sequenceMode: false,
    ...extra,
  }
}

/** Tap `times` times, threading the state through. */
function tap(from: RoundState, times: number, sequence: DhikrSequenceStep[] = []): RoundState {
  let current = from
  for (let i = 0; i < times; i++) current = advance(current, sequence).state
  return current
}

test("advance counts up without completing a round", () => {
  const { state: next, completed } = advance(state(), [])
  assert.equal(next.count, 1)
  assert.equal(completed, null)
  assert.equal(next.lifetime.subhanallah, 1)
  assert.equal(next.sessionTotal, 1)
  assert.deepEqual(next.rounds, {})
})

test("advance rolls the count over and banks the round at the target", () => {
  const { state: next, completed } = advance(state({ count: 32 }), [])
  assert.equal(completed, 33)
  assert.equal(next.count, 0)
  assert.equal(next.rounds.subhanallah, 1)
  // The 33rd tap still counts toward the lifetime total even though count resets.
  assert.equal(next.lifetime.subhanallah, 1)
})

test("lifetime and session totals accumulate across rounds", () => {
  const after = tap(state(), 34)
  assert.equal(after.count, 1)
  assert.equal(after.rounds.subhanallah, 1)
  assert.equal(after.lifetime.subhanallah, 34)
  assert.equal(after.sessionTotal, 34)
})

test("sequence mode walks 33 / 33 / 34 and wraps", () => {
  const seq = TASBIH_FATIMAH_SEQUENCE
  let current = state({ sequenceMode: true })

  current = tap(current, 33, seq)
  assert.equal(current.activeId, "alhamdulillah")
  assert.equal(current.target, 33)

  current = tap(current, 33, seq)
  assert.equal(current.activeId, "allahu-akbar")
  assert.equal(current.target, 34)

  current = tap(current, 34, seq)
  assert.equal(current.activeId, "subhanallah")
  assert.equal(current.target, 33)
  assert.equal(current.sessionTotal, 100)
  assert.deepEqual(current.rounds, { subhanallah: 1, alhamdulillah: 1, "allahu-akbar": 1 })
})

test("sequence mode enters at the first leg from a dhikr outside the sequence", () => {
  const { state: next } = advance(
    state({ activeId: "istighfar", target: 1, sequenceMode: true }),
    TASBIH_FATIMAH_SEQUENCE,
  )
  assert.equal(next.activeId, "subhanallah")
  assert.equal(next.target, 33)
})

test("sequence mode is inert without a sequence", () => {
  const { state: next } = advance(state({ target: 1, sequenceMode: true }), [])
  assert.equal(next.activeId, "subhanallah")
  assert.equal(next.count, 0)
  assert.equal(next.rounds.subhanallah, 1)
})

// A target of 0 would make the round "complete" on every tap and spin the round
// counter forever, so it is clamped to 1 rather than trusted.
test("advance clamps a non-positive target to one", () => {
  const { state: next, completed } = advance(state({ target: 0 }), [])
  assert.equal(completed, 1)
  assert.equal(next.target, 1)
  assert.equal(next.rounds.subhanallah, 1)
})

test("undo steps the count and totals back", () => {
  const next = undo(state({ count: 5, lifetime: { subhanallah: 5 }, sessionTotal: 5 }))
  assert.equal(next.count, 4)
  assert.equal(next.lifetime.subhanallah, 4)
  assert.equal(next.sessionTotal, 4)
})

test("undo at zero is a no-op and never reopens a banked round", () => {
  const banked = state({ count: 0, rounds: { subhanallah: 1 }, lifetime: { subhanallah: 33 }, sessionTotal: 33 })
  const next = undo(banked)
  assert.equal(next.count, 0)
  assert.equal(next.rounds.subhanallah, 1)
  assert.equal(next.lifetime.subhanallah, 33)
  assert.equal(next.sessionTotal, 33)
})

// Guards the Math.max floor: a lifetime total out of step with the round count
// (older persisted state, or a cleared total) must not go negative.
test("undo floors the lifetime total at zero", () => {
  const next = undo(state({ count: 1, lifetime: {}, sessionTotal: 0 }))
  assert.equal(next.lifetime.subhanallah, 0)
  assert.equal(next.sessionTotal, 0)
})
