"use client"

import { useEffect, useState } from "react"

/**
 * Trailing-edge debounce for search box text: keeps the input responsive while
 * the expensive work (Fuse queries, Pagefind fetches, index lookups) only runs
 * once the reader stops typing.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
