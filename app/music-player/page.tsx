'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useMusicPlayer, type Song } from '@/app/components/music/MusicPlayerContext'
import { parseYouTubeUrl } from './lib/youtube'
import { authFetch } from '@/lib/auth-fetch'

interface SearchResult { videoId: string; title: string; artist: string; thumbnail: string | null }

type FilterTab = 'all' | 'liked' | 'pinned'

export default function MusicPlayerPage() {
  const toast = useToast()
  const { songs, currentSong, selectSong, addSong, removeSong, toggleLike, togglePin, pinnedArtists, togglePinnedArtist } = useMusicPlayer()

  // UI State
  const [showAddSong, setShowAddSong] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [tab, setTab] = useState<FilterTab>('all')
  const [artistFilter, setArtistFilter] = useState<string | null>(null)

  // Form State
  const [newSongUrl, setNewSongUrl] = useState('')
  const [newSongTitle, setNewSongTitle] = useState('')
  const [newSongArtist, setNewSongArtist] = useState('')
  const [detectedSource, setDetectedSource] = useState<'file' | 'spotify' | 'youtube'>('file')

  const rowRefs = useRef(new Map<string, HTMLDivElement>())

  // Detect Source when URL changes
  useEffect(() => {
    if (!newSongUrl) return

    if (newSongUrl.includes('spotify.com')) {
      setDetectedSource('spotify')
    } else if (newSongUrl.includes('youtube.com') || newSongUrl.includes('youtu.be')) {
      setDetectedSource('youtube')
    } else {
      setDetectedSource('file')
    }
  }, [newSongUrl])

  const searchYouTube = useCallback(async (rawQuery?: string) => {
    const query = (rawQuery ?? searchQuery).trim()
    if (query.length < 2) { toast.warning('请输入至少两个字'); return }
    setIsSearching(true)
    try {
      const response = await authFetch(`/api/youtube-search?q=${encodeURIComponent(query)}`)
      const data = await response.json() as { results?: SearchResult[]; error?: string }
      if (!response.ok) throw new Error(data.error ?? '搜索失败')
      setSearchResults(data.results ?? [])
      if (!data.results?.length) toast.info('没有找到可嵌入的视频')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '搜索失败')
    } finally { setIsSearching(false) }
  }, [searchQuery, toast])

  // Add Song
  const handleAddSong = async () => {
    if (!newSongUrl) {
      toast.error('请输入链接')
      return
    }

    if (detectedSource === 'youtube' && !parseYouTubeUrl(newSongUrl)) {
      toast.error('无法识别此 YouTube / YouTube Music 链接')
      return
    }

    let finalCover = '🎵'
    if (detectedSource === 'spotify') finalCover = '🟢'
    else if (detectedSource === 'youtube') finalCover = '🔴'

    const song = await addSong({ title: newSongTitle, artist: newSongArtist, url: newSongUrl, source: detectedSource, cover: finalCover })
    if (song) {
      toast.success('添加成功，已开始播放！')
      setNewSongUrl('')
      setNewSongTitle('')
      setNewSongArtist('')
    } else {
      toast.error('添加失败')
    }
  }

  const addSearchResult = async (result: SearchResult) => {
    const song = await addSong({ title: result.title, artist: result.artist, url: `https://www.youtube.com/watch?v=${result.videoId}`, source: 'youtube', cover: '🔴' })
    if (song) toast.success(`已加入并播放：${result.title}`)
    else toast.error('加入歌单失败')
  }

  const handleRemoveSong = async (id: string) => {
    try {
      await removeSong(id)
      toast.success('已移除')
    } catch {
      toast.error('移除失败')
    }
  }

  // Clicking an artist name switches to "artist view": filters the shared playlist to their
  // tracks and kicks off a YouTube search for more songs by them (closest we can get to a
  // YouTube-Music-style artist page without a paid catalog API).
  const viewArtist = (artist: string) => {
    setArtistFilter(artist)
    setTab('all')
    setShowAddSong(true)
    setSearchQuery(artist)
    void searchYouTube(artist)
  }

  const clearArtistFilter = () => setArtistFilter(null)

  const visibleSongs = useMemo(() => {
    let list = songs
    if (artistFilter) list = list.filter((song) => song.artist === artistFilter)
    else if (tab === 'liked') list = list.filter((song) => song.liked)
    else if (tab === 'pinned') list = list.filter((song) => song.pinned)
    return list
  }, [songs, tab, artistFilter])

  // Auto-scroll the active track into view instead of making people hunt for it after adding/searching.
  const currentSongId = currentSong?.id
  useEffect(() => {
    if (!currentSongId) return
    const node = rowRefs.current.get(currentSongId)
    node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentSongId])

  const artistCounts = useMemo(() => {
    const counts = new Map<string, number>()
    songs.forEach((song) => counts.set(song.artist, (counts.get(song.artist) ?? 0) + 1))
    return counts
  }, [songs])

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card">
          <h1 className="text-3xl md:text-4xl font-bold text-primary text-center mb-2">
            🎵 共享音乐播放器 (Online)
          </h1>
          <p className="text-gray-600 text-center mb-2">支持 MP3 / Spotify / YouTube Music • 双方共享歌单</p>
          <p className="text-gray-400 text-center text-xs mb-6">播放器已固定在右下角悬浮面板，切到其他页面音乐也会继续播放</p>

          {/* Search / Add — kept open by default so you don't have to scroll to find it every time */}
          <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
            <div className="space-y-3">
              <div>
                <label className="label-primary">直接搜索 YouTube Music</label>
                <div className="flex gap-2">
                  <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void searchYouTube() }} placeholder="歌曲、歌手或专辑" className="input-primary" maxLength={80} />
                  <button type="button" onClick={() => void searchYouTube()} disabled={isSearching} className="btn-primary shrink-0 px-5">{isSearching ? '搜索中…' : '搜索'}</button>
                </div>
                <p className="mt-1 text-[11px] text-gray-400">目前仅支持 YouTube Music 搜索；MP3 / Spotify 请用下方链接添加。</p>
              </div>
              {searchResults.length > 0 && <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border bg-white p-2">{searchResults.map((result) => <div key={result.videoId} className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"><div className="h-12 w-20 shrink-0 rounded-md bg-cover bg-center bg-gray-200" style={result.thumbnail ? { backgroundImage: `url(${result.thumbnail})` } : undefined} /><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold text-gray-900">{result.title}</p><button type="button" onClick={() => viewArtist(result.artist)} className="truncate text-xs text-gray-500 hover:text-primary hover:underline">{result.artist}</button></div><button type="button" onClick={() => void addSearchResult(result)} className="rounded-full bg-pink-100 px-3 py-2 text-xs font-bold text-pink-700 hover:bg-pink-200">＋歌单</button></div>)}</div>}
              <button type="button" onClick={() => setShowAddSong((open) => !open)} className="text-xs font-semibold text-gray-400 hover:text-primary">{showAddSong ? '收起链接添加 ▲' : '展开链接添加（MP3 / Spotify）▼'}</button>
              {showAddSong && (
                <div className="space-y-3 pt-1">
                  <input
                    type="text"
                    placeholder="链接（MP3 / Spotify / YouTube Music）"
                    value={newSongUrl}
                    onChange={(e) => setNewSongUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary outline-none"
                  />
                  <div className="text-xs text-gray-500 text-right">
                    已识别来源:{' '}
                    <span className="font-bold uppercase text-primary">{detectedSource}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="歌曲名"
                      value={newSongTitle}
                      onChange={(e) => setNewSongTitle(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary outline-none"
                    />
                    <input
                      type="text"
                      placeholder="歌手"
                      value={newSongArtist}
                      onChange={(e) => setNewSongArtist(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <button
                    onClick={handleAddSong}
                    className="w-full py-2 bg-primary text-white rounded-lg hover:bg-pink-600 transition-colors"
                  >
                    确认添加
                  </button>
                </div>
              )}
            </div>
          </div>

          {pinnedArtists.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {pinnedArtists.map((artist) => (
                <button
                  key={artist}
                  type="button"
                  onClick={() => viewArtist(artist)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    artistFilter === artist ? 'border-amber-400 bg-amber-100 text-amber-700' : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300'
                  }`}
                >
                  📌 {artist}
                </button>
              ))}
            </div>
          )}

          {artistFilter ? (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-indigo-50 px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-700">
                <span>🎤 {artistFilter}</span>
                <span className="text-xs font-normal text-indigo-400">歌单内 {artistCounts.get(artistFilter) ?? 0} 首</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void togglePinnedArtist(artistFilter)} className={`text-xs font-bold ${pinnedArtists.includes(artistFilter) ? 'text-amber-600' : 'text-indigo-500 hover:text-amber-600'}`}>
                  {pinnedArtists.includes(artistFilter) ? '📌 已置顶' : '📌 置顶歌手'}
                </button>
                <button type="button" onClick={clearArtistFilter} className="text-xs font-bold text-indigo-500 hover:text-indigo-700">✕ 返回全部</button>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex gap-2">
              {([['all', `全部 (${songs.length})`], ['liked', `喜欢 (${songs.filter((s) => s.liked).length})`], ['pinned', `置顶 (${songs.filter((s) => s.pinned).length})`]] as [FilterTab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    tab === key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {visibleSongs.length === 0 && (
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 mb-6 shadow-inner text-center text-gray-400">
              <p className="text-4xl mb-2">☁️</p>
              <p>{songs.length === 0 ? '播放列表为空，快添加一首吧！' : '这里还没有歌曲'}</p>
            </div>
          )}

          {/* Song List */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {visibleSongs.map((song: Song) => (
              <div
                key={song.id}
                ref={(node) => { if (node) rowRefs.current.set(song.id, node); else rowRefs.current.delete(song.id) }}
                onClick={() => selectSong(song.id)}
                className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all border ${
                  song.id === currentSong?.id
                    ? 'bg-white border-primary shadow-md transform scale-[1.02]'
                    : 'bg-white border-transparent hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                <span className="text-xl">{song.cover}</span>
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-bold truncate ${
                      song.id === currentSong?.id ? 'text-primary' : 'text-gray-800'
                    }`}
                  >
                    {song.title}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="uppercase bg-gray-100 px-1 rounded text-[10px]">
                      {song.source}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); viewArtist(song.artist) }}
                      className="truncate hover:text-primary hover:underline"
                    >
                      {song.artist}
                    </button>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); void toggleLike(song.id) }}
                  className={`p-1.5 transition-colors ${song.liked ? 'text-rose-500' : 'text-gray-300 hover:text-rose-400'}`}
                  aria-label={song.liked ? '取消喜欢' : '喜欢'}
                >
                  {song.liked ? '❤️' : '🤍'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); void togglePin(song.id) }}
                  className={`p-1.5 transition-colors ${song.pinned ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}
                  aria-label={song.pinned ? '取消置顶' : '置顶'}
                >
                  📌
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleRemoveSong(song.id)
                  }}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  aria-label="移除"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
