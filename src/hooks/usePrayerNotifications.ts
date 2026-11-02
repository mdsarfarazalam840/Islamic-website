"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { detectPlatform } from "@/lib/platform"
import {
  calculatePrayerSchedule,
  DEFAULT_PRAYER_SETTINGS,
  type PrayerCalculationMethod,
  type PrayerMadhhab,
  type PrayerSettings,
} from "@/lib/prayer"

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
  calculationMethod?: PrayerCalculationMethod
  madhhab?: PrayerMadhhab
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

  const scheduleNotifications = useCallback(async (settings: PrayerSettings) => {
    const platform = detectPlatform()
    const today = new Date()
    const prayers = calculatePrayerSchedule(today, settings).prayers

    const now = new Date()
    const upcoming = prayers.filter((p) => p.time > now)

    if (upcoming.length === 0) {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      upcoming.push(calculatePrayerSchedule(tomorrow, settings).prayers[0])
    }

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
    } else if (typeof Notification !== "undefined") {
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission()

      if (permission === "granted") {
        for (const prayer of upcoming) {
          const delay = prayer.time.getTime() - now.getTime()
          setTimeout(() => {
            new Notification(`Prayer Time — ${prayer.name}`, {
              body: `It is time for ${prayer.name} prayer.`,
            })
          }, delay)
        }
      }
    }
  }, [])

  const enable = useCallback(async (
    latitude: number,
    longitude: number,
    calculationMethod: PrayerCalculationMethod = DEFAULT_PRAYER_SETTINGS.calculationMethod,
    madhhab: PrayerMadhhab = DEFAULT_PRAYER_SETTINGS.madhhab,
  ) => {
    const settings: PrayerSettings = {
      ...DEFAULT_PRAYER_SETTINGS,
      latitude,
      longitude,
      calculationMethod,
      madhhab,
    }
    storeConfig({ enabled: true, latitude, longitude, calculationMethod, madhhab })
    await scheduleNotifications(settings)
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
        await scheduleNotifications({
          ...DEFAULT_PRAYER_SETTINGS,
          latitude: config.latitude,
          longitude: config.longitude,
          calculationMethod: config.calculationMethod ?? DEFAULT_PRAYER_SETTINGS.calculationMethod,
          madhhab: config.madhhab ?? DEFAULT_PRAYER_SETTINGS.madhhab,
        })
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
        scheduleNotifications({
          ...DEFAULT_PRAYER_SETTINGS,
          latitude: cfg.latitude,
          longitude: cfg.longitude,
          calculationMethod: cfg.calculationMethod ?? DEFAULT_PRAYER_SETTINGS.calculationMethod,
          madhhab: cfg.madhhab ?? DEFAULT_PRAYER_SETTINGS.madhhab,
        })
      }
    }, 60_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [scheduleNotifications])

  return { ...state, enable, disable }
}
