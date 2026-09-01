"use client"

import { useSyncExternalStore } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  DEFAULT_DHIKR_ID,
  getDhikr,
  TASBIH_FATIMAH_SEQUENCE,
} from "@/lib/tasbih/dhikr"
import { advance, undo as undoOne, type RoundState } from "@/lib/tasbih/round"

const STORAGE_KEY = "noor-tasbih"

export interface TasbihState extends RoundState {
  /** Buzz on each tap where the device supports it. */
  haptics: boolean
  /** Count one. Returns the target just completed, or null mid-round. */
  tick: () => number | null
  undo: () => void
  resetRound: () => void
  /** Wipe every count, including lifetime totals. */
  resetAll: () => void
  selectDhikr: (id: string) => void
  setTarget: (target: number) => void
  toggleSequence: () => void
  toggleHaptics: () => void
}

const defaultTarget = getDhikr(DEFAULT_DHIKR_ID)?.defaultTarget ?? 33

/**
 * The tasbih counter's state. Mirrors hooks/useFontSize.ts — zustand + persist
 * is the house pattern for a small persisted preference store.
 *
 * `sessionTotal` is left out of `partialize` so "this session" means this visit;
 * `rounds` and `lifetime` are what carry across reloads.
 */
export const useTasbih = create<TasbihState>()(
  persist(
    (set, get) => ({
      activeId: DEFAULT_DHIKR_ID,
      target: defaultTarget,
      count: 0,
      rounds: {},
      lifetime: {},
      sessionTotal: 0,
      sequenceMode: false,
      haptics: true,

      tick: () => {
        const { state, completed } = advance(get(), TASBIH_FATIMAH_SEQUENCE)
        set(state)
        return completed
      },

      undo: () => set(undoOne(get())),

      resetRound: () => set({ count: 0 }),

      resetAll: () =>
        set({ count: 0, rounds: {}, lifetime: {}, sessionTotal: 0 }),

      // Picking a different dhikr starts that dhikr's round at zero: an open
      // round belongs to the dhikr it was counted on, and carrying a partial
      // count across would attribute those taps to the wrong phrase.
      selectDhikr: (id) => {
        const preset = getDhikr(id)
        if (!preset) return
        set({ activeId: id, target: preset.defaultTarget, count: 0 })
      },

      setTarget: (target) => {
        const next = Number.isFinite(target) ? Math.max(1, Math.floor(target)) : 1
        // Lowering the target below the open count would leave the round already
        // past its end, which advance() would then complete on the next tap.
        set({ target: next, count: get().count < next ? get().count : 0 })
      },

      toggleSequence: () => {
        const on = !get().sequenceMode
        const inSequence = TASBIH_FATIMAH_SEQUENCE.some((s) => s.id === get().activeId)
        if (!on || inSequence) {
          set({ sequenceMode: on })
          return
        }
        // Switching the sequence on from an unrelated dhikr enters at its first
        // leg rather than waiting out the current round.
        const [first] = TASBIH_FATIMAH_SEQUENCE
        set({ sequenceMode: on, activeId: first.id, target: first.target, count: 0 })
      },

      toggleHaptics: () => set({ haptics: !get().haptics }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        activeId: s.activeId,
        target: s.target,
        count: s.count,
        rounds: s.rounds,
        lifetime: s.lifetime,
        sequenceMode: s.sequenceMode,
        haptics: s.haptics,
      }),
    },
  ),
)

/** Nothing to listen to: the answer flips once, when React finishes hydrating. */
function subscribeNever() {
  return () => {}
}

/**
 * False on the server and on the first client render, true from hydration onward.
 * localStorage rehydrates synchronously, so without this gate the first client
 * render would disagree with the prerendered HTML — the same
 * render-empty-then-fill rule the saved views follow (see SavedClient.tsx).
 *
 * useSyncExternalStore rather than a mount effect: React swaps the server
 * snapshot for the client one as part of hydration, so no setState-in-effect
 * (which react-hooks/set-state-in-effect rejects) and no extra render pass.
 */
export function useTasbihHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )
}
