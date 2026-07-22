"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Ayah, Surah } from "@/types"
import { getAllSurahs } from "@/lib/quran/surahs"
import { assetPath } from "@/lib/utils"

export function useSurahAyahs(surahNumber: number) {
  const [ayahs, setAyahs] = useState<Ayah[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(assetPath(`/data/quran/surah-${surahNumber}.json`))
      .then((r) => r.json())
      .then((data: Ayah[]) => {
        setAyahs(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [surahNumber])

  return { ayahs, loading }
}

export function useJuzNavigation(surahNumber: number, ayahs: Ayah[]) {
  const [currentJuz, setCurrentJuz] = useState<number>(1)

  const juzBoundaries = ayahs.filter(
    (a, i) => i === 0 || a.juz !== ayahs[i - 1].juz,
  )

  const jumpToJuz = useCallback(
    (juz: number) => {
      const target = juzBoundaries.find((a) => a.juz === juz)
      if (target) {
        setCurrentJuz(juz)
        const el = document.getElementById(`ayah-${target.number}`)
        el?.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    },
    [juzBoundaries],
  )

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const ayahNum = Number(entry.target.getAttribute("data-ayah-global"))
            const ayah = ayahs.find((a) => a.number === ayahNum)
            if (ayah && ayah.juz !== currentJuz) {
              setCurrentJuz(ayah.juz)
            }
          }
        }
      },
      { threshold: 0.3 },
    )

    const elements = document.querySelectorAll("[data-ayah-global]")
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ayahs, currentJuz])

  return { currentJuz, jumpToJuz, juzBoundaries }
}

export function useSurahList() {
  const [surahs] = useState<Surah[]>(() => getAllSurahs())
  const [query, setQuery] = useState("")
  const [revelationFilter, setRevelationFilter] = useState<"all" | "meccan" | "medinan">("all")

  const filtered = surahs.filter((s) => {
    if (revelationFilter !== "all" && s.revelationType !== revelationFilter) return false
    if (!query) return true
    const q = query.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      s.nameTranslated.toLowerCase().includes(q) ||
      s.nameArabic.includes(query)
    )
  })

  return { surahs: filtered, query, setQuery, revelationFilter, setRevelationFilter, total: surahs.length }
}

export function useQuran() {
  const surahs = useState<Surah[]>(() => getAllSurahs())[0]
  const ayahCache = useRef<Map<number, Ayah[]>>(new Map())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function loadAll() {
      const fetches = surahs.map(async (surah) => {
        if (ayahCache.current.has(surah.number)) return
        const res = await fetch(assetPath(`/data/quran/surah-${surah.number}.json`))
        const data: Ayah[] = await res.json()
        ayahCache.current.set(surah.number, data)
      })
      await Promise.all(fetches)
      setLoaded(true)
    }
    loadAll()
  }, [surahs])

  const getAyahs = useCallback((surahNumber: number): Ayah[] => {
    return ayahCache.current.get(surahNumber) ?? []
  }, [])

  return { surahs, getAyahs, loaded }
}
