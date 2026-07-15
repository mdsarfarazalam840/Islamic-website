## Task 7: Select + Tooltip UI Components

**Files:**
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/tooltip.tsx`

**Interfaces:**
- `Select`: wraps `@base-ui/react/select` with variants { default, ghost }
- `Tooltip`: wraps `@base-ui/react/tooltip` with variants { dark, light }, sides { top, bottom, left, right }

- [ ] **Step 1: Create Select component**

```tsx
// src/components/ui/select.tsx
"use client"

import { Select as SelectPrimitive } from "@base-ui/react/select"
import { Check, ChevronDown } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const selectTriggerVariants = cva(
  "flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
  {
    variants: {
      variant: {
        default: "border-input",
        ghost: "border-transparent bg-muted/50 hover:bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function SelectTrigger({ className, variant, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & VariantProps<typeof selectTriggerVariants>) {
  return (
    <SelectPrimitive.Trigger data-slot="select-trigger" className={cn(selectTriggerVariants({ variant }), className)} {...props}>
      {children}
      <SelectPrimitive.Icon className="flex items-center">
        <ChevronDown className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectValue({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" className={cn("text-foreground", className)} {...props} />
}

function SelectPopup({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Popup>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Backdrop className="fixed inset-0 z-40" />
      <SelectPrimitive.Popup data-slot="select-popup" className={cn("z-50 max-h-64 min-w-[8rem] overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95", className)} {...props} />
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item data-slot="select-item" className={cn("relative flex w-full cursor-default items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[selected]:font-medium", className)} {...props}>
      <span className="absolute left-2 flex items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectGroup({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" className={cn("", className)} {...props} />
}

function SelectLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.GroupLabel>) {
  return <SelectPrimitive.GroupLabel data-slot="select-label" className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />
}

export { SelectTrigger, SelectValue, SelectPopup, SelectItem, SelectGroup, SelectLabel }
```

- [ ] **Step 2: Create Tooltip component**

```tsx
// src/components/ui/tooltip.tsx
"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const tooltipContentVariants = cva(
  "z-50 overflow-hidden rounded-lg border px-3 py-1.5 text-xs font-medium shadow-md data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95",
  {
    variants: {
      variant: {
        dark: "bg-foreground text-background border-foreground",
        light: "bg-background text-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "dark",
    },
  }
)

function TooltipProvider(props: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" {...props} />
}

function TooltipRoot(props: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip-root" {...props} />
}

function TooltipTrigger(props: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Popup>, VariantProps<typeof tooltipContentVariants> {}

function TooltipContent({ className, variant = "dark", ...props }: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner>
        <TooltipPrimitive.Popup data-slot="tooltip-content" className={cn(tooltipContentVariants({ variant }), className)} {...props} />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent }
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

