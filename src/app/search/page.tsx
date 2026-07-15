import type { Metadata } from "next"
import { SearchClient } from "./SearchClient"

export const metadata: Metadata = {
  title: "Search — Noor",
  description: "Search across the entire Quran with translations in English, Hindi, and Urdu.",
}

export default function SearchPage() {
  return <SearchClient />
}
