'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { coupleChannel } from '@/lib/couple-interactions'
import { useToast } from '@/app/components/feedback/ToastProvider'
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton'
import {
  GameState, canHu, applySelfHu, initializeGameState,
  applyDiscard, applyBotTurn, applyAction,
  ActionType,
} from '../engine/MahjongLogic'
import PlayerHand from '../components/PlayerHand'
import TileComponent from '../components/Tile'
import GameEndModal from '../components/GameEndModal'
import PlayerAvatar from '../components/PlayerAvatar'

export default function MahjongGameRoom() {
  const { id } = useParams()
  const router = useRouter()
  const { user: currentUser, me, coupleId } = useAuth()
  const { showToast } = useToast()

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const isPractice = id === 'practice'

  const persistGame = async (next: GameState) => {
    setGameState(next)
    if (isPractice) return true
    setIsSaving(true)
    const { error } = await supabase.from('mahjong_games').update({ game_state: next, status: next.status }).eq('id', id)
    setIsSaving(false)
    if (error) {
      showToast('牌局同步失败，请重试', 'error')
      await fetchGame(false)
      return false
    }
    return true
  }

  // ─── Data Fetching ────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !id) return
    if (isPractice) {
      const practicePlayers = [
        { id: currentUser, name: me?.name ?? '我', avatar: me?.avatar ?? '😊', isBot: false },
        { id: 'bot_practice_1', name: '阿旺', avatar: '🐯', isBot: true },
        { id: 'bot_practice_2', name: '小满', avatar: '🐼', isBot: true },
        { id: 'bot_practice_3', name: '团子', avatar: '🦊', isBot: true },
      ]
      setGameState(initializeGameState('practice', 'sichuan', 1, practicePlayers, currentUser))
      setIsLoading(false)
      return
    }
    if (!coupleId) return
    fetchGame(true)

    const channel = supabase
      .channel(coupleChannel(coupleId, `mahjong_game_${id}`))
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mahjong_games', filter: `id=eq.${id}` },
        (payload) => {
          const gs = payload.new.game_state
          if (gs && gs.players && gs.deck) setGameState(gs as GameState)
        },
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') console.debug('[mahjong] realtime status:', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [currentUser, coupleId, id, isPractice]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchGame = async (showLoading = false) => {
    try {
      const { data, error } = await supabase
        .from('mahjong_games').select('*').eq('id', id).single()
      if (error) throw error
      if (data?.game_state?.players && data.game_state.deck) {
        setGameState(prev => {
          const next = data.game_state as GameState
          // Avoid overwriting local optimistic state if ours is more recent
          if (prev && prev.deck.length < next.deck.length) return prev
          return next
        })
      } else if (showLoading) {
        setGameState(null)
      }
    } catch (err) {
      if (showLoading) {
        console.error(err)
        showToast('获取对局数据失败', 'error')
        router.push('/mahjong')
      }
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  // ─── Polling fallback (for when Realtime isn't configured) ────
  useEffect(() => {
    if (!gameState || !currentUser) return
    if (gameState.status !== 'playing') return

    // Non-host players (or when it's not my turn) - poll every 2s as backup
    const selfIdx = gameState.players.findIndex(p => p.id === currentUser)
    const isMyTurn = selfIdx === gameState.currentTurn
    const isHost = gameState.host_id === currentUser
    const hasMyPending = gameState.pendingActions?.[currentUser]

    // Poll only when we're waiting for server updates (not driving the game locally)
    if (isMyTurn && !hasMyPending) return
    if (isHost && gameState.players.every(p => !p.isBot || p.id !== gameState.players[gameState.currentTurn]?.id)) {
      // Host handles bots locally, no polling needed
    }

    const interval = setInterval(() => { fetchGame(false) }, 2000)
    return () => clearInterval(interval)
  }, [gameState?.currentTurn, gameState?.status, currentUser]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (gameState || !currentUser || !id || isPractice) return
    const interval = window.setInterval(() => { void fetchGame(false) }, 1500)
    return () => window.clearInterval(interval)
  }, [gameState, currentUser, id, isPractice]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Player Position Mapping ──────────────────────────────
  const getRenderPositions = () => {
    if (!gameState) return { bottom: null, right: null, top: null, left: null }
    const selfIdx = gameState.players.findIndex(p => p.id === currentUser)
    const idx = selfIdx === -1 ? 0 : selfIdx
    return {
      bottom: gameState.players[idx],
      right:  gameState.players[(idx + 1) % 4],
      top:    gameState.players[(idx + 2) % 4],
      left:   gameState.players[(idx + 3) % 4],
    }
  }

  // ─── Bot Automation (Host Only) ───────────────────────────
  useEffect(() => {
    if (!gameState || !currentUser) return
    if (gameState.host_id !== currentUser) return

    // 1) Bot pending actions
    if (gameState.pendingActions && Object.keys(gameState.pendingActions).length > 0) {
      const hasHumanPending = Object.keys(gameState.pendingActions).some(pId => {
        const p = gameState.players.find(x => x.id === pId)
        return p && !p.isBot
      })
      if (hasHumanPending) return

      const priorities: ActionType[] = ['hu', 'kong', 'pong', 'chow']
      const botResponses = Object.entries(gameState.pendingActions).flatMap(([playerId, actions]) => {
        const player = gameState.players.find(candidate => candidate.id === playerId)
        return player?.isBot ? actions.map(action => ({ playerId, action })) : []
      })
      const response = botResponses.sort((a, b) => priorities.indexOf(a.action.type) - priorities.indexOf(b.action.type))[0]
      if (response) {
        const timer = setTimeout(() => { void persistGame(applyAction(gameState, response.playerId, response.action.type)) }, 650)
        return () => clearTimeout(timer)
      }
      return
    }

    // 2) Normal bot turn
    if (gameState.status !== 'playing') return
    const cp = gameState.players[gameState.currentTurn]
    if (cp?.isBot) {
      if (gameState.pendingActions && Object.keys(gameState.pendingActions).length > 0) return
      const timer = setTimeout(async () => {
        try {
          const next = applyBotTurn(gameState, cp.id)
          await persistGame(next)
        } catch (err) { console.error('Bot turn error:', err) }
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [gameState, currentUser]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Player Actions ───────────────────────────────────────
  const handleSelfDiscard = async () => {
    if (selectedTileIndex === null || !gameState || !currentUser) return
    const selfIdx = gameState.players.findIndex(p => p.id === currentUser)
    if (gameState.currentTurn !== selfIdx) {
      showToast('还没到你的回合', 'warning')
      return
    }
    const player = gameState.players[selfIdx]
    const selectedTile = player.hand[selectedTileIndex]
    if (gameState.mode === 'sichuan' && player.voidSuit && player.hand.some(tile => tile.suit === player.voidSuit) && selectedTile.suit !== player.voidSuit) {
      showToast(`定缺牌还没打完，请先打${player.voidSuit === 'characters' ? '万' : player.voidSuit === 'bamboo' ? '条' : '筒'}`, 'warning')
      return
    }
    const next = applyDiscard(gameState, currentUser, selectedTileIndex)
    setSelectedTileIndex(null)
    await persistGame(next)
  }

  const handleAction = async (actionType: ActionType) => {
    if (!gameState || !currentUser) return
    const next = applyAction(gameState, currentUser, actionType)
    await persistGame(next)
  }

  const handleSelfHu = async () => {
    if (!gameState || !currentUser) return
    const next = applySelfHu(gameState, currentUser)
    if (next === gameState) return showToast('现在还不能胡', 'warning')
    await persistGame(next)
  }

  // ─── Loading / Waiting States ─────────────────────────────
  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#0a1f14] flex items-center justify-center">
        <LoadingSkeleton type="card" count={1} />
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-[#0a1f14] flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">🀄</div>
        <h1 className="text-xl font-bold text-amber-300">等待玩家加入...</h1>
        <button
          onClick={() => router.push('/mahjong')}
          className="px-6 py-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
        >
          退出房间
        </button>
      </div>
    )
  }

  // ─── Derived State ────────────────────────────────────────
  const { bottom, right, top, left } = getRenderPositions()
  const isMyTurn = bottom
    ? gameState.currentTurn === gameState.players.findIndex(p => p.id === bottom.id)
    : false
  const hasPending = gameState.pendingActions && Object.keys(gameState.pendingActions).length > 0
  const myPending = gameState.pendingActions?.[currentUser] ?? null
  const canSelfHu = Boolean(bottom && isMyTurn && !hasPending && canHu(bottom.hand, gameState.mode, bottom.voidSuit))

  const actionLabels: Record<string, string> = { hu: '胡', kong: '杠', pong: '碰', chow: '吃' }

  // ─── Render ───────────────────────────────────────────────
  return (
    <main
      className="relative flex min-h-dvh select-none flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]"
      style={{
        background: 'radial-gradient(ellipse at center, #1a4a2e 0%, #0f2d1a 50%, #081a0f 100%)',
      }}
    >
      {/* ── Table felt texture overlay ── */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'1\' cy=\'1\' r=\'0.6\' fill=\'%23fff\'/%3E%3C/svg%3E")',
        backgroundSize: '6px 6px',
      }} />

      {/* ── Top Bar ── */}
      <div className="relative z-30 flex items-center justify-between gap-2 px-3 py-2">
        <button
          onClick={() => router.push('/mahjong')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/30 text-white/70 text-sm
            hover:bg-black/50 transition-colors border border-white/10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          离开
        </button>

        {/* Center info */}
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-amber-700/30 bg-black/40 px-2.5 py-1.5 text-center sm:px-4">
            <div className="text-amber-400/70 text-[10px] tracking-wider uppercase">
              {gameState.mode === 'sichuan' ? '四川定缺' : '经典模式'}
            </div>
            <div className="text-amber-300 text-sm font-bold">{gameState.baseMultiplier * 100} 豆/番</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-center sm:px-4">
            <div className="text-white/40 text-[10px]">剩余</div>
            <div className="text-white font-bold text-lg leading-none">{gameState.deck.length}</div>
          </div>
        </div>

        <div className="w-10 text-right text-[10px] text-white/45 sm:w-[60px]">{isPractice ? '本地练习' : isSaving ? '同步中' : '已同步'}</div>
      </div>

      {/* ── Game Table ── */}
      <div className="relative mx-auto w-full max-w-5xl flex-1">
        {/* Center discard area - all players' discards */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="h-[210px] w-[250px] rounded-xl md:h-[300px] md:w-[360px]
            border border-amber-700/20 bg-black/15 relative overflow-hidden">

            {/* Top player discards (grow downward) */}
            {top && top.discards.length > 0 && (
              <div className="absolute top-1 left-1/2 -translate-x-1/2">
                <div className="flex flex-wrap justify-center gap-[1px] max-w-[160px] md:max-w-[220px]">
                  {top.discards.map((t, i) => (
                    <TileComponent key={`dt-${i}`} tile={t} size="xs" />
                  ))}
                </div>
              </div>
            )}

            {/* Left player discards (grow rightward) */}
            {left && left.discards.length > 0 && (
              <div className="absolute left-1 top-1/2 -translate-y-1/2">
                <div className="flex flex-wrap gap-[1px] max-w-[60px] md:max-w-[80px]">
                  {left.discards.map((t, i) => (
                    <TileComponent key={`dl-${i}`} tile={t} size="xs" />
                  ))}
                </div>
              </div>
            )}

            {/* Right player discards (grow leftward) */}
            {right && right.discards.length > 0 && (
              <div className="absolute right-1 top-1/2 -translate-y-1/2">
                <div className="flex flex-wrap justify-end gap-[1px] max-w-[60px] md:max-w-[80px]">
                  {right.discards.map((t, i) => (
                    <TileComponent key={`dr-${i}`} tile={t} size="xs" />
                  ))}
                </div>
              </div>
            )}

            {/* Bottom (self) discards (grow upward) */}
            {bottom && bottom.discards.length > 0 && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                <div className="flex flex-wrap justify-center gap-[1px] max-w-[160px] md:max-w-[220px]">
                  {bottom.discards.map((t, i) => (
                    <TileComponent key={`db-${i}`} tile={t} size="xs" />
                  ))}
                </div>
              </div>
            )}

            {/* Last discard highlight in true center */}
            {gameState.lastAction?.tile && gameState.lastAction.type === 'discard' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                flex flex-col items-center gap-1 bg-black/50 rounded-lg px-3 py-2 backdrop-blur-sm">
                <span className="text-white/60 text-[10px]">
                  {gameState.players.find(p => p.id === gameState.lastAction!.playerId)?.name}
                </span>
                <TileComponent tile={gameState.lastAction.tile} size="sm" />
              </div>
            )}
          </div>
        </div>

        {/* ── Top Player ── */}
        {top && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
            <PlayerHand
              player={top}
              position="top"
              isCurrentTurn={gameState.currentTurn === gameState.players.findIndex(p => p.id === top.id)}
            />
          </div>
        )}

        {/* ── Left Player ── */}
        {left && (
          <div className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 md:block">
            <PlayerHand
              player={left}
              position="left"
              isCurrentTurn={gameState.currentTurn === gameState.players.findIndex(p => p.id === left.id)}
            />
          </div>
        )}

        {/* ── Right Player ── */}
        {right && (
          <div className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 md:block">
            <PlayerHand
              player={right}
              position="right"
              isCurrentTurn={gameState.currentTurn === gameState.players.findIndex(p => p.id === right.id)}
            />
          </div>
        )}

        <div className="absolute inset-x-2 top-24 z-10 flex justify-between md:hidden">
          {[left, right].map((player) => player && <div key={player.id} className="rounded-xl border border-white/10 bg-black/45 px-2 py-1.5 text-center text-white/80"><span className="text-lg"><PlayerAvatar avatar={player.avatar} fallback="😊" /></span><p className="max-w-16 truncate text-[10px] font-bold">{player.name} · {player.hand.length}张</p></div>)}
        </div>

        {/* ── Action Buttons (center overlay) ── */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-3 pointer-events-none">
          {/* My turn: Discard button */}
          {isMyTurn && !hasPending && <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-black/55 p-2 shadow-xl backdrop-blur"><button onClick={handleSelfDiscard} disabled={selectedTileIndex === null || isSaving} className="rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-7 py-2.5 text-lg font-black text-black shadow-lg disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400">出牌</button>{canSelfHu && <button type="button" onClick={() => void handleSelfHu()} className="rounded-xl bg-gradient-to-b from-red-500 to-red-700 px-5 py-2.5 text-lg font-black text-white">胡</button>}</div>}

          {/* Interruption buttons */}
          {myPending && myPending.length > 0 && (
            <div className="pointer-events-auto flex gap-3 p-3 bg-black/70 rounded-2xl backdrop-blur-md
              border border-amber-600/30 shadow-2xl animate-pulse">
              {myPending.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAction(action.type)}
                  className={`
                    px-6 py-3 text-xl font-black rounded-xl shadow-lg
                    active:scale-90 transition-all hover:scale-105
                    ${action.type === 'hu'
                      ? 'bg-gradient-to-b from-red-500 to-red-700 text-white shadow-red-600/40'
                      : action.type === 'kong'
                        ? 'bg-gradient-to-b from-yellow-400 to-amber-600 text-black shadow-amber-600/40'
                        : 'bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-blue-600/40'}
                  `}
                >
                  {actionLabels[action.type] || action.type}
                </button>
              ))}
              <button
                onClick={() => handleAction('pass')}
                className="px-6 py-3 text-xl font-black bg-gradient-to-b from-gray-500 to-gray-700
                  text-white rounded-xl shadow-lg active:scale-90 transition-all hover:scale-105"
              >
                过
              </button>
            </div>
          )}
        </div>

        {/* ── Bottom Player (Self) ── */}
        {bottom && (
          <div className="absolute bottom-1 left-1/2 z-10 w-full -translate-x-1/2 px-1 sm:bottom-2 sm:px-2">
            <PlayerHand
              player={bottom}
              position="bottom"
              isCurrentTurn={isMyTurn}
              selectedTileIndex={selectedTileIndex}
              onTileClick={(tile, idx) => {
                if (isMyTurn) setSelectedTileIndex(prev => prev === idx ? null : idx)
              }}
            />
          </div>
        )}
      </div>

      {/* ── Game End Modal ── */}
      <GameEndModal
        gameState={gameState}
        currentUser={currentUser}
        onReturnToLobby={() => router.push('/mahjong')}
      />
    </main>
  )
}
