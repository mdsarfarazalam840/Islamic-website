## Task 8: ThemeToggle to MobileNav

**Files:**
- Modify: `src/components/layout/MobileNav.tsx`

- [ ] **Step 1: Add ThemeToggle to MobileNav**

```tsx
// In src/components/layout/MobileNav.tsx â€” add ThemeToggle import and render it in the nav bar
import { ThemeToggle } from "@/components/shared/ThemeToggle"

// Add ThemeToggle between the last nav link and the end of the flex container
// Change the container to include ThemeToggle
// In the return, modify:
// Change `<div className="flex items-center justify-around h-16 px-2">`
// to `<div className="flex items-center justify-around h-16 px-2">` and add ThemeToggle as an item
```

Add ThemeToggle as an additional item in the mobile nav:

Search for:
```tsx
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>
```

Replace with:
```tsx
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
        <ThemeToggle />
      </div>
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

