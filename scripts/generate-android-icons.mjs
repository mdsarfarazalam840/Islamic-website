/**
 * Generate Noor Android launcher icons, splash screens and the notification
 * icon from the same SVG mark used by the web app (public/images/icons).
 *
 * Run after `npx cap add android`:
 *   node scripts/generate-android-icons.mjs
 *
 * Requires sharp, which is already a transitive dependency of the Next build.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import sharp from "sharp"

const root = resolve(import.meta.dirname, "..")
const res = resolve(root, "apps/mobile/android/app/src/main/res")

const NAVY = "#0a1628"
const NAVY_DEEP = "#050a14"
const GOLD = "#c8a45c"

function glyphSvg(size, { background = null, rounded = 0, scale = 1 } = {}) {
  const fontSize = Math.round(size * 0.62 * scale)
  const bg = background
    ? `<rect width="${size}" height="${size}" rx="${rounded}" fill="${background}"/>`
    : ""
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg}
    <text x="${size / 2}" y="${size / 2 + fontSize * 0.36}" font-family="serif" font-size="${fontSize}"
      font-weight="bold" fill="${GOLD}" text-anchor="middle">ن</text>
  </svg>`
}

async function renderPng(svg, size, out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out)
}

async function renderSplash(width, height, out) {
  const mark = Math.round(Math.min(width, height) * 0.28)
  const title = Math.round(mark * 0.28)
  const top = Math.round(height / 2 - mark * 0.9)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${NAVY_DEEP}"/>
    <text x="${width / 2}" y="${top + mark * 0.82}" font-family="serif" font-size="${mark}"
      font-weight="bold" fill="${GOLD}" text-anchor="middle">ن</text>
    <text x="${width / 2}" y="${top + mark * 1.35}" font-family="serif" font-size="${title}"
      letter-spacing="${Math.round(title * 0.35)}" fill="#e8d48b" text-anchor="middle">NOOR</text>
  </svg>`
  await sharp(Buffer.from(svg)).png().toFile(out)
}

const densities = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
}

const baseIcon = 48
for (const [name, factor] of Object.entries(densities)) {
  const dir = resolve(res, `mipmap-${name}`)
  const legacy = Math.round(baseIcon * factor)
  const fg = Math.round(108 * factor)

  await renderPng(glyphSvg(legacy, { background: NAVY, rounded: Math.round(legacy * 0.18) }), legacy, resolve(dir, "ic_launcher.png"))
  await renderPng(glyphSvg(legacy, { background: NAVY, rounded: legacy }), legacy, resolve(dir, "ic_launcher_round.png"))
  await renderPng(glyphSvg(fg, { scale: 0.5 }), fg, resolve(dir, "ic_launcher_foreground.png"))
}

const legacyBase = 320
for (const [name, factor] of Object.entries(densities)) {
  const w = Math.round(legacyBase * factor)
  const h = Math.round(legacyBase * factor * 1.6)
  await renderSplash(w, h, resolve(res, `drawable-port-${name}`, "splash.png"))
  await renderSplash(h, w, resolve(res, `drawable-land-${name}`, "splash.png"))
}
await renderSplash(480, 320, resolve(res, "drawable", "splash.png"))

writeFileSync(
  resolve(res, "values/ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${NAVY}</color>\n</resources>\n`,
)
writeFileSync(
  resolve(res, "drawable/ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android"\n    android:width="108dp" android:height="108dp"\n    android:viewportWidth="108" android:viewportHeight="108">\n    <path android:fillColor="${NAVY}" android:pathData="M0,0h108v108h-108z" />\n</vector>\n`,
)
writeFileSync(
  resolve(res, "drawable/ic_stat_notify.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android"\n    android:width="24dp" android:height="24dp"\n    android:viewportWidth="24" android:viewportHeight="24">\n    <path android:fillColor="#FFFFFFFF"\n        android:pathData="M12,2 L14.4,9.6 L22,12 L14.4,14.4 L12,22 L9.6,14.4 L2,12 L9.6,9.6 Z" />\n</vector>\n`,
)

console.log("Android icons, splash screens and notification icon generated.")
