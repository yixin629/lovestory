'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { coupleChannel } from '@/lib/couple-interactions'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Song {
  id: string
  title: string
  artist: string
  url: string
  cover?: string
  source: 'file' | 'spotify' | 'youtube'
  added_by?: string
  created_at?: string
  liked?: boolean
  pinned?: boolean
  pinned_at?: string | null
}

export type RepeatMode = 'off' | 'all' | 'one'

export interface PendingSync {
  positionSeconds: number
  isPlaying: boolean
  receivedAt: number
}

export interface Reaction {
  id: string
  emoji: string
  at: number
}

export interface PartyInvite {
  at: number
  songTitle: string | null
}

interface SyncRow {
  couple_id: string
  song_id: string | null
  position_seconds: number
  is_playing: boolean
  updated_by: string | null
  updated_at: string
}

const REPEAT_STORAGE_KEY = 'music-player-repeat-mode'
const LAST_SONG_STORAGE_KEY = 'music-player-last-song-id'
const LISTEN_TOGETHER_STORAGE_KEY = 'music-player-listen-together'
const REACTION_LIFETIME_MS = 4000

function sortSongs(list: Song[]) {
  return [...list].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
    if (a.pinned && b.pinned) {
      return (a.pinned_at ?? '').localeCompare(b.pinned_at ?? '')
    }
    return (a.created_at ?? '').localeCompare(b.created_at ?? '')
  })
}

interface MusicPlayerContextValue {
  songs: Song[]
  currentSong: Song | null
  currentSongIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  repeatMode: RepeatMode
  pinnedArtists: string[]
  audioRef: RefObject<HTMLAudioElement | null>
  listenTogether: boolean
  partnerOnline: boolean
  pendingSync: PendingSync | null
  reactions: Reaction[]
  partyInvite: PartyInvite | null
  dismissPartyInvite: () => void
  setCurrentTime: (value: number) => void
  setDuration: (value: number) => void
  setIsPlaying: (value: boolean) => void
  selectSong: (id: string, autoplay?: boolean) => void
  togglePlay: () => void
  playNext: () => void
  playPrev: () => void
  handleTrackEnded: () => void
  cycleRepeatMode: () => void
  addSong: (song: { title: string; artist: string; url: string; source: Song['source']; cover: string }) => Promise<Song | null>
  removeSong: (id: string) => Promise<void>
  toggleLike: (id: string) => Promise<void>
  togglePin: (id: string) => Promise<void>
  togglePinnedArtist: (artist: string) => Promise<void>
  loadSongs: () => Promise<void>
  toggleListenTogether: () => void
  reportSeek: (seconds: number) => void
  reportPosition: (seconds: number) => void
  consumePendingSync: () => void
  sendReaction: (emoji: string) => void
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null)

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast()
  const { user, coupleId } = useAuth()
  const audioRef = useRef<HTMLAudioElement>(null)
  // 未登录或还没配对（/settings、/pair）时不查询、不订阅
  const coupleIdRef = useRef(coupleId)
  useEffect(() => { coupleIdRef.current = coupleId }, [coupleId])

  const [songs, setSongs] = useState<Song[]>([])
  const [currentSongId, setCurrentSongId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all')
  const [pinnedArtists, setPinnedArtists] = useState<string[]>([])
  const [listenTogether, setListenTogether] = useState(false)
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [pendingSync, setPendingSync] = useState<PendingSync | null>(null)
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [partyInvite, setPartyInvite] = useState<PartyInvite | null>(null)
  const hasRestoredLastSong = useRef(false)

  // Tags our own realtime writes so the sync subscription can ignore its own echo. Lazily
  // initialized state (not a ref) so reading it during render doesn't trip react-hooks/refs;
  // it's mirrored into a ref right below since callbacks only ever need the current value.
  const [clientId] = useState(() => (typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36)))
  const clientIdRef = useRef(clientId)

  const currentSongIdRef = useRef(currentSongId)
  useEffect(() => { currentSongIdRef.current = currentSongId }, [currentSongId])
  const songsRef = useRef(songs)
  useEffect(() => { songsRef.current = songs }, [songs])
  const isPlayingRef = useRef(isPlaying)
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  const currentTimeRef = useRef(currentTime)
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])
  const listenTogetherRef = useRef(listenTogether)
  useEffect(() => {
    listenTogetherRef.current = listenTogether
    if (listenTogether) setPartyInvite(null)
  }, [listenTogether])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(REPEAT_STORAGE_KEY)
      if (stored === 'off' || stored === 'all' || stored === 'one') setRepeatMode(stored)
      const storedListen = window.localStorage.getItem(LISTEN_TOGETHER_STORAGE_KEY)
      if (storedListen === '1') setListenTogether(true)
    } catch {
      // localStorage unavailable (private mode etc.) — keep default
    }
  }, [])

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((mode) => {
      const next = mode === 'all' ? 'one' : mode === 'one' ? 'off' : 'all'
      try { window.localStorage.setItem(REPEAT_STORAGE_KEY, next) } catch { /* ignore */ }
      return next
    })
  }, [])

  // Pushes "what I'm doing" to the shared single-row sync table, tagged with our client id
  // so the realtime handler below can tell our own echo apart from the partner's changes.
  const pushSync = useCallback((partial: { songId?: string | null; positionSeconds?: number; isPlaying?: boolean }) => {
    if (!listenTogetherRef.current || !coupleIdRef.current) return
    // 每对情侣一行，couple_id 由数据库默认值 current_couple_id() 填充
    supabase.from('music_sync_session').upsert({
      song_id: partial.songId ?? currentSongIdRef.current,
      position_seconds: partial.positionSeconds ?? currentTimeRef.current,
      is_playing: partial.isPlaying ?? isPlayingRef.current,
      updated_by: clientIdRef.current,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'couple_id' }).then(({ error }) => {
      if (error) console.warn('Listen-together sync push failed (has the migration been run?):', error)
    })
  }, [])

  const toggleListenTogether = useCallback(() => {
    const turningOn = !listenTogetherRef.current
    setListenTogether(turningOn)
    try { window.localStorage.setItem(LISTEN_TOGETHER_STORAGE_KEY, turningOn ? '1' : '0') } catch { /* ignore */ }
    if (!turningOn) return
    const currentCoupleId = coupleIdRef.current
    if (!currentCoupleId) return

    // Opting in should JOIN whatever the partner already has going, not stomp it — so check
    // the shared row first. Only announce our own state if there's nothing (or it's stale/ours)
    // to join, so the partner can catch up to us instead once they opt in.
    supabase.from('music_sync_session').select('couple_id, song_id, position_seconds, is_playing, updated_by, updated_at').maybeSingle().then(({ data, error }) => {
      if (error) console.warn('Listen-together sync read failed:', error)
      const row = data as SyncRow | null
      const joinable = row && row.song_id && row.updated_by !== clientIdRef.current
      if (joinable && row) {
        if (row.song_id !== currentSongIdRef.current) { setCurrentSongId(row.song_id); setDuration(0) }
        setIsPlaying(row.is_playing)
        setCurrentTime(Number(row.position_seconds) || 0)
        setPendingSync({ positionSeconds: Number(row.position_seconds) || 0, isPlaying: row.is_playing, receivedAt: Date.now() })
      } else {
        supabase.from('music_sync_session').upsert({
          song_id: currentSongIdRef.current,
          position_seconds: currentTimeRef.current,
          is_playing: isPlayingRef.current,
          updated_by: clientIdRef.current,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'couple_id' }).then(({ error }) => {
          if (error) console.warn('Listen-together sync push failed (has the migration been run?):', error)
        })
        // Nobody to join, so we're the one starting the session — let the partner know so
        // they get a one-click "加入" prompt instead of having to discover the toggle themselves.
        const songTitle = songsRef.current.find((song) => song.id === currentSongIdRef.current)?.title ?? null
        supabase.channel(coupleChannel(currentCoupleId, 'music-party-invite')).send({ type: 'broadcast', event: 'invite', payload: { at: Date.now(), songTitle } })
      }
    })
  }, [])

  const dismissPartyInvite = useCallback(() => setPartyInvite(null), [])

  // Invite banner — broadcast-only, always listened for (even before opting in ourselves) so
  // turning "listen together" on tells the partner right away instead of them having to notice.
  useEffect(() => {
    if (!coupleId) return
    const channel = supabase
      .channel(coupleChannel(coupleId, 'music-party-invite'))
      .on('broadcast', { event: 'invite' }, ({ payload }) => {
        if (listenTogetherRef.current) return // already connected, no need to prompt
        setPartyInvite(payload as PartyInvite)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coupleId])

  useEffect(() => {
    if (!partyInvite) return
    const timer = setTimeout(() => setPartyInvite(null), 20000)
    return () => clearTimeout(timer)
  }, [partyInvite])

  const reportSeek = useCallback((seconds: number) => {
    setCurrentTime(seconds)
    pushSync({ positionSeconds: seconds })
  }, [pushSync])

  const reportPosition = useCallback((seconds: number) => {
    setCurrentTime(seconds)
  }, [])

  const sendReaction = useCallback((emoji: string) => {
    const reaction: Reaction = { id: crypto.randomUUID(), emoji, at: Date.now() }
    setReactions((prev) => [...prev, reaction])
    if (!coupleIdRef.current) return
    supabase.channel(coupleChannel(coupleIdRef.current, 'music-reactions')).send({ type: 'broadcast', event: 'reaction', payload: reaction })
  }, [])

  // Reactions (flowers etc.) — a broadcast-only channel, no table needed, works whether or
  // not "listen together" is on. The partner's channel.send above and our own optimistic
  // add above both land here; broadcast doesn't echo back to the sender by default.
  useEffect(() => {
    if (!coupleId) return
    const channel = supabase
      .channel(coupleChannel(coupleId, 'music-reactions'))
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const reaction = payload as Reaction
        setReactions((prev) => [...prev, reaction])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coupleId])

  useEffect(() => {
    if (reactions.length === 0) return
    const timer = setTimeout(() => {
      const cutoff = Date.now() - REACTION_LIFETIME_MS
      setReactions((prev) => prev.filter((reaction) => reaction.at > cutoff))
    }, REACTION_LIFETIME_MS)
    return () => clearTimeout(timer)
  }, [reactions])

  const loadSongs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setSongs(sortSongs(data || []))
    } catch (error) {
      console.error('Failed to load songs:', error)
      toast.error('加载歌单失败')
    }
  }, [toast])

  const loadPinnedArtists = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pinned_artists')
        .select('artist')
        .order('pinned_at', { ascending: true })
      if (error) throw error
      setPinnedArtists((data ?? []).map((row) => row.artist as string))
    } catch (error) {
      // Table may not exist yet if the enhancements migration hasn't been run — fail quietly.
      console.warn('Failed to load pinned artists (has the migration been run?):', error)
    }
  }, [])

  useEffect(() => {
    if (!coupleId) {
      setSongs([])
      setPinnedArtists([])
      return
    }
    loadSongs()
    loadPinnedArtists()

    const songsChannel = supabase
      .channel(coupleChannel(coupleId, 'songs_changes'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, () => {
        loadSongs()
      })
      .subscribe()

    const artistsChannel = supabase
      .channel(coupleChannel(coupleId, 'pinned_artists_changes'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pinned_artists' }, () => {
        loadPinnedArtists()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(songsChannel)
      supabase.removeChannel(artistsChannel)
    }
  }, [coupleId, loadSongs, loadPinnedArtists])

  // "Listen together": subscribe to the shared sync row + presence only while opted in.
  useEffect(() => {
    if (!listenTogether || !coupleId) { setPartnerOnline(false); return }

    let channel: RealtimeChannel | null = null
    channel = supabase
      .channel(coupleChannel(coupleId, 'music-party'), { config: { presence: { key: clientIdRef.current } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_sync_session', filter: `couple_id=eq.${coupleId}` }, (payload) => {
        const row = payload.new as SyncRow | undefined
        if (!row || row.updated_by === clientIdRef.current) return
        if (row.song_id && row.song_id !== currentSongIdRef.current) {
          setCurrentSongId(row.song_id)
          setDuration(0)
        }
        setIsPlaying(row.is_playing)
        setCurrentTime(Number(row.position_seconds) || 0)
        setPendingSync({ positionSeconds: Number(row.position_seconds) || 0, isPlaying: row.is_playing, receivedAt: Date.now() })
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel?.presenceState() ?? {}
        const others = Object.keys(state).filter((key) => key !== clientIdRef.current)
        setPartnerOnline(others.length > 0)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel?.track({ online_at: Date.now() })
      })

    return () => {
      if (channel) supabase.removeChannel(channel)
      setPartnerOnline(false)
    }
  }, [listenTogether, coupleId])

  // Heartbeat: while listening together and actively playing, periodically re-announce our
  // position so a partner joining mid-song (or one that drifted) can catch up.
  useEffect(() => {
    if (!listenTogether || !isPlaying || !currentSongId) return
    const interval = setInterval(() => pushSync({}), 5000)
    return () => clearInterval(interval)
  }, [listenTogether, isPlaying, currentSongId, pushSync])

  const consumePendingSync = useCallback(() => setPendingSync(null), [])

  // Restore the last-played track (paused) after a hard page reload, so the floating
  // player doesn't just vanish — currentSongId otherwise only lives in memory and a
  // full refresh (not a client-side Link navigation) wipes it.
  useEffect(() => {
    if (hasRestoredLastSong.current || currentSongId || songs.length === 0) return
    hasRestoredLastSong.current = true
    try {
      const storedId = window.localStorage.getItem(LAST_SONG_STORAGE_KEY)
      if (storedId && songs.some((song) => song.id === storedId)) {
        setCurrentSongId(storedId)
      }
    } catch {
      // ignore
    }
  }, [songs, currentSongId])

  useEffect(() => {
    try {
      if (currentSongId) window.localStorage.setItem(LAST_SONG_STORAGE_KEY, currentSongId)
      else window.localStorage.removeItem(LAST_SONG_STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [currentSongId])

  const currentSong = songs.find((song) => song.id === currentSongId) ?? null
  const currentSongIndex = currentSong ? songs.indexOf(currentSong) : -1

  // Actually drive the <audio> element: React's `autoPlay` prop only fires on mount,
  // and this element stays mounted across song switches (that's what keeps navigation
  // from killing playback), so switching songs or hitting play needs an explicit play() call.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || currentSong?.source !== 'file') return
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying, currentSong?.id, currentSong?.source])

  const selectSong = useCallback((id: string, autoplay = true) => {
    setCurrentSongId(id)
    setCurrentTime(0)
    setDuration(0)
    if (autoplay) setIsPlaying(true)
    pushSync({ songId: id, positionSeconds: 0, isPlaying: autoplay })
  }, [pushSync])

  const togglePlay = useCallback(() => {
    const next = !isPlaying
    if (currentSong?.source === 'file' && audioRef.current) {
      if (isPlaying) audioRef.current.pause()
      else audioRef.current.play()
    }
    setIsPlaying(next)
    pushSync({ isPlaying: next })
  }, [currentSong, isPlaying, pushSync])

  const playNext = useCallback(() => {
    if (songs.length === 0) return
    const index = currentSongIndex < 0 ? -1 : currentSongIndex
    const nextIndex = (index + 1) % songs.length
    selectSong(songs[nextIndex].id)
  }, [songs, currentSongIndex, selectSong])

  const playPrev = useCallback(() => {
    if (songs.length === 0) return
    const index = currentSongIndex < 0 ? 0 : currentSongIndex
    const prevIndex = index - 1 < 0 ? songs.length - 1 : index - 1
    selectSong(songs[prevIndex].id)
  }, [songs, currentSongIndex, selectSong])

  // Wired to the file <audio>'s onEnded. (YouTube auto-advance is wired separately through the
  // IFrame Player API in GlobalMusicPlayer; Spotify's plain iframe still has no such event.)
  const handleTrackEnded = useCallback(() => {
    if (repeatMode === 'one') {
      const audio = audioRef.current
      if (audio) { audio.currentTime = 0; audio.play().catch(() => setIsPlaying(false)) }
      return
    }
    if (repeatMode === 'off' && currentSongIndex === songs.length - 1) {
      setIsPlaying(false)
      return
    }
    playNext()
  }, [repeatMode, currentSongIndex, songs.length, playNext])

  const addSong = useCallback(async (song: { title: string; artist: string; url: string; source: Song['source']; cover: string }) => {
    try {
      const { data, error } = await supabase.from('songs').insert({
        title: song.title || '未知歌曲',
        artist: song.artist || '未知歌手',
        url: song.url,
        source: song.source,
        cover: song.cover,
        added_by: user,
      }).select().single()
      if (error) throw error

      const newSong = data as Song
      // Jump straight to the new song and start playing it instead of just adding it silently.
      setSongs((prev) => {
        if (prev.some((existing) => existing.id === newSong.id)) return prev
        return sortSongs([...prev, newSong])
      })
      setCurrentSongId(newSong.id)
      setCurrentTime(0)
      setDuration(0)
      setIsPlaying(true)
      pushSync({ songId: newSong.id, positionSeconds: 0, isPlaying: true })

      await loadSongs()
      return newSong
    } catch (error) {
      console.error('Add song failed:', error)
      return null
    }
  }, [loadSongs, pushSync, user])

  const removeSong = useCallback(async (id: string) => {
    const { error } = await supabase.from('songs').delete().eq('id', id)
    if (error) throw error
    if (currentSongId === id) setCurrentSongId(null)
    await loadSongs()
  }, [currentSongId, loadSongs])

  const toggleLike = useCallback(async (id: string) => {
    const song = songs.find((item) => item.id === id)
    if (!song) return
    const liked = !song.liked
    setSongs((prev) => prev.map((item) => item.id === id ? { ...item, liked } : item))
    const { error } = await supabase.from('songs').update({ liked }).eq('id', id)
    if (error) {
      console.error('Toggle like failed:', error)
      toast.error('操作失败，请确认已执行 database/setup/05-games-music.sql')
      await loadSongs()
    }
  }, [songs, toast, loadSongs])

  const togglePin = useCallback(async (id: string) => {
    const song = songs.find((item) => item.id === id)
    if (!song) return
    const pinned = !song.pinned
    const pinnedAt = pinned ? new Date().toISOString() : null
    setSongs((prev) => sortSongs(prev.map((item) => item.id === id ? { ...item, pinned, pinned_at: pinnedAt } : item)))
    const { error } = await supabase.from('songs').update({ pinned, pinned_at: pinnedAt }).eq('id', id)
    if (error) {
      console.error('Toggle pin failed:', error)
      toast.error('操作失败，请确认已执行 database/setup/05-games-music.sql')
      await loadSongs()
    }
  }, [songs, toast, loadSongs])

  const togglePinnedArtist = useCallback(async (artist: string) => {
    const isPinned = pinnedArtists.includes(artist)
    setPinnedArtists((prev) => isPinned ? prev.filter((name) => name !== artist) : [...prev, artist])
    try {
      if (isPinned) {
        const { error } = await supabase.from('pinned_artists').delete().eq('artist', artist)
        if (error) throw error
      } else {
        const { error } = await supabase.from('pinned_artists').upsert({ artist }, { onConflict: 'couple_id,artist' })
        if (error) throw error
      }
    } catch (error) {
      console.error('Toggle pinned artist failed:', error)
      toast.error('操作失败，请确认已执行 database/setup/05-games-music.sql')
      await loadPinnedArtists()
    }
  }, [pinnedArtists, toast, loadPinnedArtists])

  const value = useMemo<MusicPlayerContextValue>(() => ({
    songs,
    currentSong,
    currentSongIndex,
    isPlaying,
    currentTime,
    duration,
    repeatMode,
    pinnedArtists,
    audioRef,
    listenTogether,
    partnerOnline,
    pendingSync,
    reactions,
    partyInvite,
    dismissPartyInvite,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    selectSong,
    togglePlay,
    playNext,
    playPrev,
    handleTrackEnded,
    cycleRepeatMode,
    addSong,
    removeSong,
    toggleLike,
    togglePin,
    togglePinnedArtist,
    loadSongs,
    toggleListenTogether,
    reportSeek,
    reportPosition,
    consumePendingSync,
    sendReaction,
  }), [songs, currentSong, currentSongIndex, isPlaying, currentTime, duration, repeatMode, pinnedArtists, listenTogether, partnerOnline, pendingSync, reactions, partyInvite, dismissPartyInvite, selectSong, togglePlay, playNext, playPrev, handleTrackEnded, cycleRepeatMode, addSong, removeSong, toggleLike, togglePin, togglePinnedArtist, loadSongs, toggleListenTogether, reportSeek, reportPosition, consumePendingSync, sendReaction])

  return <MusicPlayerContext.Provider value={value}>{children}</MusicPlayerContext.Provider>
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext)
  if (!context) throw new Error('useMusicPlayer must be used within MusicPlayerProvider')
  return context
}
