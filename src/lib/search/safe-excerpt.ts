export interface SearchExcerptSegment {
  text: string
  highlighted: boolean
}

/**
 * Pagefind marks matched text with <mark> tags. Keep only those exact tags and
 * return the content as text so an unexpected HTML fragment can never become
 * executable markup in the search results.
 */
export function splitSearchExcerpt(excerpt: string): SearchExcerptSegment[] {
  const segments: SearchExcerptSegment[] = []
  const parts = excerpt.split(/(<mark>|<\/mark>)/i)
  let highlighted = false

  for (const part of parts) {
    if (part.toLowerCase() === "<mark>") {
      highlighted = true
      continue
    }
    if (part.toLowerCase() === "</mark>") {
      highlighted = false
      continue
    }
    if (part) segments.push({ text: part, highlighted })
  }

  return segments
}
