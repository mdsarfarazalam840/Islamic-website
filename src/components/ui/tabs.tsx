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
