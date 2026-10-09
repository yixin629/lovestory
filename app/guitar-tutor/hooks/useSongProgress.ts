'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SongProgress } from '../types'

const STORAGE_PREFIX = 'guitar-tutor-progress-v1'

function storageKey(songId: string) {
  return `${STORAGE_PREFIX}-${songId}`
}

const emptyProgress: SongProgress = { masteredChordIds: [], currentStepIndex: 0 }

/**
 * 单首歌的本地练习进度：哪些和弦已经标记为"掌握"，练到第几步。
 * 这是单人练习工具，不需要 Supabase，用 localStorage 就够了，写法参照
 * app/tic-tac-toe/page.tsx 里 try/catch 包裹读写、带版本号 key 的约定。
 */
export function useSongProgress(songId: string) {
  const [progress, setProgress] = useState<SongProgress>(emptyProgress)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(songId))
      setProgress(saved ? (JSON.parse(saved) as SongProgress) : emptyProgress)
    } catch {
      setProgress(emptyProgress)
    } finally {
      setIsLoaded(true)
    }
  }, [songId])

  const persist = useCallback(
    (next: SongProgress) => {
      setProgress(next)
      try {
        localStorage.setItem(storageKey(songId), JSON.stringify(next))
      } catch {
        // 本地存储不可用时不阻塞练习，只是这次进度不会被记住
      }
    },
    [songId]
  )

  const toggleChordMastered = useCallback(
    (chordId: string) => {
      const alreadyMastered = progress.masteredChordIds.includes(chordId)
      const nextMastered = alreadyMastered
        ? progress.masteredChordIds.filter((id) => id !== chordId)
        : [...progress.masteredChordIds, chordId]
      persist({ ...progress, masteredChordIds: nextMastered })
    },
    [progress, persist]
  )

  const setCurrentStepIndex = useCallback(
    (index: number) => {
      persist({ ...progress, currentStepIndex: index })
    },
    [progress, persist]
  )

  const resetProgress = useCallback(() => {
    persist(emptyProgress)
  }, [persist])

  return { progress, isLoaded, toggleChordMastered, setCurrentStepIndex, resetProgress }
}
