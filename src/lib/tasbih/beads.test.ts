import assert from "node:assert/strict"
import test from "node:test"
import { beadFill, beadLayout } from "@/lib/tasbih/beads"

test("targets that fit on a strand get one bead each", () => {
  assert.deepEqual(beadLayout(33), { beads: 33, per: 1 })
  assert.deepEqual(beadLayout(34), { beads: 34, per: 1 })
  assert.deepEqual(beadLayout(1), { beads: 1, per: 1 })
})

test("longer targets split into whole-numbered beads", () => {
  assert.deepEqual(beadLayout(99), { beads: 33, per: 3 })
  assert.deepEqual(beadLayout(100), { beads: 25, per: 4 })
  assert.deepEqual(beadLayout(500), { beads: 25, per: 20 })
  assert.deepEqual(beadLayout(1000), { beads: 25, per: 40 })
})

// 47 is prime, so no bead count between 10 and 34 divides it: the fallback rounds
// the bead value up, which is why the strand covers 48 rather than exactly 47.
test("a target with no exact split rounds the bead value up", () => {
  const { beads, per } = beadLayout(47)
  assert.equal(per, 2)
  assert.equal(beads, 24)
  assert.ok(beads * per >= 47)
  assert.ok(beads <= 34)
})

test("a non-positive or non-finite target collapses to one bead", () => {
  assert.deepEqual(beadLayout(0), { beads: 1, per: 1 })
  assert.deepEqual(beadLayout(-5), { beads: 1, per: 1 })
  assert.deepEqual(beadLayout(Number.NaN), { beads: 1, per: 1 })
})

test("beadFill clamps to the bead it belongs to", () => {
  assert.equal(beadFill(0, 0, 1), 0)
  assert.equal(beadFill(0, 1, 1), 1)
  assert.equal(beadFill(1, 1, 1), 0)
  assert.equal(beadFill(0, 9, 1), 1)
})

test("beadFill reports part-filled grouped beads", () => {
  assert.equal(beadFill(0, 2, 4), 0.5)
  assert.equal(beadFill(1, 6, 4), 0.5)
  assert.equal(beadFill(1, 4, 4), 0)
})
