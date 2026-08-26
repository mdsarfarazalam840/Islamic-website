"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import type { Ayah, Reciter } from "@/types"
import {
  getAyahAudioUrl,
  getReciter,
  getSurahAudioUrl,
  supportsAyahSync,
} from "@/config/audio"
import { useRealtime } from "@/components/realtime/RealtimeProvider"
import { useReciter } from "@/hooks/useReciter"

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

type Status = "idle" | "loading" | "ready" | "error"

/**
 * "ayah" reciters publish one file per verse, so playback can follow the text
 * (highlight + auto-scroll + per-ayah play buttons). "surah" reciters publish a
 * single file per surah with no verse timings, so the player is a plain track.
 */
export type PlaybackMode = "ayah" | "surah"

interface AudioPlayerContextValue {
  reciter: Reciter
  mode: PlaybackMode
  /** Surah being played, so consumers can look up its live listener count. */
  surahNumber: number
  /** True when individual ayahs can be played/followed (mode === "ayah"). */
  canPlayAyah: boolean
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
  /** Load and play a specific ayah by its global number. No-op in surah mode. */
  playAyah: (globalAyahNumber: number) => void
  /** Play/pause; starts from the beginning when nothing is loaded. */
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
  surahNumber: number
  children: React.ReactNode
}

export function AudioPlayerProvider({
  ayahs,
  surahNumber,
  children,
}: AudioPlayerProviderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const reciterId = useReciter((s) => s.reciterId)
  const reciter = getReciter(reciterId)
  const mode: PlaybackMode = supportsAyahSync(reciter) ? "ayah" : "surah"

  const [index, setIndex] = useState<number | null>(null)
  const [surahLoaded, setSurahLoaded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speedIndex, setSpeedIndex] = useState(1) // default 1x

  const current = mode === "ayah" && index != null ? ayahs[index] : null
  const playingAyahId = current?.number ?? null

  /** Reciter whose file sits in the element right now; null while empty. */
  const loadedReciterId = useRef<string | null>(null)

  // Point the element at a new file. The element renders with preload="none" so
  // opening a surah costs no audio bytes, but that also means a bare `src =`
  // assignment fetches nothing on its own: while paused the element would sit at
  // readyState 0 forever — duration NaN, dead seek bar, status stuck on
  // "loading". play() forces the fetch when autoplaying; when not, preload has
  // to be raised and load() called explicitly, which is what makes a reciter
  // change take effect live instead of only after a reload.
  const applySource = useCallback(
    (url: string, autoplay: boolean) => {
      const audio = audioRef.current
      if (!audio) return
      audio.src = url
      setCurrentTime(0)
      setDuration(0) // the previous reciter's length does not apply to this file
      setStatus("loading")
      if (autoplay) {
        void audio.play().catch(() => setStatus("error"))
      } else {
        audio.preload = "metadata"
        audio.load()
      }
      // Assigned last: the media load algorithm resets playbackRate to
      // defaultPlaybackRate, which would silently drop the chosen speed.
      audio.playbackRate = PLAYBACK_SPEEDS[speedIndex]
    },
    [speedIndex],
  )

  // Load an ayah by list index and optionally start playback. Driving the
  // <audio> src imperatively (rather than via a React prop) keeps load→play
  // ordering deterministic when auto-advancing between ayah files.
  const load = useCallback(
    (i: number, autoplay: boolean) => {
      const ayah = ayahs[i]
      if (!audioRef.current || !ayah) return
      const url = getAyahAudioUrl(reciter, ayah.number)
      if (!url) {
        setStatus("error")
        return
      }
      setIndex(i)
      setSurahLoaded(false)
      loadedReciterId.current = reciter.id
      applySource(url, autoplay)
    },
    [ayahs, reciter, applySource],
  )

  // Surah mode: one file for the whole surah, so there is no ayah position to
  // track and nothing to auto-advance to.
  const loadSurah = useCallback(
    (autoplay: boolean) => {
      if (!audioRef.current) return
      const url = getSurahAudioUrl(reciter, surahNumber)
      if (!url) {
        setStatus("error")
        return
      }
      setIndex(null)
      setSurahLoaded(true)
      loadedReciterId.current = reciter.id
      applySource(url, autoplay)
    },
    [reciter, surahNumber, applySource],
  )

  const playAyah = useCallback(
    (globalAyahNumber: number) => {
      if (mode !== "ayah") return
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
    [ayahs, index, load, mode],
  )

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (mode === "surah") {
      if (!surahLoaded) {
        loadSurah(true)
        return
      }
    } else if (index == null) {
      load(0, true)
      return
    }
    if (audio.paused) void audio.play().catch(() => setStatus("error"))
    else audio.pause()
  }, [index, load, loadSurah, mode, surahLoaded])

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
    const audio = audioRef.current
    if (mode === "surah" || index == null) {
      audio?.pause() // let onPause own isPlaying
      return
    }
    const nextIndex = index + 1
    if (nextIndex < ayahs.length) {
      load(nextIndex, true) // auto-advance to the next ayah
    } else {
      audio?.pause() // reached the end of the surah
    }
  }, [index, ayahs.length, load, mode])

  // Swap the source when the reader picks another reciter: keep going from the
  // same ayah in ayah mode, restart the track in surah mode (the recordings
  // share no timeline, so a carried-over offset would land anywhere), and keep
  // whatever play/pause state the player was in. The comparison is against the
  // reciter actually loaded rather than the previous render's id, so the
  // persisted store rehydrating on mount does not count as a switch, and a
  // stale/unknown stored id (which getReciter maps to the default) cannot loop.
  useEffect(() => {
    const loaded = loadedReciterId.current
    // Nothing loaded yet: the next play() already picks up the new reciter.
    if (loaded === null || loaded === reciter.id) return

    const audio = audioRef.current
    if (!audio) return
    const wasPlaying = !audio.paused
    if (mode === "surah") loadSurah(wasPlaying)
    else load(index ?? 0, wasPlaying)
  }, [reciter, mode, index, load, loadSurah])

  // Feed the live "N listening" count. The surah itself is published by
  // SurahPresence, so this only contributes whether audio is actually running
  // and whose voice it is. report() throttles, so play/pause drumming cannot
  // turn into a burst of presence writes.
  const { report } = useRealtime()
  useEffect(() => {
    report({ p: isPlaying, r: isPlaying ? reciter.name : null })
    return () => report({ p: false, r: null })
  }, [isPlaying, reciter, report])

  const value: AudioPlayerContextValue = {
    reciter,
    mode,
    surahNumber,
    canPlayAyah: mode === "ayah",
    playingAyahId,
    isPlaying,
    status,
    currentTime,
    duration,
    speed: PLAYBACK_SPEEDS[speedIndex],
    position: mode === "ayah" && index != null ? index + 1 : 0,
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
