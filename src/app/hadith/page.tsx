import type { Metadata } from "next"
import { MessageSquareText } from "lucide-react"
import { CollectionCard } from "@/components/hadith/CollectionCard"
import { getCollections } from "@/lib/hadith/translations"

export const metadata: Metadata = {
  title: "Hadith Collections — Noor",
  description: "Explore authentic Hadith collections — Sahih al-Bukhari and Sahih Muslim.",
}

export default function HadithPage() {
  const collections = getCollections()

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquareText className="size-6 text-secondary" />
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Hadith Collections</h1>
          <p className="text-sm text-muted-foreground">Authentic sayings of the Prophet Muhammad (ﷺ)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {collections.map((collection) => (
          <CollectionCard
            key={collection.id}
            id={collection.id}
            name={collection.name}
            nameArabic={collection.nameArabic}
            description={collection.description}
            totalHadith={collection.totalHadith}
            totalBooks={collection.totalBooks}
          />
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border/50 bg-card p-6">
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">
          About These Collections
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Hadith are the collected sayings, actions, and approvals of the Prophet Muhammad (ﷺ).
            Together with the Quran, they form the primary sources of Islamic guidance.
          </p>
          <p>
            <strong className="text-foreground">Sahih al-Bukhari</strong> is widely regarded as the most authentic
            book after the Quran. Imam al-Bukhari spent 16 years collecting over 600,000 hadith,
            selecting only ~7,500 authentic ones based on strict criteria.
          </p>
          <p>
            <strong className="text-foreground">Sahih Muslim</strong> is the second most authentic collection,
            compiled by Imam Muslim. It shares ~2,000 hadith with Bukhari but includes unique narrations
            with different chains of transmission.
          </p>
        </div>
      </div>
    </div>
  )
}
