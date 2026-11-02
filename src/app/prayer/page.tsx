import type { Metadata } from "next"
import { PrayerDashboard } from "@/components/prayer/PrayerDashboard"

export const metadata: Metadata = {
  title: "Prayer Times — Noor",
  description: "View daily prayer times, countdowns, location settings, and prayer notifications.",
}

export default function PrayerPage() {
  return <PrayerDashboard />
}
