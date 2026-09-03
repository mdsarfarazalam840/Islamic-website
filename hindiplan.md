# Hinglish and Hindi coverage — findings and plan

Status: plan, ready to implement. Rewritten 2026-09-03 after auditing every data source for Hinglish, measuring real Urdu and Hindi coverage across the corpus, and prototyping a Devanagari → Hinglish transliterator against live repo data. Revised the same day so the paid translation pass runs unattended in GitHub Actions rather than on a local machine — see "Running Layer 2 in GitHub Actions".

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

Prototyped as a dependency-free probe at `.cache/translit-probe.mjs` (gitignored) and run against live repo data. It is roughly 90–150 lines and needs no library.

Algorithm:

1. **Segment** each Devanagari run into syllable units `{ consonant, vowel }`. A consonant with no matra carries the inherent schwa `a`; a virama (`्`) makes the unit vowel-less; anusvara/chandrabindu (`ं`/`ँ`) become `n`; visarga (`ः`) becomes `h`.
2. **Map** matras and independent vowels through fixed tables. Nuqta forms — both pre-composed (`क़ ख़ ग़ ज़ ड़ ढ़ फ़`) and decomposed base + `़` — map to `q kh gh z r rh f`.
3. **Vowel scheme:** `i`/`u` for both short and long (`ि`/`ी` → `i`, `ु`/`ू` → `u`). Tested against `ee`/`oo` and clearly more natural — no Hindi speaker writes *rahmeem* for रहीम.
4. **Long-a rule:** `ा`/`आ` → `aa` when the syllable closes (the next unit is a bare consonant), otherwise `a`. This is what turns *aasamaanaon* into *aasmanon*.
5. **Schwa deletion**, the one place a mechanical mapper goes wrong. Three rules: drop word-final inherent `a` unless the word is monosyllabic (*na*, *ka* survive); drop medial inherent `a` scanned **right to left** when both neighbours carry a vowel (*ra-ha-maan* → *rahmaan*, *ka-ra-ne* → *karne*, *u-sa-ke* → *uske*); never touch the first syllable (*namaaz*, not *nmaaz*).
6. **Override lexicon** for the words a table cannot get right — high-frequency function words and Arabic/Persian loans (`में` → *mein*, `नहीं` → *nahi*, `फ़ैसला` → *faisla*, `काफ़िर` → *kafir*). Expect to seed ~200 entries; each one is cheap and permanent.
7. `।` becomes `.`; non-Devanagari characters, including Latin and punctuation, pass through untouched.

Measured output, straight from the probe on real repo data:

| Devanagari (on disk) | Hinglish (derived) |
| --- | --- |
| अल्लाह के नाम से जो रहमान व रहीम है। | allaah ke naam se jo rahmaan va rahim hai. |
| रोज़े जज़ा का मालिक है। | roze jaza ka malik hai. |
| और मोहताजों को खिलाने के लिए (लोगों को) आमादा नहीं करता | aur mohtajon ko khilane ke lie (logon ko) amada nahi karta |

A cached hadeethenc Hindi entry and a knowledge-base `summary.hi` both transliterated cleanly too. This is comfortably good enough to ship, and better than any Urdu-sourced transliteration can be.

**Known defects, all fixable, all to be covered by tests before shipping:**

- `ॊ` (U+094A) and other rare matras pass through raw, producing `aasamaanaॊn`. Fix: complete the matra table, then assert the invariant — *no Devanagari code point survives in output* — over the entire Quran Hindi corpus. That single test catches every future gap in the table.
- `tarif` should be `taarif` — word-initial syllables need exemption from the open-syllable rule.
- `quraaan` — vowel sequences need collapsing at unit boundaries.
- `vaaky` should be `vaakya` — keep the cluster-final schwa when the second cluster member is a semivowel (`य`/`व`), while `सब्र` → `sabr` must keep dropping it.
- `kaaphiron`, `pharmae` — caused by nuqta-less source spelling (`काफिर` for `काफ़िर`). This is what the override lexicon is for.
- `mahaantam` where `mahantam` reads better — a long-a edge case, low frequency.

## Search

`scripts/build-pagefind-index.mjs` declares every record as `language: "en"`, which is deliberate — it keeps raw multilingual substrings matchable. That decision helps here: Hinglish is Latin script, so the English stemmer and tokenizer handle it natively, and a reader typing `namaz` or `rahmaan` will actually hit.

Append derived Hinglish to the searchable `content` of each record type, alongside the existing Devanagari (indexing both means either script finds the ayah):

- Quran: content is currently `[a.arabic, a.translations?.en, a.translations?.ur, a.translations?.hi]` — add `toHinglish(a.translations?.hi)`.
- Hadith: the loader builds `hindiByNumber` from the `hindi/` sidecars as `[entry.text, entry.explanation, ...hints]` — add the Hinglish of each.
- Knowledge: `langs = ["en", "ur", "hi"]` — add the Hinglish of the `hi` fields.

Index size grows by roughly the Hinglish character count, which is comparable to the Devanagari it derives from. Against a ~400 MB artifact this is not a concern, but measure it after the first build rather than assuming.

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

**Layer 1 — transliterator (free, do first)**

1. Read the relevant guide under `node_modules/next/dist/docs/` before touching any component — this Next.js version differs from training-data conventions, per `AGENTS.md`.
2. Write `src/lib/translit/hinglish.ts` from the spec above. Pure functions, no imports, no `node:*`. Promote the probe at `.cache/translit-probe.mjs` rather than rewriting from scratch, applying the long-a post-pass and the `i`/`u` scheme (the saved probe still carries the rejected `ee`/`oo` mapping).
3. Write `src/lib/translit/hinglish.test.ts`: golden cases for each schwa rule, each nuqta form, and each override; plus the corpus invariant — run every one of the 6,236 Quran Hindi translations through and assert no Devanagari code point survives in the output. Fix the matra table until it passes.
4. Add `DisplayLang` and `dataLang` to `src/types/knowledge.ts`; wire `LanguageSwitcher`, `TranslationTabs`, `QuranReader`, `KnowledgeLanguageTabs`, and `src/lib/knowledge/lang.ts`.
5. Switch `build:pagefind` to `node --import tsx scripts/build-pagefind-index.mjs`; append Hinglish to Quran, hadith, and knowledge content.
6. `npm test`, `npm run build:pagefind`, `npm run build:static`. Spot-check Hinglish rendering on an ayah, a tafsir panel, and an article, and search for a Latin-script Hindi word to confirm the index took.

**Layer 2 — hadith translation (needs a key; runs in GitHub Actions)**

7. Do the one-time setup from the workflow header: add the `ANTHROPIC_API_KEY` secret, create the orphan `batch-state` branch, add `/.batch-state/` to `.gitignore`.
8. Write `scripts/translate-hadith-hindi.ts` with two modes, both driven by environment variables so the workflow needs no argument parsing:
   - **submit** — read `public/data/hadith/<col>/<col>-all.json`, take `urdu` (falling back to `english` for the 2,720 that lack it, recording which source was used per record), chunk into ~5,000-request batches keyed by `custom_id = <collection>:<hadithNumber>`, POST each, and write the batch id to `$STATE_DIR` **before** moving to the next chunk. Honour `SAMPLE` and `COLLECTIONS`.
   - **resume** — read the state file, `GET /v1/messages/batches/{id}` for each unwritten chunk, stream `results_url` (JSONL) when `processing_status == "ended"`, write the sidecars, mark the chunk `written`, checkpoint. Exit 0 immediately when there is no state file or nothing is pending, so the scheduled tick is cheap.
   - Both modes stop cleanly at `DEADLINE_MINUTES` so the workflow's commit steps still run.
9. Add `"translate:hadith-hindi": "tsx scripts/translate-hadith-hindi.ts"` to `package.json` scripts.
10. Prompt: translate Urdu to Hindi, Devanagari output, preserve religious terminology, no commentary or expansion, return the translation only. Keep the system prompt byte-identical across requests so prompt caching applies on top of the 50% batch discount.
11. Add `.github/workflows/translate-hadith-hindi.yml` as specified above. Dispatch `sample=200` against `claude-haiku-4-5` and `claude-sonnet-5`, read both outputs, pick one — then dispatch `sample=0` for the full corpus.
12. Results write into the existing `public/data/hadith/<col>/hindi/book-<bookId>.json` shape, keeping hadeethenc's `explanation`/`hints`/`attribution`/`grade` where a match exists and leaving them absent otherwise. The client (`hindiTafseer.ts`) needs no change.
13. Update `hindi-tafseer-coverage.json` to report authored-explanation coverage rather than text coverage; adjust the book-header note accordingly.
14. Relabel `HadithTafseerPanel` per the UI section, add the machine-translation disclosure, and add the explicit note for the 203 no-source hadiths.
15. Once the corpus is done, delete the `schedule:` block from the workflow — it is a one-time job and a standing cron for it is dead weight. The `batch-state` branch can stay as a record of what was submitted and when.
16. Confirm the ship: the data commit triggers `versioning.yml`, which pauses on the `release` environment gate; approve it, and `deploy.yml` runs on the resulting tag. Then check `out/data/hadith/<col>/hindi/` is present in the artifact.

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
3. **Model for Layer 2**, after reading the sample: Haiku 4.5 at ~$31 batched, or Sonnet 5 at ~$92.
4. **Whether Layer 2 happens at all.** Layers 1 and 3 are free and key-less. If the project must stay free, ship those two and take option A's mechanical Urdu → Devanagari as the hadith fallback, accepting rougher text.

## Corrections to the previous version

- The 2026-09-01 version claimed at line 22 that "Urdu, by contrast, covers every collection we ship." Every collection is *fetched*, but coverage is 33,467 of 36,390 (92.0%), with nasai at 67.2%. The sentence implied completeness that the data does not show.
- Its cost estimate ($27–54) was derived from a guessed ~250 tokens per hadith. The measured figure is 504 characters ≈ 229 tokens of Urdu, so the guess was close, but the estimate omitted per-request instruction overhead and used a coarser output figure. The recomputed range above is grounded in the actual 16,856,957-character corpus.
- It offered no Hinglish path at all, and its option ordering (transliterate Urdu directly) points the wrong way for a Hinglish target — see Finding 2.
