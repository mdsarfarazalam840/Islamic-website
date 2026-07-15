## Task 6: Dialog + Sheet UI Components

**Files:**
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/sheet.tsx`

**Interfaces:**
- `Dialog`: wraps `@base-ui/react/dialog` with sizes { sm, md, lg }
- `Sheet`: wraps `@base-ui/react/dialog` with sides { left, right, top, bottom } and sizes { sm, md, lg, full }

- [ ] **Step 1: Create Dialog component**

```tsx
// src/components/ui/dialog.tsx
"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const dialogContentVariants = cva(
  "fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-full -translate-x-1/2 -translate-y-1/2 flex-col gap-4 border border-border bg-background p-6 shadow-xl duration-200 data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95 data-[closed]:duration-150",
  {
    variants: {
      size: {
        sm: "max-w-sm rounded-xl",
        md: "max-w-lg rounded-xl",
        lg: "max-w-2xl rounded-xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

function DialogTrigger(props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal(props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogOverlay({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Backdrop>) {
  return <DialogPrimitive.Backdrop data-slot="dialog-overlay" className={cn("fixed inset-0 z-40 bg-black/50 data-[open]:animate-in data-[open]:fade-in-0 data-[closed]:animate-out data-[closed]:fade-out-0", className)} {...props} />
}

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>, VariantProps<typeof dialogContentVariants> {}

function DialogContent({ className, size, children, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Popup data-slot="dialog-content" className={cn(dialogContentVariants({ size }), className)} {...props}>
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)} {...props} />
}

function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="dialog-footer" className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2", className)} {...props} />
}

function DialogClose(props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

export { DialogTrigger, DialogPortal, DialogOverlay, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose }
```

- [ ] **Step 2: Create Sheet component**

```tsx
// src/components/ui/sheet.tsx
"use client"

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const sheetContentVariants = cva(
  "fixed z-50 flex flex-col gap-4 border border-border bg-background p-6 shadow-xl transition-all duration-200 data-[open]:animate-in data-[closed]:animate-out",
  {
    variants: {
      side: {
        left: "inset-y-0 left-0 h-full data-[open]:slide-in-from-left data-[closed]:slide-out-to-left",
        right: "inset-y-0 right-0 h-full data-[open]:slide-in-from-right data-[closed]:slide-out-to-right",
        top: "inset-x-0 top-0 w-full data-[open]:slide-in-from-top data-[closed]:slide-out-to-top",
        bottom: "inset-x-0 bottom-0 w-full data-[open]:slide-in-from-bottom data-[closed]:slide-out-to-bottom",
      },
      size: {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        full: "",
      },
    },
    defaultVariants: {
      side: "right",
      size: "sm",
    },
  }
)

function SheetTrigger(props: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetPortal(props: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Backdrop>) {
  return <SheetPrimitive.Backdrop data-slot="sheet-overlay" className={cn("fixed inset-0 z-40 bg-black/50", className)} {...props} />
}

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Popup>, VariantProps<typeof sheetContentVariants> {}

function SheetContent({ className, side = "right", size = "sm", children, ...props }: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetOverlay />
      <SheetPrimitive.Popup data-slot="sheet-content" className={cn(sheetContentVariants({ side, size }), className)} {...props}>
        {children}
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sheet-footer" className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2", className)} {...props} />
}

function SheetClose(props: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

export { SheetTrigger, SheetPortal, SheetOverlay, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose }
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

