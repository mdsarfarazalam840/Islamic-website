"use client"

import { Play, Pause, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAudioPlayer } from "./AudioPlayerContext"

interface SurahAudioPlayerProps {
  reciterName: string
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function SurahAudioPlayer({ reciterName }: SurahAudioPlayerProps) {
  const {
    isPlaying,
    status,
    currentTime,
    duration,
    speed,
    position,
    total,
    toggle,
    seek,
    cycleSpeed,
  } = useAudioPlayer()

  return (
    <div className="w-full max-w-md rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          disabled={status === "error"}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full transition-all duration-200",
            status === "error"
              ? "cursor-not-allowed bg-muted text-muted-foreground"
              : "bg-secondary/10 text-secondary hover:bg-secondary/20",
          )}
          aria-label={isPlaying ? "Pause recitation" : "Play recitation"}
        >
          {status === "error" ? (
            <AlertCircle className="size-5" />
          ) : status === "loading" ? (
            <Loader2 className="size-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5 translate-x-px" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-foreground">
              {reciterName}
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {status === "error"
                ? "Unavailable"
                : position > 0
                  ? `Ayah ${position} / ${total}`
                  : `${total} verses`}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            step={0.1}
            onChange={(e) => seek(Number(e.target.value))}
            disabled={status === "error" || !duration}
            aria-label="Seek recitation"
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border accent-secondary disabled:cursor-not-allowed"
          />

          <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <button
          onClick={cycleSpeed}
          disabled={status === "error"}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground transition-colors hover:bg-secondary/5 hover:text-secondary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Change playback speed"
        >
          {speed}x
        </button>
      </div>
    </div>
  )
}
