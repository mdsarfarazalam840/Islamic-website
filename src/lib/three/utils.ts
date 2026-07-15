export function hasWebGL(): boolean {
  if (typeof window === "undefined") return false
  try {
    const canvas = document.createElement("canvas")
    return !!(canvas.getContext("webgl") || canvas.getContext("webgl2"))
  } catch {
    return false
  }
}

export function randomPosition(range = 5): [number, number, number] {
  return [
    (Math.random() - 0.5) * range * 2,
    (Math.random() - 0.5) * range * 2,
    (Math.random() - 0.5) * range * 2,
  ]
}

export const GOLD_PALETTE = {
  main: "#c8a45c",
  light: "#e8d4a0",
  dark: "#8b6d30",
  emissive: "#4a3a1a",
}

export const TEAL_PALETTE = {
  main: "#2dd4bf",
  light: "#5eead4",
  dark: "#0f766e",
  emissive: "#134e4a",
}
