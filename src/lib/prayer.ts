import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan"

export const CALCULATION_METHODS = [
  { value: "MuslimWorldLeague", label: "Muslim World League", detail: "18° Fajr · 17° Isha" },
  { value: "Egyptian", label: "Egyptian General Authority", detail: "19.5° Fajr · 17.5° Isha" },
  { value: "Karachi", label: "University of Islamic Sciences, Karachi", detail: "18° Fajr · 18° Isha" },
  { value: "UmmAlQura", label: "Umm al-Qura University, Makkah", detail: "18.5° Fajr · 90 min Isha" },
  { value: "NorthAmerica", label: "Islamic Society of North America", detail: "15° Fajr · 15° Isha" },
  { value: "Singapore", label: "Singapore", detail: "20° Fajr · 18° Isha" },
  { value: "Turkey", label: "Diyanet, Turkey", detail: "18° Fajr · 17° Isha" },
] as const

export type PrayerCalculationMethod = (typeof CALCULATION_METHODS)[number]["value"]
export type PrayerMadhhab = "shafi" | "hanafi"

export interface PrayerSettings {
  city: string
  country: string
  latitude: number
  longitude: number
  calculationMethod: PrayerCalculationMethod
  madhhab: PrayerMadhhab
}

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  city: "New Delhi",
  country: "India",
  latitude: 28.6139,
  longitude: 77.209,
  calculationMethod: "MuslimWorldLeague",
  madhhab: "hanafi",
}

export interface PrayerTime {
  name: "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha"
  time: Date
  icon: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"
}

export interface PrayerSchedule {
  date: Date
  prayers: PrayerTime[]
}

export function getCalculationParameters(settings: Pick<PrayerSettings, "calculationMethod" | "madhhab">) {
  const params = CalculationMethod[settings.calculationMethod]()
  params.madhab = settings.madhhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi
  return params
}

export function calculatePrayerSchedule(date: Date, settings: PrayerSettings): PrayerSchedule {
  const prayerTimes = new PrayerTimes(
    new Coordinates(settings.latitude, settings.longitude),
    date,
    getCalculationParameters(settings),
  )

  return {
    date,
    prayers: [
      { name: "Fajr", time: prayerTimes.fajr, icon: "fajr" },
      { name: "Dhuhr", time: prayerTimes.dhuhr, icon: "dhuhr" },
      { name: "Asr", time: prayerTimes.asr, icon: "asr" },
      { name: "Maghrib", time: prayerTimes.maghrib, icon: "maghrib" },
      { name: "Isha", time: prayerTimes.isha, icon: "isha" },
    ],
  }
}

export function getNextPrayer(schedule: PrayerSchedule, now: Date, settings: PrayerSettings) {
  const next = schedule.prayers.find((prayer) => prayer.time.getTime() > now.getTime())
  if (next) return { ...next, isTomorrow: false }

  const tomorrow = new Date(schedule.date)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowSchedule = calculatePrayerSchedule(tomorrow, settings)

  return { ...tomorrowSchedule.prayers[0], isTomorrow: true }
}

export function formatPrayerTime(time: Date) {
  return time.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

export function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":")
}
