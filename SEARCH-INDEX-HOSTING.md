# Hosting on GitHub Pages (free, no payment method)

The whole site — the static Next.js export **and** the Pagefind search index —
is deployed to **GitHub Pages** in a single artifact by
`.github/workflows/deploy.yml`. There is no Cloudflare deploy and no separate
index workflow.

## Why GitHub Pages (and why the index ships with the site)

The search page uses [Pagefind](https://pagefind.app/): at build time we generate
a static index (`public/pagefind/`) and the browser fetches only the tiny
fragments matching each query (~tens of KB), instead of downloading the whole
Quran/Hadith corpus.

That bundle is **~43,000 files / ~184 MB**. Cloudflare Pages caps a site at
**20,000 files**, so the index could not ship there. GitHub Pages has:
- **no file-count limit** (only a 1 GB total-size cap — we're at ~184 MB),
- **no payment method required**, ever.

Because everything is on one origin now, the index is served same-origin at
`<pages-root>/pagefind/` — no cross-origin CORS setup needed.

---

## One-time setup

### 1. Make sure the repo is public
GitHub Pages' free tier requires a **public** repo. (The Quran/Hadith data is
public religious text, so this is fine.)

### 2. Enable GitHub Pages via Actions
Repo → **Settings** → **Pages** → **Build and deployment** →
**Source: "GitHub Actions"**. (No branch to pick — the workflow handles it.)

### 3. Push to `main`
`deploy.yml` runs on every push to `main` (or manually from the Actions tab). It:
1. builds the Pagefind index (`npm run build:pagefind`),
2. builds the static site (`npm run build`),
3. adds `.nojekyll` so GitHub doesn't strip Next's `_next/` folder,
4. uploads `out/` and deploys it to Pages.

When it finishes, the site is live at:
```
https://<owner>.github.io/<repo>/
```
and the index at `https://<owner>.github.io/<repo>/pagefind/`.

---

## The subpath (basePath)

This is a **project** site, so it serves from `/<repo>/`, not the domain root.
The workflow sets two build-time env vars from the repo name:

| Env var | Consumed by | Purpose |
|---|---|---|
| `NEXT_PUBLIC_BASE_PATH` | `next.config.ts` | Prefixes assets/routes with `/<repo>` |
| `NEXT_PUBLIC_PAGEFIND_BUNDLE` | `src/app/search/pagefind.ts` | Points the client at `/<repo>/pagefind` |

**Local dev** leaves both unset, so `npm run dev` serves from `/` with the
same-origin `public/pagefind/` bundle — nothing to configure.

If you later move to a **custom domain / user site** served from the root,
drop both env vars from the workflow (and add a `public/CNAME`).
