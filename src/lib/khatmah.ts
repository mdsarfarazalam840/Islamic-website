export const KHATMAH_STORAGE_KEY = "noor-khatmah-plan"
export const TOTAL_QURAN_AYAHS = 6236
export const KHATMAH_DURATIONS = [7, 15, 30, 60, 90, 120] as const

export interface KhatmahDay {
  furthestAyahId: number
  ayahsRead: number
}

export interface KhatmahPlan {
  startedAt: string
  durationDays: number
  dailyAyahGoal: number
  furthestAyahId: number
  reminderEnabled: boolean
  reminderTime: string
  activity: Record<string, KhatmahDay>
}

export interface KhatmahStats {
  completedAyahs: number
  remainingAyahs: number
  percentage: number
  todayAyahs: number
  todayGoal: number
  todayRemaining: number
  currentStreak: number
  bestStreak: number
  activeDays: number
  estimatedCompletionDate: string | null
  isComplete: boolean
}

export interface KhatmahJuzProgress {
  juz: number
  startGlobal: number
  endGlobal: number
  status: "complete" | "current" | "upcoming"
  percentage: number
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function dateKeyAfter(key: string, days: number): string {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

function normalizePlan(value: unknown): KhatmahPlan | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Partial<KhatmahPlan>
  if (!raw.startedAt || !Number.isFinite(raw.durationDays) || !Number.isFinite(raw.dailyAyahGoal)) return null
  const durationDays = raw.durationDays ?? 1
  const dailyAyahGoal = raw.dailyAyahGoal ?? 1
  return {
    startedAt: raw.startedAt,
    durationDays: Math.max(1, Math.round(durationDays)),
    dailyAyahGoal: Math.max(1, Math.round(dailyAyahGoal)),
    furthestAyahId: Math.min(TOTAL_QURAN_AYAHS, Math.max(0, Math.round(raw.furthestAyahId ?? 0))),
    reminderEnabled: raw.reminderEnabled === true,
    reminderTime: typeof raw.reminderTime === "string" && /^\d{2}:\d{2}$/.test(raw.reminderTime) ? raw.reminderTime : "20:00",
    activity: raw.activity && typeof raw.activity === "object" ? raw.activity : {},
  }
}

export function readKhatmahPlan(): KhatmahPlan | null {
  if (typeof window === "undefined") return null
  try {
    return normalizePlan(JSON.parse(localStorage.getItem(KHATMAH_STORAGE_KEY) ?? "null"))
  } catch {
    return null
  }
}

function notifyChange() {
  window.dispatchEvent(new Event("storage-update"))
}

function writeKhatmahPlan(plan: KhatmahPlan | null) {
  if (plan) localStorage.setItem(KHATMAH_STORAGE_KEY, JSON.stringify(plan))
  else localStorage.removeItem(KHATMAH_STORAGE_KEY)
  notifyChange()
}

export function createKhatmahPlan(durationDays: number, reminderTime = "20:00"): KhatmahPlan {
  const duration = Math.max(1, Math.round(durationDays))
  const plan: KhatmahPlan = {
    startedAt: new Date().toISOString(),
    durationDays: duration,
    dailyAyahGoal: Math.ceil(TOTAL_QURAN_AYAHS / duration),
    furthestAyahId: 0,
    reminderEnabled: false,
    reminderTime,
    activity: {},
  }
  if (typeof window !== "undefined") writeKhatmahPlan(plan)
  return plan
}

export function updateKhatmahPlan(patch: Partial<Pick<KhatmahPlan, "durationDays" | "reminderEnabled" | "reminderTime">>) {
  const current = readKhatmahPlan()
  if (!current) return null
  const duration = patch.durationDays === undefined ? current.durationDays : Math.max(1, Math.round(patch.durationDays))
  const next = {
    ...current,
    ...patch,
    durationDays: duration,
    dailyAyahGoal: Math.ceil(TOTAL_QURAN_AYAHS / duration),
  }
  writeKhatmahPlan(next)
  return next
}

export function clearKhatmahPlan() {
  if (typeof window !== "undefined") writeKhatmahPlan(null)
}

export function recordKhatmahAyah(ayahId: number, date = new Date()) {
  const plan = readKhatmahPlan()
  if (!plan || !Number.isFinite(ayahId)) return plan
  const reached = Math.min(TOTAL_QURAN_AYAHS, Math.max(0, Math.round(ayahId)))
  const key = localDateKey(date)
  const previousDays = Object.entries(plan.activity)
    .filter(([day]) => day < key)
    .map(([, entry]) => entry.furthestAyahId)
  const beforeToday = Math.max(...previousDays, 0)
  const previousToday = plan.activity[key]
  const furthestToday = Math.max(previousToday?.furthestAyahId ?? 0, reached)
  const next: KhatmahPlan = {
    ...plan,
    furthestAyahId: Math.max(plan.furthestAyahId, reached),
    activity: {
      ...plan.activity,
      [key]: {
        furthestAyahId: furthestToday,
        ayahsRead: Math.max(previousToday?.ayahsRead ?? 0, Math.max(0, furthestToday - beforeToday)),
      },
    },
  }
  if (next.furthestAyahId !== plan.furthestAyahId || next.activity[key].ayahsRead !== previousToday?.ayahsRead) writeKhatmahPlan(next)
  return next
}

export function getKhatmahStats(plan: KhatmahPlan, now = new Date()): KhatmahStats {
  const today = plan.activity[localDateKey(now)]
  const activeDates = Object.entries(plan.activity)
    .filter(([, entry]) => entry.ayahsRead > 0)
    .map(([date]) => date)
    .sort()
  let currentStreak = 0
  let cursor = localDateKey(now)
  if (!plan.activity[cursor]?.ayahsRead) cursor = dateKeyAfter(cursor, -1)
  while (plan.activity[cursor]?.ayahsRead > 0) {
    currentStreak += 1
    cursor = dateKeyAfter(cursor, -1)
  }
  let bestStreak = 0
  let run = 0
  let previous: string | null = null
  for (const date of activeDates) {
    run = previous && dateKeyAfter(previous, 1) === date ? run + 1 : 1
    bestStreak = Math.max(bestStreak, run)
    previous = date
  }
  const completedAyahs = Math.min(TOTAL_QURAN_AYAHS, plan.furthestAyahId)
  const remainingAyahs = Math.max(0, TOTAL_QURAN_AYAHS - completedAyahs)
  const estimatedCompletionDate = remainingAyahs === 0
    ? null
    : dateKeyAfter(localDateKey(now), Math.max(0, Math.ceil(remainingAyahs / plan.dailyAyahGoal) - 1))
  return {
    completedAyahs,
    remainingAyahs,
    percentage: Math.round((completedAyahs / TOTAL_QURAN_AYAHS) * 1000) / 10,
    todayAyahs: today?.ayahsRead ?? 0,
    todayGoal: plan.dailyAyahGoal,
    todayRemaining: Math.max(0, plan.dailyAyahGoal - (today?.ayahsRead ?? 0)),
    currentStreak,
    bestStreak,
    activeDays: activeDates.length,
    estimatedCompletionDate,
    isComplete: remainingAyahs === 0,
  }
}

export function getKhatmahJuzProgress(plan: KhatmahPlan, boundaries: Array<{ juz: number; startGlobal: number; endGlobal: number }>): KhatmahJuzProgress[] {
  return boundaries.map((boundary) => {
    const percentage = plan.furthestAyahId >= boundary.endGlobal
      ? 100
      : plan.furthestAyahId < boundary.startGlobal
        ? 0
        : Math.round(((plan.furthestAyahId - boundary.startGlobal + 1) / (boundary.endGlobal - boundary.startGlobal + 1)) * 100)
    return {
      juz: boundary.juz,
      startGlobal: boundary.startGlobal,
      endGlobal: boundary.endGlobal,
      percentage,
      status: percentage === 100 ? "complete" : percentage > 0 ? "current" : "upcoming",
    }
  })
}

export function formatKhatmahDate(dateKey: string | null): string {
  if (!dateKey) return "Complete"
  return parseDateKey(dateKey).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}
