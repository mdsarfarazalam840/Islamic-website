"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { ThemeProvider } from "next-themes"
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider"
import { assetPath } from "@/lib/utils"
import { isNative } from "@/lib/platform"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  useEffect(() => {
    // Native shells (Capacitor/Tauri) already ship the whole static bundle
    // locally. A service worker there only adds a second cache that can serve
    // stale chunks after an app update, so registration stays web-only.
    if (isNative()) return
    if (!("serviceWorker" in navigator)) return

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register(assetPath("/sw.js"), { scope: assetPath("/") })
        .catch((err) => console.error("SW registration failed:", err))
    } else {
      // Dev: a previously-installed SW caches /_next/static chunks cache-first,
      // serving stale bundles after a rebuild → hydration mismatch + dead module
      // IDs (the "M_ID" crash). Tear it down so dev always hits the network.
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
      }
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        {/* Owns the site's single Realtime connection; every live count on every
            page derives from the one presence snapshot it keeps. */}
        <RealtimeProvider>{children}</RealtimeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
