import type { Video } from "@/types"
import { scholars } from "@/config/scholars"

const categoryLabels: Record<string, string> = {
  tafsir: "Tafsir",
  seerah: "Seerah",
  fiqh: "Fiqh",
  aqeedah: "Aqeedah",
  dawah: "Dawah",
  spirituality: "Spirituality",
  quran: "Quran",
  hadith: "Hadith",
  "comparative-religion": "Comparative Religion",
  "quranic-arabic": "Quranic Arabic",
}

const baseVideoData: Array<{
  youtubeId: string
  title: string
  description: string
  category: string
  duration: string
  views: number
  publishedAt: string
}> = [
  {
    youtubeId: "dQw4w9WgXcQ",
    title: "The Beauty of Quran Recitation",
    description: "A beautiful recitation reflecting on the verses of the Holy Quran with deep spiritual insights.",
    category: "quran",
    duration: "15:30",
    views: 245000,
    publishedAt: "2025-12-15T10:00:00Z",
  },
  {
    youtubeId: "jNQXAC9IVRw",
    title: "Understanding Surah Al-Fatiha",
    description: "Deep dive into the meanings and reflections of the opening chapter of the Quran.",
    category: "tafsir",
    duration: "22:15",
    views: 189000,
    publishedAt: "2026-01-10T14:30:00Z",
  },
  {
    youtubeId: "kJQP7kiw5Fk",
    title: "The Life of Prophet Muhammad (PBUH)",
    description: "An inspiring lecture covering the blessed life of the final Messenger.",
    category: "seerah",
    duration: "45:00",
    views: 567000,
    publishedAt: "2025-11-20T09:00:00Z",
  },
  {
    youtubeId: "fJ9rUzIMcZQ",
    title: "Lessons from the Stories of Prophets",
    description: "Powerful lessons derived from the stories of various prophets mentioned in the Quran.",
    category: "seerah",
    duration: "31:20",
    views: 412000,
    publishedAt: "2026-02-05T16:00:00Z",
  },
  {
    youtubeId: "9bZkp7q19f0",
    title: "Strengthening Your Faith (Iman)",
    description: "Practical steps to strengthen your faith and connection with Allah in daily life.",
    category: "aqeedah",
    duration: "18:45",
    views: 334000,
    publishedAt: "2026-03-01T11:00:00Z",
  },
  {
    youtubeId: "hT_nvWreIhg",
    title: "Islamic Jurisprudence Essentials",
    description: "An overview of the key principles of Islamic jurisprudence for everyday life.",
    category: "fiqh",
    duration: "27:30",
    views: 178000,
    publishedAt: "2026-01-25T08:00:00Z",
  },
  {
    youtubeId: "RgKAFK5djSk",
    title: "The Power of Dua (Supplication)",
    description: "Understanding the importance and etiquette of making dua in Islam.",
    category: "spirituality",
    duration: "12:10",
    views: 523000,
    publishedAt: "2026-02-14T13:00:00Z",
  },
  {
    youtubeId: "JGwWNGJdvx8",
    title: "Comparative Religion: Islam and Christianity",
    description: "A respectful comparative analysis between Islamic and Christian beliefs.",
    category: "comparative-religion",
    duration: "38:20",
    views: 445000,
    publishedAt: "2025-10-30T15:00:00Z",
  },
  {
    youtubeId: "OPf0YbXqDm0",
    title: "Introduction to Quranic Arabic",
    description: "Learn the basics of Quranic Arabic to better understand the Holy Quran.",
    category: "quranic-arabic",
    duration: "20:00",
    views: 289000,
    publishedAt: "2026-03-10T10:30:00Z",
  },
  {
    youtubeId: "06T4w_0tM0g",
    title: "Hadith: The Second Revelation",
    description: "Understanding the importance of Hadith as a source of Islamic guidance.",
    category: "hadith",
    duration: "16:40",
    views: 198000,
    publishedAt: "2026-02-20T12:00:00Z",
  },
  {
    youtubeId: "b8HO6h0K9nM",
    title: "Dealing with Life's Challenges",
    description: "Islamic perspective on dealing with trials, hardships, and challenges in life.",
    category: "spirituality",
    duration: "25:15",
    views: 378000,
    publishedAt: "2026-01-05T09:00:00Z",
  },
  {
    youtubeId: "kfVsfOSbJY0",
    title: "The Concept of Tawheed",
    description: "Understanding the fundamental concept of monotheism in Islam.",
    category: "aqeedah",
    duration: "33:50",
    views: 267000,
    publishedAt: "2025-12-01T14:00:00Z",
  },
  {
    youtubeId: "lp-EO5I60KA",
    title: "Parenting in Islam",
    description: "Islamic guidelines for raising righteous children in the modern world.",
    category: "fiqh",
    duration: "29:10",
    views: 456000,
    publishedAt: "2026-03-05T11:00:00Z",
  },
  {
    youtubeId: "s6TtwIN8FvI",
    title: "Reflections on Surah Al-Kahf",
    description: "Deep reflections on the verses and lessons from Surah Al-Kahf.",
    category: "tafsir",
    duration: "41:30",
    views: 612000,
    publishedAt: "2026-02-28T16:00:00Z",
  },
  {
    youtubeId: "xyfHqP0Y1sE",
    title: "Calling to Islam with Wisdom",
    description: "Learn the etiquettes and methods of calling others to Islam with wisdom and kindness.",
    category: "dawah",
    duration: "19:45",
    views: 234000,
    publishedAt: "2026-01-15T10:00:00Z",
  },
]

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function getMockVideos(): Video[] {
  const videos: Video[] = []
  let idCounter = 1

  for (const scholar of scholars) {
    const scholarCategories = scholar.categories
    const scholarVideos = baseVideoData
      .filter((v) => scholarCategories.includes(v.category))
      .slice(0, 6)

    if (scholarVideos.length < 3) {
      const fallbackCategories = ["spirituality", "quran", "dawah"]
      const extraCount = 3 - scholarVideos.length
      for (let i = 0; i < extraCount; i++) {
        const fallback = baseVideoData.find(
          (v) => fallbackCategories.includes(v.category) && !scholarVideos.includes(v)
        )
        if (fallback) scholarVideos.push(fallback)
      }
    }

    for (const videoData of scholarVideos) {
      videos.push({
        id: `mock-${idCounter}`,
        youtubeId: videoData.youtubeId,
        title: videoData.title,
        description: videoData.description,
        scholarId: scholar.id,
        scholarName: scholar.name,
        thumbnail: `https://i.ytimg.com/vi/${videoData.youtubeId}/mqdefault.jpg`,
        duration: videoData.duration,
        publishedAt: videoData.publishedAt,
        category: videoData.category,
        views: videoData.views,
      })
      idCounter++
    }
  }

  return videos
}

export function getMockVideosByScholar(scholarId: string): Video[] {
  return getMockVideos().filter((v) => v.scholarId === scholarId)
}

export function getMockVideosByCategory(category: string): Video[] {
  if (!category || category === "all") return getMockVideos()
  return getMockVideos().filter((v) => v.category === category)
}

export function getCategories(): Array<{ id: string; label: string }> {
  return Object.entries(categoryLabels).map(([id, label]) => ({ id, label }))
}

export function getScholarCategories(scholarId: string): Array<{ id: string; label: string }> {
  const scholar = scholars.find((s) => s.id === scholarId)
  if (!scholar) return []
  return scholar.categories.map((id) => ({
    id,
    label: categoryLabels[id] || id,
  }))
}
