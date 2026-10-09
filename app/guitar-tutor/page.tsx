'use client'

import { useEffect, useState } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import type { Song } from './types'
import { getSongById, listSongs } from './lib/song-repository'
import SongList from './components/SongList'
import SongDetail from './components/SongDetail'

export default function GuitarTutorPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    listSongs().then((result) => {
      if (!cancelled) {
        setSongs(result)
        setIsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSelectSong = async (songId: string) => {
    const song = await getSongById(songId)
    if (song) setSelectedSong(song)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">🎸 吉他新手陪练</h1>
          <p className="text-sm text-gray-600">
            选一首歌，跟着分解步骤一个和弦一个和弦地学，从新手到能弹唱完整段落。
          </p>
        </div>

        {selectedSong ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedSong(null)}
              className="mb-4 text-sm text-primary font-medium"
            >
              ← 返回曲库列表
            </button>
            <SongDetail song={selectedSong} />
          </>
        ) : isLoading ? (
          <div className="card-compact text-center text-gray-600">曲库加载中…</div>
        ) : (
          <SongList songs={songs} onSelectSong={handleSelectSong} />
        )}
      </div>
    </div>
  )
}
