import type { Metadata } from "next"
import { scholars } from "@/config/scholars"
import { Video, TrendingUp, Users } from "lucide-react"
import Link from "next/link"
import { VideosClient } from "./VideosClient"

export const metadata: Metadata = {
  title: "Video Library — Noor",
  description: "Islamic lectures and scholar talks from renowned scholars.",
}

export default function VideosPage() {
  const featuredScholars = scholars.filter((s) => s.featured)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Video className="size-6 text-gold-light" />
        <div>
          <h1 className="text-2xl font-display gold-gradient-text font-bold">Video Library</h1>
          <p className="text-sm text-muted-foreground">Islamic lectures and scholar talks</p>
        </div>
      </div>

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Users className="size-5 text-gold-light" />
          <h2 className="text-lg font-display font-semibold text-foreground">Scholars</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {featuredScholars.map((scholar) => (
            <Link
              key={scholar.id}
              href={`/videos/${scholar.id}`}
              className="group rounded-xl border border-border/20 bg-card/40 p-4 transition-all duration-300 hover:border-gold-dim/30 hover:gold-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-dim/10 text-gold-light text-sm font-bold border border-gold-dim/20">
                  {scholar.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground group-hover:text-gold-light transition-colors truncate">
                    {scholar.name}
                  </h3>
                  <span className="text-xs text-gold-dim/60 font-arabic block truncate">
                    {scholar.nameAr}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="size-5 text-gold-light" />
          <h2 className="text-lg font-display font-semibold text-foreground">Latest Videos</h2>
        </div>
        <VideosClient />
      </section>
    </div>
  )
}
