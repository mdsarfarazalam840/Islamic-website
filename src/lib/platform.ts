export type Platform = "web" | "tauri" | "capacitor"

export function detectPlatform(): Platform {
  if (typeof window === "undefined") return "web"
  if ("__TAURI_INTERNALS__" in window) return "tauri"
  if ("Capacitor" in window && (window as any).Capacitor?.isNativePlatform?.()) return "capacitor"
  return "web"
}

export function isNative(): boolean {
  return detectPlatform() !== "web"
}

export function isDesktop(): boolean {
  return detectPlatform() === "tauri"
}

export function isMobile(): boolean {
  return detectPlatform() === "capacitor"
}
