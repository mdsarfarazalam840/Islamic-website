export const apiConfig = {
  quran: {
    baseUrl: "https://api.alquran.cloud/v1",
    editions: {
      arabic: "quran-uthmani",
      english: "en.ahmedali",
      hindi: "hi.hindi",
      urdu: "ur.jalandhry",
    },
  },
  hadith: {
    baseUrl: "https://api.ummahapi.com/hadith",
    collections: {
      bukhari: "bukhari",
      muslim: "muslim",
    },
  },
  youtube: {
    apiKey: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "",
    baseUrl: "https://www.googleapis.com/youtube/v3",
    cacheTTL: 3600000,
  },
}
