"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { DEFAULT_RECITER_ID } from "@/config/audio"

const STORAGE_KEY = "noor-reciter"

export interface ReciterState {
  reciterId: string
  setReciter: (id: string) => void
}

// Global rather than per-page so the chosen voice follows the reader from one
// surah to the next and survives reloads.
export const useReciter = create<ReciterState>()(
  persist(
    (set) => ({
      reciterId: DEFAULT_RECITER_ID,
      setReciter: (id: string) => set({ reciterId: id }),
    }),
    {
      name: STORAGE_KEY,
    },
  ),
)
