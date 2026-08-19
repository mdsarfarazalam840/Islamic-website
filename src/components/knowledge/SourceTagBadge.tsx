import { BookOpen, MessageSquareText, ScrollText, Footprints } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getCollectionDisplayName } from "@/lib/hadith/collections"
import type { HadithGrade, SourceTag } from "@/types"

const GRADE_LABEL: Record<HadithGrade, string> = {
  sahih: "Sahih",
  hasan: "Hasan",
  daif: "Da'if",
}

// Da'if has no Badge variant; per DESIGN.md §9 it renders muted. (Sahih/Quran =
// emerald, Hasan = gold are covered by the built-in variants.)
const DAIF_CLASS = "border border-border/20 bg-space-mid/30 text-muted-foreground"
const NEUTRAL_CLASS = "border border-gold-dim/20 bg-gold-dim/5 text-muted-foreground"

interface SourceTagBadgeProps {
  source: SourceTag
  className?: string
}

/** One SourceTag rendered as a strength-colored provenance badge. */
export function SourceTagBadge({ source, className }: SourceTagBadgeProps) {
  switch (source.type) {
    case "quran":
      return (
        <Badge variant="emerald" className={cn("gap-1", className)}>
          <BookOpen className="size-3" />
          Qur&apos;an {source.ref}
        </Badge>
      )
    case "hadith": {
      const label = `${getCollectionDisplayName(source.collection)} · ${GRADE_LABEL[source.grade]}`
      if (source.grade === "sahih") {
        return (
          <Badge variant="emerald" className={cn("gap-1", className)}>
            <MessageSquareText className="size-3" />
            {label}
          </Badge>
        )
      }
      if (source.grade === "hasan") {
        return (
          <Badge variant="gold" className={cn("gap-1", className)}>
            <MessageSquareText className="size-3" />
            {label}
          </Badge>
        )
      }
      return (
        <Badge className={cn("gap-1", DAIF_CLASS, className)}>
          <MessageSquareText className="size-3" />
          {label}
        </Badge>
      )
    }
    case "tafsir":
      return (
        <Badge className={cn("gap-1", NEUTRAL_CLASS, className)}>
          <ScrollText className="size-3" />
          Tafsir {source.scholar}
        </Badge>
      )
    case "seerah":
      return (
        <Badge className={cn("gap-1", NEUTRAL_CLASS, className)}>
          <Footprints className="size-3" />
          Seerah
        </Badge>
      )
  }
}
