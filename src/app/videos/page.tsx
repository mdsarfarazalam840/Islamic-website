import type { Metadata } from "next"
import { scholars } from "@/config/scholars"
import { Video, TrendingUp, Users } from "lucide-react"
import Link from "next/link"
import { VideosClient } from "./VideosClient"

export const metadata: Metadata = {
  title: "Video Library",
  description: "Islamic lectures and scholar talks from renowned scholars.",
}

export default function VideosPage() {
  const featuredScholars = scholars.filter((s) => s.featured)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Video className="size-6 text-secondary" />
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Video Library</h1>
          <p className="text-sm text-muted-foreground">Islamic lectures and scholar talks</p>
        </div>
      </div>

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Users className="size-5 text-secondary" />
          <h2 className="text-lg font-display font-semibold text-foreground">Scholars</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {featuredScholars.map((scholar) => (
            <Link
              key={scholar.id}
              href={`/videos/${scholar.id}`}
              className="group rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary text-sm font-bold">
                  {scholar.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground group-hover:text-secondary transition-colors truncate">
                    {scholar.name}
                  </h3>
                  <span className="text-xs text-muted-foreground font-arabic block truncate">
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
          <TrendingUp className="size-5 text-secondary" />
          <h2 className="text-lg font-display font-semibold text-foreground">Latest Videos</h2>
        </div>
        <VideosClient />
      </section>
    </div>
  )
}
