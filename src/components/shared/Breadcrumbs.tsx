import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Crumb {
  label: string
  href?: string
}

/** Breadcrumb trail. The final crumb (no href) renders as the current page. */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("mb-6", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-gold-light transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast && "text-foreground")} aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight className="size-3.5 text-muted-foreground/50" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
