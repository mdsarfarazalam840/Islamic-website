import type { Metadata } from "next"
import { DuaLibrary } from "@/components/duas/DuaLibrary"

export const metadata: Metadata = {
  title: "Duas & Adhkar — Noor",
  description: "Browse categorized duas and adhkar with Arabic, translations, hadith sources, references, favorites, and audio.",
}

export default function DuasPage() {
  return <DuaLibrary />
}
