"use client"

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react"
import type { Ayah } from "@/types"
import { getAyahAudioUrl } from "@/config/audio"

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

type Status = "idle" | "loading" | "ready" | "error"

interface AudioPlayerContextValue {
  /** Global ayah number (Ayah.number) currently loaded, or null. */
  playingAyahId: number | null
  isPlaying: boolean
  status: Status
  currentTime: number
  duration: number
  speed: number
  /** 1-based position of the current ayah within the surah, 0 when idle. */
  position: number
  total: number
  /** Load and play a specific ayah by its global number. */
  playAyah: (globalAyahNumber: number) => void
  /** Play/pause; starts from the first ayah when nothing is loaded. */
  toggle: () => void
  seek: (seconds: number) => void
  cycleSpeed: () => void
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null)

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext)
  if (!ctx) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider")
  }
  return ctx
}

interface AudioPlayerProviderProps {
  ayahs: Ayah[]
  children: React.ReactNode
}

export function AudioPlayerProvider({ ayahs, children }: AudioPlayerProviderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [index, setIndex] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speedIndex, setSpeedIndex] = useState(1) // default 1x

  const current = index != null ? ayahs[index] : null
  const playingAyahId = current?.number ?? null

  // Load an ayah by list index and optionally start playback. Driving the
  // <audio> src imperatively (rather than via a React prop) keeps load→play
  // ordering deterministic when auto-advancing between ayah files.
  const load = useCallback(
    (i: number, autoplay: boolean) => {
      const audio = audioRef.current
      const ayah = ayahs[i]
      if (!audio || !ayah) return
      audio.src = getAyahAudioUrl(ayah.surahNumber, ayah.ayahNumber)
      audio.playbackRate = PLAYBACK_SPEEDS[speedIndex]
      setIndex(i)
      setCurrentTime(0)
      setStatus("loading")
      if (autoplay) {
        void audio.play().catch(() => setStatus("error"))
      }
    },
    [ayahs, speedIndex],
  )

  const playAyah = useCallback(
    (globalAyahNumber: number) => {
      const i = ayahs.findIndex((a) => a.number === globalAyahNumber)
      if (i === -1) return
      // Toggle if this ayah is already the active one.
      const audio = audioRef.current
      if (i === index && audio) {
        if (audio.paused) void audio.play().catch(() => setStatus("error"))
        else audio.pause()
        return
      }
      load(i, true)
    },
    [ayahs, index, load],
  )

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (index == null) {
      load(0, true)
      return
    }
    if (audio.paused) void audio.play().catch(() => setStatus("error"))
    else audio.pause()
  }, [index, load])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = seconds
    setCurrentTime(seconds)
  }, [])

  const cycleSpeed = useCallback(() => {
    setSpeedIndex((i) => {
      const next = (i + 1) % PLAYBACK_SPEEDS.length
      if (audioRef.current) audioRef.current.playbackRate = PLAYBACK_SPEEDS[next]
      return next
    })
  }, [])

  const handleEnded = useCallback(() => {
    if (index == null) return
    const nextIndex = index + 1
    if (nextIndex < ayahs.length) {
      load(nextIndex, true) // auto-advance to the next ayah
    } else {
      setIsPlaying(false) // reached the end of the surah
    }
  }, [index, ayahs.length, load])

  const value: AudioPlayerContextValue = {
    playingAyahId,
    isPlaying,
    status,
    currentTime,
    duration,
    speed: PLAYBACK_SPEEDS[speedIndex],
    position: index == null ? 0 : index + 1,
    total: ayahs.length,
    playAyah,
    toggle,
    seek,
    cycleSpeed,
  }

  return (
    <AudioPlayerContext.Provider value={value}>
      <audio
        ref={audioRef}
        preload="none"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration)
          setStatus("ready")
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setStatus("loading")}
        onPlaying={() => setStatus("ready")}
        onEnded={handleEnded}
        onError={() => setStatus("error")}
      />
      {children}
    </AudioPlayerContext.Provider>
  )
}
