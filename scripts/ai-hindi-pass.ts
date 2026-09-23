import fs from "node:fs"
import path from "node:path"

/**
 * AI correction / translation pass over every Hindi surface in the repo, run
 * through the Anthropic Message Batch API.
 *
 * WHAT IT TOUCHES (one "section" each, selectable via SECTIONS):
 *
 *   quran      proofread  public/data/quran/*.json          translations.hi
 *   surah      translate  src/data/quran/surahs.json        nameHi, nameTranslatedHi
 *   tafsir     proofread  public/data/tafsir/hindi-mokhtasar/surah-*.json
 *   hadith     translate  public/data/hadith/<col>/hindi/book-*.json   (from urdu, else english)
 *   knowledge  proofread  src/data/knowledge/articles/*.json           every hi string
 *
 * PROOFREAD vs TRANSLATE is the safety line and it is deliberate. Proofread
 * sections already have Hindi; the model may only repair mechanical damage
 * (broken conjuncts, orphan matras, doubled viramas, missing nuqta — the repo
 * has real instances: `अौर` for `और`, `हडड्ी` for `हड्डी`, `गिरफ््तार`). It may
 * not reword, retranslate or modernise, so diffs stay small and reviewable.
 * Translate sections have no Hindi at all, so there is nothing to preserve.
 *
 * Hinglish is NOT produced here. It is derived from Devanagari at render time
 * by src/lib/translit/hinglish.ts; storing it would lose information (Hinglish
 * → Devanagari is ambiguous) and would drift from its Devanagari twin. Every
 * correction written here improves the Hinglish view for free.
 *
 * MODES (env MODE):
 *   estimate  count units, print token/cost estimate, submit nothing.
 *   selftest  check every custom_id is unique, legal and parses back to the
 *             target it came from, and that the knowledge walker is symmetric.
 *             Reads only; no API key, no writes. Run before spending money.
 *   submit    build batches, POST them, checkpoint each batch id, then poll and
 *             write results until everything lands or DEADLINE_MINUTES is hit.
 *   resume    poll the batches recorded in STATE_DIR and write what has ended.
 *             Exits in seconds when nothing is pending, so a scheduled tick is
 *             nearly free.
 *
 * WHY RESUMABLE: a GitHub-hosted job is killed at 360 minutes; the Batch API's
 * ceiling is 24 hours. Anthropic retains batch results for 29 days keyed by
 * custom_id, so the batch id IS the cache — a resume days later costs zero
 * tokens. State is checkpointed after every chunk, never only at the end.
 *
 * Run: npm run ai:hindi -- (env-driven; see .github/workflows/ai-hindi-pass.yml)
 */

// --- Configuration ---------------------------------------------------------

const API_KEY = process.env.ANTHROPIC_API_KEY ?? ""
const API_BASE = "https://api.anthropic.com/v1"
const ANTHROPIC_VERSION = "2023-06-01"

type Mode = "estimate" | "selftest" | "submit" | "resume"
const MODE = (process.env.MODE || "estimate") as Mode
const MODEL = process.env.MODEL || "claude-opus-5"

const ALL_SECTIONS = ["quran", "surah", "tafsir", "hadith", "knowledge"] as const
type SectionName = (typeof ALL_SECTIONS)[number]

const SECTIONS = (process.env.SECTIONS || ALL_SECTIONS.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean) as SectionName[]

/** Units per section; 0 = the whole corpus. Defaults to a sample on purpose. */
const SAMPLE = Number(process.env.SAMPLE ?? "200")

const COLLECTIONS_FILTER = (process.env.COLLECTIONS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const STATE_DIR = process.env.STATE_DIR || ".batch-state"
const STATE_FILE = path.join(STATE_DIR, "ai-hindi-pass.json")

/** Our own stop, under the runner's 360-minute kill, so commits still happen. */
const DEADLINE_MINUTES = Number(process.env.DEADLINE_MINUTES ?? "330")
const STARTED_AT = Date.now()

/** Requests per batch. Well under the 100,000 / 256 MB API caps; sized for
 *  progress visibility and cheap partial retries. */
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE ?? "2000")

/** Seconds between polls of an in-flight batch. */
const POLL_SECONDS = Number(process.env.POLL_SECONDS ?? "60")

/** Batch API pricing is 50% of standard. Per-MTok, USD. */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 2.5, output: 12.5 },
  "claude-sonnet-5": { input: 1.5, output: 7.5 },
  "claude-haiku-4-5": { input: 0.5, output: 2.5 },
}

const COLLECTIONS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]

const QURAN_DIR = path.resolve("public/data/quran")
const SURAHS_FILE = path.resolve("src/data/quran/surahs.json")
const TAFSIR_DIR = path.resolve("public/data/tafsir/hindi-mokhtasar")
const HADITH_DIR = path.resolve("public/data/hadith")
const KNOWLEDGE_DIR = path.resolve("src/data/knowledge/articles")

const DEVANAGARI = /[ऀ-ॿ]/

// --- Types -----------------------------------------------------------------

/** One API request: an id that encodes its write-back target, and the strings to process. */
interface Unit {
  id: string
  strings: string[]
}

interface SectionDef {
  name: SectionName
  system: string
  /** Everything this section would send, in deterministic order. */
  collect(): Unit[]
  /** Write results back to disk. Called per chunk, so it must be re-entrant. */
  apply(results: Map<string, string[]>): void
  /** Proofread sections keep the original when output drifts too far. */
  proofread: boolean
}

interface ChunkState {
  n: number
  section: SectionName
  batchId: string
  count: number
  status: string
  written: boolean
}

interface PassState {
  model: string
  sections: SectionName[]
  sample: number
  startedAt: string
  /** Branch the workflow commits this pass's output to; resumes reuse it so one
   *  pass produces one pull request even when it spans several runs. */
  branch: string
  chunks: ChunkState[]
  usage: { input: number; output: number }
  applied: number
  rejected: number
  errored: number
}

// --- Small helpers ---------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function pastDeadline(): boolean {
  return Date.now() - STARTED_AT > DEADLINE_MINUTES * 60_000
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T
}

/** custom_id charset is alphanumeric, underscore and dash only. */
function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64)
}

/** Split "quran-1234" into ["quran", "1234"] — the key may itself contain dashes. */
function splitId(id: string): [string, string] {
  const i = id.indexOf("-")
  return i === -1 ? [id, ""] : [id.slice(0, i), id.slice(i + 1)]
}

function log(msg: string) {
  const mins = Math.floor((Date.now() - STARTED_AT) / 60_000)
  console.log(`[${String(mins).padStart(3)}m] ${msg}`)
}

/** Append a line to the GitHub Actions job summary when running in CI. */
function summary(line: string) {
  const file = process.env.GITHUB_STEP_SUMMARY
  if (file) fs.appendFileSync(file, line + "\n")
}

// --- Prompts ---------------------------------------------------------------
//
// Byte-identical per section across every request, which is what lets the API
// reuse its prefix. (No explicit cache_control: these system prompts are well
// under the 1024-token minimum for prompt caching, so the block would be inert.)

const PROOFREAD_RULES = `You repair mechanical errors in Hindi text written in Devanagari script.

Fix ONLY these, and only where they are unambiguously wrong:
- malformed conjuncts and misplaced viramas (e.g. "हडड्ी" -> "हड्डी", "गिरफ््तार" -> "गिरफ़्तार")
- orphan or wrongly ordered matras (e.g. "अौर" -> "और", "साीधा" -> "सीधा", "बेिहश्त" -> "बहिश्त")
- word-initial matras or nuqta that cannot start a word (e.g. "ुम" -> "तुम", "़ज़बाह" -> "ज़बह")
- missing or wrong nuqta on क़ ख़ ग़ ज़ ड़ ढ़ फ़ where the word requires it
- doubled or dropped characters that produce a non-word
- obvious spacing and punctuation damage

Do NOT do any of the following, ever:
- do NOT reword, rephrase, retranslate, simplify, or modernise
- do NOT add, remove, reorder or merge words, clauses or sentences
- do NOT change religious terminology, proper nouns, or Arabic/Persian loanwords
- do NOT add commentary, notes, honorifics, brackets or explanations
- do NOT change punctuation style (keep "।" as "।")
- do NOT "improve" text that is merely old-fashioned or unusual

If a string contains no mechanical error, return it EXACTLY as given, character for character. Most strings will be unchanged, and that is the expected outcome.

Return one output string per input string, in the same order, via the emit tool.`

const TRANSLATE_TO_HINDI = `You translate into Hindi written in Devanagari script.

Rules:
- Render the meaning faithfully and completely. Do not summarise or expand.
- Keep Islamic religious terminology in its familiar Urdu/Hindi form rather than Sanskritised substitutes (नमाज़, रोज़ा, ईमान, रसूल, फ़रिश्ता, क़यामत, इबादत), with nuqta where the word takes one.
- Keep proper nouns and honorifics as they appear (अल्लाह, मुहम्मद ﷺ, अबू हुरैरा).
- Do NOT add commentary, explanation, grading, or bracketed notes of your own.
- Do NOT translate or alter text that is already Hindi.
- Output Devanagari only, apart from characters that were already Latin or Arabic in the source.

Return one output string per input string, in the same order, via the emit tool.`

const SURAH_NAMES = `You translate Qur'an surah names into Hindi (Devanagari).

You receive exactly two strings per request:
1. the surah's transliterated Arabic name (e.g. "Al-Fatiha") — transliterate it into Devanagari as a Hindi reader would write it ("अल-फ़ातिहा"), keeping nuqta.
2. the surah's English meaning (e.g. "The Opener") — translate the meaning into natural Hindi ("खोलने वाली").

No commentary, no numbering, no extra words. Return both strings via the emit tool, in that order.`

// --- Section: quran --------------------------------------------------------

interface QuranAyah {
  number: number
  surahNumber: number
  translations: { en: string; hi: string; ur: string }
}

const quranSection: SectionDef = {
  name: "quran",
  proofread: true,
  system: PROOFREAD_RULES,
  collect() {
    const file = path.join(QURAN_DIR, "quran-all.json")
    if (!fs.existsSync(file)) return []
    const ayahs = readJson<QuranAyah[]>(file)
    return ayahs
      .filter((a) => a.translations?.hi?.trim())
      .map((a) => ({ id: safeId(`quran-${a.number}`), strings: [a.translations.hi] }))
  },
  apply(results) {
    const allFile = path.join(QURAN_DIR, "quran-all.json")
    const ayahs = readJson<QuranAyah[]>(allFile)
    const byNumber = new Map(ayahs.map((a) => [a.number, a]))
    const touchedSurahs = new Set<number>()

    for (const [id, out] of results) {
      const ayah = byNumber.get(Number(splitId(id)[1]))
      if (!ayah || !out[0]) continue
      if (out[0] === ayah.translations.hi) continue
      ayah.translations.hi = out[0]
      touchedSurahs.add(ayah.surahNumber)
    }
    if (touchedSurahs.size === 0) return

    // quran-all.json is compact, the per-surah files are pretty-printed —
    // matching scripts/fetch-quran-data.ts so a re-fetch produces no diff noise.
    fs.writeFileSync(allFile, JSON.stringify(ayahs))
    for (const n of touchedSurahs) {
      const surahAyahs = ayahs.filter((a) => a.surahNumber === n)
      fs.writeFileSync(path.join(QURAN_DIR, `surah-${n}.json`), JSON.stringify(surahAyahs, null, 2))
    }
  },
}

// --- Section: surah --------------------------------------------------------

interface SurahMeta {
  number: number
  name: string
  nameTranslated: string
  nameHi?: string
  nameTranslatedHi?: string
}

const surahSection: SectionDef = {
  name: "surah",
  proofread: false,
  system: SURAH_NAMES,
  collect() {
    if (!fs.existsSync(SURAHS_FILE)) return []
    return readJson<SurahMeta[]>(SURAHS_FILE).map((s) => ({
      id: safeId(`surah-${s.number}`),
      strings: [s.name, s.nameTranslated],
    }))
  },
  apply(results) {
    const surahs = readJson<SurahMeta[]>(SURAHS_FILE)
    const byNumber = new Map(surahs.map((s) => [s.number, s]))
    let changed = false
    for (const [id, out] of results) {
      const s = byNumber.get(Number(splitId(id)[1]))
      if (!s || out.length < 2) continue
      if (out[0]) s.nameHi = out[0]
      if (out[1]) s.nameTranslatedHi = out[1]
      changed = true
    }
    if (changed) fs.writeFileSync(SURAHS_FILE, JSON.stringify(surahs, null, 2))
  },
}

// --- Section: tafsir -------------------------------------------------------

/** ayah number (string key) → tafsir text, one file per surah. */
type TafsirSurah = Record<string, string>

const tafsirSection: SectionDef = {
  name: "tafsir",
  proofread: true,
  system: PROOFREAD_RULES,
  collect() {
    if (!fs.existsSync(TAFSIR_DIR)) return []
    const units: Unit[] = []
    for (let n = 1; n <= 114; n++) {
      const file = path.join(TAFSIR_DIR, `surah-${n}.json`)
      if (!fs.existsSync(file)) continue
      const map = readJson<TafsirSurah>(file)
      for (const ayah of Object.keys(map).sort((a, b) => Number(a) - Number(b))) {
        if (map[ayah]?.trim()) units.push({ id: safeId(`tafsir-${n}-${ayah}`), strings: [map[ayah]] })
      }
    }
    return units
  },
  apply(results) {
    // Group by surah so each file is read and written once per chunk.
    const bySurah = new Map<string, Map<string, string>>()
    for (const [id, out] of results) {
      if (!out[0]) continue
      const [surah, ayah] = splitId(id)[1].split("-")
      if (!bySurah.has(surah)) bySurah.set(surah, new Map())
      bySurah.get(surah)!.set(ayah, out[0])
    }
    for (const [surah, entries] of bySurah) {
      const file = path.join(TAFSIR_DIR, `surah-${surah}.json`)
      if (!fs.existsSync(file)) continue
      const map = readJson<TafsirSurah>(file)
      let changed = false
      for (const [ayah, text] of entries) {
        if (map[ayah] !== undefined && map[ayah] !== text) {
          map[ayah] = text
          changed = true
        }
      }
      if (changed) fs.writeFileSync(file, JSON.stringify(map, null, 2))
    }
  },
}

// --- Section: hadith -------------------------------------------------------

interface HadithEntry {
  number: number
  bookId?: number
  urdu?: string
  english?: string
}

/** The sidecar shape src/lib/hadith/hindiTafseer.ts already reads. */
interface HindiSidecarEntry {
  text: string
  explanation: string
  hints: string[]
  attribution: string
  grade: string
  sourceId: string
  /** Which field this machine translation came from. Absent on hadeethenc-authored entries. */
  textSource?: "ur" | "en"
}

function hadithBookFiles(col: string): string[] {
  const dir = path.join(HADITH_DIR, col, "books")
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("book-") && f.endsWith(".json"))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))
    .map((f) => path.join(dir, f))
}

const hadithSection: SectionDef = {
  name: "hadith",
  proofread: false,
  system: TRANSLATE_TO_HINDI,
  collect() {
    const cols = COLLECTIONS_FILTER.length ? COLLECTIONS_FILTER : COLLECTIONS
    const units: Unit[] = []
    for (const col of cols) {
      for (const file of hadithBookFiles(col)) {
        const hadiths = readJson<HadithEntry[]>(file)
        for (const h of hadiths) {
          const urdu = h.urdu?.trim()
          const english = h.english?.trim()
          const src = urdu ? "ur" : english ? "en" : null
          // The ~203 hadiths with neither stay Arabic-only: a corpus gap, not a
          // pipeline gap, and inventing text for them is exactly what we don't do.
          if (!src) continue
          const bookId = h.bookId ?? Number(path.basename(file).match(/\d+/)![0])
          units.push({
            id: safeId(`hadith-${col}-${bookId}-${h.number}-${src}`),
            strings: [(src === "ur" ? urdu : english)!],
          })
        }
      }
    }
    return units
  },
  apply(results) {
    // Group by (collection, book) so each sidecar is read and written once.
    const byBook = new Map<string, Map<string, { text: string; src: "ur" | "en" }>>()
    for (const [id, out] of results) {
      if (!out[0]) continue
      const parts = splitId(id)[1].split("-")
      const src = parts.pop() as "ur" | "en"
      const number = parts.pop()!
      const bookId = parts.pop()!
      const col = parts.join("-")
      const key = `${col}/${bookId}`
      if (!byBook.has(key)) byBook.set(key, new Map())
      byBook.get(key)!.set(number, { text: out[0], src })
    }

    for (const [key, entries] of byBook) {
      const [col, bookId] = key.split("/")
      const dir = path.join(HADITH_DIR, col, "hindi")
      fs.mkdirSync(dir, { recursive: true })
      const file = path.join(dir, `book-${bookId}.json`)
      const sidecar: Record<string, HindiSidecarEntry> = fs.existsSync(file)
        ? readJson<Record<string, HindiSidecarEntry>>(file)
        : {}

      for (const [number, { text, src }] of entries) {
        // Keep hadeethenc's authored explanation, hints, attribution and grade
        // where a match exists — this pass only ever fills `text`.
        const existing = sidecar[number]
        sidecar[number] = {
          explanation: existing?.explanation ?? "",
          hints: existing?.hints ?? [],
          attribution: existing?.attribution ?? "",
          grade: existing?.grade ?? "",
          sourceId: existing?.sourceId ?? "",
          text,
          textSource: src,
        }
      }
      fs.writeFileSync(file, JSON.stringify(sidecar, null, 2))
    }
  },
}

// --- Section: knowledge ----------------------------------------------------

interface KnowledgeBlock {
  kind: string
  text?: string
  note?: string
  label?: string
  translation?: string
  transliteration?: string
  items?: { text?: string }[]
}

interface KnowledgeArticleFile {
  slug: string
  title?: Record<string, string>
  summary?: Record<string, string>
  body?: Record<string, KnowledgeBlock[]>
}

/**
 * Every authored Hindi string in an article, as get/set pairs in a stable order.
 *
 * Both collect() and apply() walk this, so the nth string sent is always the nth
 * string written back. `arabic.text` is deliberately excluded — it is Arabic
 * scripture, not Hindi prose, and is repeated verbatim across all three bodies.
 */
function hindiSlots(article: KnowledgeArticleFile): { get: () => string; set: (v: string) => void }[] {
  const slots: { get: () => string; set: (v: string) => void }[] = []
  const field = (obj: Record<string, unknown> | undefined, key: string) => {
    if (!obj || typeof obj[key] !== "string" || !(obj[key] as string).trim()) return
    const target = obj
    slots.push({ get: () => target[key] as string, set: (v) => (target[key] = v) })
  }

  field(article.title, "hi")
  field(article.summary, "hi")
  for (const block of article.body?.hi ?? []) {
    if (!block || typeof block !== "object") continue
    switch (block.kind) {
      case "p":
      case "heading":
        field(block as unknown as Record<string, unknown>, "text")
        break
      case "list":
        for (const item of block.items ?? []) field(item as Record<string, unknown>, "text")
        break
      case "verse":
      case "hadith":
        field(block as unknown as Record<string, unknown>, "note")
        break
      case "arabic":
        field(block as unknown as Record<string, unknown>, "transliteration")
        field(block as unknown as Record<string, unknown>, "translation")
        field(block as unknown as Record<string, unknown>, "label")
        break
    }
  }
  return slots
}

const knowledgeSection: SectionDef = {
  name: "knowledge",
  proofread: true,
  system: PROOFREAD_RULES,
  collect() {
    if (!fs.existsSync(KNOWLEDGE_DIR)) return []
    const units: Unit[] = []
    for (const file of fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".json")).sort()) {
      const article = readJson<KnowledgeArticleFile>(path.join(KNOWLEDGE_DIR, file))
      const strings = hindiSlots(article).map((s) => s.get())
      if (strings.length) units.push({ id: safeId(`knowledge-${article.slug}`), strings })
    }
    return units
  },
  apply(results) {
    for (const [id, out] of results) {
      const slug = splitId(id)[1]
      const file = path.join(KNOWLEDGE_DIR, `${slug}.json`)
      if (!fs.existsSync(file)) {
        console.warn(`  ⚠ knowledge: no file for slug "${slug}"`)
        continue
      }
      const article = readJson<KnowledgeArticleFile>(file)
      const slots = hindiSlots(article)
      if (slots.length !== out.length) {
        console.warn(`  ⚠ knowledge/${slug}: ${out.length} strings for ${slots.length} slots, skipped`)
        continue
      }
      let changed = false
      slots.forEach((slot, i) => {
        if (out[i] && out[i] !== slot.get()) {
          slot.set(out[i])
          changed = true
        }
      })
      if (changed) fs.writeFileSync(file, JSON.stringify(article, null, 2) + "\n")
    }
  },
}

const SECTION_DEFS: Record<SectionName, SectionDef> = {
  quran: quranSection,
  surah: surahSection,
  tafsir: tafsirSection,
  hadith: hadithSection,
  knowledge: knowledgeSection,
}

// --- Anthropic Batch API ---------------------------------------------------

function apiHeaders(): Record<string, string> {
  return {
    "x-api-key": API_KEY,
    "anthropic-version": ANTHROPIC_VERSION,
    "content-type": "application/json",
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  // Retry on transient failures — a 5xx or 429 hours into a run must not lose
  // the chunk, and a checkpoint is only written once the call succeeds.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { ...init, headers: apiHeaders() })
    if (res.ok) return (await res.json()) as T
    const body = await res.text()
    const retryable = res.status === 429 || res.status >= 500
    if (!retryable || attempt >= 4) {
      throw new Error(`${init?.method ?? "GET"} ${url} -> ${res.status}: ${body.slice(0, 400)}`)
    }
    const wait = Math.min(60_000, 2 ** attempt * 2000)
    log(`  API ${res.status}, retrying in ${wait / 1000}s`)
    await sleep(wait)
  }
}

/**
 * Forcing a tool call is what makes the output parseable without heuristics:
 * the model cannot emit prose, fences or a stray apology, and the array shape
 * is validated by the API before it ever reaches us.
 */
const EMIT_TOOL = {
  name: "emit",
  description: "Return the processed strings, one per input string, in the same order.",
  input_schema: {
    type: "object" as const,
    properties: {
      out: { type: "array" as const, items: { type: "string" as const } },
    },
    required: ["out"],
  },
}

function buildRequest(unit: Unit, section: SectionDef) {
  const chars = unit.strings.reduce((n, s) => n + s.length, 0)
  return {
    custom_id: unit.id,
    params: {
      model: MODEL,
      // Devanagari is well under one token per character, so budgeting a token
      // per source character is a safe ceiling. Unused budget costs nothing.
      max_tokens: Math.min(32_000, Math.max(1024, chars + 512)),
      temperature: 0,
      system: section.system,
      tools: [EMIT_TOOL],
      tool_choice: { type: "tool" as const, name: "emit" },
      messages: [
        {
          role: "user" as const,
          content: JSON.stringify({ in: unit.strings }),
        },
      ],
    },
  }
}

interface BatchResponse {
  id: string
  processing_status: string
  results_url: string | null
  request_counts?: Record<string, number>
}

async function submitBatch(units: Unit[], section: SectionDef): Promise<string> {
  const body = JSON.stringify({ requests: units.map((u) => buildRequest(u, section)) })
  const batch = await api<BatchResponse>(`${API_BASE}/messages/batches`, { method: "POST", body })
  return batch.id
}

async function getBatch(id: string): Promise<BatchResponse> {
  return api<BatchResponse>(`${API_BASE}/messages/batches/${id}`)
}

/** Stream a results_url (JSONL) line by line so a large batch never lands in memory whole. */
async function* streamResults(url: string): AsyncGenerator<Record<string, unknown>> {
  const res = await fetch(url, { headers: apiHeaders() })
  if (!res.ok || !res.body) throw new Error(`results_url -> ${res.status}`)
  const decoder = new TextDecoder()
  let buffer = ""
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true })
    let nl: number
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (line) yield JSON.parse(line)
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer.trim())
}

// --- Result validation -----------------------------------------------------

interface Validation {
  applied: Map<string, string[]>
  rejected: number
  errored: number
  usage: { input: number; output: number }
}

/**
 * Turn one batch's JSONL into the write-back map, dropping anything that fails
 * a sanity check.
 *
 * The length guard is the teeth behind "fix errors only": a proofread result
 * that is half or double the source is a rewrite, not a repair, so the original
 * is kept and the drop is counted and reported.
 */
function validate(
  lines: Record<string, unknown>[],
  section: SectionDef,
  inputs: Map<string, string[]>,
): Validation {
  const applied = new Map<string, string[]>()
  let rejected = 0
  let errored = 0
  const usage = { input: 0, output: 0 }

  for (const line of lines) {
    const id = line.custom_id as string
    const result = line.result as { type: string; message?: Record<string, unknown> } | undefined
    if (!result || result.type !== "succeeded" || !result.message) {
      errored++
      continue
    }

    const u = result.message.usage as { input_tokens?: number; output_tokens?: number } | undefined
    usage.input += u?.input_tokens ?? 0
    usage.output += u?.output_tokens ?? 0

    const content = (result.message.content ?? []) as { type: string; input?: { out?: unknown } }[]
    const toolUse = content.find((b) => b.type === "tool_use")
    const out = toolUse?.input?.out
    const source = inputs.get(id)

    if (!Array.isArray(out) || !source || out.length !== source.length) {
      rejected++
      continue
    }

    const kept: string[] = []
    for (let i = 0; i < out.length; i++) {
      const candidate = typeof out[i] === "string" ? (out[i] as string).trim() : ""
      const original = source[i]
      const ok =
        candidate.length > 0 &&
        // Never silently drop Devanagari that was there before.
        (!DEVANAGARI.test(original) || DEVANAGARI.test(candidate)) &&
        // Translation output must actually be Devanagari.
        (section.proofread || DEVANAGARI.test(candidate)) &&
        // Proofreading may not resize the text.
        (!section.proofread ||
          (candidate.length >= original.length * 0.5 && candidate.length <= original.length * 2))
      kept.push(ok ? candidate : original)
      if (!ok) rejected++
    }
    applied.set(id, kept)
  }

  return { applied, rejected, errored, usage }
}

// --- State -----------------------------------------------------------------

function loadState(): PassState | null {
  if (!fs.existsSync(STATE_FILE)) return null
  return readJson<PassState>(STATE_FILE)
}

function saveState(state: PassState) {
  fs.mkdirSync(STATE_DIR, { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

// --- Estimation ------------------------------------------------------------

/** Devanagari and Urdu both run roughly 2.2 characters per token. */
const CHARS_PER_TOKEN = 2.2
/** Fixed per-request overhead: the system prompt plus the tool definition. */
const OVERHEAD_TOKENS = 450

function estimate(plan: { section: SectionDef; units: Unit[] }[]) {
  let totalIn = 0
  let totalOut = 0
  console.log("\nUnits to process:\n")
  for (const { section, units } of plan) {
    const chars = units.reduce((n, u) => n + u.strings.reduce((m, s) => m + s.length, 0), 0)
    const inTok = Math.round(chars / CHARS_PER_TOKEN + units.length * OVERHEAD_TOKENS)
    const outTok = Math.round(chars / CHARS_PER_TOKEN)
    totalIn += inTok
    totalOut += outTok
    console.log(
      `  ${section.name.padEnd(10)} ${String(units.length).padStart(6)} units  ` +
        `${(chars / 1e6).toFixed(2)}M chars  ~${(inTok / 1e6).toFixed(2)}M in / ${(outTok / 1e6).toFixed(2)}M out`,
    )
  }
  const price = PRICING[MODEL]
  const cost = price ? (totalIn / 1e6) * price.input + (totalOut / 1e6) * price.output : NaN
  console.log(
    `\n  TOTAL      ${(totalIn / 1e6).toFixed(2)}M input / ${(totalOut / 1e6).toFixed(2)}M output tokens`,
  )
  console.log(
    price
      ? `  Estimated batch cost on ${MODEL}: ~$${cost.toFixed(2)} (50% batch discount applied)\n`
      : `  No price on file for ${MODEL}; cost unknown.\n`,
  )
  summary(`### AI Hindi pass — ${MODE}`)
  summary(`Model \`${MODEL}\`, sections ${SECTIONS.join(", ")}, sample ${SAMPLE || "full corpus"}`)
  for (const { section, units } of plan) summary(`- ${section.name}: ${units.length} units`)
  if (price) summary(`- **Estimated cost: ~$${cost.toFixed(2)}**`)
}

// --- Self-test -------------------------------------------------------------

/**
 * Cheap pre-flight over the real corpus, no API key and no writes.
 *
 * What it actually protects against: the Batch API rejects a whole 2,000-request
 * chunk if two custom_ids collide or one uses an illegal character, and a
 * knowledge article whose slot count shifts between collect() and apply() would
 * write corrected strings into the wrong fields. Both are silent-until-expensive,
 * so they are asserted here instead.
 */
function selftest(plan: { section: SectionDef; units: Unit[] }[]): number {
  let failures = 0
  const fail = (msg: string) => {
    console.error(`  ✗ ${msg}`)
    failures++
  }

  for (const { section, units } of plan) {
    const seen = new Set<string>()
    let illegal = 0
    let tooLong = 0
    let collisions = 0

    for (const u of units) {
      if (!/^[a-zA-Z0-9_-]+$/.test(u.id)) illegal++
      if (u.id.length > 64) tooLong++
      if (seen.has(u.id)) collisions++
      seen.add(u.id)
      if (u.strings.some((s) => typeof s !== "string" || !s.trim())) {
        fail(`${section.name}: unit ${u.id} carries an empty string`)
        break
      }
    }
    if (illegal) fail(`${section.name}: ${illegal} id(s) contain illegal characters`)
    if (tooLong) fail(`${section.name}: ${tooLong} id(s) exceed 64 characters`)
    if (collisions) fail(`${section.name}: ${collisions} duplicate custom_id(s)`)

    // Every id must name a target that still exists — this is what apply() will
    // look up, so a miss here is a silently dropped correction later.
    if (section.name === "hadith") {
      for (const u of units.slice(0, 200)) {
        const parts = splitId(u.id)[1].split("-")
        const src = parts.pop()
        const number = parts.pop()
        const bookId = parts.pop()
        const col = parts.join("-")
        if (!COLLECTIONS.includes(col) || !bookId || !number || !["ur", "en"].includes(src ?? "")) {
          fail(`hadith: id ${u.id} does not parse back (col=${col} book=${bookId} n=${number} src=${src})`)
          break
        }
      }
    }

    if (section.name === "knowledge") {
      for (const u of units) {
        const slug = splitId(u.id)[1]
        const file = path.join(KNOWLEDGE_DIR, `${slug}.json`)
        if (!fs.existsSync(file)) {
          fail(`knowledge: id ${u.id} has no article file (expected ${slug}.json)`)
          continue
        }
        const slots = hindiSlots(readJson<KnowledgeArticleFile>(file))
        if (slots.length !== u.strings.length) {
          fail(`knowledge/${slug}: collect sent ${u.strings.length} strings, apply has ${slots.length} slots`)
        }
      }
    }

    console.log(`  ${section.name.padEnd(10)} ${String(units.length).padStart(6)} units — ids ok`)
  }
  return failures
}

// --- Poll / write loop -----------------------------------------------------

/**
 * Poll every unwritten chunk, applying each one the moment its batch ends.
 * Returns when everything is written or the deadline is reached — whichever
 * comes first, with state checkpointed after every chunk either way.
 *
 * `inputsBySection` holds the source strings the length guard compares against.
 * It is filled lazily so a fresh `resume` (which has no in-memory plan) pays for
 * one re-collect per section rather than one per chunk.
 */
async function drain(state: PassState, inputsBySection: Map<SectionName, Map<string, string[]>>) {
  while (true) {
    const pending = state.chunks.filter((c) => !c.written)
    if (pending.length === 0) {
      log("All chunks written.")
      return
    }
    if (pastDeadline()) {
      log(`Deadline reached with ${pending.length} chunk(s) still pending — re-dispatch mode=resume.`)
      return
    }

    let progressed = false
    for (const chunk of pending) {
      if (pastDeadline()) break
      const batch = await getBatch(chunk.batchId)
      chunk.status = batch.processing_status
      if (batch.processing_status !== "ended" || !batch.results_url) continue

      log(`Chunk ${chunk.n} (${chunk.section}, ${chunk.count} units) ended — writing...`)
      const lines: Record<string, unknown>[] = []
      for await (const line of streamResults(batch.results_url)) lines.push(line)

      const section = SECTION_DEFS[chunk.section]
      let inputs = inputsBySection.get(chunk.section)
      if (!inputs) {
        inputs = new Map(section.collect().map((u) => [u.id, u.strings]))
        inputsBySection.set(chunk.section, inputs)
      }

      const { applied, rejected, errored, usage } = validate(lines, section, inputs)
      section.apply(applied)

      chunk.written = true
      state.applied += applied.size
      state.rejected += rejected
      state.errored += errored
      state.usage.input += usage.input
      state.usage.output += usage.output
      saveState(state)
      progressed = true
      log(`  ✓ chunk ${chunk.n}: ${applied.size} applied, ${rejected} string(s) kept as-is, ${errored} errored`)
    }

    saveState(state)
    if (!progressed) {
      const left = state.chunks.filter((c) => !c.written).length
      log(`${left} chunk(s) still processing; sleeping ${POLL_SECONDS}s`)
      await sleep(POLL_SECONDS * 1000)
    }
  }
}

// --- Main ------------------------------------------------------------------

async function main() {
  console.log(`=== AI Hindi Pass (${MODE}) ===`)
  console.log(`Model: ${MODEL}  Sections: ${SECTIONS.join(", ")}  Sample: ${SAMPLE || "full corpus"}`)

  const unknown = SECTIONS.filter((s) => !(s in SECTION_DEFS))
  if (unknown.length) throw new Error(`Unknown section(s): ${unknown.join(", ")}`)

  const buildPlan = (sample: number) =>
    SECTIONS.map((name) => {
      const section = SECTION_DEFS[name]
      const units = section.collect()
      if (units.length === 0) {
        // Almost always a missing input rather than a finished section — the
        // tafsir snapshot in particular only exists after `npm run
        // fetch:tafsir-hindi` has been run and committed.
        console.warn(`  ⚠ section "${name}" collected 0 units — is its source data present?`)
      }
      return { section, units: sample > 0 ? units.slice(0, sample) : units }
    })

  if (MODE === "selftest") {
    // Always the whole corpus: a duplicate id that only appears at unit 5,000
    // still kills the chunk it lands in.
    console.log("\nChecking every unit id against the corpus:\n")
    const failures = selftest(buildPlan(0))
    if (failures) throw new Error(`${failures} self-test failure(s)`)
    console.log("\n✓ self-test passed\n")
    return
  }

  if (MODE === "estimate") {
    estimate(buildPlan(SAMPLE))
    return
  }

  if (!API_KEY) throw new Error("ANTHROPIC_API_KEY is not set")

  if (MODE === "resume") {
    const state = loadState()
    if (!state) {
      log("No state file — nothing to resume.")
      return
    }
    if (state.chunks.every((c) => c.written)) {
      log("Every chunk is already written — nothing to do.")
      return
    }
    await drain(state, new Map())
    report(state)
    return
  }

  // --- submit ---
  const existing = loadState()
  if (existing && existing.chunks.some((c) => !c.written)) {
    throw new Error(
      `${STATE_FILE} has ${existing.chunks.filter((c) => !c.written).length} unwritten chunk(s). ` +
        `Run with MODE=resume to finish them (free — results are already paid for), ` +
        `or delete the state file to start a new pass.`,
    )
  }

  const plan = buildPlan(SAMPLE)
  estimate(plan)

  const state: PassState = {
    model: MODEL,
    sections: SECTIONS,
    sample: SAMPLE,
    startedAt: new Date().toISOString(),
    branch: process.env.PASS_BRANCH || "",
    chunks: [],
    usage: { input: 0, output: 0 },
    applied: 0,
    rejected: 0,
    errored: 0,
  }

  const inputsBySection = new Map<SectionName, Map<string, string[]>>()
  let n = 0
  submitting: for (const { section, units } of plan) {
    inputsBySection.set(section.name, new Map(units.map((u) => [u.id, u.strings])))
    for (let i = 0; i < units.length; i += CHUNK_SIZE) {
      if (pastDeadline()) {
        log("Deadline reached during submission — remaining chunks were NOT submitted.")
        break submitting
      }
      const slice = units.slice(i, i + CHUNK_SIZE)
      const batchId = await submitBatch(slice, section)
      state.chunks.push({
        n,
        section: section.name,
        batchId,
        count: slice.length,
        status: "in_progress",
        written: false,
      })
      // Checkpoint immediately: an id that is not on disk is an id we pay for
      // and cannot collect.
      saveState(state)
      log(`Submitted chunk ${n} — ${section.name} ${i}..${i + slice.length} → ${batchId}`)
      n++
    }
  }

  if (state.chunks.length === 0) {
    log("Nothing to submit.")
    return
  }

  await drain(state, inputsBySection)
  report(state)
}

function report(state: PassState) {
  const price = PRICING[state.model]
  const cost = price
    ? (state.usage.input / 1e6) * price.input + (state.usage.output / 1e6) * price.output
    : NaN
  const written = state.chunks.filter((c) => c.written).length

  console.log("\n--- Pass summary ---")
  console.log(`  chunks written : ${written}/${state.chunks.length}`)
  console.log(`  units applied  : ${state.applied}`)
  console.log(`  strings kept   : ${state.rejected} (failed the sanity guard, original preserved)`)
  console.log(`  requests errored: ${state.errored}`)
  console.log(`  tokens         : ${state.usage.input} in / ${state.usage.output} out`)
  if (price) console.log(`  actual cost    : ~$${cost.toFixed(2)}`)
  console.log("")

  summary("")
  summary(`| metric | value |`)
  summary(`| --- | --- |`)
  summary(`| chunks written | ${written}/${state.chunks.length} |`)
  summary(`| units applied | ${state.applied} |`)
  summary(`| strings kept as-is | ${state.rejected} |`)
  summary(`| requests errored | ${state.errored} |`)
  summary(`| tokens | ${state.usage.input} in / ${state.usage.output} out |`)
  if (price) summary(`| actual cost | ~$${cost.toFixed(2)} |`)
}

main().catch((err) => {
  console.error("\nAI Hindi pass failed:", err)
  process.exit(1)
})
