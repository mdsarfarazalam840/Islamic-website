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
    // The API key is intentionally NOT here. It lives only on the Cloudflare
    // Pages Function (functions/api/youtube.ts) as a server-side env var so it
    // never ships to the browser. The client fetches via the /api/youtube proxy.
    baseUrl: "https://www.googleapis.com/youtube/v3",
    cacheTTL: 3600000,
  },
}
