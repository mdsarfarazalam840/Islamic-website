/** Ad-hoc ayah lookup for authoring: node scripts/ayah.mjs 37 102 37 107 */
import fs from "node:fs"
import path from "node:path"

const args = process.argv.slice(2)
for (let i = 0; i < args.length; i += 2) {
  const s = Number(args[i])
  const spec = args[i + 1]
  const file = path.resolve(`public/data/quran/surah-${s}.json`)
  if (!fs.existsSync(file)) {
    console.log(`surah ${s}: NO DATA`)
    continue
  }
  const ayahs = JSON.parse(fs.readFileSync(file, "utf-8"))
  const [from, to] = spec.includes("-") ? spec.split("-").map(Number) : [Number(spec), Number(spec)]
  for (let n = from; n <= to; n++) {
    const a = ayahs.find((x) => x.ayahNumber === n)
    if (!a) {
      console.log(`${s}:${n}  OUT OF RANGE (surah has ${ayahs.length})`)
      continue
    }
    console.log(`${s}:${n}  ${a.translations.en}`)
  }
  console.log("")
}
