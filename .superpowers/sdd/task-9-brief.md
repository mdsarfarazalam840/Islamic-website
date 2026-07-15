## Task 9: Loading States â€” Enhance All loading.tsx Files

**Files (modify):**
- `src/app/quran/loading.tsx`
- `src/app/quran/[surahNumber]/loading.tsx`
- `src/app/hadith/loading.tsx`
- `src/app/hadith/[collection]/loading.tsx`
- `src/app/hadith/[collection]/[bookId]/loading.tsx`
- `src/app/videos/loading.tsx`
- `src/app/videos/[scholar]/loading.tsx`
- `src/app/search/loading.tsx`
- `src/app/about/loading.tsx`

- [ ] **Step 1: Update each loading.tsx to use LoadingSkeleton**

For example, `src/app/quran/loading.tsx` becomes:
```tsx
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"

export default function QuranLoading() {
  return <LoadingSkeleton variant="quran-index" />
}
```

Map each route to its variant:
- `/quran` â†’ `"quran-index"`
- `/quran/[surahNumber]` â†’ `"quran-reader"`
- `/hadith` â†’ `"hadith-collection"`
- `/hadith/[collection]` â†’ `"hadith-collection"` (book list page)
- `/hadith/[collection]/[bookId]` â†’ `"hadith-book"`
- `/videos` â†’ `"videos"`
- `/videos/[scholar]` â†’ `"videos"`
- `/search` â†’ `"search"`
- `/about` â†’ `"default"`

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

