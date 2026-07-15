## Task 10: Error Boundaries Integration

**Files (modify):**
- `src/app/layout.tsx` â€” add ErrorBoundary around main content
- `src/app/quran/error.tsx`
- `src/app/quran/[surahNumber]/error.tsx`
- `src/app/hadith/error.tsx`
- `src/app/hadith/[collection]/error.tsx`
- `src/app/hadith/[collection]/[bookId]/error.tsx`
- `src/app/videos/error.tsx`
- `src/app/videos/[scholar]/error.tsx`
- `src/app/search/error.tsx`
- `src/app/about/error.tsx`

- [ ] **Step 1: Update root layout to wrap main content in ErrorBoundary**

In `src/app/layout.tsx`, add import and wrap the main tag:
```tsx
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"

// Wrap the main content:
<ErrorBoundary>
  <main id="main-content" className="flex-1 pt-16 pb-16 md:pb-0" role="main">
    {children}
  </main>
</ErrorBoundary>
```

- [ ] **Step 2: Update each error.tsx to use ErrorBoundary style**

Each route-level `error.tsx` is a client component (`"use client"`) that receives `{ error, reset }`. Replace the body with a proper UI that matches the ErrorBoundary default fallback pattern.

Example for `src/app/quran/error.tsx`:
```tsx
"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function QuranError({ error, reset }: ErrorProps) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      <Button variant="default" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
```

Apply this pattern to all error.tsx files.

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

