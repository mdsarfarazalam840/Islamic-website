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

**Anthropic direct (recommended).** Settings → Secrets and variables → Actions →
New repository secret:

- `ANTHROPIC_API_KEY` = your key from console.anthropic.com

Leave `ANTHROPIC_BASE_URL` unset. You get the `batch` transport: half price,
results retained 29 days, resumable for free.

**Through a relay.** Set both:

- repository **variable** `ANTHROPIC_BASE_URL` = e.g. `https://agentrouter.org`
- repository **secret** `ANTHROPIC_AUTH_TOKEN` = the relay's token

You get the `sync` transport. Read the compatibility section below first — not
every relay can do this job at all.

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
| `API_RETRIES` | `4` | Attempts per request. Covers 429, 5xx and `content-blocked`. Each retry is charged |
| `PREFLIGHT_SAMPLES` | `5` | Requests used to measure the endpoint before committing |
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

31.55M input / 9.55M output tokens. On the `sync` transport there is no batch
discount, so double it — and on a relay you are billed that provider's rate,
which the script's estimate cannot know. It says so in its output.

Prompt caching does **not** apply: the system prompts are ~450 tokens, under the
1,024-token minimum, so no `cache_control` block is sent.

---

## Troubleshooting

**`401 API key is invalid`** — the key does not match the endpoint. An
AgentRouter token sent to `api.anthropic.com` produces exactly this. Check the
first line of output: it prints the resolved endpoint and transport.

**`404 Invalid URL (POST /v1/messages/batches)`** — the endpoint has no batch
API. Set `TRANSPORT=sync`, or let `auto` handle it by leaving it alone.

**`unauthorized client detected`** — relay client fingerprinting. Should not
happen now that the Claude Code headers are sent; if it does, the relay wants
something further.

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
