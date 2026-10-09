export interface YouTubeEmbedTarget {
  videoId: string | null
  playlistId: string | null
}

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

export function parseYouTubeUrl(value: string): YouTubeEmbedTarget | null {
  try {
    const url = new URL(value.trim())
    const host = url.hostname.replace(/^www\./, '')
    if (!['youtube.com', 'music.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) return null

    let videoId: string | null = null
    if (host === 'youtu.be') videoId = url.pathname.split('/').filter(Boolean)[0] ?? null
    else if (url.pathname === '/watch') videoId = url.searchParams.get('v')
    else if (/^\/(embed|shorts|live)\//.test(url.pathname)) videoId = url.pathname.split('/')[2] ?? null

    if (videoId && !VIDEO_ID_PATTERN.test(videoId)) videoId = null
    const playlistId = url.searchParams.get('list')
    if (!videoId && !playlistId) return null
    return { videoId, playlistId }
  } catch {
    return null
  }
}

export function getYouTubeEmbedUrl(value: string) {
  const target = parseYouTubeUrl(value)
  if (!target) return null
  const params = new URLSearchParams({ playsinline: '1', rel: '0' })
  if (target.playlistId) params.set('list', target.playlistId)
  if (target.playlistId && !target.videoId) params.set('listType', 'playlist')
  const path = target.videoId ? `/${target.videoId}` : ''
  return `https://www.youtube-nocookie.com/embed${path}?${params.toString()}`
}
