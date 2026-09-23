"use client"

import { useState } from "react"
import { CornerDownLeft, Locate } from "lucide-react"

interface AyahJumpProps {
  /** Highest ayah number in this surah. */
  max: number
  /** Returns false when the ayah isn't in the loaded data. */
  onJump: (ayahNumber: number) => boolean
}

/**
 * Jump straight to an ayah inside the surah being read. The reader renders one
 * juz at a time, so without this, reaching ayah 200 of a three-juz surah means
 * stepping through juz until it appears.
 */
export function AyahJump({ max, onJump }: AyahJumpProps) {
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(value.trim())
    if (!Number.isInteger(n) || n < 1 || n > max) {
      setError(`Enter a number between 1 and ${max}.`)
      return
    }
    if (!onJump(n)) {
      setError("That ayah isn't available yet.")
      return
    }
    setError(null)
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-gold-dim/15 bg-card/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Locate className="size-4 text-gold-light" />
        <span className="text-xs font-medium text-gold-light uppercase tracking-wider">
          Go to ayah
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={max}
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          placeholder={`1–${max}`}
          aria-label={`Ayah number, 1 to ${max}`}
          className="min-w-0 flex-1 rounded-lg border border-border/20 bg-space-mid/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold-dim/40 transition-colors"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-lg border border-gold-dim/20 bg-gold-dim/10 px-3 py-2 text-xs font-medium text-gold-light transition-all hover:border-gold-dim/40 hover:bg-gold-dim/20"
        >
          Go
          <CornerDownLeft className="size-3.5" />
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-muted-foreground">{error}</p>}
    </form>
  )
}
