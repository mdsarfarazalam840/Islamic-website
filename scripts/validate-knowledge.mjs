/**
 * Validate the Knowledge Base article JSON against the real Quran/Hadith data.
 *
 * The renderer silently DROPS unresolvable verse/hadith refs (see
 * src/lib/knowledge/hydrate.ts) so a typo'd surah:ayah costs content without
 * failing the build. This script surfaces those, plus schema slips that the
 * dev-only warning in src/lib/knowledge/articles.ts does not cover:
 * slug/filename mismatch, unknown block kinds, missing language bodies, and
 * relatedSlugs pointing at nothing.
 *
 * Plain ESM so it can be run with bare `node` (same reason as
 * build-pagefind-index.mjs — no tsx needed).
 *
 *   node scripts/validate-knowledge.mjs
 *
 * Exits 1 on any error; unresolved relatedSlugs are warnings only (the loader
 * ignores them by design, and forward references while authoring are normal).
 */
import fs from "node:fs"
import path from "node:path"

const ARTICLES_DIR = path.resolve("src/data/knowledge/articles")
const QURAN_DIR = path.resolve("public/data/quran")
const HADITH_DIR = path.resolve("public/data/hadith")

const CATEGORIES = [
  "basics",
  "concepts",
  "creed",
  "prophets",
  "seerah",
  "quranic",
  "hadith-stories",
  "surahs",
]
const BLOCK_KINDS = ["p", "heading", "list", "verse", "hadith", "arabic"]
const LANGS = ["en", "hi", "ur"]

const errors = []
const warnings = []

// --- reference indexes ------------------------------------------------------

/** surah number -> count of ayahs, read from the per-surah files. */
const ayahCounts = new Map()
for (let n = 1; n <= 114; n++) {
  const file = path.join(QURAN_DIR, `surah-${n}.json`)
  if (!fs.existsSync(file)) continue
  const ayahs = JSON.parse(fs.readFileSync(file, "utf-8"))
  ayahCounts.set(n, Array.isArray(ayahs) ? ayahs.length : 0)
}

/** collection -> Set of hadith numbers present locally. */
const hadithNumbers = new Map()
function loadCollection(collection) {
  if (hadithNumbers.has(collection)) return hadithNumbers.get(collection)
  const set = new Set()
  const booksDir = path.join(HADITH_DIR, collection, "books")
  if (fs.existsSync(booksDir)) {
    for (const file of fs.readdirSync(booksDir)) {
      if (!file.startsWith("book-") || !file.endsWith(".json")) continue
      const raw = JSON.parse(fs.readFileSync(path.join(booksDir, file), "utf-8"))
      for (const h of raw) set.add(Number(h.number))
    }
  }
  hadithNumbers.set(collection, set)
  return set
}

// --- walk the articles ------------------------------------------------------

const files = fs.existsSync(ARTICLES_DIR)
  ? fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".json"))
  : []

const slugs = new Set()
const relatedRefs = []

for (const file of files) {
  const full = path.join(ARTICLES_DIR, file)
  let a
  try {
    a = JSON.parse(fs.readFileSync(full, "utf-8"))
  } catch (err) {
    errors.push(`${file}: invalid JSON — ${err.message}`)
    continue
  }

  const expectedSlug = file.replace(/\.json$/, "")
  if (a.slug !== expectedSlug) errors.push(`${file}: slug "${a.slug}" != filename`)
  if (slugs.has(a.slug)) errors.push(`${file}: duplicate slug "${a.slug}"`)
  slugs.add(a.slug)

  if (!CATEGORIES.includes(a.category)) errors.push(`${file}: unknown category "${a.category}"`)

  for (const field of ["title", "summary"]) {
    for (const lang of LANGS) {
      if (!a[field]?.[lang]?.trim()) errors.push(`${file}: missing ${field}.${lang}`)
    }
  }

  for (const slug of a.relatedSlugs ?? []) relatedRefs.push([file, slug])

  for (const lang of LANGS) {
    const blocks = a.body?.[lang]
    if (!Array.isArray(blocks) || blocks.length === 0) {
      errors.push(`${file}: body.${lang} missing or empty`)
      continue
    }
    blocks.forEach((b, i) => {
      const at = `${file}: body.${lang}[${i}]`
      if (!b || typeof b !== "object") return errors.push(`${at}: not an object`)
      if (!BLOCK_KINDS.includes(b.kind)) return errors.push(`${at}: unknown kind "${b.kind}"`)

      switch (b.kind) {
        case "p":
          if (!b.text?.trim()) errors.push(`${at}: empty p.text`)
          break
        case "heading":
          if (!b.text?.trim()) errors.push(`${at}: empty heading.text`)
          if (b.level !== 2 && b.level !== 3) errors.push(`${at}: heading.level must be 2 or 3`)
          break
        case "list":
          if (!Array.isArray(b.items) || b.items.length === 0) {
            errors.push(`${at}: list.items missing or empty`)
          } else if (b.items.some((it) => !it?.text?.trim())) {
            errors.push(`${at}: list has an empty item`)
          }
          break
        case "arabic":
          if (!b.text?.trim()) errors.push(`${at}: empty arabic.text`)
          break
        case "verse": {
          const count = ayahCounts.get(b.surah)
          if (count == null) errors.push(`${at}: no data for surah ${b.surah}`)
          else if (!Number.isInteger(b.ayah) || b.ayah < 1 || b.ayah > count) {
            errors.push(`${at}: ${b.surah}:${b.ayah} out of range (surah has ${count} ayahs)`)
          }
          break
        }
        case "hadith": {
          const present = loadCollection(b.collection)
          if (present.size === 0) errors.push(`${at}: unknown collection "${b.collection}"`)
          else if (!present.has(Number(b.hadith))) {
            errors.push(`${at}: ${b.collection} ${b.hadith} not in local dataset — WILL BE DROPPED`)
          }
          break
        }
      }
    })
  }

  // The three bodies must agree on their language-agnostic refs, otherwise one
  // language silently shows scripture the others do not.
  const refKey = (blocks) =>
    (blocks ?? [])
      .filter((b) => b?.kind === "verse" || b?.kind === "hadith" || b?.kind === "arabic")
      .map((b) =>
        b.kind === "verse"
          ? `v${b.surah}:${b.ayah}`
          : b.kind === "hadith"
            ? `h${b.collection}-${b.hadith}`
            : `a${b.text}`,
      )
      .join("|")
  const en = refKey(a.body?.en)
  for (const lang of ["hi", "ur"]) {
    if (refKey(a.body?.[lang]) !== en) {
      warnings.push(`${file}: body.${lang} verse/hadith/arabic refs differ from body.en`)
    }
  }
}

for (const [file, slug] of relatedRefs) {
  if (!slugs.has(slug)) warnings.push(`${file}: relatedSlug "${slug}" does not exist`)
}

// --- report -----------------------------------------------------------------

console.log(`Checked ${files.length} knowledge articles.\n`)
for (const w of warnings) console.warn(`  warn  ${w}`)
for (const e of errors) console.error(`  ERROR ${e}`)

if (errors.length) {
  console.error(`\n✗ ${errors.length} error(s), ${warnings.length} warning(s)`)
  process.exit(1)
}
console.log(`\n✓ no errors (${warnings.length} warning(s))`)
