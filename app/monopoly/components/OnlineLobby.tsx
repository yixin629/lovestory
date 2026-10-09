'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { createGame } from '../engine/game'
import type { MonopolyRoom } from '../online-types'

const makeRoomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase()

export default function OnlineLobby() {
  const router = useRouter()
  const toast = useToast()
  const { user, me, partner, loading } = useAuth()
  const [roomCode, setRoomCode] = useState('')
  const [busy, setBusy] = useState(false)

  const requireUser = () => {
    if (!user || !me) {
      toast.error('请先登录，再创建或加入在线房间')
      return false
    }
    if (!partner) {
      toast.error('等另一半加入后才能玩在线模式')
      return false
    }
    return true
  }

  const createRoom = async () => {
    if (!requireUser()) return
    setBusy(true)
    const code = makeRoomCode()
    const name = me?.name ?? '我'
    const { data, error } = await supabase
      .from('monopoly_rooms')
      .insert({ room_code: code, host_id: user, host_name: name, game_state: createGame([name, '等待加入']) })
      .select('id')
      .single()
    setBusy(false)
    if (error || !data) {
      toast.error(error?.message.includes('monopoly_rooms') ? '请先执行大富翁数据库迁移' : '创建房间失败')
      return
    }
    router.push(`/monopoly/${data.id}`)
  }

  const joinRoom = async () => {
    if (!requireUser()) return
    const code = roomCode.trim().toUpperCase()
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      toast.error('请输入 6 位房间码')
      return
    }
    setBusy(true)
    const { data, error } = await supabase.from('monopoly_rooms').select('*').eq('room_code', code).single<MonopolyRoom>()
    if (error || !data) {
      setBusy(false)
      toast.error('没有找到这个房间')
      return
    }
    if (data.host_id !== user && data.guest_id && data.guest_id !== user) {
      setBusy(false)
      toast.error('房间已经满了')
      return
    }
    if (data.host_id !== user && !data.guest_id) {
      const guestName = me?.name ?? '我'
      const nextGame = { ...data.game_state, players: data.game_state.players.map((player, index) => index === 1 ? { ...player, name: guestName } : player), message: `${guestName} 已加入，${data.host_name}先手` }
      const { error: joinError } = await supabase.from('monopoly_rooms').update({ guest_id: user, guest_name: guestName, status: 'playing', game_state: nextGame, version: data.version + 1 }).eq('id', data.id).eq('version', data.version)
      if (joinError) {
        setBusy(false)
        toast.error('加入失败，请重试')
        return
      }
    }
    router.push(`/monopoly/${data.id}`)
  }

  return (
    <section className="card mb-6 border-primary/20 bg-gradient-to-r from-pink-50 to-blue-50 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="badge-blue mb-2">Realtime 在线模式</span>
          <h2 className="text-xl font-bold text-gray-900">和远方的 ta 玩一局</h2>
          <p className="mt-1 text-sm text-gray-600">创建房间后，把六位房间码发给对方。</p>
          {!partner && (
            <p className="mt-1 text-sm text-amber-700">
              等另一半加入后可用，<Link href="/pair" className="underline">去分享邀请码</Link>
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn-primary whitespace-nowrap" disabled={busy || loading || !partner} onClick={createRoom}>创建在线房间</button>
          <div className="flex gap-2">
            <input aria-label="六位房间码" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().slice(0, 6))} className="input-primary w-36 uppercase tracking-[0.2em]" placeholder="ABC123" />
            <button type="button" className="btn-secondary whitespace-nowrap" disabled={busy || loading || !partner} onClick={joinRoom}>加入房间</button>
          </div>
        </div>
      </div>
    </section>
  )
}
