import type {
  Block,
  HydratedArticle,
  HydratedBlock,
  KnowledgeArticle,
  Language,
} from "@/types"
import { getAyahByRef } from "@/lib/quran/translations"
import { getSurah } from "@/lib/quran/surahs"
import { getHadithById } from "@/lib/hadith/translations"
import { getCollectionDisplayName } from "@/lib/hadith/collections"

// Resolve one content block against the real Quran/Hadith data. p/heading/list
// pass through untouched; verse/hadith refs are hydrated with live scripture so
// the client renderer never has to fetch anything. Unresolvable refs are
// dropped (with a warning) rather than crashing the static export.
function hydrateBlock(block: Block): HydratedBlock | null {
  switch (block.kind) {
    case "p":
    case "heading":
    case "list":
      return block

    case "verse": {
      const ayah = getAyahByRef(block.surah, block.ayah)
      if (!ayah) {
        console.warn(`[knowledge] unresolved verse ref ${block.surah}:${block.ayah}`)
        return null
      }
      const surah = getSurah(block.surah)
      return {
        ...block,
        arabic: ayah.arabic,
        translations: ayah.translations,
        surahName: surah?.name ?? `Surah ${block.surah}`,
        globalNumber: ayah.number,
      }
    }

    case "hadith": {
      const hadith = getHadithById(`${block.collection}-${block.hadith}`)
      if (!hadith) {
        console.warn(`[knowledge] unresolved hadith ref ${block.collection}-${block.hadith}`)
        return null
      }
      return {
        ...block,
        bookId: hadith.bookId,
        href: `/hadith/${block.collection}/${hadith.bookId}#hadith-${block.collection}-${block.hadith}`,
        narrator: hadith.narrator,
        grade: hadith.grade,
        arabic: hadith.arabic,
        english: hadith.english,
        urdu: hadith.urdu,
        collectionName: getCollectionDisplayName(block.collection),
      }
    }
  }
}

function hydrateBlocks(blocks: Block[]): HydratedBlock[] {
  return blocks.map(hydrateBlock).filter((b): b is HydratedBlock => b !== null)
}

/**
 * Resolve every verse/hadith reference in all three language bodies to live
 * data, producing a fully serializable article for the client renderer. The
 * three body arrays are hydrated independently; per-surah/per-hadith reads are
 * cached upstream, so repeating a ref across languages is cheap.
 */
export function hydrateArticle(article: KnowledgeArticle): HydratedArticle {
  const { body, ...meta } = article
  const langs: Language[] = ["en", "hi", "ur"]
  const hydratedBody = {} as HydratedArticle["body"]
  for (const lang of langs) {
    hydratedBody[lang] = hydrateBlocks(body[lang] ?? [])
  }
  return { ...meta, body: hydratedBody }
}
