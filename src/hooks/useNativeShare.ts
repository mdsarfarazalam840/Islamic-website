"use client"

import { useCallback, useState } from "react"
import { detectPlatform } from "@/lib/platform"

interface ShareOptions {
  title: string
  text: string
  url?: string
}

export function useNativeShare() {
  const [isSharing, setIsSharing] = useState(false)

  const share = useCallback(async (options: ShareOptions) => {
    const platform = detectPlatform()
    setIsSharing(true)

    try {
      if (platform === "capacitor") {
        const { Share } = await import("@capacitor/share")
        await Share.share({
          title: options.title,
          text: options.text,
          url: options.url,
          dialogTitle: options.title,
        })
      } else if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        })
      } else {
        await navigator.clipboard.writeText(
          `${options.text}${options.url ? `\n${options.url}` : ""}`
        )
      }
    } finally {
      setIsSharing(false)
    }
  }, [])

  return { share, isSharing }
}
