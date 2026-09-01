import type { Metadata } from "next"
import { CircleDot } from "lucide-react"
import { TasbihClient } from "@/components/tasbih/TasbihClient"

export const metadata: Metadata = {
  title: "Tasbih — Noor",
  description:
    "An interactive tasbih counter for Subhanallah, Alhamdulillah, Allahu Akbar and other dhikr, with rounds and totals kept on your device.",
}

export default function TasbihPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <CircleDot className="size-6 text-gold-light" />
        <div>
          <h1 className="text-2xl font-display gold-gradient-text font-bold">Tasbih</h1>
          <p className="text-sm text-muted-foreground">
            Count your dhikr — rounds and totals stay on this device
          </p>
        </div>
      </div>

      <TasbihClient />
    </div>
  )
}
