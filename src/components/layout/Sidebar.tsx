"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SidebarProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

import { useEffect, useRef } from "react"

export function Sidebar({ open, onClose, title, children }: SidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement
    sidebarRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "Tab") {
        const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("keydown", handleKey)
      prev?.focus()
    }
  }, [open, onClose])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        ref={sidebarRef}
        tabIndex={-1}
        className={cn(
          "fixed top-16 bottom-0 right-0 z-50 w-80 border-l border-border/50 glass",
          "transform transition-transform duration-300 ease-in-out",
          "outline-none",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-label={title || "Sidebar"}
        role="dialog"
        aria-modal={open}
      >
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          {title && (
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close sidebar">
            <X className="size-4" />
          </Button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-57px)] p-4">
          {children}
        </div>
      </aside>
    </>
  )
}
