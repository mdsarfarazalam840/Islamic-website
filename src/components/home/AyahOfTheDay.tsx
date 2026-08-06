import { getDailyPools } from "@/lib/home/dailyPool"
import { DailyReminder } from "./DailyReminder"

// Server component: resolves the Quran + Hadith pools from the local data at
// build time, then hands them to the client <DailyReminder>, which decides
// which item to show based on the visitor's own local date. This is what makes
// the card actually change every day on a static export (`output: "export"`) —
// the server render is frozen at build time, so the day logic must run client-
// side. Even days show an ayah, odd days a hadith.
export function AyahOfTheDay() {
  const pools = getDailyPools()
  if (pools.quran.length === 0 && pools.hadith.length === 0) return null

  // Seed the first paint with the build date so server/client markup match on
  // hydration; the client immediately recomputes from the real local date.
  const buildDay = Math.floor(Date.now() / 86_400_000)

  return <DailyReminder pools={pools} serverDay={buildDay} />
}
