'use client'

import { useMemo, useState } from 'react'
import type { Song } from '../types'

interface SongListProps {
  songs: Song[]
  onSelectSong: (songId: string) => void
}

/**
 * 曲库搜索框只在已有的 songs 数组里做本地过滤，不实现"联网查任意歌名"，
 * 找不到时用诚实的空状态文案说明这是一个人工整理的曲库，而不是"搜索失败"。
 */
export default function SongList({ songs, onSelectSong }: SongListProps) {
  const [query, setQuery] = useState('')

  const filteredSongs = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return songs
    return songs.filter(
      (song) => song.title.toLowerCase().includes(trimmed) || song.artist.toLowerCase().includes(trimmed)
    )
  }, [songs, query])

  return (
    <div className="flex flex-col gap-4">
      <div className="card-compact">
        <label htmlFor="guitar-song-search" className="block text-sm text-gray-600 mb-2">
          在曲库里搜索（歌名或歌手）
        </label>
        <input
          id="guitar-song-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="例如：林俊杰"
          className="input-primary"
        />
        <p className="text-xs text-gray-500 mt-2">
          曲库由人工核实和弦信息后原创整理，不是实时联网搜索，也不会展示任何版权谱面或歌词。
        </p>
      </div>

      {filteredSongs.length === 0 ? (
        <div className="card-compact text-center text-gray-600">
          曲库还没有这首歌，可以先看看已有曲目。
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredSongs.map((song) => (
            <button
              key={song.id}
              type="button"
              onClick={() => onSelectSong(song.id)}
              className="card-compact text-left border border-gray-200 hover:border-primary transition-colors"
            >
              <div className="font-bold text-lg">{song.title}</div>
              <div className="text-gray-600 text-sm">{song.artist}</div>
              <div className="text-xs text-gray-500 mt-1">
                用到的和弦：{song.chordIds.join('、')}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
