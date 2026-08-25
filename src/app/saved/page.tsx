import type { Metadata } from "next"
import { Bookmark } from "lucide-react"
import { SavedClient } from "@/components/saved/SavedClient"

export const metadata: Metadata = {
  title: "Saved — Noor",
  description:
    "Your bookmarked ayahs, hadiths, and articles, plus where you left off reading.",
}

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Bookmark className="size-6 text-gold-light" />
        <div>
          <h1 className="text-2xl font-display gold-gradient-text font-bold">Saved</h1>
          <p className="text-sm text-muted-foreground">
            Your bookmarks and reading positions, kept on this device
          </p>
        </div>
      </div>

      <SavedClient />
    </div>
  )
}
