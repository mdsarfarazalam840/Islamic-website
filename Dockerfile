# syntax=docker/dockerfile:1

# Quran website — Next.js *static export* served by nginx.
#
# next.config.ts sets `output: "export"`, so `next build` emits a static `out/`
# directory (HTML/CSS/JS) with no Node runtime. We build it in a Node stage and
# serve the result from a tiny nginx stage.

# ---- Stage 1: build the static export ----------------------------------------
# glibc base (Debian), NOT alpine: pagefind ships only glibc Linux binaries
# (see node_modules/pagefind/package.json optionalDependencies — no -musl), and
# Tailwind v4's lightningcss/oxide are glibc-prebuilt too. Node 22 matches CI.
FROM node:22-bookworm-slim AS build
WORKDIR /app

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NEXT_TELEMETRY_DISABLED=1

# Install against the lockfile first so this layer caches unless deps change.
COPY package.json package-lock.json ./
RUN npm ci

# Build the static site. `build:static` runs build:pagefind (writes the search
# index to public/pagefind/) then `next build`, which copies public/ — data +
# pagefind — into out/. NEXT_PUBLIC_BASE_PATH is intentionally left unset so the
# app serves from root "/" (the pagefind bundle then defaults to /pagefind/).
COPY . .
RUN npm run build:static

# Drop build-only inputs the browser never fetches: the Quran + hadith
# *-all.json files (~90 MB) are read only at build time by build:pagefind and
# lib/quran/translations.ts. Clients request per-surah/per-book JSON instead.
# Mirrors the GitHub Pages deploy (.github/workflows/deploy.yml).
RUN find out/data -name '*-all.json' -delete

# ---- Stage 2: serve the static files -----------------------------------------
FROM nginx:1.27-alpine AS runtime

# Static site + generated search index.
COPY --from=build /app/out /usr/share/nginx/html
# Server block: gzip, cache headers, and trailingSlash-aware routing.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

# nginx:alpine's default CMD already runs `nginx -g 'daemon off;'`.
