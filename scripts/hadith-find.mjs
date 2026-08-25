/** Ad-hoc hadith text search for authoring: node scripts/hadith-find.mjs "call to prayer" bukhari muslim */
import fs from "node:fs"
import path from "node:path"

const [needle, ...collections] = process.argv.slice(2)
const list = collections.length
  ? collections
  : ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]
const re = new RegExp(needle, "i")

for (const c of list) {
  const file = path.resolve(`public/data/hadith/${c}/${c}-all.json`)
  if (!fs.existsSync(file)) continue
  const all = JSON.parse(fs.readFileSync(file, "utf-8"))
  for (const h of all) {
    if (re.test(h.english ?? "")) {
      console.log(`${c} ${h.number} [${h.grade ?? "?"}] ${(h.english ?? "").slice(0, 190).replace(/\s+/g, " ")}`)
    }
  }
}
