// Minimal typings for the YouTube IFrame Player API that we actually use.
// Loaded at runtime from https://www.youtube.com/iframe_api.
// Reference: https://developers.google.com/youtube/iframe_api_reference

interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
  destroy(): void
}

interface YTPlayerEvent {
  target: YTPlayer
  data: number
}

interface YTPlayerOptions {
  videoId: string
  host?: string
  playerVars?: {
    autoplay?: 0 | 1
    rel?: 0 | 1
    playsinline?: 0 | 1
    modestbranding?: 0 | 1
  }
  events?: {
    onReady?: (event: YTPlayerEvent) => void
    onStateChange?: (event: YTPlayerEvent) => void
    // `data` carries the error code: 2 (bad param), 5 (HTML5 error),
    // 100 (removed/private), 101 & 150 (embedding disabled by the owner).
    onError?: (event: YTPlayerEvent) => void
  }
}

interface YTNamespace {
  Player: new (element: HTMLElement | string, options: YTPlayerOptions) => YTPlayer
  PlayerState: {
    UNSTARTED: number
    ENDED: number
    PLAYING: number
    PAUSED: number
    BUFFERING: number
    CUED: number
  }
}

interface Window {
  YT?: YTNamespace
  onYouTubeIframeAPIReady?: () => void
}
