import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// On the subpath deploy (GitHub Pages project site) the app is served from
// /<repo>/. next/link prefixes routes with basePath automatically, but manual
// fetch() calls to static files under /public do not get that treatment — so
// prepend it here. NEXT_PUBLIC_BASE_PATH is inlined at build time; unset in
// local dev, where assets serve from "/".
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH?.trim().replace(/\/$/, "") || ""

/** Prefix an absolute public-asset path (e.g. "/data/…") with the deploy basePath. */
export function assetPath(path: string): string {
  const rel = path.startsWith("/") ? path : `/${path}`
  return `${BASE_PATH}${rel}`
}

/**
 * Coarse "3 days ago" for saved/resume timestamps. Only ever called from client
 * components rendering localStorage state, so it can't skew a prerender.
 */
export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? "" : "s"} ago`
}

