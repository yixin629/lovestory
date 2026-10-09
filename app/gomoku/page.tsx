'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { coupleChannel } from '@/lib/couple-interactions'
import { GomokuGameState, GomokuPlayerInfo, createEmptyBoard, Player } from './engine/GomokuLogic'
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton'
import PlayerAvatar from './components/PlayerAvatar'

interface GomokuRoomRow {
  id: string
  created_at: string
  status: string
  players: GomokuPlayerInfo[] | null
  game_mode: 'pvp' | 'pve'
  host_id: string
}

export default function GomokuLobbyPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const { user: currentUser, me, partner, coupleId, loading: authLoading } = useAuth()

  const [waitingRooms, setWaitingRooms] = useState<GomokuRoomRow[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!currentUser || !coupleId) return

    fetchRooms()

    const channel = supabase
      .channel(coupleChannel(coupleId, 'gomoku_lobby'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gomoku_games' },
        () => {
          fetchRooms()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser, coupleId, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('gomoku_games')
        .select(`
          id,
          created_at,
          status,
          players,
          game_mode,
          host_id
        `)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })

      if (error) throw error
      setWaitingRooms((data ?? []) as GomokuRoomRow[])
    } catch (error) {
      console.error('获取房间失败:', error)
      showToast('获取房间列表失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRoom = async (mode: 'pvp' | 'pve') => {
    if (!currentUser || !me) {
      showToast('请先登录', 'error')
      return
    }
    if (mode === 'pvp' && !partner) {
      showToast('等另一半加入后才能双人对战', 'warning')
      return
    }

    setIsCreating(true)
    try {
      const hostPlayer: GomokuPlayerInfo = {
         id: currentUser,
         name: me.name,
         avatar: me.avatar,
         color: 'black' as Player,
         isBot: false
      }

      const allPlayers: GomokuPlayerInfo[] = [hostPlayer]

      if (mode === 'pve') {
         allPlayers.push({
            id: 'bot-1',
            name: 'Gomoku Bot',
            avatar: '🤖',
            color: 'white' as Player,
            isBot: true
         })
      }

      const initialState: GomokuGameState = {
         board: createEmptyBoard(),
         currentPlayer: 'black',
         status: mode === 'pve' ? 'playing' : 'waiting',
         winner: null,
         lastMove: null,
         history: [],
         players: allPlayers,
         gameMode: mode,
         hostId: currentUser
      }

      const { data, error } = await supabase
        .from('gomoku_games')
        .insert([{
          game_state: initialState,
          status: initialState.status,
          host_id: currentUser,
          game_mode: mode,
          players: allPlayers
        }])
        .select()
        .single()

      if (error) throw error

      showToast(`已创建${mode === 'pve' ? '人机' : '对战'}房间`, 'success')
      router.push(`/gomoku/${data.id}`)
    } catch (error) {
      console.error('创建房间失败:', error)
      showToast('创建房间失败', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async (gameId: string, currentPlayers: GomokuPlayerInfo[]) => {
    if (!currentUser || !me) return
    setIsCreating(true)

    try {
      // Check if already in room
      const existingPlayer = currentPlayers.find(p => p.id === currentUser)
      if (existingPlayer) {
        router.push(`/gomoku/${gameId}`)
        return
      }

      if (currentPlayers.length >= 2) {
        showToast('房间已满', 'error')
        setIsCreating(false)
        return
      }

      const newPlayer: GomokuPlayerInfo = {
        id: currentUser,
        name: me.name,
        avatar: me.avatar,
        color: 'white' as Player,
        isBot: false
      }

      // Fetch the full game state to update properly
      const { data: gameData, error: fetchErr } = await supabase
         .from('gomoku_games')
         .select('game_state')
         .eq('id', gameId)
         .single()

      if (fetchErr) throw fetchErr

      const nextState = { ...gameData.game_state, status: 'playing' }
      nextState.players.push(newPlayer)

      const updatedPlayers = nextState.players

      const { error } = await supabase
        .from('gomoku_games')
        .update({
          game_state: nextState,
          status: 'playing',
          players: updatedPlayers
        })
        .eq('id', gameId)

      if (error) throw error

      showToast('成功加入房间', 'success')
      router.push(`/gomoku/${gameId}`)
    } catch (error) {
      console.error('加入房间失败:', error)
      showToast('加入房间失败', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  if (authLoading || isLoading) {
      return (
         <div className="min-h-screen p-4 md:p-8 flex flex-col justify-center max-w-4xl mx-auto">
            <LoadingSkeleton type="card" count={3} />
         </div>
      )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">⚫⚪ 五子棋大厅 ⚫⚪</h1>
          <p className="text-gray-600 mb-6">在线实时对战，一决高下</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <button
               onClick={() => handleCreateRoom('pve')}
               disabled={isCreating}
               className="btn-secondary px-8 py-4 text-lg disabled:opacity-50"
             >
               🤖 单人挑战 (打电脑)
             </button>
             <button
               onClick={() => handleCreateRoom('pvp')}
               disabled={isCreating || !partner}
               title={partner ? undefined : '等另一半加入后可用'}
               className="btn-primary px-8 py-4 text-lg disabled:opacity-50"
             >
               ⚔️ 创建双人对战
             </button>
          </div>
          {!partner && (
            <p className="text-sm text-gray-500 mt-4">
              双人对战需要另一半加入，
              <Link href="/pair" className="text-primary underline">去分享邀请码</Link>
            </p>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>🎮</span> 等待中的对战
          </h2>
          
          {waitingRooms.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <span className="text-4xl block mb-2">👻</span>
              暂无等待中的房间，自己创建一个吧！
            </div>
          ) : (
            <div className="grid gap-3">
              {waitingRooms.map((room) => {
                 const players = room.players || []
                 const host = Array.isArray(players) && players.length > 0 && typeof players[0] === 'object' ? players[0] : null
                 return (
                  <div
                    key={room.id}
                    className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white border rounded-xl hover:shadow-md transition-shadow gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
                        <PlayerAvatar avatar={host?.avatar} fallback="👤" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-lg">{host?.name || '未知玩家'}</div>
                        <div className="text-sm text-gray-500">
                           {room.game_mode === 'pvp' ? '双人在线对战' : '人机对战'} |
                           等待加入...
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleJoinRoom(room.id, players)}
                      disabled={isCreating}
                      className="w-full sm:w-auto px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
                    >
                      加入对局
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
