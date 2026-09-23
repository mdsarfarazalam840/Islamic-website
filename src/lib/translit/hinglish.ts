/**
 * Devanagari → Hinglish (Hindi in Latin script — `hi-Latn`).
 *
 * Only this direction is mechanised, on purpose. Devanagari writes every vowel
 * explicitly, so Devanagari → Latin is a deterministic table lookup. The reverse
 * is not (`ki` could be कि or की), which is why Devanagari stays the stored form
 * everywhere and Hinglish is derived: at render time in the browser, and at index
 * time in scripts/build-pagefind-index.mjs. One implementation, no second copy of
 * the corpus, nothing to keep in sync.
 *
 * Dependency-free and side-effect-free by requirement: this runs in the browser
 * (lib/quran/tafsir.ts fetches Hindi tafsir at runtime) and under tsx in the
 * Pagefind build. No `node:*`, no I/O.
 */

/** Matras. Long and short i/u both collapse to `i`/`u` — nobody writes *raheem*. */
const VOWEL_SIGNS: Record<string, string> = {
  "ा": "aa", // ा  resolved to a/aa later, see resolveLongA
  "ि": "i", // ि
  "ी": "i", // ी
  "ु": "u", // ु
  "ू": "u", // ू
  "ृ": "ri", // ृ
  "ॄ": "ri", // ॄ
  "ॅ": "e", // ॅ  candra e
  "ॆ": "e", // ॆ
  "े": "e", // े
  "ै": "ai", // ै
  "ॉ": "o", // ॉ  candra o
  "ॊ": "o", // ॊ
  "ो": "o", // ो
  "ौ": "au", // ौ
  "ॎ": "e", // ॎ  prishthamatra e
  "ॏ": "aw", // ॏ
  "ॢ": "li", // ॢ
  "ॣ": "li", // ॣ
}

const INDEP_VOWELS: Record<string, string> = {
  "ऄ": "e", // ऄ
  "अ": "a", // अ
  "आ": "aa", // आ
  "इ": "i", // इ
  "ई": "i", // ई
  "उ": "u", // उ
  "ऊ": "u", // ऊ
  "ऋ": "ri", // ऋ
  "ऌ": "li", // ऌ
  "ऍ": "e", // ऍ
  "ऎ": "e", // ऎ
  "ए": "e", // ए
  "ऐ": "ai", // ऐ
  "ऑ": "o", // ऑ
  "ऒ": "o", // ऒ
  "ओ": "o", // ओ
  "औ": "au", // औ
  "ॠ": "ri", // ॠ
  "ॡ": "li", // ॡ
  "ॲ": "a", // ॲ
  "ॳ": "au", // ॳ
  "ॴ": "au", // ॴ
  "ॵ": "o", // ॵ
  "ॶ": "u", // ॶ
  "ॷ": "u", // ॷ
}

const CONS: Record<string, string> = {
  "क": "k", // क
  "ख": "kh", // ख
  "ग": "g", // ग
  "घ": "gh", // घ
  "ङ": "ng", // ङ
  "च": "ch", // च
  "छ": "chh", // छ
  "ज": "j", // ज
  "झ": "jh", // झ
  "ञ": "ny", // ञ
  "ट": "t", // ट
  "ठ": "th", // ठ
  "ड": "d", // ड
  "ढ": "dh", // ढ
  "ण": "n", // ण
  "त": "t", // त
  "थ": "th", // थ
  "द": "d", // द
  "ध": "dh", // ध
  "न": "n", // न
  "ऩ": "n", // ऩ
  "प": "p", // प
  "फ": "ph", // फ
  "ब": "b", // ब
  "भ": "bh", // भ
  "म": "m", // म
  "य": "y", // य
  "र": "r", // र
  "ऱ": "r", // ऱ
  "ल": "l", // ल
  "ळ": "l", // ळ
  "ऴ": "l", // ऴ
  "व": "v", // व
  "श": "sh", // श
  "ष": "sh", // ष
  "स": "s", // स
  "ह": "h", // ह
  // Pre-composed nuqta forms. Also reachable as base + U+093C, handled below.
  "क़": "q", // क़
  "ख़": "kh", // ख़
  "ग़": "gh", // ग़
  "ज़": "z", // ज़
  "ड़": "r", // ड़
  "ढ़": "rh", // ढ़
  "फ़": "f", // फ़
  "य़": "y", // य़
  // Sindhi implosives and rare additions — vanishingly rare in this corpus, but
  // mapped so the no-Devanagari-survives invariant holds.
  "ॸ": "z", // ॸ
  "ॹ": "y", // ॹ
  "ॺ": "y", // ॺ
  "ॻ": "g", // ॻ
  "ॼ": "j", // ॼ
  "ॾ": "d", // ॾ
  "ॿ": "b", // ॿ
}

/** base consonant + nuqta (U+093C) → the nuqta'd sound. */
const NUQTA_MAP: Record<string, string> = {
  k: "q",
  kh: "kh",
  g: "gh",
  j: "z",
  d: "r",
  dh: "rh",
  ph: "f",
  y: "y",
}

/** Standalone characters that are neither consonant nor vowel. */
const STANDALONE: Record<string, string> = {
  "ॐ": "om", // ॐ
  "॰": ".", // ॰  abbreviation sign
  "ॱ": "", // ॱ  high spacing dot
  "ॽ": "'", // ॽ  glottal stop
}

const VIRAMA = "्" // ्
const NUQTA = "़" // ़
const ANUSVARA = "ं" // ं
const CHANDRABINDU = "ँ" // ँ
const INVERTED_CANDRABINDU = "ऀ" // ऀ
const VISARGA = "ः" // ः

/** Vedic accents and other combining marks that carry no Latin equivalent. */
const DROPPED = new Set([
  "॑",
  "॒",
  "॓",
  "॔",
  "ॕ",
  "ॖ",
  "ॗ",
  "‌", // ZWNJ
  "‍", // ZWJ
])

/** Devanagari digits ० — ९. */
const DIGIT_BASE = 0x0966

/**
 * Words the tables get wrong, and always will. Two kinds:
 *  - function words whose conventional Roman spelling is fixed by usage
 *    (`में` is *mein*, never *men*),
 *  - Arabic/Persian religious vocabulary, listed under both the correct nuqta
 *    spelling and the bare spelling our sources actually use (`काफिर` for
 *    `काफ़िर`), since a missing nuqta otherwise yields *kaaphir*.
 * Cheap to extend; every entry is permanent.
 */
const OVERRIDES: Record<string, string> = {
  // --- function words -----------------------------------------------------
  "में": "mein", // में
  "मैं": "main", // मैं
  "नहीं": "nahi", // नहीं
  "है": "hai", // है
  "हैं": "hain", // हैं
  "हूँ": "hun", // हूँ
  "थे": "the", // थे
  "कि": "ki", // कि
  "की": "ki", // की
  "यह": "yah", // यह
  "वह": "vah", // वह
  "क्या": "kya", // क्या
  "क्यों": "kyon", // क्यों
  "कहाँ": "kahan", // कहाँ
  "यहाँ": "yahan", // यहाँ
  "वहाँ": "vahan", // वहाँ
  "लिए": "liye", // लिए
  "लिये": "liye", // लिये
  "पहले": "pehle", // पहले
  "बिना": "bina", // बिना
  "तारीफ़": "taarif", // तारीफ़
  "तारीफ": "taarif", // तारीफ
  // --- religious vocabulary ----------------------------------------------
  "अल्लाह": "Allah", // अल्लाह
  "काफ़िर": "kafir", // काफ़िर
  "काफिर": "kafir", // काफिर
  "फ़ैसला": "faisla", // फ़ैसला
  "फैसला": "faisla", // फैसला
  "क़ुरआन": "Quran", // क़ुरआन
  "कुरआन": "Quran", // कुरआन
  "क़ुरान": "Quran", // क़ुरान
  "कुरान": "Quran", // कुरान
  "नमाज़": "namaz", // नमाज़
  "नमाज": "namaz", // नमाज
  "रोज़ा": "roza", // रोज़ा
  "रोजा": "roza", // रोजा
  "ज़कात": "zakat", // ज़कात
  "जकात": "zakat", // जकात
  "हज": "hajj", // हज
  "ईमान": "imaan", // ईमान
  "क़यामत": "qayamat", // क़यामत
  "कयामत": "qayamat", // कयामत
  "फ़रिश्ता": "farishta", // फ़रिश्ता
  "फरिश्ता": "farishta", // फरिश्ता
  "फ़र्ज़": "farz", // फ़र्ज़
  "फर्ज": "farz", // फर्ज
  "तफ़सीर": "tafseer", // तफ़सीर
  "तफसीर": "tafseer", // तफसीर
  "कुफ़्र": "kufr", // कुफ़्र
  "कुफ्र": "kufr", // कुफ्र
  "रहीम": "raheem", // रहीम
  "वुजू": "wuzu", // वुजू
}

/** One syllable unit. `v: ""` = bare consonant (virama or deleted schwa). */
interface Unit {
  c: string
  v: string
  /** Set for characters passed through verbatim (Latin, punctuation, digits). */
  raw?: string
}

function units(word: string): Unit[] {
  const out: Unit[] = []
  for (let i = 0; i < word.length; i++) {
    const ch = word[i]

    if (DROPPED.has(ch)) continue

    if (CONS[ch]) {
      let c = CONS[ch]
      if (word[i + 1] === NUQTA) {
        c = NUQTA_MAP[c] ?? c
        i++
      }
      if (word[i + 1] === VIRAMA) {
        out.push({ c, v: "" })
        i++
        continue
      }
      const sign = VOWEL_SIGNS[word[i + 1]]
      if (sign !== undefined) {
        out.push({ c, v: sign })
        i++
      } else {
        out.push({ c, v: "a" }) // inherent schwa
      }
      continue
    }

    if (INDEP_VOWELS[ch]) {
      out.push({ c: "", v: INDEP_VOWELS[ch] })
      continue
    }

    if (ch === ANUSVARA || ch === CHANDRABINDU || ch === INVERTED_CANDRABINDU) {
      // n before dentals, m before labials: संदेश → sandesh, अंबर → ambar.
      const next = word[i + 1]
      const labial = next !== undefined && "पफबभम".includes(next)
      out.push({ c: labial ? "m" : "n", v: "" })
      continue
    }

    if (ch === VISARGA) {
      out.push({ c: "h", v: "" })
      continue
    }

    const code = ch.codePointAt(0)!
    if (code >= DIGIT_BASE && code <= DIGIT_BASE + 9) {
      out.push({ c: "", v: "", raw: String(code - DIGIT_BASE) })
      continue
    }

    const standalone = STANDALONE[ch]
    if (standalone !== undefined) {
      out.push({ c: "", v: "", raw: standalone })
      continue
    }

    // --- malformed input recovery -----------------------------------------
    // The corpus really does contain broken Devanagari: matras after a virama
    // (ख्ािंच for खींच), independent vowels carrying a matra (अौर for और),
    // word-initial nuqta, doubled viramas (गिरफ््तार). A combining mark reached
    // here was consumed by no consonant, so attach it to the preceding unit as
    // best we can — the invariant that must never break is that no Devanagari
    // reaches the output. Units holding pass-through `raw` text are skipped as
    // anchors, since they render their raw string and would swallow the mark.
    const prev = out[out.length - 1]
    const anchor = prev !== undefined && prev.raw === undefined ? prev : undefined

    const orphanVowel = VOWEL_SIGNS[ch]
    if (orphanVowel !== undefined) {
      // Fill an empty slot (ड्ी → *ddi*), or re-vowel a bare independent vowel
      // (अौर → *aur*); otherwise stand alone.
      if (anchor && (!anchor.v || anchor.c === "")) anchor.v = orphanVowel
      else out.push({ c: "", v: orphanVowel })
      continue
    }
    if (ch === VIRAMA) {
      if (anchor) anchor.v = ""
      continue
    }
    if (ch === NUQTA) {
      if (anchor) anchor.c = NUQTA_MAP[anchor.c] ?? anchor.c
      continue
    }

    out.push({ c: "", v: "", raw: ch })
  }
  return out
}

/**
 * Schwa deletion — the one place a mechanical mapper goes wrong. Three rules:
 *  - word-final inherent `a` drops, unless the word is monosyllabic (*na*, *ka*
 *    survive) or the final consonant is a semivowel closing a cluster
 *    (वाक्य → *vaakya*, while सब्र → *sabr* still drops);
 *  - medial inherent `a` drops when both neighbours carry a vowel, scanned right
 *    to left: *ra-ha-maan* → *rahmaan*, *ka-ra-ne* → *karne*, *u-sa-ke* → *uske*;
 *  - never the first syllable: नमाज़ stays *namaaz*, not *nmaaz*.
 */
function deleteSchwas(u: Unit[]): void {
  const vowelled = u.filter((x) => x.v).length
  const last = u[u.length - 1]

  if (last && last.v === "a" && vowelled > 1) {
    const prev = u[u.length - 2]
    const clusterFinalSemivowel =
      prev !== undefined && !prev.v && prev.c !== "" && (last.c === "y" || last.c === "v")
    if (!clusterFinalSemivowel) last.v = ""
  }

  for (let i = u.length - 2; i >= 1; i--) {
    if (u[i].v !== "a" || !u[i].c) continue
    const prev = u[i - 1]
    const next = u[i + 1]
    if (prev.v && next.v && next.c) u[i].v = ""
  }
}

/**
 * `ा`/`आ` is `aa` in a closed syllable and `a` in an open one — the rule that
 * turns *aasamaanaon* into *aasmanon*. Word-initial long-a is exempt so that
 * तारीफ़ is *taarif* and पानी is *paani*, but monosyllables are not, so का stays
 * *ka* rather than *kaa*.
 *
 * Must run after deleteSchwas: it is schwa deletion that makes रहमान's `म` close.
 */
function resolveLongA(u: Unit[]): void {
  for (let i = 0; i < u.length; i++) {
    if (u[i].v !== "aa") continue
    if (i === 0 && u.length >= 2) continue // word-initial, keep aa
    const next = u[i + 1]
    const closed = next !== undefined && next.v === "" && next.c !== ""
    if (!closed) u[i].v = "a"
  }
}

const wordCache = new Map<string, string>()

function transliterateWord(word: string): string {
  const cached = wordCache.get(word)
  if (cached !== undefined) return cached

  const override = OVERRIDES[word]
  if (override !== undefined) {
    wordCache.set(word, override)
    return override
  }

  const u = units(word)
  let result: string
  if (!u.length) {
    result = word
  } else {
    deleteSchwas(u)
    resolveLongA(u)
    result = u
      .map((x) => (x.raw !== undefined ? x.raw : x.c + x.v))
      .join("")
      // Collapse vowel runs created at unit boundaries: क़ुरआन would otherwise
      // give *quraaan*.
      .replace(/([aeiou])\1{2,}/g, "$1$1")
  }

  wordCache.set(word, result)
  return result
}

/**
 * Runs of Devanagari, including the joiners that can appear inside a word.
 * Danda and double danda (U+0964/U+0965) are deliberately excluded: they are
 * sentence punctuation, and leaving them in the class would glue them to the
 * preceding word and defeat every OVERRIDES lookup ("है।" would never match
 * "है"). They are replaced before this runs.
 */
const DEVANAGARI_RUN = /[ऀ-ॣ०-ॿ‌‍]+/g

/** Danda → full stop, handled before word transliteration. See DEVANAGARI_RUN. */
const DANDA = /[।॥]/g

/**
 * Transliterate every Devanagari run in `text`, leaving everything else — Latin,
 * Arabic, punctuation, markup — untouched. Safe to call on mixed-script strings
 * and on text with no Devanagari at all.
 */
export function toHinglish(text: string): string {
  if (!text) return text
  return text.replace(DANDA, ".").replace(DEVANAGARI_RUN, transliterateWord)
}
