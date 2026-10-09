'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMusicPlayer } from './MusicPlayerContext'
import { authFetch } from '@/lib/auth-fetch'
import { getYouTubeEmbedUrl } from '@/app/music-player/lib/youtube'

// Minimal shape of the bits of the YouTube IFrame Player API we actually use.
interface YTPlayer {
  destroy: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  playVideo: () => void
  pauseVideo: () => void
}
interface YTPlayerEvent { data: number; target: YTPlayer }
interface YTNamespace {
  Player: new (elementId: string, options: { events: { onReady?: (event: YTPlayerEvent) => void; onStateChange: (event: YTPlayerEvent) => void } }) => YTPlayer
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number }
}
declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

// Loads the official youtube.com/iframe_api script once per page and resolves when window.YT is ready.
// This is what lets us detect "video ended" on an embedded YouTube player — plain <iframe onEnded>
// doesn't exist; only the JS API's onStateChange event exposes that.
function useYouTubeApiReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (window.YT?.Player) { setReady(true); return }
    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script')
      tag.id = 'youtube-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { previous?.(); setReady(true) }
  }, [])
  return ready
}

// Rendered once in the root layout so the <audio>/<iframe> element is never
// unmounted while navigating between pages — that's what keeps playback going
// after leaving /music-player (no premium APIs needed, just don't destroy the DOM node).
// Follows the same fixed-FAB + slide-up-panel convention as AIChatbot / UnifiedThemePanel
// so it docks into the same bottom-right button row instead of overlapping them.
//
// IMPORTANT: the panel below is always mounted once currentSong exists — only its
// visibility classes toggle. Conditionally rendering it (`{open && <section>...}`)
// would unmount the <audio>/<iframe> every time the panel is collapsed, which is
// exactly the "music stops" bug this component exists to avoid.
interface LyricsState {
  loading: boolean
  found: boolean
  text: string | null
  error: boolean
}

const REPEAT_LABELS: Record<string, { icon: string; label: string }> = {
  off: { icon: '➡️', label: '不循环' },
  all: { icon: '🔁', label: '列表循环' },
  one: { icon: '🔂', label: '单曲循环' },
}

const REACTION_OPTIONS = ['🌹', '💐', '❤️', '👏', '🔥', '😂']

export default function GlobalMusicPlayer() {
  const { songs, currentSong, isPlaying, currentTime, duration, repeatMode, audioRef, setCurrentTime, setDuration, setIsPlaying, selectSong, togglePlay, playNext, playPrev, handleTrackEnded, cycleRepeatMode, toggleLike, togglePin, listenTogether, partnerOnline, pendingSync, reactions, partyInvite, dismissPartyInvite, toggleListenTogether, reportSeek, reportPosition, consumePendingSync, sendReaction } = useMusicPlayer()
  const pathname = usePathname()
  const onMusicPage = pathname === '/music-player'
  const [isOpen, setIsOpen] = useState(false)
  const [lyricsOpen, setLyricsOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [lyrics, setLyrics] = useState<LyricsState>({ loading: false, found: false, text: null, error: false })

  // Landing on the dedicated page opens the panel automatically; leaving it collapses back to the FAB.
  useEffect(() => { setIsOpen(onMusicPage) }, [onMusicPage])

  useEffect(() => { setIsBuffering(false) }, [currentSong?.id])

  const panelOpen = isOpen || onMusicPage
  const hasSong = Boolean(currentSong)

  // Auto-advance for YouTube tracks: wire the official IFrame Player API to the embedded
  // iframe so its "ended" state routes into the same handleTrackEnded logic as MP3s. A plain
  // <iframe> has no onEnded event, which is why auto-next silently did nothing before.
  const ytReady = useYouTubeApiReady()
  const ytIframeRef = useRef<HTMLIFrameElement>(null)
  const ytPlayerRef = useRef<YTPlayer | null>(null)
  const [ytPlayerInstanceReady, setYtPlayerInstanceReady] = useState(0)
  const handleTrackEndedRef = useRef(handleTrackEnded)
  useEffect(() => { handleTrackEndedRef.current = handleTrackEnded }, [handleTrackEnded])
  // Guards against double-firing handleTrackEnded from both onStateChange's ENDED event and
  // the redundant near-duration poll below (see that effect's comment for why both exist).
  const hasTriggeredEndRef = useRef(false)
  useEffect(() => { hasTriggeredEndRef.current = false }, [currentSong?.id])
  const ytElementId = currentSong?.source === 'youtube' ? `yt-player-${currentSong.id}` : undefined
  useEffect(() => {
    if (!ytReady || !ytElementId || !window.YT || !document.getElementById(ytElementId)) return
    // Passing the iframe's id (not the element) is the documented way to "adopt" an
    // existing embed — the constructor's own return value isn't reliably control-ready
    // yet, so we grab the real instance from onReady instead.
    const player = new window.YT.Player(ytElementId, {
      events: {
        onReady: (event) => { ytPlayerRef.current = event.target; setYtPlayerInstanceReady((value) => value + 1) },
        onStateChange: (event) => {
          if (window.YT && event.data === window.YT.PlayerState.ENDED && !hasTriggeredEndRef.current) {
            hasTriggeredEndRef.current = true
            handleTrackEndedRef.current()
          }
        },
      },
    })
    return () => { player.destroy(); ytPlayerRef.current = null }
  }, [ytReady, ytElementId])

  // Drive actual play/pause on the YouTube player when `isPlaying` changes — mirrors the
  // <audio> effect below, since an <iframe> has no play/pause props of its own either.
  useEffect(() => {
    if (currentSong?.source !== 'youtube' || !ytPlayerRef.current) return
    if (isPlaying) ytPlayerRef.current.playVideo()
    else ytPlayerRef.current.pauseVideo()
  }, [isPlaying, currentSong?.id, currentSong?.source, ytPlayerInstanceReady])

  // Poll YouTube's own playhead into shared `currentTime` — an <iframe> gives us no
  // onTimeUpdate, but "listen together" needs a real position to sync with the partner.
  // The same poll doubles as a *redundant* end-of-track detector: onStateChange's ENDED
  // event depends on the postMessage handshake actually working, which has turned out to
  // be unreliable in practice, so we also just watch the playhead catch up to the duration.
  const reportPositionRef = useRef(reportPosition)
  useEffect(() => { reportPositionRef.current = reportPosition }, [reportPosition])
  useEffect(() => {
    if (currentSong?.source !== 'youtube') return
    const interval = setInterval(() => {
      const player = ytPlayerRef.current
      if (!player) return
      const seconds = player.getCurrentTime()
      if (typeof seconds === 'number' && Number.isFinite(seconds)) reportPositionRef.current(seconds)
      const total = player.getDuration()
      if (!hasTriggeredEndRef.current && total > 0 && seconds > 0 && total - seconds < 1) {
        hasTriggeredEndRef.current = true
        handleTrackEndedRef.current()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [currentSong?.id, currentSong?.source])

  // Some browsers block the *unmuted* autoplay that follows an auto-advance (no fresh click
  // to anchor "user activation" to), especially for a freshly (re)loaded YouTube iframe. If
  // we intended to keep playing but the media is actually sitting paused a moment later,
  // surface a one-tap "继续播放" nudge instead of silently doing nothing.
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  useEffect(() => {
    setAutoplayBlocked(false)
    if (!isPlaying || !currentSong) return
    const timer = setTimeout(() => {
      if (currentSong.source === 'file' && audioRef.current?.paused) setAutoplayBlocked(true)
      else if (currentSong.source === 'youtube' && window.YT && ytPlayerRef.current && ytPlayerRef.current.getPlayerState() !== window.YT.PlayerState.PLAYING) setAutoplayBlocked(true)
    }, 1800)
    return () => clearTimeout(timer)
  }, [currentSong?.id, isPlaying, currentSong, audioRef])

  const resumeBlockedPlayback = () => {
    setAutoplayBlocked(false)
    if (currentSong?.source === 'file') audioRef.current?.play().catch(() => {})
    else if (currentSong?.source === 'youtube') ytPlayerRef.current?.playVideo()
  }

  // Apply a sync update pushed by the partner: seek whichever media element is actually
  // playing to where they are (plus elapsed time since their update, if they're playing).
  useEffect(() => {
    if (!pendingSync || !currentSong) return
    const elapsed = pendingSync.isPlaying ? (Date.now() - pendingSync.receivedAt) / 1000 : 0
    const target = Math.max(0, pendingSync.positionSeconds + elapsed)
    if (currentSong.source === 'file' && audioRef.current) {
      audioRef.current.currentTime = target
    } else if (currentSong.source === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(target, true)
    }
    consumePendingSync()
  }, [pendingSync, currentSong, audioRef, consumePendingSync])

  // Only refetch lyrics when the song identity changes, not when liked/pinned flags update.
  const lyricsSongId = currentSong?.id
  const lyricsTitle = currentSong?.title
  const lyricsArtist = currentSong?.artist
  useEffect(() => {
    if (!lyricsOpen || !lyricsSongId || lyricsTitle === undefined || lyricsArtist === undefined) return
    let cancelled = false
    setLyrics({ loading: true, found: false, text: null, error: false })
    const params = new URLSearchParams({ title: lyricsTitle, artist: lyricsArtist })
    authFetch(`/api/lyrics?${params}`)
      .then((response) => response.json() as Promise<{ found?: boolean; plainLyrics?: string | null; error?: string }>)
      .then((data) => {
        if (cancelled) return
        if (data.error) { setLyrics({ loading: false, found: false, text: null, error: true }); return }
        setLyrics({ loading: false, found: Boolean(data.found), text: data.plainLyrics ?? null, error: false })
      })
      .catch(() => { if (!cancelled) setLyrics({ loading: false, found: false, text: null, error: true }) })
    return () => { cancelled = true }
  }, [lyricsOpen, lyricsSongId, lyricsTitle, lyricsArtist])

  // Bake `autoplay=1` into an embed's src only for the moment a new song becomes current
  // (and only if it should already be playing) — never in response to later play/pause
  // toggles, since changing an <iframe> src always reloads it and would restart the track.
  const [lastSeenId, setLastSeenId] = useState<string | null>(null)
  const [autoplayId, setAutoplayId] = useState<string | null>(null)
  if (currentSong && currentSong.id !== lastSeenId) {
    setLastSeenId(currentSong.id)
    if (isPlaying) setAutoplayId(currentSong.id)
  }
  const autoplayParam = currentSong && autoplayId === currentSong.id ? '&autoplay=1' : ''

  return (
    <>
      {/* Invite banner: fires the moment the partner turns on "一起听" as the session host,
          so joining is one tap instead of "hope they notice the toggle exists". */}
      {partyInvite && (
        <div
          role="status"
          className="fixed inset-x-3 top-20 z-[80] mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-xl animate-fade-in sm:left-auto sm:right-4"
        >
          <span className="text-2xl" aria-hidden="true">🎧</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-800">对方开启了&ldquo;一起听&rdquo;</p>
            <p className="truncate text-xs text-gray-500">{partyInvite.songTitle ? `正在听：${partyInvite.songTitle}` : '一起同步听歌吧'}</p>
          </div>
          <button
            type="button"
            onClick={() => { toggleListenTogether(); dismissPartyInvite() }}
            className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600"
          >
            加入
          </button>
          <button
            type="button"
            onClick={dismissPartyInvite}
            className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            aria-label="忽略邀请"
          >
            ✕
          </button>
        </div>
      )}

      {/* Flying reactions (flowers etc.) — visible on every page, not just while the panel is open,
          so a "🌹" the partner sends still shows up even if you're browsing away from the player. */}
      <div className="pointer-events-none fixed bottom-24 right-6 z-[65] h-0 w-0 sm:bottom-24">
        {reactions.map((reaction) => (
          <span
            key={reaction.id}
            className="reaction-particle absolute bottom-0 right-0 text-3xl"
            style={{ ['--drift' as string]: `${Math.round((Math.random() - 0.5) * 60)}px` }}
            aria-hidden="true"
          >
            {reaction.emoji}
          </span>
        ))}
      </div>
      <style jsx global>{`
        .reaction-particle {
          animation: reaction-float 2.4s ease-out forwards;
        }
        @keyframes reaction-float {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          15% { transform: translate(0, 0) scale(1.1); opacity: 1; }
          100% { transform: translate(var(--drift), -140px) scale(1); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .reaction-particle { animation: none; opacity: 0; }
        }
      `}</style>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-[7.75rem] flex h-12 w-12 items-center justify-center rounded-full text-xl text-white shadow-lg transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-xl sm:bottom-6 sm:right-[10.5rem] sm:h-14 sm:w-14 sm:text-2xl ${
          panelOpen ? 'z-[70]' : 'z-50'
        } bg-gradient-to-br from-rose-400 to-fuchsia-600`}
        aria-label={panelOpen ? '收起音乐播放器' : '打开音乐播放器'}
        data-global-utility="music"
        aria-expanded={panelOpen}
        aria-controls="global-music-panel"
        title={hasSong ? (isPlaying ? `正在播放：${currentSong?.title}` : '音乐播放器') : '音乐播放器'}
      >
        <span aria-hidden="true">{isPlaying ? '🎶' : '🎵'}</span>
        {isPlaying && !autoplayBlocked && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-emerald-400" aria-hidden="true" />}
        {autoplayBlocked && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-amber-400" aria-hidden="true" />}
      </button>

      {panelOpen && !onMusicPage && (
        <div
          className="fixed inset-0 z-[55] bg-slate-950/35 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Always mounted — visibility only, never unmount/remount (see note above). */}
      <section
        id="global-music-panel"
        role="dialog"
        aria-label="音乐播放器"
        aria-hidden={!panelOpen}
        className={`fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] z-[60] flex max-h-[calc(100dvh-10rem)] flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-2xl transition-[opacity,transform] duration-200 sm:inset-x-auto sm:bottom-24 sm:right-6 sm:max-h-[calc(100dvh-6rem)] sm:w-[360px] ${
          panelOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        {!currentSong && (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <span className="text-3xl" aria-hidden="true">🎵</span>
            <p className="text-sm text-gray-500">还没有播放任何歌曲</p>
            <Link
              href="/music-player"
              onClick={() => setIsOpen(false)}
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-pink-600"
            >
              去添加 / 选一首
            </Link>
          </div>
        )}
        {currentSong && (
          <>
            {autoplayBlocked && (
              <button
                type="button"
                onClick={resumeBlockedPlayback}
                className="flex items-center justify-center gap-2 border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100"
              >
                ⚠️ 浏览器拦下了自动播放 · 点击继续播放 ▶
              </button>
            )}
            <div className="flex items-center gap-2 border-b border-pink-50 px-3 py-2">
              <span className="text-lg">{currentSong.cover || '🎵'}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-800">{currentSong.title}</p>
                <p className="truncate text-xs text-gray-400">{currentSong.artist}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleLike(currentSong.id)}
                className={`shrink-0 rounded-full p-1.5 transition-colors ${currentSong.liked ? 'text-rose-500' : 'text-gray-300 hover:text-rose-400'}`}
                aria-label={currentSong.liked ? '取消喜欢' : '喜欢这首歌'}
                aria-pressed={Boolean(currentSong.liked)}
              >
                {currentSong.liked ? '❤️' : '🤍'}
              </button>
              <button
                type="button"
                onClick={() => togglePin(currentSong.id)}
                className={`shrink-0 rounded-full p-1.5 transition-colors ${currentSong.pinned ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}
                aria-label={currentSong.pinned ? '取消置顶' : '置顶这首歌'}
                aria-pressed={Boolean(currentSong.pinned)}
              >
                📌
              </button>
              {!onMusicPage && (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                  aria-label="收起播放器"
                >
                  ▾
                </button>
              )}
            </div>

            <div className="border-b border-pink-50 px-3 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={toggleListenTogether}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    listenTogether ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                  aria-pressed={listenTogether}
                  title="双方都要点开才会同步：谁开着谁的播放/暂停/切歌/进度会实时发给对方"
                >
                  <span aria-hidden="true">🎧</span>
                  一起听
                  {listenTogether && (
                    <span className={`h-1.5 w-1.5 rounded-full ${partnerOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} aria-hidden="true" />
                  )}
                </button>
                <div className="flex items-center gap-1">
                  {REACTION_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => sendReaction(emoji)}
                      className="rounded-full p-1 text-base transition-transform hover:scale-125"
                      aria-label={`发送 ${emoji} 反应`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              {listenTogether && (
                <p className="mt-1 text-[10px] text-gray-400">
                  {partnerOnline ? '对方也开着一起听，播放已同步 ✓' : '对方还没打开"一起听"——两边都开了才会同步'}
                </p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Playlist / lyrics are just visibility overlays — the media below stays mounted
                  so switching between them never interrupts playback (see note above). */}
              <div className={listOpen ? '' : 'hidden'}>
                <div className="divide-y divide-pink-50">
                  {songs.length === 0 && <p className="px-3 py-6 text-center text-xs text-gray-400">歌单是空的，去 <Link href="/music-player" onClick={() => setIsOpen(false)} className="text-primary underline">音乐播放器</Link> 添加吧</p>}
                  {songs.map((song) => (
                    <button
                      key={song.id}
                      type="button"
                      onClick={() => { selectSong(song.id); setListOpen(false) }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${song.id === currentSong.id ? 'bg-pink-50' : 'hover:bg-gray-50'}`}
                    >
                      <span className="text-base shrink-0">{song.id === currentSong.id ? (isPlaying ? '🎶' : '🎵') : (song.cover || '🎵')}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${song.id === currentSong.id ? 'font-bold text-primary' : 'text-gray-700'}`}>{song.title}</span>
                        <span className="block truncate text-xs text-gray-400">{song.artist}</span>
                      </span>
                      {song.pinned && <span className="shrink-0 text-xs" aria-hidden="true">📌</span>}
                      {song.liked && <span className="shrink-0 text-xs" aria-hidden="true">❤️</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className={lyricsOpen ? '' : 'hidden'}>
                <div className="min-h-[10rem] px-3 py-3 text-sm leading-relaxed text-gray-700">
                  {lyrics.loading && <p className="text-gray-400">歌词加载中…</p>}
                  {!lyrics.loading && lyrics.error && <p className="text-red-500">歌词服务暂时不可用</p>}
                  {!lyrics.loading && !lyrics.error && !lyrics.found && <p className="text-gray-400">没有找到这首歌的歌词</p>}
                  {!lyrics.loading && lyrics.found && lyrics.text && <pre className="whitespace-pre-wrap font-sans">{lyrics.text}</pre>}
                </div>
              </div>

              <div className={lyricsOpen || listOpen ? 'hidden' : ''}>
                {currentSong.source === 'youtube' && (() => {
                  const embedUrl = getYouTubeEmbedUrl(currentSong.url)
                  const jsApiParams = `&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`
                  return embedUrl ? (
                    <iframe
                      ref={ytIframeRef}
                      id={ytElementId}
                      key={currentSong.id}
                      className="aspect-video w-full"
                      src={`${embedUrl}${autoplayParam}${jsApiParams}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      title={`${currentSong.title} - YouTube 播放器`}
                    />
                  ) : (
                    <p className="p-3 text-xs text-red-500">无法解析 YouTube 链接</p>
                  )
                })()}

                {currentSong.source === 'spotify' && (() => {
                  const base = currentSong.url.includes('/embed/') ? currentSong.url : currentSong.url.replace('spotify.com/', 'spotify.com/embed/')
                  const embedUrl = `${base}${base.includes('?') ? '&' : '?'}${autoplayParam ? 'autoplay=1' : 'autoplay=0'}`
                  return (
                    <iframe
                      key={currentSong.id}
                      className="h-80 w-full"
                      src={embedUrl}
                      allow="autoplay; encrypted-media"
                      title="Spotify"
                    />
                  )
                })()}

                {currentSong.source === 'file' && (
                  <div className="px-3 py-3">
                    <audio
                      ref={audioRef}
                      src={currentSong.url}
                      onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
                      onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
                      onEnded={handleTrackEnded}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onWaiting={() => setIsBuffering(true)}
                      onStalled={() => setIsBuffering(true)}
                      onPlaying={() => setIsBuffering(false)}
                      onCanPlay={() => setIsBuffering(false)}
                      autoPlay={isPlaying}
                    />
                    {isBuffering && (
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] text-gray-400">
                        <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-gray-300 border-t-pink-500" aria-hidden="true" />
                        缓冲中…这段还没加载好，稍等一下
                      </p>
                    )}
                    <div
                      role="slider"
                      tabIndex={0}
                      aria-label="播放进度"
                      aria-valuemin={0}
                      aria-valuemax={Math.round(duration) || 0}
                      aria-valuenow={Math.round(currentTime)}
                      className="mb-1 h-1.5 w-full cursor-pointer rounded-full bg-gray-200"
                      onClick={(event) => {
                        const audio = audioRef.current
                        if (!audio || !duration) return
                        const rect = event.currentTarget.getBoundingClientRect()
                        const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
                        audio.currentTime = ratio * duration
                        reportSeek(audio.currentTime)
                      }}
                      onKeyDown={(event) => {
                        const audio = audioRef.current
                        if (!audio || !duration) return
                        if (event.key === 'ArrowRight') { audio.currentTime = Math.min(duration, audio.currentTime + 5); reportSeek(audio.currentTime) }
                        if (event.key === 'ArrowLeft') { audio.currentTime = Math.max(0, audio.currentTime - 5); reportSeek(audio.currentTime) }
                      }}
                    >
                      <div className="h-1.5 rounded-full bg-pink-500 transition-all" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
                      <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 border-t border-pink-50 px-3 py-2">
              <button
                onClick={cycleRepeatMode}
                className={`text-base transition-opacity ${repeatMode === 'off' ? 'opacity-40 hover:opacity-70' : 'opacity-100'}`}
                aria-label={`播放模式：${REPEAT_LABELS[repeatMode].label}，点击切换`}
                title={REPEAT_LABELS[repeatMode].label}
              >
                {REPEAT_LABELS[repeatMode].icon}
              </button>
              <button onClick={playPrev} className="text-lg text-gray-500 hover:text-primary" aria-label="上一首">⏮️</button>
              <button onClick={togglePlay} className="text-2xl hover:scale-105" aria-label={isPlaying ? '暂停' : '播放'}>{isPlaying ? '⏸️' : '▶️'}</button>
              <button onClick={playNext} className="text-lg text-gray-500 hover:text-primary" aria-label="下一首">⏭️</button>
              <button
                onClick={() => { setLyricsOpen((open) => !open); setListOpen(false) }}
                className={`text-base transition-opacity ${lyricsOpen ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                aria-label={lyricsOpen ? '关闭歌词' : '显示歌词'}
                aria-pressed={lyricsOpen}
                title="歌词"
              >
                📜
              </button>
              <button
                onClick={() => { setListOpen((open) => !open); setLyricsOpen(false) }}
                className={`text-base transition-opacity ${listOpen ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                aria-label={listOpen ? '关闭歌单' : `打开歌单（${songs.length} 首）`}
                aria-pressed={listOpen}
                title="歌单"
              >
                📋
              </button>
            </div>
          </>
        )}
      </section>
    </>
  )
}
