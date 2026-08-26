"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { detectPlatform } from "@/lib/platform"

interface PrayerNotificationState {
  enabled: boolean
  nextPrayer: string | null
  nextPrayerTime: Date | null
}

const STORAGE_KEY = "noor-prayer-notifications"

interface StoredConfig {
  enabled: boolean
  latitude: number
  longitude: number
}

function getStoredConfig(): StoredConfig | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function storeConfig(config: StoredConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function usePrayerNotifications() {
  const [state, setState] = useState<PrayerNotificationState>({
    enabled: false,
    nextPrayer: null,
    nextPrayerTime: null,
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Mirrors state.nextPrayerTime so the polling interval can read it without
  // being torn down and recreated on every state change.
  const nextPrayerTimeRef = useRef<Date | null>(null)

  const scheduleNotifications = useCallback(async (latitude: number, longitude: number) => {
    const platform = detectPlatform()
    const { CalculationMethod, Coordinates, PrayerTimes } = await import("adhan")

    const params = CalculationMethod.MuslimWorldLeague()
    const coordinates = new Coordinates(latitude, longitude)
    const today = new Date()
    const prayerTimes = new PrayerTimes(coordinates, today, params)

    const prayers: Array<{ name: string; time: Date }> = [
      { name: "Fajr", time: prayerTimes.fajr },
      { name: "Dhuhr", time: prayerTimes.dhuhr },
      { name: "Asr", time: prayerTimes.asr },
      { name: "Maghrib", time: prayerTimes.maghrib },
      { name: "Isha", time: prayerTimes.isha },
    ]

    const now = new Date()
    const upcoming = prayers.filter((p) => p.time > now)

    if (upcoming.length === 0) return

    nextPrayerTimeRef.current = upcoming[0].time
    setState({
      enabled: true,
      nextPrayer: upcoming[0].name,
      nextPrayerTime: upcoming[0].time,
    })

    if (platform === "capacitor") {
      const { LocalNotifications } = await import("@capacitor/local-notifications")
      await LocalNotifications.requestPermissions()

      for (const prayer of upcoming) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: prayer.name.charCodeAt(0),
              title: `Prayer Time — ${prayer.name}`,
              body: `It is time for ${prayer.name} prayer.`,
              schedule: { at: prayer.time },
              sound: "default",
            },
          ],
        })
      }
    } else if (platform === "tauri") {
      const {
        isPermissionGranted,
        requestPermission,
        sendNotification,
      } = await import("@tauri-apps/plugin-notification")

      let permitted = await isPermissionGranted()
      if (!permitted) {
        const permission = await requestPermission()
        permitted = permission === "granted"
      }

      if (permitted) {
        for (const prayer of upcoming) {
          const delay = prayer.time.getTime() - now.getTime()
          setTimeout(() => {
            sendNotification({
              title: `Prayer Time — ${prayer.name}`,
              body: `It is time for ${prayer.name} prayer.`,
            })
          }, delay)
        }
      }
    }
  }, [])

  const enable = useCallback(async (latitude: number, longitude: number) => {
    storeConfig({ enabled: true, latitude, longitude })
    await scheduleNotifications(latitude, longitude)
  }, [scheduleNotifications])

  const disable = useCallback(async () => {
    storeConfig({ enabled: false, latitude: 0, longitude: 0 })
    nextPrayerTimeRef.current = null
    setState({ enabled: false, nextPrayer: null, nextPrayerTime: null })

    const platform = detectPlatform()
    if (platform === "capacitor") {
      const { LocalNotifications } = await import("@capacitor/local-notifications")
      const pending = await LocalNotifications.getPending()
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        })
      }
    }
  }, [])

  useEffect(() => {
    // Restoring a stored subscription talks to the OS notification APIs, so the
    // work (and the state update that follows it) happens off the effect body.
    async function restoreStoredSchedule() {
      const config = getStoredConfig()
      if (config?.enabled) {
        await scheduleNotifications(config.latitude, config.longitude)
      }
    }
    restoreStoredSchedule()

    // Once the pending prayer has passed, roll the schedule forward. Reads the
    // ref rather than doing side effects inside a setState updater.
    intervalRef.current = setInterval(() => {
      const next = nextPrayerTimeRef.current
      if (!next || new Date() <= next) return
      const cfg = getStoredConfig()
      if (cfg?.enabled) {
        scheduleNotifications(cfg.latitude, cfg.longitude)
      }
    }, 60_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [scheduleNotifications])

  return { ...state, enable, disable }
}
