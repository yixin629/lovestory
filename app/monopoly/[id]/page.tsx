'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import BackButton from '@/app/components/ui/BackButton'
import ThreeDDice from '@/app/components/ui/ThreeDDice'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { coupleChannel } from '@/lib/couple-interactions'
import {
  BOARD,
  buyCurrentProperty,
  finishTurn,
  MAX_ROUNDS,
  playerNetWorth,
  rollAndMove,
  upgradeCurrentProperty,
} from '../engine/game'
import type { MonopolyRoom } from '../online-types'
import type { GameState } from '../types'

const cellPosition = (index: number) => {
  if (index <= 6) return { gridRow: 7, gridColumn: 7 - index }
  if (index <= 12) return { gridRow: 13 - index, gridColumn: 1 }
  if (index <= 18) return { gridRow: 1, gridColumn: index - 11 }
  return { gridRow: index - 18, gridColumn: 7 }
}

export default function OnlineMonopolyPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const { user, coupleId, loading: authLoading } = useAuth()
  const [room, setRoom] = useState<MonopolyRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [rolling, setRolling] = useState(false)

  const fetchRoom = useCallback(async () => {
    const { data, error } = await supabase.from('monopoly_rooms').select('*').eq('id', id).single<MonopolyRoom>()
    if (error || !data) {
      toast.error('房间不存在或数据库尚未配置')
      router.push('/monopoly')
      return
    }
    setRoom(data)
    setLoading(false)
  }, [id, router, toast])

  useEffect(() => {
    if (authLoading) return
    if (!user || !coupleId) return
    void fetchRoom()
    const channel = supabase
      .channel(coupleChannel(coupleId, `monopoly-room-${id}`))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'monopoly_rooms', filter: `id=eq.${id}` }, (payload) => setRoom(payload.new as MonopolyRoom))
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [authLoading, coupleId, fetchRoom, id, user])

  const saveState = async (nextGame: GameState) => {
    if (!room) return false
    setBusy(true)
    const nextStatus = nextGame.phase === 'finished' ? 'finished' : room.status
    const { data, error } = await supabase
      .from('monopoly_rooms')
      .update({ game_state: nextGame, status: nextStatus, version: room.version + 1, updated_at: new Date().toISOString() })
      .eq('id', room.id)
      .eq('version', room.version)
      .select('*')
      .single<MonopolyRoom>()
    setBusy(false)
    if (error || !data) {
      toast.error('对局已被另一端更新，正在同步最新进度')
      await fetchRoom()
      return false
    }
    setRoom(data)
    return true
  }

  if (loading || authLoading || !room || !user) {
    return <main className="flex min-h-screen items-center justify-center text-gray-600">正在连接在线房间…</main>
  }

  const seat = room.host_id === user ? 0 : room.guest_id === user ? 1 : null
  const game = room.game_state
  const current = game.players[game.currentPlayer]
  const currentCell = BOARD[current.position]
  const property = game.properties[current.position]
  const isMyTurn = room.status === 'playing' && seat === game.currentPlayer

  const roll = () => {
    if (!isMyTurn || busy || rolling || game.phase !== 'roll') return
    setRolling(true)
    const value = Math.floor(Math.random() * 6) + 1
    const chanceIndex = Math.floor(Math.random() * 6)
    window.setTimeout(() => {
      void saveState(rollAndMove(game, value, chanceIndex)).finally(() => setRolling(false))
    }, 1450)
  }

  const perform = (next: GameState) => { if (isMyTurn && !busy) void saveState(next) }

  return (
    <main className="min-h-screen px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <BackButton href="/monopoly" text="返回大富翁大厅" />
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="badge-green">● 在线房间</span>
            <h1 className="title-h1 title-gradient mt-2">甜蜜大富翁</h1>
          </div>
          <div className="rounded-xl border bg-white/80 px-5 py-3 text-center">
            <p className="text-xs text-gray-500">房间码</p>
            <p className="text-2xl font-black tracking-[0.25em] text-gray-900">{room.room_code}</p>
          </div>
        </header>

        {room.status === 'waiting' && (
          <div className="card mb-5 border-amber-200 bg-amber-50 text-center">
            <p className="text-3xl">⏳</p><h2 className="mt-2 text-xl font-bold">等待另一位玩家加入</h2>
            <p className="mt-1 text-gray-600">把房间码 <strong>{room.room_code}</strong> 发给对方即可。</p>
          </div>
        )}
        {seat === null && <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-center text-amber-900">你正在旁观此对局，不能执行操作。</div>}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="card overflow-hidden p-3 sm:p-5">
            <div className="mx-auto grid aspect-square w-full max-w-[760px] grid-cols-7 grid-rows-7 gap-1 rounded-[2rem] bg-gradient-to-br from-rose-100 via-amber-50 to-cyan-100 p-2 shadow-inner sm:gap-2 sm:p-3">
              {BOARD.map((cell, index) => {
                const owned = game.properties[cell.id]
                const tokens = game.players.filter((player) => player.position === index)
                return <div key={cell.id} style={cellPosition(index)} title={cell.name} className={`relative flex min-w-0 flex-col items-center justify-center rounded-lg border border-white/80 p-0.5 text-center shadow-sm sm:rounded-xl sm:p-1 ${cell.color}`}>
                  {owned && <span className={`absolute inset-x-1 top-0 h-1 rounded-full ${owned.ownerId === 0 ? 'bg-rose-500' : 'bg-blue-500'}`} />}
                  <span className="text-base sm:text-2xl">{cell.icon}</span><span className="hidden max-w-full truncate text-[10px] font-bold text-slate-700 sm:block md:text-xs">{cell.name}</span>
                  {cell.kind === 'property' && <span className="hidden text-[9px] text-slate-500 md:block">{owned ? `${owned.level}级` : `¥${cell.price}`}</span>}
                  {tokens.length > 0 && <span className="absolute -bottom-1 left-1/2 z-10 flex -translate-x-1/2 rounded-full bg-white/90 px-0.5 text-sm shadow sm:text-xl">{tokens.map((player) => <span key={player.id}>{player.token}</span>)}</span>}
                </div>
              })}
              <div className="col-start-2 col-end-7 row-start-2 row-end-7 flex flex-col items-center justify-center rounded-[1.5rem] border border-white/70 bg-white/70 p-3 text-center shadow-inner backdrop-blur-sm">
                <span className="badge-amber mb-2">第 {game.round} / {MAX_ROUNDS} 回合</span>
                <h2 className="text-lg font-black text-slate-800 sm:text-3xl">{isMyTurn ? '轮到你了' : `等待${current.name}`}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600 sm:text-sm" aria-live="polite">{game.message}</p>
                {game.phase === 'roll' && <ThreeDDice value={game.lastRoll} rolling={rolling} onRoll={roll} disabled={!isMyTurn || busy} />}
                {game.phase === 'decision' && isMyTurn && <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {!property && <button className="btn-primary px-4 py-2 text-sm" disabled={busy || current.cash < (currentCell.price ?? 0)} onClick={() => perform(buyCurrentProperty(game))}>买下 ¥{currentCell.price}</button>}
                  {property?.ownerId === current.id && property.level < 3 && <button className="btn-primary px-4 py-2 text-sm" disabled={busy || current.cash < Math.round((currentCell.price ?? 0) * 0.6)} onClick={() => perform(upgradeCurrentProperty(game))}>升级地产</button>}
                  <button className="btn-secondary px-4 py-2 text-sm" disabled={busy} onClick={() => perform({ ...game, phase: 'turn-end', message: `${current.name} 决定暂不操作` })}>暂不操作</button>
                </div>}
                {game.phase === 'turn-end' && isMyTurn && <button className="btn-primary mt-4 px-5 py-2 text-sm" disabled={busy} onClick={() => perform(finishTurn(game))}>结束回合</button>}
                {game.phase === 'finished' && <div className="mt-4 text-xl font-bold text-slate-800">🏆 {game.players[game.winnerId ?? 0].name} 获胜</div>}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="card p-4"><h2 className="mb-3 font-bold">在线玩家</h2>{game.players.map((player) => <div key={player.id} className={`mb-2 rounded-xl border p-3 ${game.currentPlayer === player.id ? 'border-primary bg-pink-50' : 'border-gray-200'}`}><div className="flex justify-between font-bold"><span>{player.token} {player.name}{seat === player.id ? '（你）' : ''}</span><span className="text-emerald-700">¥{player.cash}</span></div><div className="mt-1 text-xs text-gray-500">总资产 ¥{playerNetWorth(game, player.id)}</div></div>)}</div>
            <div className="card p-4"><h2 className="mb-3 font-bold">对局动态</h2><ol className="space-y-2 text-sm text-gray-600">{game.log.map((entry, index) => <li key={`${entry}-${index}`} className="border-l-2 border-primary/30 pl-3">{entry}</li>)}</ol></div>
          </aside>
        </div>
      </div>
    </main>
  )
}
