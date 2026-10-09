import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/server-auth'

interface LrcLibResult {
  trackName?: string
  artistName?: string
  plainLyrics?: string | null
  syncedLyrics?: string | null
  instrumental?: boolean
}

// Song titles/artists here often come straight from YouTube video metadata
// ("Song Name (Official Music Video) ft. Someone", channel "Artist - Topic"), which rarely
// matches a lyrics database's clean metadata. Strip the common noise before searching.
function cleanTitle(title: string) {
  return title
    .replace(/[([]\s*(official\s*)?(music\s*)?(video|audio|lyrics?|mv|hd|4k|visualizer|官方|歌词|完整版|高清)[^)\]]*[)\]]/gi, '')
    .replace(/\b(official\s*(music\s*)?video|official\s*audio|lyrics?\s*video|audio)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function cleanArtist(artist: string) {
  return artist.replace(/\s*-\s*topic$/i, '').trim()
}

async function searchLrcLib(title: string, artist: string) {
  const params = new URLSearchParams({ track_name: title })
  if (artist) params.set('artist_name', artist)
  const response = await fetch(`https://lrclib.net/api/search?${params}`, {
    cache: 'no-store',
    headers: { 'User-Agent': 'decide-today-eat music player (personal project)' },
  })
  if (!response.ok) return null
  const results = await response.json() as LrcLibResult[]
  return results.find((item) => !item.instrumental && (item.syncedLyrics || item.plainLyrics)) ?? null
}

// lyrics.ovh is a free, keyless fallback — decent coverage for Western pop, weaker for
// Chinese/Asian tracks, but worth trying when lrclib comes up empty.
async function searchLyricsOvh(title: string, artist: string) {
  if (!artist) return null
  const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { cache: 'no-store' })
  if (!response.ok) return null
  const data = await response.json() as { lyrics?: string }
  return data.lyrics?.trim() || null
}

export async function GET(request: NextRequest) {
  const user = await authenticatedUser(request)
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const rawTitle = request.nextUrl.searchParams.get('title')?.trim() ?? ''
  const rawArtist = request.nextUrl.searchParams.get('artist')?.trim() ?? ''
  if (!rawTitle) return NextResponse.json({ error: '缺少歌曲名' }, { status: 400 })
  if (rawTitle.length > 200 || rawArtist.length > 200) {
    return NextResponse.json({ error: '歌曲名或歌手过长' }, { status: 400 })
  }

  const title = cleanTitle(rawTitle)
  const artist = cleanArtist(rawArtist)

  try {
    let best = await searchLrcLib(title, artist)
    if (!best && artist) best = await searchLrcLib(title, '') // artist field is sometimes a channel name unrelated to the actual singer
    if (best?.plainLyrics || best?.syncedLyrics) {
      return NextResponse.json({
        found: true,
        source: 'lrclib',
        instrumental: Boolean(best.instrumental),
        plainLyrics: best.plainLyrics ?? null,
        syncedLyrics: best.syncedLyrics ?? null,
      })
    }

    const ovhLyrics = await searchLyricsOvh(title, artist)
    if (ovhLyrics) {
      return NextResponse.json({ found: true, source: 'lyrics.ovh', instrumental: false, plainLyrics: ovhLyrics, syncedLyrics: null })
    }

    return NextResponse.json({ found: false })
  } catch (error) {
    console.error('Lyrics lookup failed:', error)
    return NextResponse.json({ error: '无法连接歌词服务' }, { status: 502 })
  }
}
