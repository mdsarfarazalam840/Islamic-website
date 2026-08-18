# Running the Quran website with Docker

This site is a **Next.js static export** (`next.config.ts` → `output: "export"`): the build
produces a folder of static HTML/CSS/JS with **no Node server at runtime**. The image is a
multi-stage build — a Node stage compiles the site, then a small `nginx` stage serves it.

The image is self-contained: `docker build` runs `npm ci` and the full static build from a
clean checkout, so it works anywhere (local, CI, another machine) with no prior `npm install`.

## Prerequisites

- Docker 20.10+ (`docker buildx` for multi-arch pushes — bundled with modern Docker Desktop).

## Build the image

```bash
docker build -t quran-website:latest .
```

The first build takes a few minutes (installs dependencies, builds the Pagefind search index,
then runs `next build`). Subsequent builds reuse the cached dependency layer.

## Run it locally

```bash
docker run --rm -p 8080:80 quran-website:latest
# open http://localhost:8080
```

Or with Compose (builds if needed):

```bash
docker compose up --build
# open http://localhost:8080  (Ctrl-C to stop; `docker compose down` to remove)
```

The container serves on port **80**; the examples above map it to host port **8080**.

## Push to Docker Hub

Replace `<your-user>` with your Docker Hub username.

```bash
docker login

# Tag for your account (also pin a version alongside :latest).
docker build -t <your-user>/quran-website:latest -t <your-user>/quran-website:0.2.4 .
docker push <your-user>/quran-website:latest
docker push <your-user>/quran-website:0.2.4
```

Then reference it anywhere:

```bash
docker run -p 8080:80 <your-user>/quran-website:latest
```

### Multi-architecture (amd64 + arm64)

To run on both Intel/AMD and ARM hosts (Apple Silicon, ARM servers, Raspberry Pi), build and
push a multi-arch image in one step with `buildx`:

```bash
docker buildx create --use --name quran-builder   # first time only
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <your-user>/quran-website:latest \
  --push .
```

## Notes

- **Serves from the root path (`/`).** The image does not set `NEXT_PUBLIC_BASE_PATH`, so it
  serves from `/` — put it behind any reverse proxy / domain you like. Serving under a
  sub-path (e.g. `https://host/quran/`) is **not** supported by this image, because the base
  path is baked in at build time; the GitHub Pages deploy handles that case separately.
- **YouTube data is a snapshot.** The scholar video lists come from the committed
  `public/data/youtube/*.json` (the build deliberately skips the live YouTube scrape so builds
  are deterministic and offline). To refresh them, run `npm run fetch:youtube` in the repo,
  commit the changes, and rebuild the image.
- **Image size** is ~250–350 MB — most of it is the Quran/Hadith text data and the search
  index, which *are* the site. The ~90 MB of build-only `*-all.json` files are pruned from the
  final image automatically.
- **Health check.** The container reports Docker health by requesting `/`; check it with
  `docker ps` (look for `healthy`).
