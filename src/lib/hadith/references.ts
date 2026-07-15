import type { Hadith } from "@/types"

export function formatReference(hadith: Hadith): string {
  const parts = [hadith.reference.collection, hadith.hadithNumber.toString()]
  return parts.join(" ")
}

export function formatFullReference(hadith: Hadith): Record<string, string> {
  return {
    collection: hadith.reference.collection,
    book: hadith.reference.book,
    hadithNumber: hadith.hadithNumber.toString(),
    volume: hadith.reference.volume ? `Vol. ${hadith.reference.volume}` : "",
    uscMsa: hadith.reference.uscMsa ?? "",
  }
}

export function getGradeColor(grade: string): string {
  const g = grade.toLowerCase()
  if (g.includes("sahih")) return "text-emerald"
  if (g.includes("hasan")) return "text-secondary"
  if (g.includes("daif") || g.includes("da'if")) return "text-muted-foreground"
  return "text-muted-foreground"
}

export function getGradeBadge(grade: string): string {
  if (!grade) return ""
  const g = grade.toLowerCase()
  if (g.includes("sahih")) return "Sahih"
  if (g.includes("hasan")) return "Hasan"
  if (g.includes("daif") || g.includes("da'if")) return "Da'if"
  return grade
}
