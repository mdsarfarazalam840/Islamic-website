import { execSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = resolve(root, "out")
const mobileWww = resolve(root, "apps/mobile/www")

function run(cmd, cwd = root) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { cwd, stdio: "inherit" })
}

const target = process.argv[2] || "all"

console.log(`Building Noor apps (target: ${target})`)

if (!existsSync(outDir)) {
  console.log("Static export not found — building web app first...")
  run("npm run build:static")
}

if (target === "all" || target === "mobile") {
  console.log("\n--- Syncing Capacitor mobile ---")
  if (existsSync(mobileWww)) rmSync(mobileWww, { recursive: true })
  mkdirSync(mobileWww, { recursive: true })
  cpSync(outDir, mobileWww, { recursive: true })
  run("npx cap sync", resolve(root, "apps/mobile"))
  console.log("Mobile sync complete.")
}

if (target === "all" || target === "desktop") {
  console.log("\n--- Building Tauri desktop ---")
  run("npx tauri build", resolve(root, "apps/desktop"))
  console.log("Desktop build complete.")
}

console.log("\nDone.")
