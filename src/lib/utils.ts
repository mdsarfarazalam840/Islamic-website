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

