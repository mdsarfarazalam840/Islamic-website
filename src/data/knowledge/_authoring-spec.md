# Knowledge Base — Article Authoring Spec

You are authoring trilingual (English / Hindi / Urdu) Islamic knowledge-base articles
as JSON files for the "Noor" Quran website. Follow this spec EXACTLY.

## STEP 1 — Read the 5 gold-standard exemplars first (do this before writing anything)

Read these files and match their structure, depth, and tone precisely:
- `F:\Pro\Quran-website\src\data\knowledge\articles\prophet-adam.json`
- `F:\Pro\Quran-website\src\data\knowledge\articles\basics-five-pillars.json`
- `F:\Pro\Quran-website\src\data\knowledge\articles\concept-tawhid.json`
- `F:\Pro\Quran-website\src\data\knowledge\articles\surah-al-ikhlas.json`
- `F:\Pro\Quran-website\src\data\knowledge\articles\story-people-of-the-cave.json`

## Schema (every file is one article)

```json
{
  "slug": "globally-unique-kebab-case",        // MUST equal the filename without .json
  "category": "basics|prophets|quranic|surahs|concepts",
  "prophetNumber": 1,                            // ONLY for category "prophets" (1..25)
  "surahNumber": 112,                            // ONLY for category "surahs"
  "featured": true,                              // optional; set on the most important 1-2 per batch
  "title":   { "en": "...", "hi": "...", "ur": "..." },
  "summary": { "en": "...", "hi": "...", "ur": "..." },
  "body": { "en": [Block...], "hi": [Block...], "ur": [Block...] },
  "sources": [SourceTag...],
  "relatedSlugs": ["other-slug", ...]
}
```

### Block kinds (text blocks carry a plain string; language is implied by which body array they sit in)
- `{ "kind": "p", "text": "paragraph" }`
- `{ "kind": "heading", "level": 2, "text": "..." }`  (level 2 or 3)
- `{ "kind": "list", "items": [ { "text": "..." }, ... ] }`
- `{ "kind": "verse", "surah": 2, "ayah": 255, "note": "optional gloss" }`  ← language-agnostic ref
- `{ "kind": "hadith", "collection": "bukhari", "hadith": 8, "note": "optional" }`  ← language-agnostic ref

### SourceTag kinds (these are provenance BADGES — refs can be any real citation)
- `{ "type": "quran", "ref": "2:255" }`
- `{ "type": "hadith", "collection": "bukhari", "ref": "8", "grade": "sahih" }`  (grade: sahih|hasan|daif)
- `{ "type": "tafsir", "scholar": "Ibn Kathir" }`
- `{ "type": "seerah" }`

## HARD RULES (violating these breaks the build or drops content)

1. **verse blocks** — the (surah, ayah) is resolved LIVE from real Quran data. All 114 surahs are
   present and fully translated (en/hi/ur), so you may embed ANY real verse. `surah` is 1–114 and
   `ayah` must be a real ayah number within that surah. Use verse blocks generously — this is how
   scripture appears in the article. DO NOT put Arabic or translations in the block; only the ref.
   (Verify surah:ayah numbers with WebSearch if unsure — a wrong ref silently drops the verse.)

2. **hadith blocks (inline embeds)** — these resolve against the local hadith dataset. You may ONLY
   use one of these FIVE verified references (any other number is silently DROPPED from the article):
   - `bukhari` 8   — "Islam is built on five pillars"
   - `bukhari` 39  — "Religion is easy…"
   - `bukhari` 5070 — "The best of you are those who learn the Qur'an and teach it"
   - `muslim` 6602 — "Allah is gentle and loves gentleness"
   - `tirmidhi` 3421 — on the Prophet's character
   If none of these fits your article, DO NOT use a hadith block — instead cite the hadith via a
   **source tag** (which can reference any authentic hadith, e.g. `{ "type":"hadith","collection":"muslim","ref":"2564","grade":"sahih" }`).

3. **Trilingual, always.** Every `title`/`summary`/text field must be present in all three languages.
   - `en` = natural English.
   - `hi` = Devanagari Hindi (Islamic terms transliterated: तौहीद, नमाज़, ईमान…).
   - `ur` = Urdu in Urdu/Arabic script (right-to-left), e.g. توحید، نماز، ایمان.
   verse/hadith blocks are language-agnostic refs: repeat the SAME block (same surah/ayah/collection/
   hadith) in all three arrays, translating only the `note`.

4. **slug** is globally unique and equals the filename. **category** is exactly one of the 5 values.

## Content quality

- Mainstream Sunni orthodox content. Accurate, respectful, sourced. Use WebSearch to confirm
  Qur'anic references (surah:ayah), prophet narratives, and surah facts before writing.
- Follow prophet names with peace be upon him where natural; the Prophet Muhammad ﷺ.
- Each language body: ~150–400 words, 5–9 blocks, including at least one `verse` block when scripture
  is directly relevant (almost always). Use a `heading` or two and often a `list` of lessons/points.
- `sources`: 2–4 tags per article, mixing quran + (hadith via tag) + tafsir/seerah as appropriate.
- `relatedSlugs`: 2–3 slugs from the master list below (they need not exist yet; unresolved ones are ignored).

## Master slug list (for relatedSlugs — use these exact slugs)

Prophets: prophet-adam, prophet-idris, prophet-nuh, prophet-hud, prophet-salih, prophet-ibrahim,
prophet-lut, prophet-ismail, prophet-ishaq, prophet-yaqub, prophet-yusuf, prophet-ayyub,
prophet-shuayb, prophet-musa, prophet-harun, prophet-dhul-kifl, prophet-dawud, prophet-sulayman,
prophet-ilyas, prophet-al-yasa, prophet-yunus, prophet-zakariyya, prophet-yahya, prophet-isa,
prophet-muhammad

Basics: basics-five-pillars, basics-shahada, basics-salah, basics-zakat, basics-sawm, basics-hajj,
basics-belief-in-allah, basics-belief-in-angels, basics-belief-in-books, basics-belief-in-messengers,
basics-belief-in-last-day, basics-belief-in-qadar, basics-wudu, basics-how-to-pray

Concepts: concept-tawhid, concept-iman, concept-taqwa, concept-shirk, concept-halal-haram,
concept-jannah, concept-jahannam, concept-sunnah, concept-dua, concept-sabr, concept-ummah,
concept-tawbah, concept-tawakkul

Surahs: surah-al-fatiha, surah-al-ikhlas, surah-ayat-al-kursi, surah-al-mulk, surah-al-kahf, surah-ya-sin

Stories (quranic): story-people-of-the-cave, story-dhul-qarnayn, story-maryam, story-luqman,
story-ashab-al-fil

## Output

Write each article with the Write tool to:
`F:\Pro\Quran-website\src\data\knowledge\articles\<slug>.json`

Produce valid JSON (double-quoted keys/strings, no trailing commas, no comments). After writing all
your assigned files, reply with the list of slugs you created.
