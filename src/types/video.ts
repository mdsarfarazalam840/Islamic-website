export interface Video {
  id: string
  youtubeId: string
  title: string
  description: string
  scholarId: string
  scholarName: string
  thumbnail: string
  duration: string
  publishedAt: string
  category: string
  views: number
}

export interface Scholar {
  id: string
  name: string
  nameAr: string
  bio: string
  image: string
  channelId: string
  // Optional YouTube handle (without the leading "@"). When set, the fetcher
  // resolves videos via https://youtube.com/@<handle>/videos instead of the
  // channelId URL — useful when a channel's UC id is unknown or has changed.
  channelHandle?: string
  channelUrl: string
  featured: boolean
  categories: string[]
}
