export type Platform = "web" | "tauri" | "capacitor"

/** Shape of the globals the native shells inject into `window`. */
interface NativeWindow {
  __TAURI_INTERNALS__?: unknown
  Capacitor?: { isNativePlatform?: () => boolean }
}

export function detectPlatform(): Platform {
  if (typeof window === "undefined") return "web"
  const w = window as unknown as NativeWindow
  if ("__TAURI_INTERNALS__" in window) return "tauri"
  if ("Capacitor" in window && w.Capacitor?.isNativePlatform?.()) return "capacitor"
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
