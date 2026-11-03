import type { Metadata } from "next"
import { KhatmahDashboard } from "@/components/khatmah/KhatmahDashboard"
import { getJuzIndex } from "@/lib/quran/juz"

export const metadata: Metadata = {
  title: "Quran Khatmah — Noor",
  description: "Create a Quran reading plan with daily goals, Juz progress, streaks, estimated completion, and gentle reminders.",
}

export default function KhatmahPage() {
  return <KhatmahDashboard juzIndex={getJuzIndex()} />
}
