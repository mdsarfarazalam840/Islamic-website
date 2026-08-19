import type { KnowledgeCategory, LocalizedText } from "@/types"
import {
  Sparkles,
  Users,
  ScrollText,
  BookMarked,
  Lightbulb,
  type LucideIcon,
} from "lucide-react"

export interface KnowledgeCategoryInfo {
  id: KnowledgeCategory
  label: LocalizedText
  blurb: LocalizedText
  icon: LucideIcon
}

/**
 * The five Knowledge Base categories, in display order. This is the single
 * source of truth mapped over by the landing page, the category filter, and
 * the sitemap. Kept free of `fs`/Node imports so client components can import
 * it directly (the article loader in ./articles.ts is server-only).
 */
export const KNOWLEDGE_CATEGORIES: KnowledgeCategoryInfo[] = [
  {
    id: "basics",
    icon: Sparkles,
    label: {
      en: "The Basics",
      hi: "मूल बातें",
      ur: "بنیادی باتیں",
    },
    blurb: {
      en: "The five pillars, the six articles of faith, and the essentials of worship.",
      hi: "इस्लाम के पाँच स्तंभ, ईमान के छह अनुच्छेद, और इबादत की आवश्यक बातें।",
      ur: "اسلام کے پانچ ارکان، ایمان کے چھ اجزاء، اور عبادت کے بنیادی مسائل۔",
    },
  },
  {
    id: "concepts",
    icon: Lightbulb,
    label: {
      en: "Core Concepts",
      hi: "मूल अवधारणाएँ",
      ur: "بنیادی تصورات",
    },
    blurb: {
      en: "Key ideas that shape Islamic belief and practice.",
      hi: "इस्लामी आस्था और व्यवहार को आकार देने वाले मुख्य विचार।",
      ur: "اسلامی عقیدہ و عمل کی تشکیل کرنے والے کلیدی تصورات۔",
    },
  },
  {
    id: "prophets",
    icon: Users,
    label: {
      en: "The Prophets",
      hi: "पैगंबर",
      ur: "انبیاء کرام",
    },
    blurb: {
      en: "The lives and messages of the twenty-five prophets named in the Qur'an.",
      hi: "क़ुरआन में वर्णित पच्चीस पैगंबरों का जीवन और संदेश।",
      ur: "قرآن میں مذکور پچیس انبیاء کی زندگیاں اور پیغامات۔",
    },
  },
  {
    id: "quranic",
    icon: ScrollText,
    label: {
      en: "Quranic Stories",
      hi: "क़ुरआनी कहानियाँ",
      ur: "قرآنی قصص",
    },
    blurb: {
      en: "Parables and narratives told in the Qur'an and the lessons they carry.",
      hi: "क़ुरआन में वर्णित दृष्टांत और कथाएँ और उनकी शिक्षाएँ।",
      ur: "قرآن میں بیان کردہ واقعات اور تمثیلیں اور اُن کے اسباق۔",
    },
  },
  {
    id: "surahs",
    icon: BookMarked,
    label: {
      en: "Surah Virtues",
      hi: "सूरह की विशेषताएँ",
      ur: "فضائلِ سور",
    },
    blurb: {
      en: "The virtues, themes, and context of individual surahs.",
      hi: "अलग-अलग सूरतों की विशेषताएँ, विषय और संदर्भ।",
      ur: "مختلف سورتوں کے فضائل، مضامین اور پس منظر۔",
    },
  },
]

export const KNOWLEDGE_CATEGORY_IDS: KnowledgeCategory[] = KNOWLEDGE_CATEGORIES.map((c) => c.id)

/** Look up a category's metadata by id. */
export function getCategoryInfo(id: KnowledgeCategory): KnowledgeCategoryInfo | undefined {
  return KNOWLEDGE_CATEGORIES.find((c) => c.id === id)
}
