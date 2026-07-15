## Task 11: Performance + Responsive + A11y + Deploy

**Files:**
- Modify: `src/app/layout.tsx` â€” add `next/dynamic` for heavy components
- Modify: `src/components/videos/YouTubeEmbed.tsx` â€” add ARIA improvements
- Create: `wrangler.toml`
- Create: `.github/workflows/deploy.yml`
- Create: `.env.example`

- [ ] **Step 1: Performance â€” Lazy load Three.js**

In `src/app/page.tsx`, ensure `HeroScene3D` is dynamically imported:
```tsx
import dynamic from "next/dynamic"

const HeroScene3D = dynamic(() => import("@/components/three/HeroScene3D"), {
  ssr: false,
  loading: () => <div className="geometric-bg absolute inset-0" />,
})
```

- [ ] **Step 2: Performance â€” Add image dimensions and priority**

Search for all `<Image>` or `<img>` tags and add `width`, `height`, and `priority` for LCP images.

- [ ] **Step 3: Accessibility â€” Add ARIA labels where missing**

Review interactive elements and ensure:
- All icon-only buttons have `aria-label`
- SearchBar has proper ARIA roles (already done in Task 2)
- YouTube embed modal has `aria-label` and focus trap
- All form inputs have associated labels

- [ ] **Step 4: Create wrangler.toml**

```toml
# wrangler.toml
name = "noor-quran"
pages_build_output_dir = ".next"
pages_build_command = "npm run build"
compatibility_date = "2026-07-15"
compatibility_flags = ["nodejs_compat"]
```

- [ ] **Step 5: Create deploy workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy .next --project-name=noor-quran
```

- [ ] **Step 6: Create .env.example**

```
# YouTube Data API v3
# Get your API key: https://console.cloud.google.com/apis/credentials
# Enable the YouTube Data API v3 in your Google Cloud project
YOUTUBE_API_KEY=
```

- [ ] **Step 7: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

