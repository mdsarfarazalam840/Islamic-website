"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bell,
  BellOff,
  Check,
  Clock3,
  Info,
  LocateFixed,
  MapPin,
  MoonStar,
  RefreshCw,
  Settings2,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react"
import {
  calculatePrayerSchedule,
  CALCULATION_METHODS,
  DEFAULT_PRAYER_SETTINGS,
  formatCountdown,
  formatPrayerTime,
  getNextPrayer,
  type PrayerCalculationMethod,
  type PrayerMadhhab,
  type PrayerSettings,
} from "@/lib/prayer"
import { usePrayerNotifications } from "@/hooks/usePrayerNotifications"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SETTINGS_KEY = "noor-prayer-settings"

const prayerIcons = {
  fajr: Sunrise,
  dhuhr: Sun,
  asr: Sun,
  maghrib: Sunset,
  isha: MoonStar,
} as const

function readSettings(): PrayerSettings {
  if (typeof window === "undefined") return DEFAULT_PRAYER_SETTINGS
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (!stored) return DEFAULT_PRAYER_SETTINGS
    return { ...DEFAULT_PRAYER_SETTINGS, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_PRAYER_SETTINGS
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function getMethodLabel(method: PrayerCalculationMethod) {
  return CALCULATION_METHODS.find((item) => item.value === method)?.label ?? method
}

export function PrayerDashboard() {
  const [settings, setSettings] = useState<PrayerSettings>(DEFAULT_PRAYER_SETTINGS)
  const [hydrated, setHydrated] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [locationError, setLocationError] = useState<string | null>(null)
  const [notificationBusy, setNotificationBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const notifications = usePrayerNotifications()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSettings(readSettings())
      setHydrated(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const dateKey = now.toDateString()
  const scheduleDate = useMemo(() => {
    const date = new Date(dateKey)
    date.setHours(0, 0, 0, 0)
    return date
  }, [dateKey])
  const schedule = useMemo(
    () => calculatePrayerSchedule(scheduleDate, settings),
    [scheduleDate, settings],
  )
  const nextPrayer = useMemo(
    () => getNextPrayer(schedule, now, settings),
    [now, schedule, settings],
  )
  const countdown = formatCountdown(nextPrayer.time.getTime() - now.getTime())
  const currentPrayer = [...schedule.prayers].reverse().find((prayer) => prayer.time <= now)

  function persistSettings(next: PrayerSettings) {
    setSettings(next)
    if (typeof window !== "undefined") {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    }
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  function updateSettings(patch: Partial<PrayerSettings>) {
    persistSettings({ ...settings, ...patch })
  }

  function useCurrentLocation() {
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError("Location is not available in this browser.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        updateSettings({
          city: "Current location",
          country: "",
          latitude: Number(coords.latitude.toFixed(4)),
          longitude: Number(coords.longitude.toFixed(4)),
        })
      },
      () => setLocationError("We could not access your location. Enter coordinates instead."),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function toggleNotifications() {
    setNotificationBusy(true)
    try {
      if (notifications.enabled) {
        await notifications.disable()
      } else {
        await notifications.enable(
          settings.latitude,
          settings.longitude,
          settings.calculationMethod,
          settings.madhhab,
        )
      }
    } finally {
      setNotificationBusy(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden geometric-bg">
      <div className="pointer-events-none absolute inset-0 lantern-glow opacity-70" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-dim">
              <Clock3 className="size-3.5" aria-hidden="true" />
              Daily prayer schedule
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Prayer times
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Keep every salah close with local times, a live countdown, and reminders that follow your settings.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 text-gold-light" aria-hidden="true" />
            <span>{settings.city}{settings.country ? `, ${settings.country}` : ""}</span>
            {hydrated && <span className="hidden text-muted-foreground/60 sm:inline">· {formatDate(now)}</span>}
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]" aria-label="Prayer overview">
          <div className="relative overflow-hidden rounded-2xl border border-gold-dim/25 bg-surface/75 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="absolute -right-16 -top-24 size-64 rounded-full bg-gold-dim/10 blur-3xl" aria-hidden="true" />
            <div className="relative flex h-full flex-col justify-between gap-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Next prayer</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-gold-dim/15 text-gold-light">
                      {(() => {
                        const Icon = prayerIcons[nextPrayer.icon]
                        return <Icon className="size-5" aria-hidden="true" />
                      })()}
                    </span>
                    <div>
                      <h2 className="font-display text-2xl font-semibold text-gold-light">{hydrated ? nextPrayer.name : "Prayer"}</h2>
                      <p className="text-xs text-muted-foreground">
                        {hydrated ? `${nextPrayer.isTomorrow ? "Tomorrow" : "Today"} · ${formatPrayerTime(nextPrayer.time)}` : "Calculating local time…"}
                      </p>
                    </div>
                  </div>
                </div>
                <span className="rounded-full border border-emerald/25 bg-emerald/10 px-3 py-1 text-xs font-medium text-emerald">
                  {hydrated ? (currentPrayer ? `${currentPrayer.name} passed` : "Before Fajr") : "Updating"}
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Time remaining</p>
                <p className="mt-2 font-mono text-5xl font-medium tracking-tight text-foreground sm:text-6xl" aria-label={hydrated ? `${countdown} until ${nextPrayer.name}` : "Calculating countdown"}>
                  {hydrated ? countdown : "--:--:--"}
                </p>
                <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
                  <span>Local time{hydrated ? ` · ${Intl.DateTimeFormat().resolvedOptions().timeZone}` : ""}</span>
                  <span>{getMethodLabel(settings.calculationMethod)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
                <Settings2 className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold text-foreground">Calculation settings</h2>
                <p className="text-xs text-muted-foreground">Used for today’s schedule</p>
              </div>
            </div>
            <dl className="mt-7 space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-3">
                <dt className="text-sm text-muted-foreground">Method</dt>
                <dd className="max-w-[12rem] text-right text-sm font-medium text-foreground">{getMethodLabel(settings.calculationMethod)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-3">
                <dt className="text-sm text-muted-foreground">Madhhab</dt>
                <dd className="text-sm font-medium capitalize text-foreground">{settings.madhhab}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-muted-foreground">Coordinates</dt>
                <dd className="text-right font-mono text-xs text-gold-dim">{settings.latitude.toFixed(4)}, {settings.longitude.toFixed(4)}</dd>
              </div>
            </dl>
            <a href="#settings" className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-gold-light underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Adjust settings <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="schedule-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="schedule-heading" className="font-display text-xl font-semibold text-foreground">Today’s schedule</h2>
              <p className="mt-1 text-sm text-muted-foreground">Five daily prayers for your selected location.</p>
            </div>
            <span className="hidden text-xs text-muted-foreground sm:block">Times update automatically</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {schedule.prayers.map((prayer) => {
              const Icon = prayerIcons[prayer.icon]
              const isNext = hydrated && prayer.name === nextPrayer.name && !nextPrayer.isTomorrow
              const isCurrent = hydrated && currentPrayer?.name === prayer.name
              return (
                <div key={prayer.name} className={cn(
                  "rounded-xl border p-4 transition-colors duration-200",
                  isNext
                    ? "border-gold-dim/40 bg-gold-dim/10 shadow-[0_0_24px_oklch(0.78_0.09_85_/_0.08)]"
                    : "border-border/60 bg-card/60 hover:border-gold-dim/25",
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <Icon className={cn("size-4", isNext ? "text-gold-light" : "text-muted-foreground")} aria-hidden="true" />
                    {(isNext || isCurrent) && <span className="size-1.5 rounded-full bg-gold-light" aria-label={isNext ? "Next prayer" : "Current prayer"} />}
                  </div>
                  <p className="mt-5 text-sm font-medium text-muted-foreground">{prayer.name}</p>
                  <p className={cn("mt-1 text-xl font-semibold", isNext ? "text-gold-light" : "text-foreground")}>{hydrated ? formatPrayerTime(prayer.time) : "--:--"}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section id="settings" className="mt-12 scroll-mt-24" aria-labelledby="settings-heading">
          <div className="mb-5">
            <h2 id="settings-heading" className="font-display text-2xl font-semibold text-foreground">Your prayer settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">Times are calculated on your device and saved for your next visit.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <MapPin className="size-5 text-gold-light" aria-hidden="true" />
                <h3 className="font-semibold text-foreground">Location</h3>
              </div>
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-foreground">
                  City or place
                  <input
                    value={settings.city}
                    onChange={(event) => updateSettings({ city: event.target.value })}
                    className="mt-2 h-11 w-full rounded-lg border border-input bg-background/60 px-3 text-sm outline-none transition focus:border-gold-dim focus:ring-2 focus:ring-ring/40"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-medium text-foreground">
                    Latitude
                    <input
                      type="number"
                      step="0.0001"
                      min="-90"
                      max="90"
                      value={settings.latitude}
                      onChange={(event) => updateSettings({ latitude: Number(event.target.value) })}
                      className="mt-2 h-11 w-full rounded-lg border border-input bg-background/60 px-3 font-mono text-xs outline-none transition focus:border-gold-dim focus:ring-2 focus:ring-ring/40"
                    />
                  </label>
                  <label className="block text-sm font-medium text-foreground">
                    Longitude
                    <input
                      type="number"
                      step="0.0001"
                      min="-180"
                      max="180"
                      value={settings.longitude}
                      onChange={(event) => updateSettings({ longitude: Number(event.target.value) })}
                      className="mt-2 h-11 w-full rounded-lg border border-input bg-background/60 px-3 font-mono text-xs outline-none transition focus:border-gold-dim focus:ring-2 focus:ring-ring/40"
                    />
                  </label>
                </div>
                <Button type="button" variant="outline" className="min-h-11 w-full border-gold-dim/25 text-gold-light hover:bg-gold-dim/10" onClick={useCurrentLocation}>
                  <LocateFixed className="size-4" aria-hidden="true" />
                  Use my current location
                </Button>
                {locationError && <p className="text-xs leading-5 text-destructive" role="alert">{locationError}</p>}
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <Settings2 className="size-5 text-gold-light" aria-hidden="true" />
                <h3 className="font-semibold text-foreground">Calculation method</h3>
              </div>
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-foreground">
                  Method
                  <select
                    value={settings.calculationMethod}
                    onChange={(event) => updateSettings({ calculationMethod: event.target.value as PrayerCalculationMethod })}
                    className="mt-2 h-11 w-full rounded-lg border border-input bg-background/60 px-3 text-sm outline-none transition focus:border-gold-dim focus:ring-2 focus:ring-ring/40"
                  >
                    {CALCULATION_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                  </select>
                </label>
                <p className="min-h-10 text-xs leading-5 text-muted-foreground">
                  {CALCULATION_METHODS.find((method) => method.value === settings.calculationMethod)?.detail}
                </p>
                <label className="block text-sm font-medium text-foreground">
                  Madhhab for Asr
                  <select
                    value={settings.madhhab}
                    onChange={(event) => updateSettings({ madhhab: event.target.value as PrayerMadhhab })}
                    className="mt-2 h-11 w-full rounded-lg border border-input bg-background/60 px-3 text-sm capitalize outline-none transition focus:border-gold-dim focus:ring-2 focus:ring-ring/40"
                  >
                    <option value="hanafi">Hanafi</option>
                    <option value="shafi">Shafi, Maliki, or Hanbali</option>
                  </select>
                </label>
                <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-gold-dim" aria-hidden="true" />
                  Your preference changes the Asr calculation only.
                </p>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3">
                {notifications.enabled ? <Bell className="size-5 text-emerald" aria-hidden="true" /> : <BellOff className="size-5 text-muted-foreground" aria-hidden="true" />}
                <h3 className="font-semibold text-foreground">Prayer notifications</h3>
              </div>
              <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/30 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Remind me at prayer time</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{notifications.enabled ? "Reminders are active on this device." : "Receive a reminder for each upcoming prayer."}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifications.enabled}
                  aria-label="Toggle prayer notifications"
                  disabled={notificationBusy}
                  onClick={toggleNotifications}
                  className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", notifications.enabled ? "bg-emerald" : "bg-muted")}
                >
                  <span className={cn("absolute top-1 size-5 rounded-full bg-foreground shadow-sm transition-transform", notifications.enabled ? "translate-x-6" : "translate-x-1")} />
                </button>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">On web, your browser will ask for permission. Native apps can schedule reminders through the operating system.</p>
              <div className="mt-5 flex min-h-5 items-center gap-2 text-xs text-emerald" aria-live="polite">
                {saved && <><Check className="size-3.5" aria-hidden="true" /> Settings saved</>}
                {notificationBusy && <><RefreshCw className="size-3.5 animate-spin" aria-hidden="true" /> Updating notifications</>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
