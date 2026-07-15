## Task 5: Input + Tabs UI Components

**Files:**
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/tabs.tsx`

**Interfaces:**
- `Input`: `cva` with variants { default, ghost }, sizes { default, sm, lg }
- `Tabs`: wraps `@base-ui/react/tabs` with `cva` variants { default, pills }

- [ ] **Step 1: Create Input component**

```tsx
// src/components/ui/input.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input",
        ghost: "border-transparent bg-muted/50 hover:bg-muted focus-visible:bg-background",
      },
      size: {
        default: "h-10 py-2",
        sm: "h-8 py-1 text-xs",
        lg: "h-12 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {}

function Input({ className, variant, size, type, ...props }: InputProps) {
  return <input type={type} data-slot="input" className={cn(inputVariants({ variant, size }), className)} {...props} />
}

export { Input, inputVariants }
```

- [ ] **Step 2: Create Tabs component**

```tsx
// src/components/ui/tabs.tsx
"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const tabsListVariants = cva(
  "inline-flex items-center gap-1",
  {
    variants: {
      variant: {
        default: "border-b border-border",
        pills: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "text-muted-foreground data-[selected]:text-foreground data-[selected]:border-b-2 data-[selected]:border-secondary -mb-px",
        pills: "rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted data-[selected]:bg-secondary data-[selected]:text-secondary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>, VariantProps<typeof tabsListVariants> {
  variant?: "default" | "pills"
}

function TabsList({ className, variant = "default", ...props }: TabsListProps) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cn(tabsListVariants({ variant }), className)} {...props} />
}

function TabsTrigger({ className, variant = "default", ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Tab> & VariantProps<typeof tabsTriggerVariants>) {
  return <TabsPrimitive.Tab data-slot="tabs-trigger" className={cn(tabsTriggerVariants({ variant }), className)} {...props} />
}

function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Panel>) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)} {...props} />
}

export { TabsList, TabsTrigger, TabsContent }
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

