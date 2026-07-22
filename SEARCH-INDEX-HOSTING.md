# Hosting the Pagefind search index (free, no payment method)

The search page uses [Pagefind](https://pagefind.app/): at build time we generate
a static index (`public/pagefind/`) and the browser fetches only the tiny
fragments matching each query (~tens of KB), instead of downloading the whole
Quran/Hadith corpus.

That bundle is **~43,000 files / ~184 MB**, which exceeds Cloudflare Pages'
**20,000-file** site limit. So it is hosted on **GitHub Pages**, which has:
- **no file-count limit** (only a 1 GB total-size cap — we're at ~184 MB),
- automatic **`Access-Control-Allow-Origin: *`** on public repos (exactly what
  Pagefind needs to load cross-origin), and
- **no payment method required**, ever.

The main site stays on Cloudflare Pages; only the search index lives on GitHub
Pages. They connect via one env var.

---

## One-time setup

### 1. Make sure the repo is public
GitHub Pages' free tier and the automatic CORS header both require a **public**
repo. (The Quran/Hadith data is public religious text, so this is fine.)
Repo → **Settings** → scroll to **Danger Zone** → **Change visibility** if needed.

### 2. Enable GitHub Pages via Actions
Repo → **Settings** → **Pages** → **Build and deployment** →
**Source: “GitHub Actions”**. (No branch to pick — the workflow handles it.)

### 3. Trigger the publish workflow
The workflow `.github/workflows/publish-pagefind.yml` runs automatically on
pushes that change `public/data/**`, or manually:
Repo → **Actions** → **Publish Pagefind search index to GitHub Pages** →
**Run workflow**.

When it finishes, the index is live at:
```
https://mdsarfarazalam840.github.io/Islamic-website/pagefind/
```
(Verify by opening `.../pagefind/pagefind.js` in a browser — you should get JS,
not a 404.)

### 4. Point the app at the index
Set this build env var so Pagefind loads from GitHub Pages instead of the
same-origin `/pagefind/`:

```
NEXT_PUBLIC_PAGEFIND_BUNDLE=https://mdsarfarazalam840.github.io/Islamic-website/pagefind
```

- **Local dev:** add it to `.env.local`, or leave it unset to use the local
  `public/pagefind/` bundle (how `npm run dev` works).
- **Cloudflare Pages / CI:** add it as a build environment variable (and, for
  the GitHub Actions deploy, as the repo secret `NEXT_PUBLIC_PAGEFIND_BUNDLE`
  referenced in `deploy.yml`). It is a `NEXT_PUBLIC_` var, so it is baked into
  the client bundle at build time.

---

## How the two deploys relate

| Workflow | Hosts | Where |
|---|---|---|
| `deploy.yml` | The website (`out/`, minus the index) | Cloudflare Pages |
| `publish-pagefind.yml` | The search index only | GitHub Pages |

`deploy.yml` runs `scripts/prune-for-pages.mjs`, which strips `out/pagefind/`
and the oversized JSONs before the Cloudflare deploy, keeping the site under the
20k-file / 25 MiB Pages limits.

## Updating after a data change
Just push a change under `public/data/**` — the publish workflow reruns and
re-publishes the index automatically. Or run it manually from the Actions tab.
