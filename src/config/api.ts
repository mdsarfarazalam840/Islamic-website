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
    // Real video data is pre-generated at build time from each channel's public
    // RSS feed (scripts/fetch-youtube-data.ts) into public/data/youtube/*.json.
    // No API key ships to the browser and none is needed at all — the RSS feed
    // is public. cacheTTL controls the in-memory client cache in lib/youtube/api.ts.
    baseUrl: "https://www.googleapis.com/youtube/v3",
    cacheTTL: 3600000,
  },
}
