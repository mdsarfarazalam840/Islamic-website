"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

// Numbered pagination with a compact page window and prev/next controls.
// Shared by the videos grid and any other paged list; mirrors the styling of
// the hadith book reader so pagination looks consistent site-wide.
export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const pageNumbers = getPageWindow(currentPage, totalPages)

  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-1.5 pt-6${className ? ` ${className}` : ""}`}
      aria-label="Pagination"
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 rounded-lg border border-gold-dim/20 bg-card/40 px-3 py-2 text-sm font-medium text-gold-light transition-all hover:border-gold-dim/40 hover:bg-gold-dim/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gold-dim/20 disabled:hover:bg-card/40"
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      {pageNumbers.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`e-${i}`}
            className="px-2 text-sm text-muted-foreground/60 select-none"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? "page" : undefined}
            className={
              p === currentPage
                ? "min-w-9 rounded-lg border border-gold-dim/40 bg-gold-dim/15 px-3 py-2 text-sm font-semibold text-gold-light"
                : "min-w-9 rounded-lg border border-border/20 bg-card/40 px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-gold-dim/30 hover:text-gold-light"
            }
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 rounded-lg border border-gold-dim/20 bg-card/40 px-3 py-2 text-sm font-medium text-gold-light transition-all hover:border-gold-dim/40 hover:bg-gold-dim/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gold-dim/20 disabled:hover:bg-card/40"
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="size-4" />
      </button>
    </nav>
  )
}

// Build a page-number list with ellipses: always show first, last, and a window
// around the current page — e.g. [1, "ellipsis", 4, 5, 6, "ellipsis", 20].
export function getPageWindow(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | "ellipsis")[] = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  if (left > 2) out.push("ellipsis")
  for (let p = left; p <= right; p++) out.push(p)
  if (right < total - 1) out.push("ellipsis")
  out.push(total)
  return out
}
