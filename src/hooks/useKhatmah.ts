"use client"

import { useCallback, useSyncExternalStore } from "react"
import {
  clearKhatmahPlan,
  createKhatmahPlan,
  readKhatmahPlan,
  recordKhatmahAyah,
  updateKhatmahPlan,
  type KhatmahPlan,
} from "@/lib/khatmah"

function subscribe(callback: () => void) {
  window.addEventListener("storage-update", callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener("storage-update", callback)
    window.removeEventListener("storage", callback)
  }
}

let cachedPlan: ReturnType<typeof readKhatmahPlan> = null

function getPlanSnapshot() {
  const next = readKhatmahPlan()
  if (JSON.stringify(next) !== JSON.stringify(cachedPlan)) cachedPlan = next
  return cachedPlan
}

export function useKhatmah() {
  const plan = useSyncExternalStore(subscribe, getPlanSnapshot, () => null)
  const create = useCallback((durationDays: number, reminderTime?: string) => createKhatmahPlan(durationDays, reminderTime), [])
  const update = useCallback((patch: Partial<Pick<KhatmahPlan, "durationDays" | "reminderEnabled" | "reminderTime">>) => updateKhatmahPlan(patch), [])
  const record = useCallback((ayahId: number) => recordKhatmahAyah(ayahId), [])
  const clear = useCallback(() => clearKhatmahPlan(), [])
  return { plan, createPlan: create, updatePlan: update, recordAyah: record, clearPlan: clear }
}
