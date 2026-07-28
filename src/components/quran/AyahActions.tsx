"use client"

import { useState, useCallback } from "react"
import { Bookmark, Copy, Share2, Check, ImageDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBookmarks } from "@/hooks/useBookmarks"
import type { Ayah, Surah } from "@/types"

interface AyahActionsProps {
  ayah: Ayah
  surah: Surah
}

export function AyahActions({ ayah, surah }: AyahActionsProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks()
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  const bookmarkId = `ayah-${ayah.number}`

  const handleCopy = useCallback(async () => {
    const text = `${ayah.arabic}\n\n${ayah.translations.en}\n\n— ${surah.name} ${ayah.ayahNumber}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [ayah, surah])

  const handleShareImage = useCallback(async () => {
    const W = 900, H = 500
    const canvas = document.createElement("canvas")
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext("2d")!

    // Background
    ctx.fillStyle = "#0d1117"
    ctx.fillRect(0, 0, W, H)

    // Gold top border
    ctx.fillStyle = "#c9a84c"
    ctx.fillRect(0, 0, W, 4)

    // Arabic text (RTL, centred)
    ctx.direction = "rtl"
    ctx.textAlign = "center"
    ctx.fillStyle = "#f0e6c8"
    ctx.font = `36px "Noto Naskh Arabic", serif`
    const arabic = ayah.arabic
    // Wrap long Arabic lines
    const maxW = W - 80
    const words = arabic.split(" ")
    const lines: string[] = []
    let line = ""
    for (const w of words) {
      const test = line ? `${w} ${line}` : w
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line); line = w
      } else { line = test }
    }
    if (line) lines.push(line)
    const arabicStartY = lines.length > 2 ? 80 : 100
    lines.forEach((l, i) => ctx.fillText(l, W / 2, arabicStartY + i * 52))

    // Divider
    const divY = arabicStartY + lines.length * 52 + 20
    ctx.strokeStyle = "#c9a84c44"
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(80, divY); ctx.lineTo(W - 80, divY); ctx.stroke()

    // English translation
    ctx.direction = "ltr"
    ctx.textAlign = "center"
    ctx.fillStyle = "#a0a8b8"
    ctx.font = `18px system-ui, sans-serif`
    const engWords = ayah.translations.en.split(" ")
    const engLines: string[] = []
    let eLine = ""
    for (const w of engWords) {
      const test = eLine ? `${eLine} ${w}` : w
      if (ctx.measureText(test).width > maxW && eLine) {
        engLines.push(eLine); eLine = w
      } else { eLine = test }
    }
    if (eLine) engLines.push(eLine)
    const engStartY = divY + 36
    engLines.slice(0, 4).forEach((l, i) => ctx.fillText(l, W / 2, engStartY + i * 28))

    // Reference
    ctx.fillStyle = "#c9a84c"
    ctx.font = `bold 15px system-ui, sans-serif`
    ctx.fillText(`— ${surah.name} ${ayah.ayahNumber}`, W / 2, H - 40)

    // Try Web Share with blob, else download
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], `ayah-${surah.number}-${ayah.ayahNumber}.png`, { type: "image/png" })
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: surah.name }); return } catch { /* cancelled */ }
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = file.name; a.click()
      URL.revokeObjectURL(url)
    }, "image/png")
  }, [ayah, surah])

  const handleShare = useCallback(async () => {
    const text = `${ayah.arabic}\n\n${ayah.translations.en}\n\n— ${surah.name} ${ayah.ayahNumber}\n\nhttps://noor-quran.vercel.app/quran/${surah.number}#ayah-${ayah.number}`
    try {
      if (navigator.share) {
        await navigator.share({ title: surah.name, text })
        return
      }
    } catch {
      // User cancelled
    }
    await navigator.clipboard.writeText(text)
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }, [ayah, surah])

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button
        onClick={() =>
          toggleBookmark({
            id: bookmarkId,
            type: "ayah",
            reference: `${surah.name} ${ayah.ayahNumber}`,
            text: ayah.translations.en.slice(0, 100),
          })
        }
        className={cn(
          "rounded-lg p-2 transition-all duration-200",
          isBookmarked(bookmarkId)
            ? "text-secondary bg-secondary/10"
            : "text-muted-foreground hover:text-secondary hover:bg-secondary/5",
        )}
        aria-label={isBookmarked(bookmarkId) ? "Remove bookmark" : "Bookmark this ayah"}
      >
        <Bookmark className={cn("size-4", isBookmarked(bookmarkId) && "fill-secondary")} />
      </button>

      <button
        onClick={handleCopy}
        className="rounded-lg p-2 text-muted-foreground hover:text-secondary hover:bg-secondary/5 transition-all duration-200"
        aria-label="Copy ayah"
      >
        {copied ? <Check className="size-4 text-accent" /> : <Copy className="size-4" />}
      </button>

      <button
        onClick={handleShare}
        className="rounded-lg p-2 text-muted-foreground hover:text-secondary hover:bg-secondary/5 transition-all duration-200"
        aria-label="Share ayah"
      >
        {shared ? <Check className="size-4 text-accent" /> : <Share2 className="size-4" />}
      </button>

      <button
        onClick={handleShareImage}
        className="rounded-lg p-2 text-muted-foreground hover:text-secondary hover:bg-secondary/5 transition-all duration-200"
        aria-label="Save as image"
      >
        <ImageDown className="size-4" />
      </button>
    </div>
  )
}
