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
  channelUrl: string
  featured: boolean
  categories: string[]
}
