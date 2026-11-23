import type { Metadata } from "next"
import { LiveDashboard } from "@/components/live/LiveDashboard"

export const metadata: Metadata = {
  title: "Live readers - Noor",
  description:
    "See how many readers are on Noor right now and which pages they are reading.",
}

export default function LivePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-display font-bold gold-gradient-text">
          Live readers
        </h1>
        <hr className="gold-divider mx-auto mt-4 max-w-xs" />
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          A real-time count of everyone reading Noor, and the pages they have
          open. Anonymous by design — a reader is one tab.
        </p>
      </div>

      <LiveDashboard />
    </div>
  )
}
