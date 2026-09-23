# Hinglish and Hindi coverage — findings and plan

Status: Layer 1 built and merged into the working tree on 2026-09-18 (transliterator, display-language plumbing, UI, search index). Layer 2's *machinery* was built on 2026-09-23 and widened past hadith — see "Running Layer 2 in GitHub Actions" — but no paid run has been made yet. Layer 3 is still a plan. Rewritten 2026-09-03 after auditing every data source for Hinglish, measuring real Urdu and Hindi coverage across the corpus, and prototyping a Devanagari → Hinglish transliterator against live repo data. Revised the same day so the paid translation pass runs unattended in GitHub Actions rather than on a local machine — see "Running Layer 2 in GitHub Actions".

Supersedes the 2026-09-01 version of this file, which was Hindi-only and contained one measurably wrong coverage claim (see "Corrections to the previous version").

## The question

"Use Hinglish instead of Hindi: if Hinglish exists, use it; if it does not, convert Urdu to Hindi or Hinglish."

That resolves into three questions, answered in order below:

1. Does any source we use already ship Hinglish — Hindi written in Latin script? (No. Nothing does.)
2. Given that, what is the cheapest correct way to produce it? (Get Devanagari, then transliterate mechanically. Not the other way round.)
3. What still has no Hindi of any kind, and what does filling that gap cost? (Hadith. Roughly $31 one-time, batched.)

## Finding 1 — no source we use ships Hinglish

Every source was checked directly rather than assumed.

| Source | Used for | Hinglish? | How it was checked |
| --- | --- | --- | --- |
| alquran.cloud `hi.hindi` | Quran translation | No — Devanagari | `scripts/fetch-quran-data.ts` editions list; inspected the written `translations.hi` values in `public/data/quran/quran-all.json` |
| spa5k `tafsir_api` `hindi-mokhtasar` | Quran tafsir | No — Devanagari | The single Hindi entry in `TAFSIR_EDITIONS` (`src/lib/quran/tafsir.ts`); fetched at runtime from jsDelivr |
| fawazahmed0 `hadith-api` | Hadith text | No Hindi at all, so no Hinglish | Fetched and read `editions.json`. Nine languages: Arabic, Bengali, English, French, Indonesian, Russian, Tamil, Turkish, Urdu. No edition identifier contains `hin` — the near-misses are the Indonesian `ind-*` entries |
| hadeethenc.com `language=hi` | Hadith explanation | No — Devanagari | Read all 60 cached `hi-*.json` payloads under `.cache/hadeethenc/`. Every one is Devanagari; no Roman-script variant was observed |
| Repo-authored knowledge base | Articles | No | e.g. `src/data/knowledge/articles/creed-kalima-tayyibah.json` — `title`/`summary`/`body` per `en`/`hi`/`ur`, Hindi in Devanagari |

One caveat worth recording honestly: `https://hadeethenc.com/api/v1/languages/list/` and `/languages/one/?language=en` both returned `{"status":false,"error":false}`, so hadeethenc's full language list could not be *enumerated*. The conclusion above rests on inspecting its actual Hindi payloads, not on a language listing. It is safe to say no Roman-script Hindi was found there; it is not safe to say the API proves one does not exist.

The only Latin-script non-English text already in the repo is *Arabic* transliteration in academic diacritics — `"Lā ilāha illa'llāh, Muḥammadur rasūlu'llāh"`. That is a different thing from Hinglish, in a different style, and cannot be reused for it.

**Consequence: Hinglish is always derived. There is no "if Hinglish is there" branch — that branch is empty everywhere.**

## Finding 2 — derive Hinglish from Devanagari, never from Urdu

The instinct from the question is Urdu → Hinglish, since both skip Devanagari. That is the wrong direction, for one structural reason:

- **Devanagari → Latin is deterministic and lossless.** Devanagari writes every vowel explicitly. A fixed mapping table plus schwa-deletion rules produces good Hinglish with no inference and no model.
- **Urdu → anything requires guessing.** Urdu script omits short vowels. `کتب` is *kitab* or *kutub* depending on context; no table can tell which. Any Urdu → Hinglish path silently inherits that error rate.

So the pipeline is always:

```
Urdu ──(needs vowel inference: LLM, or mechanical fallback)──▶ Hindi (Devanagari) ──(deterministic table)──▶ Hinglish
```

This also settles storage. **Devanagari is the single source of truth on disk; Hinglish is derived at render time and at index time, never stored.** Reasons:

- Hinglish → Devanagari is not deterministic (`ki` could be कि or की), so storing Hinglish as the container loses information permanently.
- Deriving means zero data growth — no second copy of ~17 MB of text per corpus, nothing extra in the ~400 MB deploy artifact.
- Deriving means no drift. One transliterator, one behaviour, in the browser and in the Pagefind build.
- Improving the transliterator improves every surface at once, with no regeneration pass.

## Finding 3 — what coverage actually exists today

All numbers measured against the files in `public/data/`, not estimated.

**Quran — Hindi is already complete.**

| Language | Ayahs with text | Total |
| --- | --- | --- |
| English | 6,236 | 6,236 |
| Hindi | 6,236 | 6,236 |
| Urdu | 6,236 | 6,236 |

Hinglish for the entire Quran is therefore **free and 100%** — it is a transliteration of text already on disk. No API, no key, no new data. This is the single largest win in this plan and it costs nothing.

**Hadith — no Hindi at all; Urdu is good but not complete.**

| Field | Hadiths | Of 36,390 |
| --- | --- | --- |
| Urdu present | 33,467 | 92.0% |
| Urdu absent | 2,923 | 8.0% |
| Urdu absent *and* English absent | 203 | 0.6% |

The 92% is not evenly spread. Nasai is the outlier at 3,874 of 5,765 (67.2%); the other collections are far closer to complete. The 203 hadiths with neither Urdu nor English have no usable source of any kind and must stay Arabic-only — this is a corpus gap, not a pipeline gap, and the UI should say so rather than appear broken.

**hadeethenc authored explanations — ceiling is about 7%, unchanged.**

A `--limit=60 --dry-run` pass reported `Categories: 449` and `ids so far: 2314`: hadeethenc exposes 2,314 Hindi hadith ids total. After the matcher was tightened (formula/isnad stripping, shingle-contiguity guard, three-path `accepts()`), 44 of 58 sampled entries matched at roughly 1.5 local hadiths each. Extrapolated across all 2,314 ids that is about 3,500 of 36,390 — under 10%.

That is a property of the source, not of the thresholds. Current on-disk state: `.cache/hadeethenc/` holds 60 of the 2,314 ids, and `public/data/hadith/<collection>/hindi/` **does not exist yet** — no sidecars have been generated.

**Knowledge base — Hindi is authored per article** in `en`/`hi`/`ur` keys, so Hinglish there is also free.

## The text-versus-explanation distinction still holds

"Tafseer" (sharh — a scholar's explanation) and "translation" (the hadith's own words in another language) are different, and only one can be made complete.

There is no complete Hindi sharh corpus anywhere, and not even a complete *Arabic* sharh in our data. The only authored Hindi explanations available are hadeethenc's 2,314 entries. So "full Hindi/Hinglish hadith" can only mean **full hadith text**, with authored explanation on the ~7% subset where hadeethenc matches.

Generating *explanations* with an LLM stays excluded. Machine-authored religious commentary on a site people may treat as a reference is a different category of risk from machine-translated text, and should not be introduced without an explicit, separate decision. Machine translation of text is disclosed and labelled; invented commentary cannot be made safe by a label.

## Architecture — Hinglish is a script, not a fourth language

The important design call. Hinglish is Hindi rendered in Latin script — `hi-Latn` in BCP-47 terms. Modelling it as a fourth *language* would be a mistake:

- It would add a fourth key to every authored article (60+ files in `src/data/knowledge/articles/`), each needing hand-authoring or, worse, a stored machine derivation that drifts from its Devanagari twin.
- It would widen the `Language` union everywhere, forcing every exhaustive `switch` and every data-fetch path to grow a case that is never a real data source.

Instead: keep the *data* type as-is, add a *display* type.

```ts
// src/types/knowledge.ts — unchanged, this is what data actually has
export type Language = "en" | "hi" | "ur"

// new — what the reader can choose to see
export type DisplayLang = Language | "hi-Latn"

// new — every data lookup goes through this
export function dataLang(d: DisplayLang): Language {
  return d === "hi-Latn" ? "hi" : d
}
```

`hi-Latn` reads Hindi data and passes it through the transliterator on the way to the DOM. Nothing else changes shape.

Touch points, all already located:

| File | Change |
| --- | --- |
| `src/lib/translit/hinglish.ts` | **New.** The transliterator. Pure, no imports, no `node:*` — must run in the browser and under `tsx` at build time |
| `src/lib/translit/hinglish.test.ts` | **New.** Golden cases, plus the invariant test described below |
| `src/types/knowledge.ts:10` | Add `DisplayLang` and `dataLang` next to `Language`; leave `Language` alone |
| `src/components/shared/LanguageSwitcher.tsx` | Add a Hinglish entry to `LANGUAGES`; `STORAGE_KEY = "noor-language"` and the `noor:languageChange` event carry `DisplayLang` |
| `src/components/quran/TranslationTabs.tsx:5`, `src/components/quran/QuranReader.tsx:25` (`TranslationLang`) | Accept `hi-Latn`; resolve through `dataLang` before reading `translations[...]` |
| `src/components/knowledge/KnowledgeLanguageTabs.tsx:20` | Same |
| `src/lib/knowledge/lang.ts` | `hi-Latn` gets `dir: "ltr"` and the Latin font stack, not the Devanagari one |
| `src/lib/quran/tafsir.ts` | `fetchTafsir()` pulls `hindi-mokhtasar` from jsDelivr at **runtime**, so the transliterator must be client-safe — it is, by the constraint above |
| `scripts/build-pagefind-index.mjs` | Append Hinglish to each record's `content` (see Search below) |
| `package.json` | `build:pagefind` becomes `node --import tsx scripts/build-pagefind-index.mjs` so the `.mjs` script can import the `.ts` transliterator with `@/` aliases — the same pattern `npm test` already uses |

Storage of the reader's choice stays a single value. A reader who picks Hinglish gets Hinglish on Quran translation, tafsir, knowledge articles, and hadith alike, from one switch.

## The transliterator — specification and measured results

**Built.** `src/lib/translit/hinglish.ts`, ~280 lines, dependency-free and browser-safe (no `node:*`, no I/O) because the same module is imported by client components and by the Pagefind build. Tests in `src/lib/translit/hinglish.test.ts`, 17 cases, run by `npm test`.

Algorithm:

1. **Segment** each Devanagari run into syllable units `{ consonant, vowel }`. A consonant with no matra carries the inherent schwa `a`; a virama (`्`) makes the unit vowel-less; anusvara/chandrabindu (`ं`/`ँ`) become `n`; visarga (`ः`) becomes `h`.
2. **Map** matras and independent vowels through fixed tables. Nuqta forms — both pre-composed (`क़ ख़ ग़ ज़ ड़ ढ़ फ़`) and decomposed base + `़` — map to `q kh gh z r rh f`.
3. **Vowel scheme:** `i`/`u` for both short and long (`ि`/`ी` → `i`, `ु`/`ू` → `u`). Tested against `ee`/`oo` and clearly more natural — no Hindi speaker writes *rahmeem* for रहीम.
4. **Long-a rule:** `ा`/`आ` → `aa` when the syllable closes (the next unit is a bare consonant), otherwise `a`. This is what turns *aasamaanaon* into *aasmanon*.
5. **Schwa deletion**, the one place a mechanical mapper goes wrong. Three rules: drop word-final inherent `a` unless the word is monosyllabic (*na*, *ka* survive); drop medial inherent `a` scanned **right to left** when both neighbours carry a vowel (*ra-ha-maan* → *rahmaan*, *ka-ra-ne* → *karne*, *u-sa-ke* → *uske*); never touch the first syllable (*namaaz*, not *nmaaz*).
6. **Override lexicon** for the words a table cannot get right — high-frequency function words and Arabic/Persian loans (`में` → *mein*, `नहीं` → *nahi*, `फ़ैसला` → *faisla*, `काफ़िर` → *kafir*). Expect to seed ~200 entries; each one is cheap and permanent.
7. `।` becomes `.`; non-Devanagari characters, including Latin and punctuation, pass through untouched.

Measured output, from the shipped module on real repo data:

| Devanagari (on disk) | Hinglish (derived) |
| --- | --- |
| अल्लाह के नाम से जो रहमान व रहीम है। | Allah ke naam se jo rahmaan va raheem hai. |
| तारीफ़ अल्लाह ही के लिये है जो तमाम क़ायनात का रब है। | taarif Allah hi ke liye hai jo tamaam qaaynaat ka rab hai. |
| अल्लाह पर ईमान — ईमान का पहला अनुच्छेद (KB title) | Allah par imaan — imaan ka pahla anuchchhed |

**Defects from the prototype, all now fixed and covered by tests:** the incomplete matra table (closed by the corpus invariant), `tarif` → `taarif` (word-initial exemption from the open-syllable rule, guarded by `i === 0 && u.length >= 2` so monosyllabic `का` still reads *ka*), `quraaan` → `qiraat`-style vowel-run collapsing, `vaaky` → `vaakya` (cluster-final semivowel kept, while `सब्र` still drops to *sabr*), and the nuqta-less source spellings (`काफिर`, `फरमाए`), which the override lexicon now carries under both spellings. `resolveLongA` must run *after* schwa deletion — it is the deleted schwa that closes the syllable.

**Two invariant tests do the real work**, one over all 6,236 Quran Hindi translations and one over every authored Hindi string in the 133 knowledge articles: *no Devanagari code point may survive transliteration*. Both skip rather than fail when the data is absent, so a fresh clone that has not run `fetch:quran` still passes.

**Remaining known defects,** none blocking:

- `क़ायनात` → *qaaynaat* where *qaynaat* reads better. The word-initial exemption over-applies when the next consonant loses its schwa. Low frequency; an override entry fixes any specific word.
- `mahaantam` where *mahantam* reads better — the same long-a edge, also low frequency.
- The override lexicon is ~60 entries, not the ~200 estimated. Grow it as real text surfaces problems rather than speculatively.

**Data-quality finding, worth acting on separately:** the alquran.cloud Hindi translation contains genuinely malformed Devanagari — `अौर` (अ + ौ) for `और`, matras after a virama (`हडड्ी`), doubled viramas (`गिरफ््तार`), word-initial matras (`ुम`) and word-initial nuqta (`़ज़बाह`), plus `साीधा`, `बेिहश्त`, `बनाऊॅगा`. This is broken in the Devanagari view today, not only in Hinglish. The transliterator recovers from each case (attaching orphan marks to the preceding unit, which yields *aur* and *haddi* rather than mojibake), and the malformed words are pinned in a test, but the source data itself is still wrong and nobody has fixed it.

## Search

`scripts/build-pagefind-index.mjs` declares every record as `language: "en"`, which is deliberate — it keeps raw multilingual substrings matchable. That decision helps here: Hinglish is Latin script, so the English stemmer and tokenizer handle it natively, and a reader typing `namaz` or `rahmaan` will actually hit.

Append derived Hinglish to the searchable `content` of each record type, alongside the existing Devanagari (indexing both means either script finds the ayah):

- Quran: content is currently `[a.arabic, a.translations?.en, a.translations?.ur, a.translations?.hi]` — add `toHinglish(a.translations?.hi)`.
- Hadith: the loader builds `hindiByNumber` from the `hindi/` sidecars as `[entry.text, entry.explanation, ...hints]` — add the Hinglish of each.
- Knowledge: `langs = ["en", "ur", "hi"]` — add the Hinglish of the `hi` fields.

Index size grows by roughly the Hinglish character count, which is comparable to the Devanagari it derives from. Against a ~400 MB artifact this is not a concern, but measure it after the first build rather than assuming.

**Built.** All three record types now carry Hinglish, and `build:pagefind` runs under `node --import tsx`. Two things the plan got wrong:

- The script's own header claimed tsx could not resolve the ESM-only `pagefind` export map, which is why it ran under plain `node`. Retested: `node --import tsx` loads both `pagefind` and the TypeScript transliterator without complaint. The comment was stale and has been corrected.
- The hadith half is inert today. `public/data/hadith/<collection>/hindi/` does not exist yet, so `hindiByNumber` is empty and the Hinglish it would add is nothing. That code path only starts producing once Layer 2 or Layer 3 writes the sidecars.

First build after the change: 6,236 ayahs + 36,390 hadiths + 133 articles, `public/pagefind/` at 189 MB.

## Options for the hadith gap

Quran, tafsir, and knowledge-base Hinglish are settled and free. Only hadith needs a decision, because no Hindi exists there at all.

### A. Mechanical Urdu → Devanagari, then transliterate

- Coverage: 92.0% (wherever Urdu exists).
- Cost: free. No key, no network, deterministic, reproducible in CI.
- Quality: the weak point, and the weakness is structural — Urdu omits short vowels, so vowel inference is guesswork. Output is readable but visibly rough. Urdu's religious register is heavy with Arabic and Persian vocabulary that survives transliteration unchanged and can read as unfamiliar even in Devanagari.
- Worth noting: since Hinglish is the display target, going Urdu → Devanagari → Hinglish means the guessed vowels get *rendered explicitly* in Latin script. Errors that Devanagari readers might gloss over become plainly visible. This makes A weaker for a Hinglish-first site than it was for a Hindi-first one.
- If chosen: validate on ~20 hadiths spread across collections before generating all of them. Aksharamukha supports the Urdu/Devanagari pair.

### B. LLM Urdu → Hindi (Devanagari), one-time batch — recommended

Translate each hadith's Urdu into Hindi Devanagari once, commit the Devanagari, derive Hinglish at render time.

- Coverage: 99.4% (36,187 of 36,390 — everything with Urdu or English; only the 203 no-source hadiths remain uncovered).
- Quality: the best available. Urdu and Hindi are the same spoken language in different scripts, so this is transliteration *with correct vowels and natural word choice* — exactly the information the mechanical path has to guess.
- Why Urdu as the source and not English or Arabic: English → Hindi double-translates (Arabic → English → Hindi) and drifts at each hop. Arabic → Hindi directly would want a larger model at several times the cost. The Urdu is already a scholarly translation of the Arabic, so it is both the cheapest and least lossy starting point. For the 2,720 hadiths with English but no Urdu, translate from English and mark those records so the weaker provenance is visible in the data.

Cost, computed from measured character counts rather than guessed:

- Urdu corpus: 16,856,957 characters across 33,467 hadiths (avg 504, max 18,795). At ~2.2 chars/token that is **~7.7M input tokens**. Plus ~100 tokens of instruction per request × 36,187 requests ≈ 3.6M. Total input ≈ **11M tokens**. Output in Devanagari is comparable in characters but tokenizes less efficiently: ≈ **10M tokens**.

| Model | Standard | Batch API (50%) |
| --- | --- | --- |
| `claude-haiku-4-5` ($1 / $5 per MTok) | ~$61 | **~$31** |
| `claude-sonnet-5` ($3 / $15) | ~$183 | ~$92 |
| `claude-opus-5` ($5 / $25) | ~$305 | ~$153 |

(Sonnet 5's $2/$10 introductory rate expired 2026-08-31, so the standard $3/$15 applies.)

Recommendation: **run a 200-hadith sample through Haiku 4.5 and Sonnet 5, read both, and pick on quality.** Urdu → Hindi is close to a transliteration task, which is where a small model is strongest, so Haiku 4.5 is likely sufficient — but that is a judgement to make on output, not on price. The sample costs well under a dollar either way.

Mechanics: the largest hadith is ~8.5K tokens, comfortably inside Haiku 4.5's 200K context. All 36,187 requests fit one batch on paper (limits are 100,000 requests / 256 MB), but split into chunks of ~5,000 for progress visibility and cheap retries. Batch results are keyed by `custom_id`, returned in arbitrary order, and retained 29 days; most batches finish within an hour, with a 24-hour ceiling.

This whole pass runs in GitHub Actions, not on a local machine — see the next section.

### C. hadeethenc only

Keep the matched ~7% and say plainly on the rest that Hindi is unavailable.

- Coverage: ~7% — the panel reads "not available" on roughly nine hadiths in ten.
- Cost: free, and the matcher work is already done.
- Quality: highest per entry — genuinely authored Hindi with `hints[]`, `attribution` and `grade`, credited to hadeethenc.com.
- On its own it fails the previous plan's own stopping rule: "if the honest match rate lands very low (say under 10%), stop and report it rather than shipping a feature that is almost always absent."

## Recommendation

**Three layers, shipped in this order.**

**Layer 1 — the transliterator, now.** Free, no key, no network, and it delivers Hinglish across the Quran (6,236/6,236), Quran tafsir, and the whole knowledge base immediately. It is also a prerequisite for everything else, so it is the right first commit regardless of what follows.

**Layer 2 — B for hadith.** LLM Urdu → Hindi Devanagari for all 36,187 hadiths that have a source, at roughly $31 batched on Haiku 4.5 (pending the sample comparison), labelled plainly as a machine translation. Store Devanagari; render Hinglish. A remains the key-less fallback if the project must stay free — the tradeoff is purely output quality, and it is a larger tradeoff under Hinglish than it was under Devanagari.

**Layer 3 — C stacked on top.** Keep hadeethenc's authored explanation rendered as a clearly separate block on the ~7% where a match exists, transliterated to Hinglish like everything else.

The result: complete Hinglish text coverage, authored explanation where it genuinely exists, machine translation disclosed as such, and no generated text passed off as scholarship. The 203 no-source hadiths stay Arabic-only with an explicit note.

## Running Layer 2 in GitHub Actions

**Built 2026-09-23, and wider than this section originally scoped.** The shipped
files are `scripts/ai-hindi-pass.ts` and `.github/workflows/ai-hindi-pass.yml`.
The four constraints below and the state-branch design were kept verbatim; what
changed is scope, model, and where the output lands.

The ask that drove the widening: *correct every Hindi/Hinglish surface with AI,
not just hadith.* So the script is section-driven, and each section declares
whether it is a **proofread** or a **translate** job:

| Section | Job | Source → target | Units |
| --- | --- | --- | --- |
| `quran` | proofread | `public/data/quran/*.json` → `translations.hi` | 6,236 |
| `surah` | translate | `src/data/quran/surahs.json` → `nameHi`, `nameTranslatedHi` | 114 |
| `tafsir` | proofread | `public/data/tafsir/hindi-mokhtasar/surah-*.json` | 6,236 |
| `hadith` | translate | `<col>-all` `urdu` (else `english`) → `hindi/book-*.json` | 36,187 |
| `knowledge` | proofread | every authored `hi` string in the 133 articles | 133 |

The proofread/translate split is the safety line. Proofread sections already
have Hindi, so the model may only repair mechanical damage — the exact defects
"Data-quality finding" records (`अौर`, `हडड्ी`, `गिरफ््तार`, `ुम`, `साीधा`) —
and is forbidden from rewording, retranslating or modernising. A length guard
enforces it: any proofread output below 0.5x or above 2x the original is
discarded and the original kept, counted, and reported. Translate sections have
no Hindi to preserve, so no guard applies beyond "output must be Devanagari".

Four things this section got wrong or left out, now settled:

- **Tafsir had nothing on disk to correct.** `fetchTafsir()` pulled every
  edition from jsDelivr at runtime. `scripts/fetch-tafsir-hindi.ts` now
  snapshots `hindi-mokhtasar` into `public/data/tafsir/hindi-mokhtasar/surah-N.json`
  (114 files, 4.7 MB, **6,236/6,236 ayahs — full coverage**, which this plan
  never measured). `fetchTafsir()` prefers the local copy for that one slug and
  falls back to the CDN; the other five editions are untouched. The snapshot is
  also folded into each ayah's Pagefind record, so tafsir text is searchable in
  Devanagari and Hinglish for the first time (index 189 MB → 196 MB).
- **Output opens a pull request, it does not commit to `main`.** 36k machine
  edits to scripture should be read before they ship. The workflow pushes
  `ai/hindi-pass-<run_id>`, records that branch name in the state file so every
  resume lands on the same PR, and opens it with `gh pr create`. Merging then
  triggers `versioning.yml` → the `release` gate → `deploy.yml`, exactly as
  before. This also sidesteps the branch-protection problem the old section
  flagged as "check before the first full run".
- **Model is `claude-opus-5`, not Haiku.** Measured by `MODE=estimate SAMPLE=0`
  against the real corpus: 31.55M input / 9.55M output tokens, **~$198 batched**
  across all five sections. Hadith is ~$150 of that; the other four together are
  under $50. (The old $153 hadith figure holds.)
- **Structured output is forced with a tool, not asked for in prose.** Every
  request carries one `emit` tool with an `{ out: string[] }` schema and
  `tool_choice: {type: "tool"}`, so the model cannot return fences or prose and
  the array shape is validated before it reaches us. `custom_id` encodes the
  write-back target (`hadith-bukhari-97-7563-ur`, `tafsir-2-255`), which is why
  the state file needs no per-unit bookkeeping at all — just one row per chunk.

`MODE` has two free modes in front of the two that cost money:

```
MODE=selftest   every custom_id unique, legal (≤64 chars, [A-Za-z0-9_-]) and
                parsing back to a target that exists; knowledge slot walker
                symmetric between collect and apply. No key, no writes.
MODE=estimate   unit counts, character counts, token projection, dollar figure.
MODE=submit     builds and POSTs batches, checkpointing each id before the next.
MODE=resume     polls recorded batches and writes what has ended. Exits in
                seconds when nothing is pending, so the cron tick is ~free.
```

A collision or an illegal character in one `custom_id` fails the whole
2,000-request chunk, and a knowledge article whose slot count shifts between
collect and apply would write corrected strings into the wrong fields. Both are
silent-until-expensive, which is why `selftest` exists and why it runs over the
full corpus regardless of `SAMPLE`. It passes today on all 42,906 units.

`SAMPLE` defaults to 200 both in the script and in the workflow input, so a full
run takes the deliberate keystroke of typing `0`.

The original design sketch follows. It is kept for the reasoning behind the
state branch, the 29-day result retention, and the 360-minute ceiling — all of
which the shipped workflow implements as described. The YAML below is **not**
the file that ships.

The translation pass must not depend on a laptop staying awake. It runs on GitHub's runners, and the design is shaped by four hard constraints:

1. **A GitHub-hosted job is killed at 360 minutes.** The Batch API's ceiling is 24 hours. So a single submit-and-wait job cannot cover the worst case, and the run must be resumable rather than restartable.
2. **`.cache/` is gitignored and a runner is ephemeral.** The local caching plan (`.cache/hindi-translation/`) buys nothing in CI — the directory evaporates when the job ends. What replaces it is better: Anthropic retains batch results for **29 days**, keyed by `custom_id`, so *the batch id is the cache*. Persist the ids and a resume costs zero tokens even days later.
3. **`GITHUB_TOKEN` pushes do not trigger other workflows.** This repo already solves that with `RELEASE_TOKEN`, a PAT that `versioning.yml` uses so its tag push reaches `deploy.yml`. The translation commit must use the same PAT if it should ship automatically.
4. **`deploy.yml` fires only on `v*` tags.** So translated data lands on `main` → `versioning.yml` tags it → `deploy.yml` ships it. Note that `versioning.yml`'s release job sits behind the `release` environment's required-reviewer gate, so the deploy pauses for one approval. That is the existing, intended behaviour — not something to work around.

### Where the state lives

Batch ids and per-chunk progress go on a dedicated **orphan `batch-state` branch**, not on `main`. Two reasons, both practical:

- Dozens of checkpoint commits would otherwise clutter the release history that tags are supposed to describe.
- A long-running job that commits to `main` races with your own pushes and eventually fails non-fast-forward. Nothing else ever writes to `batch-state`, so its push can't conflict.

The state file is small — one entry per chunk:

```json
{
  "model": "claude-haiku-4-5",
  "submittedAt": "2026-09-03T18:04:11Z",
  "chunks": [
    { "n": 0, "batchId": "msgbatch_01…", "collection": "bukhari", "range": [0, 5000], "status": "ended", "written": true },
    { "n": 1, "batchId": "msgbatch_01…", "collection": "bukhari", "range": [5000, 7563], "status": "in_progress", "written": false }
  ]
}
```

**The script must checkpoint after every chunk, not at the end.** That is what makes the 360-minute ceiling a non-event: a job that runs out of time has already banked everything it finished.

### The workflow

`.github/workflows/translate-hadith-hindi.yml` — one file, `workflow_dispatch` for the human entry points plus a low-frequency `schedule` as a safety net.

```yaml
name: Translate hadith to Hindi

# One-time bulk translation of the hadith corpus (Urdu -> Hindi Devanagari) via
# the Anthropic Batch API, run entirely on GitHub's runners so no local machine
# has to stay awake for it.
#
# Anthropic keeps batch results for 29 days, and this workflow checkpoints batch
# ids to the `batch-state` branch after every chunk. That makes the run fully
# resumable: a job that hits the runner's 6-hour ceiling is restarted by
# re-dispatching with mode=resume and picks up exactly where it stopped, without
# re-submitting (or re-paying for) a single request.
#
# ONE-TIME SETUP:
#   1. Settings -> Secrets and variables -> Actions -> New repository secret:
#        ANTHROPIC_API_KEY
#      (RELEASE_TOKEN already exists — versioning.yml uses it.)
#   2. Create the state branch once, with no history shared with main:
#        git switch --orphan batch-state
#        git commit --allow-empty -m "chore: batch state branch"
#        git push -u origin batch-state
#        git switch -
#   3. Add `/.batch-state/` to .gitignore so the second checkout below never
#      shows up as untracked noise in main's working tree.

on:
  workflow_dispatch:
    inputs:
      mode:
        description: "submit = build and send batches. resume = poll existing batches and write results."
        type: choice
        options: [submit, resume]
        default: submit
      model:
        description: "Model id"
        type: choice
        options: [claude-haiku-4-5, claude-sonnet-5, claude-opus-5]
        default: claude-haiku-4-5
      sample:
        description: "Translate only the first N hadiths (model comparison). Set to 0 for the full corpus."
        default: "200"
      collections:
        description: "Comma-separated collections. Blank = all seven."
        required: false
  # Safety net only. Batches usually end within an hour but the ceiling is 24h,
  # and this catches a run that died mid-flight without anyone noticing. The
  # script exits in seconds when there is no state file or every chunk is
  # written, so an idle tick is nearly free. Minute 23 avoids the top-of-hour
  # scheduler congestion, matching deploy.yml's convention.
  schedule:
    - cron: "23 */6 * * *"

permissions:
  contents: write

# Two of these at once would clobber the state branch. Queue rather than cancel,
# so an in-flight chunk finishes and checkpoints.
concurrency:
  group: translate-hadith-hindi
  cancel-in-progress: false

jobs:
  translate:
    runs-on: ubuntu-latest
    # GitHub kills a job at 360 minutes. Stop at 350 under our own control so the
    # final checkpoint is written and pushed rather than lost.
    timeout-minutes: 350
    steps:
      # The hadith corpus (~258 MB, including the *-all.json this reads) is
      # committed, so a plain checkout is all the input the script needs — no
      # fetch:hadith, no network beyond the Anthropic API.
      - uses: actions/checkout@v4
        with:
          # RELEASE_TOKEN (a PAT) so the data commit below triggers versioning.yml,
          # which tags, which triggers deploy.yml. GITHUB_TOKEN would not.
          token: ${{ secrets.RELEASE_TOKEN }}

      - uses: actions/checkout@v4
        with:
          ref: batch-state
          path: .batch-state

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci

      - name: Translate
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          # A scheduled tick is always a resume; only a human submits.
          MODE: ${{ github.event_name == 'schedule' && 'resume' || inputs.mode }}
          MODEL: ${{ inputs.model || 'claude-haiku-4-5' }}
          SAMPLE: ${{ inputs.sample || '0' }}
          COLLECTIONS: ${{ inputs.collections }}
          STATE_DIR: .batch-state
          # Leave headroom under timeout-minutes for the two commit steps.
          DEADLINE_MINUTES: "330"
        run: npm run translate:hadith-hindi

      # Checkpoint first and unconditionally. If the data commit fails, the batch
      # ids still survive and a resume costs nothing.
      - name: Checkpoint batch state
        if: always()
        working-directory: .batch-state
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add -A
          if git diff --quiet --cached; then echo "state unchanged"; exit 0; fi
          git commit -m "chore: batch checkpoint (run ${{ github.run_id }})"
          git push origin HEAD:batch-state

      - name: Commit translations
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add public/data/hadith
          if git diff --quiet --cached; then echo "no new translations"; exit 0; fi
          git commit -m "feat(hadith): Hindi translation (run ${{ github.run_id }})"
          git pull --rebase --autostash origin ${{ github.ref_name }}
          git push origin HEAD:${{ github.ref_name }}
```

Note the `if git diff --quiet --cached; then … fi` form rather than `&& exit 0`. `run:` steps execute under `bash -e`, where a failing left-hand side of an `&&` list can abort the step; the explicit `if` has no such ambiguity, and `git diff --quiet` deliberately exits non-zero when there *are* changes.

### How it is actually used

```
Dispatch  mode=submit, model=claude-haiku-4-5, sample=200   # the comparison sample
Dispatch  mode=submit, model=claude-sonnet-5,  sample=200   # read both, pick one
Dispatch  mode=submit, model=<winner>,         sample=0     # the full corpus
Dispatch  mode=resume                                       # only if the 350-min cap was hit
```

The `sample` input defaults to `200` on purpose: a full run costs real money, so it should take a deliberate keystroke (`0`) rather than happening because someone clicked the green button. Sample runs also make the model comparison itself a GitHub Actions job, so even that step needs nothing local.

Practical notes:

- **Runtime.** Submitting 36,187 requests as eight chunks and waiting is dominated by batch processing, not by our code. Most batches end within the hour, so the realistic shape is one job of 1–3 hours. The 350-minute cap and the resume path exist for the 24-hour tail, not the common case.
- **Minutes.** Public repos get unlimited Actions minutes; private repos get 2,000/month. The 6-hourly safety net is four near-instant ticks a day, which is negligible either way — but it is worth deleting the `schedule:` block once the corpus is translated, since this is a one-time job and a permanent cron for it is dead weight.
- **Scheduled workflows are disabled after 60 days of repository inactivity.** Only affects the safety net, and only on a dormant repo.
- **Repo growth.** The sidecars add roughly 30–40 MB of Devanagari JSON to a `public/data/hadith/` tree that is already 258 MB. Acceptable, but it is permanent history — worth one moment's thought before the full run, not after.
- **Branch protection.** If `main` requires PRs or status checks, the `Commit translations` step will be rejected. Either allow the PAT's account to bypass, or change that step to push a branch and open a PR instead. Check before the first full run rather than discovering it four hours in.
- **`git pull --rebase --autostash`** before the push handles the case where `main` moved while the job ran, which over a multi-hour job is likely rather than hypothetical.

## UI changes required

Two, both already located:

1. **The panel label.** `src/components/hadith/HadithTafseerPanel.tsx:52` currently reads `हिन्दी तफ़सीर · Hindi tafseer`. "तफ़सीर" is wrong for a translation, and a Devanagari label is wrong on a Hinglish view. It becomes a script-aware label — "Hindi text" / "Hinglish text" (machine-translated, labelled) — with the authored explanation as a separate, clearly-marked block shown only where hadeethenc matched. The same applies to the panel's other hard-coded Devanagari strings: `व्याख्या` (line 87), `लाभ` (line 101), `लोड हो रहा है…` (line 61), the error string (line 67), the empty state (lines 72–75), and `स्रोत / Source` (line 112). Each needs a Hinglish variant selected by `DisplayLang`.
2. **The coverage note** on the book header, fed by `getHindiTafseerBookCount` in `src/lib/hadith/hindiCoverage.ts:43`. Under B, text coverage is ~100% per book, so the note either goes away or switches to reporting *authored-explanation* coverage specifically. The distinction matters to a reader and should not be blurred: "text everywhere, explanation on some" is the honest statement.

## What is already built and reusable

Nothing about the client half depends on where the Hindi text comes from. All of the following read `public/data/hadith/<collection>/hindi/book-<bookId>.json` and work unchanged under any option:

- `src/lib/hadith/hindiTafseer.ts` — promise-cached per-book fetch; 404 resolves to an empty map. Shape: `{ text, explanation, hints, attribution, grade, sourceId }`.
- `src/components/hadith/HadithTafseerPanel.tsx` — the collapsible panel (relabelling aside).
- `src/components/hadith/HadithCard.tsx` — mounts the panel with `collection`, `bookId`, `hadithNumber`.
- `src/lib/hadith/hindiCoverage.ts` and the book-header note — build-time read, returns 0 when the coverage file is absent, which is the state of a fresh clone.
- `scripts/build-pagefind-index.mjs` — already loads `hindi/*.json` per collection and appends the text to each hadith's searchable `content`.
- The deploy prune in `.github/workflows/deploy.yml` deletes only `*-all.json`, so these sidecars survive into the artifact.

Only the *producer* of the sidecars changes. Under B a new script fills every hadith number instead of the 2,314 hadeethenc ids.

## Implementation steps

**Layer 1 — transliterator (free, do first) — DONE 2026-09-18**

1. ~~Read the relevant guide under `node_modules/next/dist/docs/` before touching any component~~ — done; `01-getting-started/05-server-and-client-components.md`. Nothing here crosses the server/client boundary: every component touched was already `"use client"`, and the transliterator is a pure function imported into that bundle.
2. ~~Write `src/lib/translit/hinglish.ts`~~ — done, from scratch rather than by promoting the probe.
3. ~~Write `src/lib/translit/hinglish.test.ts`~~ — done: 17 tests, including the two corpus invariants. `npm test` is 87 passing.
4. ~~Add `DisplayLang` and `dataLang`; wire the UI~~ — done, and the real touch points differed from the guess above:
   - `src/types/knowledge.ts` — `DisplayLang = Language | "hi-Latn"`, re-exported from `src/types/index.ts`. `Language` untouched, so every data file and lookup stays three-keyed.
   - `src/lib/lang.ts` (new) — `dataLang`, `displayText`, `displayDir`, `displayFont`, `DISPLAY_LANG_LABELS`. The whole display layer is these five exports.
   - `src/lib/knowledge/lang.ts` — `langDir`/`langFont`/`pick` widened to `DisplayLang` and delegated to the above. `pick` is the single funnel for all knowledge-base strings; one change covers 133 articles. Gained `displayBlocks`, which transliterates a hydrated body once so the block views stay language-agnostic.
   - `ArticleView`, `KnowledgeIndexClient` — state widened to `DisplayLang`; `ArticleView` resolves `article.body[dataLang(lang)]` and runs it through `displayBlocks`, then passes the resolved `Language` down. `BlockRenderer`, `VerseBlockView`, `HadithBlockView` and `ArabicBlockView` needed no changes at all.
   - `KnowledgeCard`, `KnowledgeCategoryCard` — prop widened; they already go through `pick`.
   - `KnowledgeLanguageTabs`, `TranslationTabs` — four tabs from `DISPLAY_LANG_LABELS`. `TranslationTabs` is now a 2×2 grid; four labels do not fit across the reader's side panel.
   - `QuranReader` — the local `TranslationLang` alias is gone, replaced by `DisplayLang`.
   - `AyahDisplay` (**not in the original list**) — carried its own `"en" | "hi" | "ur"` prop; now resolves through `dataLang` and `displayText`.
   - `TafsirPanel` (**not in the original list**) — `preferredLang` widened; Hinglish selects the Hindi edition and transliterates its text on the way out.
   - `LanguageSwitcher` was **left alone deliberately.** It writes `localStorage["noor-language"]` and dispatches `noor:languageChange`, and nothing in the app reads either one — the control is inert, and it offers an "Arabic" option no view honours. Adding Hinglish to it would ship a switch that does nothing. Either wire it up or delete it; that is a separate decision.
5. ~~Switch `build:pagefind` to tsx; append Hinglish to the index~~ — done. See "Search".
6. `npm test` (87 passing), `npx tsc --noEmit` and `npm run lint` (both clean), `npm run build:pagefind` (rebuilt). Still to do by hand: look at an ayah, a tafsir panel, an article and a Latin-script search hit in a browser.

Not done, and arguably part of Layer 1: `HadithTafseerPanel` has no language control at all — it is hard-coded Hindi, Devanagari labels included. A reader on the Hinglish tab elsewhere in the app still gets Devanagari there. Wiring it needs new UI (a script toggle), not just a `displayText` call, so it is folded into the Layer 2 relabelling step below.

**Layer 2 — the AI pass (needs a key; runs in GitHub Actions) — MACHINERY DONE 2026-09-23, NO PAID RUN YET**

Steps 8–12 were built as one section-driven pass over all five surfaces rather than a hadith-only script; see "Running Layer 2 in GitHub Actions" for what changed and why.

7. **Still to do, and it blocks everything below.** One-time setup: add the `ANTHROPIC_API_KEY` repository secret, and create the orphan `batch-state` branch:
   ```bash
   git switch --orphan batch-state
   git commit --allow-empty -m "chore: batch state branch"
   git push -u origin batch-state
   git switch -
   ```
   `/.batch-state/` is already in `.gitignore`.
8. ~~Write the script with submit/resume modes, env-driven~~ — done as `scripts/ai-hindi-pass.ts`, with `selftest` and `estimate` added in front of the two paid modes. `custom_id` encodes the write-back target, so the state file carries one row per chunk and no per-unit bookkeeping. Chunk size is 2,000 (not 5,000) for finer checkpointing. Both paid modes stop cleanly at `DEADLINE_MINUTES`.
9. ~~Add the npm script~~ — done: `ai:hindi` (plus `fetch:tafsir-hindi` for the tafsir snapshot the pass reads).
10. ~~Prompt~~ — done, two of them: a proofread prompt that enumerates the permitted mechanical repairs and forbids rewording, and a translate prompt that pins religious register (नमाज़/रोज़ा/ईमान over Sanskritised substitutes). Both are byte-identical per section across requests. Note prompt caching does **not** apply: at ~450 tokens these sit under the 1,024-token minimum, so no `cache_control` block is sent — the 50% batch discount is the only discount in play.
11. ~~Add the workflow~~ — done as `.github/workflows/ai-hindi-pass.yml`. Next action once step 7 is complete: dispatch `mode=selftest`, then `mode=estimate sample=0`, then `mode=submit sample=200 sections=quran` (~$1) and read that diff before committing to the full corpus.
12. ~~Sidecar write-back~~ — done, and `hindiTafseer.ts` did need one change after all: a new optional `textSource: "ur" | "en"` records which field a machine translation came from, since provenance through English is weaker and the UI should be able to say so. `explanation`/`hints`/`attribution`/`grade` are preserved where hadeethenc matched.
13. Update `hindi-tafseer-coverage.json` to report authored-explanation coverage rather than text coverage; adjust the book-header note accordingly.
14. Relabel `HadithTafseerPanel` per the UI section, add the machine-translation disclosure (now able to distinguish `textSource`), and add the explicit note for the 203 no-source hadiths.
15. Once the corpus is done, delete the `schedule:` block from the workflow — it is a one-time job and a standing cron for it is dead weight. The `batch-state` branch can stay as a record of what was submitted and when.
16. Confirm the ship: merging the PR triggers `versioning.yml`, which pauses on the `release` environment gate; approve it, and `deploy.yml` runs on the resulting tag. Then check `out/data/hadith/<col>/hindi/` and `out/data/tafsir/` are present in the artifact — the deploy prune only deletes `*-all.json`, so both should survive.

**Layer 3 — hadeethenc (free, already mostly built)**

The matcher's third threshold revision (`STRONG_RUN`, `STRONG_RUN_MIN_RATIO`, `CONTAINED_MIN_HITS` and the three-path `accepts()` in `scripts/fetch-hadith-hindi-tafseer.ts`) has not yet been measured. Verify, then generate:

```bash
npm run fetch:hadith-hindi -- --limit=60 --dry-run --offline   # instant, uses the 60 cached ids
npm run fetch:hadith-hindi -- --dry-run                        # full pass, ~10 min for 2314 ids
npm run fetch:hadith-hindi                                     # write the sidecars
```

The offline pass should show the eight identified near-misses flipping to matched without per-entry inflation. Watch the `Entries used: N/M — X hadiths per entry` line and the `Widest-claiming entries` line; anything much above ~2 hadiths per entry means the acceptance rule has loosened too far.

The full pass is ~10 minutes of network against hadeethenc.com (`REQUEST_DELAY_MS = 250` across 2,314 ids), so it is fine locally — but if it should also run unattended, it is a much simpler workflow than Layer 2's: single `workflow_dispatch` job, `npm run fetch:hadith-hindi`, commit `public/data/hadith/*/hindi/` and `hindi-tafseer-coverage.json`. No batch state, no resume, no schedule. Worth adding only if the matcher thresholds are expected to be re-tuned more than once.

## Open decisions for the user

1. **Vowel scheme sign-off.** The `i`/`u` choice (over `ee`/`oo`) and the long-a rule were picked by comparing sample output, not by a native reader's judgement. Worth ten minutes of review on the sample table above before the golden tests bake it in — changing it afterwards means rewriting every test case.
2. **What `hi` defaults to.** Should a reader who picks "Hindi" see Devanagari (current behaviour, with Hinglish as a separate fourth option in the switcher), or should Hinglish become the default rendering of Hindi with Devanagari as the alternate? This is an audience question, not a technical one — the code supports either, and it is one line in the switcher.
3. ~~**Model for Layer 2.**~~ Settled: `claude-opus-5`, chosen deliberately over the cheaper options because the proofread sections edit scripture and a weaker model's false positives cost more than the price difference. Measured at ~$198 batched for all five sections. The workflow still offers Sonnet 5 and Haiku 4.5 in its dropdown, so a section can be run cheaper if a sample shows the gap is not worth paying for.
4. **Whether the paid run happens at all.** Unchanged, and now the only remaining gate. Layers 1 and 3 are free and key-less; `selftest` and `estimate` are free too. Nothing costs money until someone dispatches `mode=submit`.
5. **How much of the ~$198 to spend at once.** The sections are independent and priced very differently: `quran` + `surah` + `tafsir` + `knowledge` together are under $50 and touch text readers see on the busiest pages; `hadith` alone is ~$150. Running the cheap four first is a defensible first purchase, and it also produces a real diff to judge the proofread guard against before committing to the expensive one.

## Corrections to the previous version

- The 2026-09-01 version claimed at line 22 that "Urdu, by contrast, covers every collection we ship." Every collection is *fetched*, but coverage is 33,467 of 36,390 (92.0%), with nasai at 67.2%. The sentence implied completeness that the data does not show.
- Its cost estimate ($27–54) was derived from a guessed ~250 tokens per hadith. The measured figure is 504 characters ≈ 229 tokens of Urdu, so the guess was close, but the estimate omitted per-request instruction overhead and used a coarser output figure. The recomputed range above is grounded in the actual 16,856,957-character corpus.
- It offered no Hinglish path at all, and its option ordering (transliterate Urdu directly) points the wrong way for a Hinglish target — see Finding 2.
