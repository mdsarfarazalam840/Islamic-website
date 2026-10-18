# Hindi / Hinglish AI pass — runbook

Everything needed to run `scripts/ai-hindi-pass.ts` and the **AI Hindi pass**
workflow, in the order you need it. Design rationale and cost analysis live in
`hindiplan.md`; this file is the operational side.

---

## What it does

One pass corrects — or, where none exists, produces — the Devanagari behind
every Hindi and Hinglish surface on the site.

| Section | Job | Reads | Writes | Units |
| --- | --- | --- | --- | --- |
| `quran` | proofread | `public/data/quran/quran-all.json` | `translations.hi` in `quran-all.json` + `surah-*.json` | 6,236 |
| `surah` | translate | `src/data/quran/surahs.json` | `nameHi`, `nameTranslatedHi` | 114 |
| `tafsir` | proofread | `public/data/tafsir/hindi-mokhtasar/surah-*.json` | same files | 6,236 |
| `hadith` | translate | `<col>/books/book-*.json` → `urdu`, else `english` | `<col>/hindi/book-*.json` (`text`, `textSource`) | 36,187 |
| `knowledge` | proofread | every authored `hi` string in `src/data/knowledge/articles/*.json` | same files | 133 |

**Hinglish is never written to disk.** It is derived from Devanagari at render
time by `src/lib/translit/hinglish.ts`. Every correction here improves the
Hinglish view for free, and the two can never drift apart.

### Proofread vs translate — the safety line

**Proofread** sections already have Hindi. The model may only repair mechanical
damage: broken conjuncts, misplaced viramas, orphan matras, missing nuqta,
doubled characters, spacing. It is explicitly forbidden from rewording,
retranslating, simplifying or modernising. Real defects in the corpus today:
`अौर` for `और`, `हडड्ी` for `हड्डी`, `गिरफ््तार`, `ुम`, `साीधा`, `बेिहश्त`.

The prompt is not the only guard. Every returned string is checked in code:

- must be non-empty
- must still contain Devanagari if the original did
- **proofread only:** must be between 0.5x and 2x the original's length

Anything failing a check is discarded and the original kept, then counted and
reported as "strings kept as-is". A rewrite cannot slip through as a repair.

**Translate** sections (`hadith`, `surah`) have no Hindi to preserve, so only
the "output must be Devanagari" check applies.

### The 203 hadiths with no source

Hadiths with neither Urdu nor English are skipped entirely. They stay
Arabic-only. That is a corpus gap, not a pipeline gap, and inventing text for
them is exactly what this pass does not do.

---

## Done without the API

All five sections were completed locally, deterministically, with no model and no
provider. This started because the relay could not run the job (see "Relay
compatibility"), but it did not stay a fallback: for the proofread sections rules
were the better approach outright, and for the hadith corpus Urdu and Hindi turn
out to be one language in two scripts, which makes the bulk of the job
transliteration rather than translation.

| Section | How | Status |
| --- | --- | --- |
| `quran` | `scripts/fix-devanagari.ts` | done — 0 defects remain |
| `tafsir` | `scripts/fix-devanagari.ts` | done — 0 defects remain |
| `knowledge` | `scripts/fix-devanagari.ts` | done — 0 defects remain |
| `surah` | `scripts/add-surah-hindi.ts` | done — 114/114 authored |
| `hadith` | `scripts/apply-hadith-hindi.ts` | 352 hand-checked, including all 37 the articles cite |
| `hadith` | `scripts/translit-hadith.ts` | 33,305 transliterated — 92.5% of the corpus has Hindi |

### Why rules beat the model here

The proofread job was never a judgement call. `scripts/scan-devanagari.ts`
measured the corpus by structural rule — sequences that cannot occur in
well-formed Devanagari — and found the damage was a handful of mechanical
encoding faults repeated thousands of times:

| Fault | Hits | Repair |
| --- | --- | --- |
| `ॉ` (U+0949) where `ाँ` belongs | 359 | `हालॉकि` → `हालाँकि` |
| `ॅ` (U+0945) where `ँ` belongs | 46 | `हॅसी` → `हँसी` |
| virama before nuqta | 27 | `कुफ़्र` → `कुफ़्र` |
| stacked / doubled matras | 28 | `काे` → `को`, `कुत्ताा` → `कुत्ता` |
| matra on a full vowel | 14 | `अौर` → `और` |
| word-initial orphan nuqta | 5 | `़ज़िना` → `ज़िना` |
| `Â` latin-1 mis-decode | 4 | `Âुदा` → `ख़ुदा` |

Rules win on every axis that matters for scripture: identical output every run,
the whole change readable as a diff, no possibility of rewording, no API, no
cost. **511 repairs across 445 strings in 86 files**, and re-running now reports
zero changes — it is idempotent.

Everything a rule could not settle is listed explicitly in `WORD_FIXES`,
`PHRASE_FIXES` and `KEEP`, so each judgement call is visible in one place
instead of buried in a prompt.

### Reading the diff is the point

`--preview=N` prints before/after pairs. Use it before `--write`; it caught two
of my own errors that a summary table would have hidden:

- `वक्त` → `वक़्त` fired **278 times** and was wrong. The nuqta is optional on
  waqt, and `(वक्ते ़ज़िबाह)` is izafat — correct as written. That is a spelling
  preference, exactly what a proofread pass must not do.
- `हॉल` → `हाँल` was wrong: `हॉल` is the correct Hindi spelling of English
  "hall". `ॉ` is the regular vowel in loanwords, which is what `KEEP` is for.

A third was caught by reading context: `हव्ी` is `हड्डी` ("bones", Q37:53,
Arabic عظام), not `वह्य`.

Verify any time:

```bash
npx tsx scripts/scan-devanagari.ts          # 6 hits, all correct loanwords
npx tsx scripts/scan-devanagari.ts --list   # रिकॉर्ड, कॉपी, हॉल
```

### Surah names

`scripts/add-surah-hindi.ts` carries all 114 Hindi names and meanings, authored
directly and keyed by surah number so a re-fetched catalog cannot shift the
mapping. `nameHi` / `nameTranslatedHi` are optional on the `Surah` type, so a
re-fetch degrades to the English pair rather than rendering blank.

Wired through `surahMatches()` in `src/lib/quran/surahs.ts` — one matcher shared
by the index filter, `useQuran` and `searchSurahs`, replacing three divergent
copies. A reader can find Al-Fatiha by `faatiha`, `फ़ातिहा`, `kholne`, `18`,
`الكهف` or `the cave`. Hinglish is derived at match time, never stored.
`src/lib/quran/surahs.test.ts` covers it (9 tests, including a well-formedness
check over all 228 authored strings).

### Hadith — the hand-checked set

`scripts/apply-hadith-hindi.ts` applies the batches in `scripts/data/hadith-hindi/`
— **352 hand-checked translations**, including all **37 the knowledge base
cites**. They are translated from the Urdu wherever it exists (one hop from the
Arabic, not two) and from the English for the 215 Nasai hadiths that have no
Urdu. Isnad chains are kept, because they are part of the stored text and
dropping them would change what the hadith is.

The cited 37 were the starting point because those are the ones appearing inside
Hindi articles a reader actually opens, where the hadith was rendering in English
only. The script writes the same sidecars the AI pass would —
`public/data/hadith/<collection>/hindi/book-<bookId>.json` with
`textSource: "ur"` or `"en"` — so nothing is throwaway, and any
hadeethenc-authored `explanation` / `hints` / `attribution` / `grade` already
present is preserved.

Two guards, both of which failed usefully during authoring:

- The cited set is **derived from the articles**, not hard-coded, so the script
  throws if an article adds a citation with no translation. It caught three
  entries lost to a bad edit.
- Every translation goes through the same structural Devanagari check as the
  corpus. A typo in the table is a build failure, not a silently broken glyph.

Side effect worth noting: `scripts/build-pagefind-index.mjs` has always read
these sidecars, but the code path was inert because none existed. It now indexes
real Hindi and Hinglish.

### Hadith — transliterating the rest

The corpus is 36,390 hadiths and 33,467 of them carry an Urdu translation. Urdu
and Hindi are the same language in two scripts, so converting those is a script
problem, not a translation problem — which puts it back in reach of rules, with
the same properties that made rules win on the proofread pass.
`src/lib/translit/urdu.ts` does the conversion and `scripts/translit-hadith.ts`
applies it:

```bash
npm run translit:hadith                       # report only
npx tsx scripts/translit-hadith.ts --write    # apply
npx tsx scripts/translit-hadith.ts --misses=80  # lexicon worklist
npx tsx scripts/translit-hadith.ts --sample=3   # eyeball before/after
```

**33,305 hadiths transliterated.** With the 352 hand-checked ones that is 33,657
of 36,390 — **92.5% of the corpus now has Hindi text**, at no API cost.

The hard part is that Urdu omits short vowels: `کتاب` writes k-t-ā-b and the
reader supplies "kitāb", with nothing in the string to rule out "kutub". No
letter-level rule recovers that, so the design is a lexicon first (authoritative,
and the only way to get short vowels right) with a letter-level fallback behind
it. A lexicon is viable because the corpus is formulaic — isnad chains and
honorifics repeat endlessly, so the top 1,000 word types cover 88% of all tokens.
Multi-word honorifics are matched before single words, because they are not
compositional: `صلی اللہ علیہ وسلم` is one unit whose `اللہ` is already inside
"सल्लल्लाहु".

**Quality is measured, not assumed.** Every run reports lexicon coverage against
letter-level fallback, so the claim is checkable rather than asserted. Currently
**723 lexicon entries carry 83.99% of 3,778,890 word tokens**; the remaining
16.01% goes through the fallback. `--misses` prints the highest-frequency unknown
words, which is the worklist for growing the lexicon where it pays most — one
entry fixes every occurrence corpus-wide. The tail is long and flat: 33,151
distinct unknowns, the most frequent appearing 480 times, so the top 40 are only
0.49% of tokens. Coverage past this point is earned a few hundred entries at a
time, not in one jump.

Precedence is explicit, and the three scripts that write these sidecars agree on
it: hand-checked translations beat hadeethenc's own Hindi, which beats
transliteration. Re-running after a hand batch lands correctly **downgrades** that
hadith from machine output to hand-checked text.

Transliterations are marked `textSource: "ur-translit"` rather than passed off as
checked text, and `HadithTafseerPanel` discloses that under the text — "उर्दू से
मशीनी लिप्यंतरण, अभी अनचेका · machine transliteration of the Urdu, not
reviewed". hadeethenc is credited only on entries that actually carry their
explanation, since most entries are now Hindi text alone and crediting them there
would be a false citation.

### What is left

- **2,733 hadiths still have no Hindi** — 2,505 that are English-only (which is
  translation, not transliteration, so out of scope for a transliterator), the
  203 with no source at all, and 25 where the `ur` field holds Arabic, a corpus
  defect. These are the only ones a model would still buy anything on, and at
  that size it is no longer Batch-API-scale work.
- **Review.** 33,305 hadiths of machine output are unreviewed by construction.
  The lexicon worklist is the cheapest way to improve them in bulk; the
  disclosure in the UI is what keeps the state honest until then.

---

## One-time setup

### 1. Get the workflow onto the default branch

`workflow_dispatch` only appears in the Actions UI if the workflow file exists
on the repository's **default branch**. Merge the branch carrying
`.github/workflows/ai-hindi-pass.yml` into `main` before anything else — this is
the step people miss.

### 2. Create the state branch

An orphan branch nothing else writes to, so checkpoint commits never clutter
release history and never conflict with your own pushes.

```bash
git switch --orphan batch-state
git commit --allow-empty -m "chore: batch state branch"
git push -u origin batch-state
git switch -
```

`/.batch-state/` is already in `.gitignore`.

### 3. Credentials — pick one route

The workflow defaults its endpoint to **`https://agentrouter.org`**, resolved
most-specific-first:

```
dispatch input `base_url`  ->  repository variable ANTHROPIC_BASE_URL  ->  https://agentrouter.org
```

It is defaulted in the workflow rather than left to a repository variable on
purpose. An unset `${{ vars.X }}` expression renders as an **empty string**, which
used to fall through to the script's own Anthropic default — so a run configured
for the relay silently called `api.anthropic.com` with the relay token and 401'd.

**Relay (the default).** Settings → Secrets and variables → Actions:

- secret `ANTHROPIC_AUTH_TOKEN` = your relay token

Nothing else. You get the `sync` transport and `STRUCTURED=json`. Read the relay
compatibility section below — as measured, this route currently cannot complete
the job.

**Anthropic direct.** Set the secret and clear the endpoint:

- secret `ANTHROPIC_API_KEY` = your key from console.anthropic.com
- clear the `base_url` dispatch input, **and** set the repository variable
  `ANTHROPIC_BASE_URL` to `https://api.anthropic.com` (or delete the variable and
  clear the input — the input default is what you are overriding)

You get the `batch` transport: half price, results retained 29 days, resumable
for free.

**The guard.** If `ANTHROPIC_AUTH_TOKEN` is the only credential set *and* the
endpoint resolves to Anthropic, the script refuses to start rather than sending a
third-party token to Anthropic for a guaranteed 401. Set the base URL, or use
`ANTHROPIC_API_KEY` if Anthropic is genuinely what you want.

`RELEASE_TOKEN` already exists; `versioning.yml` uses it.

---

## Running it

Actions → **AI Hindi pass** → Run workflow.

| Order | Inputs | Costs | Why |
| --- | --- | --- | --- |
| 1 | `mode=selftest` | nothing | Every unit id unique, legal, parses back to a real target; knowledge slot walker symmetric. Catches the failures that are silent until expensive. |
| 2 | `mode=estimate`, `sample=0` | nothing | Unit counts, token projection, dollar figure against the real corpus. |
| 3 | `mode=submit`, `sample=200`, `sections=quran` | ~$1 | Read the diff. Judge whether it only fixed broken characters or reworded anything. |
| 4 | `mode=submit`, `sample=200`, `sections=hadith` | ~$1 | Different question — this is translation quality, not repair quality. |
| 5 | `mode=submit`, `sample=0`, `sections=quran,surah,tafsir,knowledge` | ~$48 | The cheap four, on the busiest pages. |
| 6 | `mode=submit`, `sample=0`, `sections=hadith` | ~$150 | The expensive one, once you trust the output. |
| — | `mode=resume` | nothing (batch) / remainder only (sync) | Only if a run hit the 330-minute cap. |

`sample` defaults to `200` in both the script and the workflow, so a full-corpus
run takes the deliberate keystroke of typing `0`.

Output never lands on `main`. Each pass pushes `ai/hindi-pass-<run_id>` and
opens a PR; resumes reuse the branch recorded in the state file, so one pass
produces one PR. Merging triggers `versioning.yml`, which pauses on the
`release` environment gate before `deploy.yml` ships.

### Locally

```bash
MODE=selftest npm run ai:hindi                  # free
MODE=estimate SAMPLE=0 npm run ai:hindi         # free
npm run fetch:tafsir-hindi                      # refresh the tafsir snapshot
```

Note that a local shell may already export `ANTHROPIC_BASE_URL` /
`ANTHROPIC_AUTH_TOKEN` for Claude Code. If so, the script picks them up and
routes through that relay. The first line of output always states the endpoint
and transport it resolved — read it before assuming.

Unlike the workflow, the **script's** own default endpoint is
`https://api.anthropic.com`; the relay default lives in the workflow input. So a
local run with neither variable set targets Anthropic.

`scripts/` is excluded in `tsconfig.json`, so `npx tsc --noEmit` does **not**
type-check this file. `npm run ai:hindi` (tsx/esbuild) is what catches syntax
errors in it — run `MODE=selftest` after editing.

---

## Transports

| | `batch` | `sync` |
| --- | --- | --- |
| Endpoint | `POST /v1/messages/batches` | `POST /v1/messages`, `CONCURRENCY` at a time |
| Price | 50% of list | full list |
| Resume cache | the batch id — Anthropic retains results 29 days | local ledger of applied unit ids in `STATE_DIR` |
| Cost to resume | zero | only the units not yet applied |
| Available on | Anthropic direct | anything Anthropic-compatible |

`TRANSPORT=auto` (the default) picks `batch` for `api.anthropic.com` and `sync`
for anything else, so switching routes needs no other change.

Under `sync`, results are written to the data files every `FLUSH_EVERY` (100)
units and the ids appended to the ledger **after** that write returns. The
workflow pushes the ledger only after the corrections commit has been pushed. So
the worst case of a killed job is redoing one flush — never a run that skips
units whose output was never committed.

Under `sync`, `submit` and `resume` are the same operation: the ledger decides
what still needs sending.

---

## Relay compatibility — read before using one

A relay can accept your credential, serve `/v1/messages` correctly, and answer
English on every attempt, while still being unable to run this job. Four
distinct gates were measured on `agentrouter.org` during development, in the
order you hit them.

### 1. No batch endpoint

```
POST /v1/messages          -> 401 (exists, needs auth)
POST /v1/messages/batches  -> 404 {"message":"Invalid URL (POST /v1/messages/batches)"}
```

Hence the `sync` transport. `TRANSPORT=auto` selects it automatically for any
non-Anthropic base URL, so this one needs no action.

### 2. Client fingerprinting

Without `user-agent: claude-cli/...` the relay answers `unauthorized client
detected` to a perfectly valid credential — the same response an unauthenticated
request gets, which makes it easy to misread as a bad key. The script now sends
`user-agent`, `x-app: cli` and `anthropic-beta: claude-code-20250219` whenever
the base URL is not Anthropic.

### 3. Silent extended thinking

Without the `anthropic-beta` marker the relay injects thinking blocks, spending
the `max_tokens` budget on reasoning nobody reads and occasionally leaving no
room for the answer. Same header, same fix. `readOut()` also ignores any
`thinking` block it does see.

### 4. `content-blocked` on Devanagari

The fatal one, and it is worth being precise because the behaviour is confusing.

The relay returns HTTP 400 `{"code":"content-blocked"}`. It is **not** a
religious-content filter, **not** a script whitelist, and **not** a length
threshold. Measurements, all with the same credential and model:

| Payload | Result |
| --- | --- |
| English input, any prompt shape, twice | 6/6 ok |
| `tools` + `{"in":["cat","dog"]}` | ok — clean `tool_use` |
| `tools` + one Devanagari ayah | **0/8** |
| no tools + one Devanagari ayah (window A) | 7/8 ok |
| no tools + one Devanagari ayah (window B, ~1h later) | **0/20** |
| single Devanagari word `पानी` in a JSON prompt | **0/3** |
| Devanagari input, 203 and 424 chars | ok (in window A) |
| Devanagari input, 50 and 101 chars | blocked (in window A) |
| English and Devanagari interleaved, 60 s apart | English ok both times, Devanagari blocked both times |

Two things follow. First, **`tools` + Devanagari is reliably blocked** — that is
the strongest single signal, and it is why `STRUCTURED=auto` drops the emit tool
off-Anthropic and uses a prompt-only JSON contract instead. Second, the rest is
**time-varying**: byte-identical requests succeed in one window and fail in
another, and length behaviour is non-monotonic. Whatever drives it is not a
property of the request.

Because it is not a property of the request, the script treats
`content-blocked` as **retryable** (`API_RETRIES`, default 4, exponential
backoff) rather than fatal. Note that each retry is charged.

### Measured verdict on agentrouter.org

Every route and model it offers was tested with the same credential. English
passes everywhere; Devanagari passes nowhere.

| Route | Model | English | Devanagari |
| --- | --- | --- | --- |
| `/v1/messages` | `claude-opus-5` + `tools` | ok | 0/8 |
| `/v1/messages` | `claude-opus-5`, no tools | ok | 0/20 |
| `/v1/chat/completions` | `claude-opus-5` | 3/3 | 0/3 |
| `/v1/chat/completions` | `deepseek-v4-flash` | 3/3 | 0/3 |
| `/v1/chat/completions` | `gpt-6-astra` | 3/3 | 0/3 |

The filter sits at the gateway, ahead of route and model selection, so there is
no combination of inputs that avoids it. Separately, its Alibaba Cloud WAF
serves an HTML challenge page to GitHub-hosted runner IPs, so CI hits a second
wall before even reaching the first.

No change in this repository can fix either. Encoding the Devanagari to slip
past the content filter would be circumventing a provider control on your own
account and is deliberately not implemented.

If you want this route, the fix is on their side: ask support (the Discord link
in their error bodies) to lift the Devanagari filter and allowlist the runner
ranges. Until then, use a provider that passes Hindi through — Anthropic direct
works, has the batch endpoint, and is half the price.

### What the script does about it

`MODE=submit` runs a **preflight**: `PREFLIGHT_SAMPLES` (default 5) identical
Devanagari requests with retries disabled, reporting the observed success rate.

- **0%** → abort, naming the endpoint and quoting the last error. Nothing
  submitted, nothing written, nothing spent beyond the samples.
- **under 80%** → warn, state the expected share of units that will need a later
  `mode=resume`, and continue. The sync transport leaves any unit that did not
  land out of the ledger, so a degraded endpoint is slow and wasteful rather
  than destructive.
- **80%+** → proceed quietly.

As of the last measurement, `agentrouter.org` preflights at **0/5** and the job
cannot run there. If you want to use it anyway, re-run the preflight later —
the state does change — or ask their support to lift the filter on your account.
Anthropic direct is the route that works, and it is also half the price because
it has the batch endpoint.

---

## Running when the endpoint blocks CI

A relay can work perfectly from your own machine and fail on every GitHub
Actions run, with this in the log:

```
Last error: Unexpected token '<', "<!doctype "... is not valid JSON
```

That is the endpoint answering with a **web page instead of an API response** —
a WAF challenge or block page, frequently with HTTP 200 so nothing looks wrong
until the JSON parse fails. `agentrouter.org` sits behind Alibaba Cloud WAF
(`Set-Cookie: acw_tc=…`), and WAFs in that class challenge datacenter IP ranges
by default. GitHub-hosted runners egress from exactly those ranges. Your
credential, your payload and the corpus are all irrelevant to it.

The script now detects this: it reads every response as text first, names the
WAF when the headers identify one, and retries (an interstitial sometimes
clears) before failing with the remedy list below.

**You cannot change a GitHub-hosted runner's IP.** Three real options:

### 1. Run it locally and commit the result (simplest)

The script is the same code the workflow runs; only the credentials come from
the environment.

```bash
export ANTHROPIC_BASE_URL=https://agentrouter.org
export ANTHROPIC_AUTH_TOKEN=<your relay token>

MODE=selftest npm run ai:hindi
MODE=submit SAMPLE=200 SECTIONS=quran npm run ai:hindi

git checkout -b ai/hindi-pass-local
git add public/data src/data
git commit -m "feat(hindi): AI pass over quran (local run)"
git push -u origin ai/hindi-pass-local
gh pr create --base main --fill
```

The `.batch-state/` ledger is written locally too, so `MODE=resume` works the
same way across sessions. This is the recommended path while the relay blocks
CI.

### 2. Self-hosted runner

Register a runner on a machine the endpoint accepts
(Settings → Actions → Runners → New self-hosted runner), then dispatch with
**`runner=self-hosted`**. The workflow's `runs-on` is
`${{ inputs.runner || 'ubuntu-latest' }}`, so nothing else changes — you keep
the PR automation, the state branch and the resume behaviour.

### 3. Proxy

Set the repository **secret** `HTTPS_PROXY` to a proxy the endpoint accepts.
The script installs an undici `ProxyAgent` when that variable is present —
Node's global `fetch` ignores proxy environment variables, so this has to be
done explicitly. It logs the proxy host (never the credentials).

Caveat: `undici` is not a declared dependency; it is present transitively and
pinned by `package.json` `overrides`. The import is best-effort — if it cannot
be resolved the script warns and continues direct rather than failing the run.
Declare it in `devDependencies` if you intend to rely on this.

---

## Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `MODE` | `estimate` | `selftest` \| `estimate` \| `submit` \| `resume` |
| `MODEL` | `claude-opus-5` | Must match a model the endpoint actually serves |
| `SECTIONS` | all five | Comma-separated |
| `SAMPLE` | `200` | Units per section; `0` = full corpus |
| `COLLECTIONS` | all seven | Hadith collections only |
| `TRANSPORT` | `auto` | `auto` \| `batch` \| `sync` |
| `STRUCTURED` | `auto` | `auto` \| `tool` \| `json`. How the string array is forced out of the model |
| `ANTHROPIC_API_KEY` | — | Anthropic direct; sent as `x-api-key` |
| `ANTHROPIC_AUTH_TOKEN` | — | Relay; sent as `Authorization: Bearer` (and `x-api-key`) |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | Trailing `/v1` optional |
| `API_RETRIES` | `4` | Attempts per request. Covers 429, 5xx, `content-blocked` and HTML interstitials. Each retry is charged |
| `PREFLIGHT_SAMPLES` | `5` | Requests used to measure the endpoint before committing |
| `HTTPS_PROXY` | — | Routes all requests through a proxy (undici `ProxyAgent`). See "Running when the endpoint blocks CI" |
| `CONCURRENCY` | `6` | Sync only. First knob to lower on 429s |
| `FLUSH_EVERY` | `100` | Sync only. Units per disk write |
| `CHUNK_SIZE` | `2000` | Batch only. Requests per batch |
| `POLL_SECONDS` | `60` | Batch only |
| `DEADLINE_MINUTES` | `330` | Self-imposed stop under the runner's 360-minute kill |
| `STATE_DIR` | `.batch-state` | Checkpoint location |
| `PASS_BRANCH` | — | Recorded in state so resumes reuse one PR |

---

## Costs

Measured with `MODE=estimate SAMPLE=0` against the real corpus, at Anthropic
list price with the batch discount applied:

| Section | Units | Chars | Batched |
| --- | --- | --- | --- |
| quran | 6,236 | 0.94M | ~$15 |
| surah | 114 | tiny | <$1 |
| tafsir | 6,236 | 1.78M | ~$24 |
| hadith | 36,187 | 18.05M | ~$150 |
| knowledge | 133 | 0.23M | ~$8 |
| **total** | **42,906** | **21.0M** | **~$198** |

This is what the pass *would* cost. None of it has been spent: every section was
done locally instead (see "Done without the API"), so the table is now the price
of a job that is already finished rather than a bill that is pending.

31.55M input / 9.55M output tokens. On the `sync` transport there is no batch
discount, so double it — and on a relay you are billed that provider's rate,
which the script's estimate cannot know. It says so in its output.

Prompt caching does **not** apply: the system prompts are ~450 tokens, under the
1,024-token minimum, so no `cache_control` block is sent.

---

## Troubleshooting

**`401 API key is invalid`** — the credential does not match the endpoint. Check
the first line of output, which prints the resolved endpoint and transport. An
AgentRouter token sent to `api.anthropic.com` produces exactly this; the
preflight now says so explicitly instead of blaming content.

**`ANTHROPIC_AUTH_TOKEN is set but the endpoint is https://api.anthropic.com`** —
the guard. Your base URL was lost (most likely an unset `vars` expression
rendering empty). Set `base_url` / `ANTHROPIC_BASE_URL` to your relay, or switch
to `ANTHROPIC_API_KEY`.

**`404 Invalid URL (POST /v1/messages/batches)`** — the endpoint has no batch
API. Set `TRANSPORT=sync`, or let `auto` handle it by leaving it alone.

**`unauthorized client detected`** — relay client fingerprinting. Should not
happen now that the Claude Code headers are sent; if it does, the relay wants
something further.

**`Unexpected token '<', "<!doctype "... is not valid JSON`** — the endpoint
returned a web page. Bot/IP protection in front of it; see "Running when the
endpoint blocks CI". Newer runs report this properly instead of as a parse
error.

**`content-blocked`** — the relay refusing the request. It is treated as
retryable (`API_RETRIES`) because byte-identical requests were measured
succeeding and failing an hour apart. If `tools` are in play, try
`structured=json` — `tools` + Devanagari was blocked 8/8. If the preflight
reports 0%, that endpoint cannot run the job right now; see relay compatibility
above.

**`Preflight: 0/5 succeeded`** — as above. Nothing was submitted or written.
Check the quoted last error to tell a blocked endpoint from a bad credential.

**Preflight warns at a low rate** — the job will run, but roughly that share of
units will fail and need a later `mode=resume`. Each retry is charged, so a very
low rate means paying several times per unit.

**`… had no usable output array`** — the endpoint is stripping
`tools`/`tool_choice`, or returned prose the JSON parser could not salvage. Try
`structured=json` if you were on `tool`.

**`… has N unwritten chunk(s)`** on submit — a previous batch pass is still
outstanding. `mode=resume` finishes it for free. Only delete the state file if
you genuinely intend to abandon (and re-pay for) that work.

**Repeated 429s** — lower `concurrency`.

**Section collected 0 units** — its source data is missing. For `tafsir`, run
`npm run fetch:tafsir-hindi` and commit the result.

---

## Related

- `hindiplan.md` — why this exists, source audit, coverage measurements, cost
  derivation, and the remaining Layer 3 work.
- `scripts/fetch-tafsir-hindi.ts` — snapshots `hindi-mokhtasar` (114 files,
  4.7 MB, 6,236/6,236 ayahs) so there is something on disk to correct and index.
- `src/lib/translit/hinglish.ts` — the transliterator every Hinglish surface
  runs through.

### Still open

`HadithTafseerPanel` has no language control and hard-coded Devanagari labels,
so a reader on the Hinglish tab elsewhere still gets Devanagari there. It also
needs the machine-translation disclosure and the explicit note for the 203
no-source hadiths. Steps 13–14 in `hindiplan.md`.
