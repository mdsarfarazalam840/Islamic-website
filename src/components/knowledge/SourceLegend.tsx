import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Legend explaining the source-strength color scheme (DESIGN.md §9). Shown on
// article detail pages so the provenance badges are self-documenting.
const ITEMS: { label: string; className: string; variant?: "emerald" | "gold" }[] = [
  { label: "Sahih / Qur'an", variant: "emerald", className: "" },
  { label: "Hasan", variant: "gold", className: "" },
  { label: "Da'if", className: "border border-border/20 bg-space-mid/30 text-muted-foreground" },
]

export function SourceLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground">Source strength:</span>
      {ITEMS.map((item) => (
        <Badge key={item.label} variant={item.variant} className={item.className}>
          {item.label}
        </Badge>
      ))}
    </div>
  )
}
