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

export interface PlaylistVideo {
  youtubeId: string
  title: string
  thumbnail: string
  duration: string
  position: number
}

export interface Playlist {
  id: string
  playlistId: string
  title: string
  scholarId: string
  scholarName: string
  thumbnail: string
  videoCount: number
  // youtubeId of the playlist's first video, used to build the embed URL
  // (youtube.com/embed/videoseries?list= sometimes needs a seed video id to
  // start reliably) and as a thumbnail fallback.
  firstVideoId: string
  videos: PlaylistVideo[]
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
