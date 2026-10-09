import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/server-auth'

interface YouTubeSearchResponse {
  items?: Array<{
    id?: { videoId?: string }
    snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string } } }
  }>
  error?: { message?: string }
}

export async function GET(request: NextRequest) {
  const user = await authenticatedUser(request)
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (query.length < 2 || query.length > 80) {
    return NextResponse.json({ error: '搜索词长度需要在 2 到 80 个字符之间' }, { status: 400 })
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return NextResponse.json({ error: '尚未配置 YouTube 搜索密钥' }, { status: 503 })

  const params = new URLSearchParams({
    part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '8',
    q: query, relevanceLanguage: 'zh-Hans', key: apiKey,
  })

  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { cache: 'no-store' })
    const data = await response.json() as YouTubeSearchResponse
    if (!response.ok) {
      console.error('YouTube search failed:', response.status, data.error?.message)
      return NextResponse.json({ error: response.status === 403 ? 'YouTube 搜索额度不足或密钥无效' : 'YouTube 搜索暂时不可用' }, { status: response.status })
    }

    const results = (data.items ?? []).flatMap((item) => {
      const videoId = item.id?.videoId
      if (!videoId || !item.snippet?.title) return []
      return [{ videoId, title: item.snippet.title, artist: item.snippet.channelTitle ?? 'YouTube', thumbnail: item.snippet.thumbnails?.medium?.url ?? null }]
    })
    return NextResponse.json({ results })
  } catch (error) {
    console.error('YouTube search request failed:', error)
    return NextResponse.json({ error: '无法连接 YouTube 搜索服务' }, { status: 502 })
  }
}
