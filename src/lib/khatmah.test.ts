import { test } from "node:test"
import assert from "node:assert/strict"
import { getKhatmahJuzProgress, getKhatmahStats, type KhatmahPlan } from "@/lib/khatmah"

function plan(overrides: Partial<KhatmahPlan> = {}): KhatmahPlan {
  return {
    startedAt: "2026-11-01T00:00:00.000Z",
    durationDays: 30,
    dailyAyahGoal: 208,
    furthestAyahId: 416,
    reminderEnabled: false,
    reminderTime: "20:00",
    activity: {
      "2026-11-01": { furthestAyahId: 208, ayahsRead: 208 },
      "2026-11-02": { furthestAyahId: 416, ayahsRead: 208 },
    },
    ...overrides,
  }
}

test("calculates Khatmah progress, ETA, and streaks", () => {
  const stats = getKhatmahStats(plan(), new Date(2026, 10, 2, 12))
  assert.equal(stats.completedAyahs, 416)
  assert.equal(stats.remainingAyahs, 5820)
  assert.equal(stats.todayAyahs, 208)
  assert.equal(stats.todayRemaining, 0)
  assert.equal(stats.currentStreak, 2)
  assert.equal(stats.bestStreak, 2)
  assert.equal(stats.activeDays, 2)
  assert.equal(stats.estimatedCompletionDate, "2026-11-29")
})

test("derives Juz states from global boundaries", () => {
  const result = getKhatmahJuzProgress(plan({ furthestAyahId: 150 }), [
    { juz: 1, startGlobal: 1, endGlobal: 100 },
    { juz: 2, startGlobal: 101, endGlobal: 200 },
  ])
  assert.deepEqual(result.map((item) => [item.status, item.percentage]), [["complete", 100], ["current", 50]])
})
