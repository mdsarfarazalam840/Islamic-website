import { execSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { resolve, dirname, sep } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = resolve(root, "out")
const mobileWww = resolve(root, "apps/mobile/www")
const androidDir = resolve(root, "apps/mobile/android")

const target = process.argv[2] || "all"
const wantsApk = process.argv.includes("--apk")
const skipWeb = process.argv.includes("--skip-web")
const wantsRelease = process.argv.includes("--release")

function run(cmd, cwd = root, env = process.env) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { cwd, stdio: "inherit", env })
}

/**
 * Offline app build environment.
 *
 * The Android/iOS bundle ships every JSON file it needs. Blanking the public
 * Supabase/Pagerfind variables stops the exported app from phoning home for
 * live visitor counts or fetching the search bundle from a remote host.
 */
const offlineEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  NEXT_PUBLIC_PAGEFIND_BUNDLE: "",
  NEXT_PUBLIC_BASE_PATH: "",
}

const GRADLEW = process.platform === "win32" ? "gradlew.bat" : "./gradlew"
// CI runs headless; disable the Gradle daemon so the build process exits cleanly.
const GRADLE_DAEMON_FLAG = process.env.CI ? " --no-daemon" : ""

console.log(`Building Noor apps (target: ${target})`)

function syncMobile({ androidOnly = false, buildApk = false } = {}) {
  console.log("\n--- Syncing Capacitor mobile ---")

  if (!skipWeb) {
    // Rebuild so the bundle never carries live-service credentials. Set
    // --skip-web when out/ was already produced with an offline environment.
    run("npm run build:static", root, offlineEnv)
  } else {
    console.log("Skipping web rebuild (--skip-web).")
  }

  if (existsSync(mobileWww)) rmSync(mobileWww, { recursive: true })
  mkdirSync(mobileWww, { recursive: true })

  // hadith-all.json (~85 MB) is a build-time aggregation. No client code
  // fetches it; the app reads per-book files, so it stays out of the APK.
  const skipped = `${sep}hadith-all.json`
  cpSync(outDir, mobileWww, {
    recursive: true,
    filter: (src) => !src.endsWith(skipped),
  })

  run(androidOnly ? "npx cap sync android" : "npx cap sync", resolve(root, "apps/mobile"))

  if (buildApk) {
    const task = wantsRelease ? "assembleRelease" : "assembleDebug"
    const flavor = wantsRelease ? "Release" : "debug"
    console.log(`\n--- Building ${flavor} APK ---`)
    run(`${GRADLEW} ${task}${GRADLE_DAEMON_FLAG}`, androidDir)
    const apkPath = resolve(androidDir, `app/build/outputs/apk/${flavor.toLowerCase()}/app-${flavor.toLowerCase()}.apk`)
    console.log(`\nAPK: ${apkPath}`)
    if (!existsSync(apkPath)) {
      // Fallback: some AGP versions name it app-release-unsigned.apk before signing
      const alt = resolve(androidDir, `app/build/outputs/apk/${flavor.toLowerCase()}/app-${flavor.toLowerCase()}-unsigned.apk`)
      console.log(`\nAPK (unsigned fallback): ${alt}`)
    }
  }

  console.log("Mobile sync complete.")
}

if (target === "all" || target === "mobile" || target === "android") {
  syncMobile({ androidOnly: target === "android", buildApk: wantsApk && target === "android" })
}

if (target === "all" || target === "desktop") {
  console.log("\n--- Building Tauri desktop ---")
  run("npx tauri build", resolve(root, "apps/desktop"))
  console.log("Desktop build complete.")
}

console.log("\nDone.")
