/**
 * Noor Android smoke test (raw CDP driver).
 *
 * Drives the installed debug APK through its WebView DevTools socket using the
 * raw Chrome DevTools Protocol over WebSocket, connecting to the page target
 * directly. This is reliable on Android WebView (Playwright's
 * connectOverCDP browser endpoint hangs on /devtools/browser).
 *
 * Exercises the real Capacitor container: local asset serving, client-side
 * JSON fetches, Pagefind search and localStorage bookmarks.
 *
 * Usage:
 *   node scripts/android-smoke.mjs --apk apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
 *   node scripts/android-smoke.mjs --offline        # also verifies airplane-mode reading
 *
 * Prerequisites: one device/emulator visible in `adb devices`, and a debug APK
 * (WebView debugging is enabled automatically in debug builds).
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { setTimeout as sleep } from "node:timers/promises"

const root = resolve(import.meta.dirname, "..")
const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(name)
  return i === -1 ? fallback : args[i + 1]
}

const pkg = option("--package", "com.noor.quran")
const activity = option("--activity", ".MainActivity")
const apk = option("--apk", null)
const base = option("--base", "https://localhost/").replace(/\/?$/, "/")
const testOffline = args.includes("--offline")
const screenshots = resolve(root, "test-results/android")
mkdirSync(screenshots, { recursive: true })

function findAdb() {
  const candidates = [
    process.env.ADB,
    process.env.ANDROID_HOME && resolve(process.env.ANDROID_HOME, "platform-tools/adb.exe"),
    process.env.ANDROID_SDK_ROOT && resolve(process.env.ANDROID_SDK_ROOT, "platform-tools/adb.exe"),
    process.env.LOCALAPPDATA && resolve(process.env.LOCALAPPDATA, "Android/Sdk/platform-tools/adb.exe"),
  ].filter(Boolean)
  const localProperties = resolve(root, "apps/mobile/android/local.properties")
  if (existsSync(localProperties)) {
    const match = readFileSync(localProperties, "utf8").match(/^sdk\.dir=(.+)$/m)
    if (match) candidates.push(resolve(match[1].trim().replace(/\\\\/g, "/"), "platform-tools/adb.exe"))
  }
  for (const candidate of candidates) if (existsSync(candidate)) return candidate
  return "adb"
}

const adb = findAdb()
const sh = (...parts) => execFileSync(adb, parts, { encoding: "utf8" }).trim()

async function captureScreenshot(path) {
  const remote = "/sdcard/noor-shot.png"
  sh("shell", "screencap", "-p", remote)
  sh("pull", remote, path)
}

const results = []
async function check(name, fn) {
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`PASS  ${name}`)
  } catch (error) {
    results.push({ name, ok: false, error })
    console.log(`FAIL  ${name}\n      ${error.message}`)
    throw error
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

// ---------- raw CDP session over WebSocket to the page target ----------
class CdpSession {
  constructor(url) {
    this.ws = new WebSocket(url)
    this.id = 0
    this.handlers = new Map()
    this.events = []
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", () => resolve())
      this.ws.addEventListener("error", (e) => reject(e))
    })
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id !== undefined) {
        const handler = this.handlers.get(msg.id)
        if (handler) {
          this.handlers.delete(msg.id)
          if (msg.error) handler.reject(new Error(msg.error.message || JSON.stringify(msg.error)))
          else handler.resolve(msg.result)
        }
      } else {
        this.events.push(msg)
      }
    })
    this.ws.addEventListener("close", () => {
      for (const handler of this.handlers.values()) handler.reject(new Error("CDP socket closed"))
    })
  }

  send(method, params = {}) {
    return this.ready.then(() => {
      const id = ++this.id
      return new Promise((resolve, reject) => {
        this.handlers.set(id, { resolve, reject })
        this.ws.send(JSON.stringify({ id, method, params }))
      })
    })
  }

  async waitForEvent(predicate, timeout = 45000) {
    const t0 = Date.now()
    while (Date.now() - t0 < timeout) {
      const ev = this.events.find(predicate)
      if (ev) return ev
      await sleep(100)
    }
    throw new Error(`timeout waiting for CDP event: ${predicate.toString().slice(0, 120)}`)
  }

  async evaluate(expression, returnByValue = true, awaitPromise = true) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue,
      awaitPromise,
      userGesture: true,
    })
    assert(!result.exceptionDetails, `Runtime.evaluate threw: ${JSON.stringify(result.exceptionDetails)}`)
    return result.result
  }

  async value(expression) {
    const result = await this.evaluate(expression)
    return result.value
  }

  /** Poll an expression until it returns truthy. */
  async waitFor(expression, timeout = 45000) {
    const t0 = Date.now()
    while (Date.now() - t0 < timeout) {
      try {
        const v = await this.value(expression)
        if (v) return v
      } catch {}
      await sleep(500)
    }
    throw new Error(`waitFor timeout: ${expression.slice(0, 120)}`)
  }

  async navigate(url) {
    await this.evaluate(`location.href = ${JSON.stringify(url)}`)
  }

  close() {
    try { this.ws.close() } catch {}
  }
}

async function main() {
  const devices = sh("devices")
    .split(/\r?\n/)
    .filter((line) => /\tdevice$/.test(line))
  assert(devices.length > 0, "No Android device found. Start an emulator or connect a phone (adb devices).")
  console.log(`Using ${adb} -> ${devices[0]}`)

  if (apk) {
    assert(existsSync(apk), `APK not found: ${apk}`)
    console.log(`Installing ${apk}`)
    sh("install", "-r", apk)
  }

  sh("shell", "am", "force-stop", pkg)
  sh("shell", "am", "start", "-W", "-n", `${pkg}/${activity}`)
  await sleep(6000)

  const pid = sh("shell", "pidof", pkg)
  assert(pid, `${pkg} is not running after launch`)

  let socket = null
  for (let attempt = 0; attempt < 30 && !socket; attempt++) {
    const unix = sh("shell", "cat", "/proc/net/unix")
    const match = unix.match(/@?(webview_devtools_remote_\d+)/)
    if (match) socket = match[1]
    else await sleep(1000)
  }
  assert(socket, "WebView DevTools socket not found. Is this a debug build?")

  sh("forward", "tcp:9222", `localabstract:${socket}`)

  let pageId = null
  for (let attempt = 0; attempt < 30 && !pageId; attempt++) {
    try {
      const targets = await (await fetch("http://127.0.0.1:9222/json/list")).json()
      const hit = targets.find((t) => t.type === "page" && t.url.startsWith("https://localhost"))
      if (hit) pageId = hit.id
    } catch {}
    if (!pageId) await sleep(1000)
  }
  assert(pageId, "No localhost WebView page exposed over CDP")

  const session = new CdpSession(`ws://127.0.0.1:9222/devtools/page/${pageId}`)
  await session.send("Page.enable")
  await session.send("Runtime.enable")

  try {
    await check("home renders", async () => {
      const hasNoor = await session.waitFor("document.body.innerText.includes('Noor')", 45000)
      assert(hasNoor, "home text missing")
      await captureScreenshot(resolve(screenshots, "01-home.png"))
    })

    await check("Quran surah loads Arabic + English from bundled JSON", async () => {
      await session.navigate(`${base}quran/1/index.html`)
      await session.waitFor("document.body.innerText.includes('الفاتحة')", 45000)
      const arabic = await session.value("document.body.innerText.includes('الفاتحة')")
      const en = await session.value("document.body.innerText.includes('In the name of Allah')")
      assert(arabic, "Arabic surah title not found")
      assert(en, "English basmalah not found")
      await captureScreenshot(resolve(screenshots, "02-quran.png"))
    })

    await check("ayah bookmark is stored in localStorage", async () => {
      const clicked = await session.value(`
        (() => { const el = document.querySelector('[aria-label^="Bookmark "]'); if (el) { el.click(); return true } return false })()
      `)
      assert(clicked, "bookmark button not found")
      const raw = await session.value("localStorage.getItem('noor-bookmarks')")
      assert(!!raw && JSON.parse(raw).length > 0, "bookmark not persisted")
    })

    await check("hadith collections render", async () => {
      await session.navigate(`${base}hadith/index.html`)
      await session.waitFor("document.body.innerText.includes('Hadith Collections')", 45000)
      await captureScreenshot(resolve(screenshots, "03-hadith.png"))
    })

    await check("hadith book loads from per-book JSON", async () => {
      await session.navigate(`${base}hadith/bukhari/0/index.html`)
      await session.waitFor("document.body.innerText.length > 2000", 45000)
      const loading = await session.value("document.body.innerText.includes('Loading')")
      assert(!loading, "hadith book still loading")
      await captureScreenshot(resolve(screenshots, "04-hadith-book.png"))
    })

    await check("knowledge base renders", async () => {
      await session.navigate(`${base}knowledge-base/index.html`)
      await session.waitFor("document.body.innerText.length > 500", 45000)
    })

    await check("duas, tasbih and prayer pages render", async () => {
      for (const route of ["duas/", "tasbih/", "prayer/"]) {
        await session.navigate(`${base}${route}index.html`)
        await session.waitFor("document.body.innerText.length > 500", 45000)
      }
      await captureScreenshot(resolve(screenshots, "05-duas.png"))
    })

    await check("Pagefind search returns results from the bundled index", async () => {
      await session.navigate(`${base}search/index.html`)
      await session.waitFor("document.title.includes('Search')", 45000)
      const quranResults = await session.value(`
        (async() => {
          const m = await import("https://localhost/pagefind/pagefind.js");
          const pf = m.default ?? m;
          const res = await pf.search("mercy", { filters: { type: "quran" } });
          return res.results.length;
        })()
      `)
      assert(quranResults > 0, "no Pagefind quran results")
      await captureScreenshot(resolve(screenshots, "06-search.png"))
    })

    if (testOffline) {
      await check("core reading works with airplane mode on", async () => {
        sh("shell", "cmd", "connectivity", "airplane-mode", "enable")
        try {
          await session.navigate(`${base}quran/2/index.html`)
          await session.waitFor("document.body.innerText.includes('Al-Baqarah')", 45000)
          const len = await session.value("document.body.innerText.length")
          assert(len > 20000, "offline quran body too short")
          await captureScreenshot(resolve(screenshots, "07-offline-quran.png"))
        } finally {
          sh("shell", "cmd", "connectivity", "airplane-mode", "disable")
        }
      })
    }
  } catch (error) {
    await captureScreenshot(resolve(screenshots, "failure.png")).catch(() => {})
    throw error
  } finally {
    session.close()
    try { sh("forward", "--remove", "tcp:9222") } catch {}
    if (testOffline) {
      try { sh("shell", "cmd", "connectivity", "airplane-mode", "disable") } catch {}
    }
  }

  console.log(`\nAndroid smoke test passed (${results.length} checks).`)
  console.log(`Screenshots: ${screenshots}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\nAndroid smoke test failed. ${error.message}`)
    process.exitCode = 1
  })
