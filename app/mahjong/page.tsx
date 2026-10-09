'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/app/components/ui/BackButton'
import PageHeader from '@/app/components/ui/PageHeader'
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { coupleChannel } from '@/lib/couple-interactions'
import type { CoupleMember } from '@/app/components/providers/AuthProvider'
import PlayerAvatar from './components/PlayerAvatar'
import { type GameMode, initializeGameState } from './engine/MahjongLogic'

interface LobbyPlayer { id: string; name: string; avatar: string; isBot: boolean }
interface LobbyGame { id: string; mode: GameMode; base_multiplier: number; players: LobbyPlayer[]; host_id: string }

const MODES: { id: GameMode; name: string; badge: string; description: string }[] = [
  { id: 'sichuan', name: '四川定缺快打', badge: '推荐', description: '自动定缺，不可吃牌，先胡即胜' },
  { id: 'standard', name: '经典麻将', badge: '入门', description: '可吃、碰、杠、胡，适合熟悉规则' },
]

function humanPlayer(member: CoupleMember): LobbyPlayer {
  return { id: member.id, name: member.name, avatar: member.avatar, isBot: false }
}

function botPlayer(index: number): LobbyPlayer {
  const bots = [{ name: '阿旺', avatar: '🐯' }, { name: '小满', avatar: '🐼' }, { name: '团子', avatar: '🦊' }]
  return { id: `bot_${index + 1}`, ...bots[index], isBot: true }
}

export default function MahjongLobbyPage() {
  const router = useRouter()
  const { user, me, partner, coupleId } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState<GameMode>('sichuan')
  const [multiplier, setMultiplier] = useState(1)
  const [botCount, setBotCount] = useState(3)
  const [balance, setBalance] = useState(1000)
  const [games, setGames] = useState<LobbyGame[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user) return
    const [balanceResult, gamesResult] = await Promise.all([
      supabase.from('user_balances').select('balance').eq('user_id', user).maybeSingle(),
      supabase.from('mahjong_games').select('id, mode, base_multiplier, players, host_id').eq('status', 'waiting').order('created_at', { ascending: false }).limit(20),
    ])
    if (balanceResult.data) setBalance(Number(balanceResult.data.balance))
    if (!gamesResult.error) setGames((gamesResult.data ?? []) as LobbyGame[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user || !coupleId) { setLoading(false); return }
    void fetchData()
    const channel = supabase.channel(coupleChannel(coupleId, 'mahjong-lobby-v2')).on('postgres_changes', { event: '*', schema: 'public', table: 'mahjong_games' }, () => void fetchData()).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [fetchData, user, coupleId])

  // 情侣空间里只有两位真人；对方没加入时只能和三个电脑牌友开局
  useEffect(() => {
    if (!partner) setBotCount(3)
  }, [partner])

  const createGame = async () => {
    if (!user || !me || creating) return
    if (botCount < 3 && !partner) { toast.warning('等另一半加入后才能留座等人'); return }
    setCreating(true)
    const id = crypto.randomUUID()
    const players: LobbyPlayer[] = [humanPlayer(me), ...Array.from({ length: botCount }, (_, index) => botPlayer(index))]
    while (players.length < 4) players.push({ id: `empty_${players.length}`, name: '等待加入', avatar: '＋', isBot: false })
    const ready = botCount === 3
    const gameState = ready ? initializeGameState(id, mode, multiplier, players, user) : {}
    const { error } = await supabase.from('mahjong_games').insert({ id, mode, base_multiplier: multiplier, host_id: user, status: ready ? 'playing' : 'waiting', players, game_state: gameState })
    if (error) { toast.error(`开局失败：${error.message}`); setCreating(false); return }
    router.push(`/mahjong/${id}`)
  }

  const joinGame = async (game: LobbyGame) => {
    if (!user || !me || joiningId) return
    if (game.players.some((player) => player.id === user)) { router.push(`/mahjong/${game.id}`); return }
    const slot = game.players.findIndex((player) => player.id.startsWith('empty_'))
    if (slot < 0) return toast.warning('这个房间已经满了')
    setJoiningId(game.id)
    const players = [...game.players]
    players[slot] = humanPlayer(me)
    const ready = players.every((player) => !player.id.startsWith('empty_'))
    const payload: { players: LobbyPlayer[]; status?: 'playing'; game_state?: ReturnType<typeof initializeGameState> } = { players }
    if (ready) { payload.status = 'playing'; payload.game_state = initializeGameState(game.id, game.mode, game.base_multiplier, players, game.host_id) }
    const { error } = await supabase.from('mahjong_games').update(payload).eq('id', game.id).eq('status', 'waiting')
    if (error) { toast.error(`加入失败：${error.message}`); setJoiningId(null); return }
    router.push(`/mahjong/${game.id}`)
  }

  if (!user) return <main className="min-h-screen px-4 pb-10 pt-20"><div className="mx-auto max-w-3xl"><BackButton href="/" text="返回首页" /><div className="card py-14 text-center"><div className="text-6xl">🀄</div><h1 className="mt-4 text-3xl font-black text-gray-800">先登录，再上桌</h1><Link href="/login" className="btn-primary mt-6 inline-block">去登录</Link></div></div></main>

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#fff1f2_48%,_#f5f3ff)] px-4 pb-12 pt-20 sm:px-6"><div className="mx-auto max-w-6xl">
    <BackButton href="/" text="返回首页" />
    <PageHeader title="欢乐麻将" emoji="🎴" subtitle="一键和三位牌友开局，或者留座等对方加入" />
    <section className="mb-6 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-amber-200 bg-white/90 p-4 shadow-sm"><p className="text-xs font-bold text-amber-700">我的欢乐豆</p><p className="mt-1 text-2xl font-black text-gray-900">🪙 {balance.toLocaleString()}</p></div>
      <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4 shadow-sm"><p className="text-xs font-bold text-emerald-700">最快开局</p><p className="mt-1 font-black text-gray-900">3 个电脑牌友 · 立即开始</p></div>
      <div className="rounded-2xl border border-violet-200 bg-white/90 p-4 shadow-sm"><p className="text-xs font-bold text-violet-700">双人玩法</p><p className="mt-1 font-black text-gray-900">2 个电脑牌友 · 给对方留一座</p></div>
    </section>

    <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
      <section className="rounded-3xl border border-orange-200 bg-white p-5 shadow-xl shadow-orange-100/60 sm:p-7">
        <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-orange-500">Create table</p><h2 className="mt-1 text-2xl font-black text-gray-900">开一桌</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">● 在线</span></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">{MODES.map((item) => <button type="button" key={item.id} onClick={() => setMode(item.id)} aria-pressed={mode === item.id} className={`rounded-2xl border p-4 text-left transition ${mode === item.id ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-100' : 'border-gray-200 hover:border-orange-200'}`}><span className="rounded-full bg-gray-900 px-2 py-1 text-[10px] font-bold text-white">{item.badge}</span><strong className="mt-3 block text-lg text-gray-900">{item.name}</strong><span className="mt-1 block text-sm leading-5 text-gray-500">{item.description}</span></button>)}</div>
        <div className="mt-6"><div className="mb-2 flex justify-between text-sm font-bold text-gray-700"><span>牌友配置</span><span>{botCount === 3 ? '立即开局' : botCount === 2 ? '等对方加入' : `还需 ${3 - botCount} 位玩家`}</span></div><div className="grid grid-cols-4 gap-2">{[0,1,2,3].map((count) => <button type="button" key={count} onClick={() => setBotCount(count)} disabled={count < 3 && !partner} aria-pressed={botCount === count} className={`rounded-xl border py-3 text-sm font-bold disabled:opacity-40 ${botCount === count ? 'border-violet-500 bg-violet-500 text-white' : 'border-gray-200 text-gray-600'}`}>{count} 电脑</button>)}</div>{!partner && <p className="mt-2 text-xs text-gray-500">另一半加入后才能留座一起打，<Link href="/pair" className="font-bold text-violet-600 underline">去分享邀请码</Link></p>}</div>
        <div className="mt-6"><p className="mb-2 text-sm font-bold text-gray-700">底分</p><div className="grid grid-cols-3 gap-2">{[1,5,10].map((value) => <button type="button" key={value} onClick={() => setMultiplier(value)} aria-pressed={multiplier === value} className={`rounded-xl border py-3 text-sm font-bold ${multiplier === value ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600'}`}>{value * 100} 豆</button>)}</div></div>
        <button type="button" onClick={() => void createGame()} disabled={creating} className="mt-7 w-full rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 py-4 text-lg font-black text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5 disabled:opacity-60">{creating ? '正在洗牌…' : botCount === 3 ? '🎴 立即开局' : '🏮 创建等候房间'}</button>
        <Link href="/mahjong/practice" className="mt-3 block w-full rounded-2xl border border-gray-200 py-3 text-center text-sm font-bold text-gray-600 transition hover:border-violet-300 hover:bg-violet-50">无需数据库 · 先练习一局</Link>
      </section>

      <section className="rounded-3xl border border-violet-200 bg-[#17132b] p-5 text-white shadow-xl sm:p-7"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-violet-300">Lobby</p><h2 className="mt-1 text-2xl font-black">等候中的牌桌</h2></div><button type="button" onClick={() => void fetchData()} className="rounded-full border border-white/15 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10">刷新</button></div>
        <div className="mt-5 min-h-72 space-y-3">{loading ? <LoadingSkeleton type="card" count={3} /> : games.length === 0 ? <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-white/15 text-center text-white/50"><div><div className="text-5xl">🏮</div><p className="mt-3">目前没有等候房间</p><p className="mt-1 text-xs">选择 3 个电脑牌友可以立即开始</p></div></div> : games.map((game) => { const humans=game.players.filter((player) => !player.isBot && !player.id.startsWith('empty_')).length; const bots=game.players.filter((player) => player.isBot).length; const mine=game.players.some((player) => player.id === user); const full=humans+bots>=4; return <article key={game.id} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-orange-400/15 px-2 py-1 text-[11px] font-bold text-orange-200">{game.mode === 'sichuan' ? '四川定缺' : '经典麻将'}</span><p className="mt-3 text-sm text-white/70">{humans} 位玩家 · {bots} 个电脑 · {game.base_multiplier * 100} 豆</p><div className="mt-2 flex -space-x-1">{game.players.filter((player) => !player.id.startsWith('empty_')).map((player) => <span key={player.id} title={player.name} className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#17132b] bg-white/10"><PlayerAvatar avatar={player.avatar} fallback="😊" /></span>)}</div></div>{mine ? <Link href={`/mahjong/${game.id}`} className="shrink-0 rounded-xl bg-blue-500 px-4 py-2 text-sm font-bold text-white">回到牌桌</Link> : <button type="button" onClick={() => void joinGame(game)} disabled={full || joiningId === game.id} className="shrink-0 rounded-xl bg-pink-500 px-4 py-2 text-sm font-bold text-white disabled:bg-white/10 disabled:text-white/40">{joiningId === game.id ? '加入中…' : full ? '已满' : '加入'}</button>}</div></article> })}</div>
      </section>
    </div>
  </div></main>
}
