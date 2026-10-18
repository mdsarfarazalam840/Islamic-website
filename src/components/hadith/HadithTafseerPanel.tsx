"use client"

import { useCallback, useState } from "react"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { fetchHindiTafseerBook, type HindiTafseer } from "@/lib/hadith/hindiTafseer"

interface HadithTafseerPanelProps {
  collection: string
  bookId: number
  hadithNumber: number
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; entry: HindiTafseer | null }
  | { status: "error" }

/**
 * How the Hindi `text` was produced, said out loud. Four provenances share this
 * panel and they are not equally trustworthy — the transliteration is machine
 * output with guessed short vowels, so presenting it identically to a
 * hand-checked translation would misrepresent it. See the `textSource` doc in
 * src/lib/hadith/hindiTafseer.ts.
 */
const TEXT_PROVENANCE: Record<NonNullable<HindiTafseer["textSource"]>, string> = {
  ur: "उर्दू अनुवाद से · translated from the Urdu",
  en: "अंग्रेज़ी अनुवाद से · translated from the English",
  "ur-translit": "उर्दू से मशीनी लिप्यंतरण, अभी अनचेका · machine transliteration of the Urdu, not reviewed",
}

/**
 * Hindi text and explanation for one hadith, collapsed until asked for.
 *
 * The two halves have very different coverage. The hadith text itself is Hindi
 * for nearly the whole corpus, mostly by transliteration from the Urdu. The
 * explanation comes from hadeethenc.com — a curated set of a few thousand
 * hadiths joined to our ~34k by Arabic text matching — so a hadith with text but
 * no explanation is the ordinary case, not a failure. The panel renders whichever
 * halves exist and labels where the text came from, rather than leaving a reader
 * to guess whether something failed to load or was never reviewed.
 */
export function HadithTafseerPanel({ collection, bookId, hadithNumber }: HadithTafseerPanelProps) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>({ status: "idle" })

  const handleToggle = useCallback(async () => {
    const next = !open
    setOpen(next)
    if (!next || state.status !== "idle") return

    setState({ status: "loading" })
    try {
      const book = await fetchHindiTafseerBook(collection, bookId)
      setState({ status: "ready", entry: book[String(hadithNumber)] ?? null })
    } catch {
      setState({ status: "error" })
    }
  }, [open, state.status, collection, bookId, hadithNumber])

  return (
    <div className="mt-3 pt-3 border-t border-gold-dim/10">
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-gold-light transition-colors"
        aria-expanded={open}
      >
        <span className="uppercase tracking-wider">हिन्दी · Hindi</span>
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-gold-dim/10 bg-card/60 p-3 text-sm leading-relaxed">
          {state.status === "loading" && (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              लोड हो रहा है…
            </span>
          )}

          {state.status === "error" && (
            <span className="text-xs text-muted-foreground/60">
              तफ़सीर लोड नहीं हो सकी. फिर कोशिश करें. / Could not load the tafseer — try again.
            </span>
          )}

          {state.status === "ready" && !state.entry && (
            <span className="text-xs text-muted-foreground/60">
              इस हदीस के लिए हिन्दी उपलब्ध नहीं है. / Hindi not available for this hadith.
            </span>
          )}

          {state.status === "ready" && state.entry && (
            <div className="space-y-3">
              {state.entry.text && (
                <div>
                  <p className="text-foreground/90">{state.entry.text}</p>
                  {state.entry.textSource && (
                    <p className="mt-1.5 text-[10px] text-muted-foreground/60">
                      {TEXT_PROVENANCE[state.entry.textSource]}
                    </p>
                  )}
                </div>
              )}

              {state.entry.explanation && (
                <div className={state.entry.text ? "border-t border-border/10 pt-3" : undefined}>
                  <p className="text-[10px] uppercase tracking-wider text-gold-dim/60 mb-1.5">
                    व्याख्या
                  </p>
                  <p className="text-muted-foreground">{state.entry.explanation}</p>
                </div>
              )}

              {state.entry.hints.length > 0 && (
                <div className="border-t border-border/10 pt-3">
                  <p className="text-[10px] uppercase tracking-wider text-gold-dim/60 mb-1.5">
                    लाभ
                  </p>
                  <ul className="space-y-1.5">
                    {state.entry.hints.map((hint, i) => (
                      <li key={i} className="flex gap-2 text-muted-foreground">
                        <span className="text-gold-dim/40 text-[10px] mt-1.5">◆</span>
                        <span>{hint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/*
                hadeethenc is credited only when something here is actually
                theirs. Most entries are now Hindi text alone, where the source
                is the corpus Urdu and the note under the text already says so —
                crediting hadeethenc for those would be a false citation.
              */}
              {(state.entry.sourceId || state.entry.attribution || state.entry.grade) && (
                <div className="border-t border-border/10 pt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground/70">
                  {state.entry.attribution && <span>{state.entry.attribution}</span>}
                  {state.entry.grade && <span>{state.entry.grade}</span>}
                  {state.entry.sourceId && <span>स्रोत / Source: hadeethenc.com</span>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
