'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { coupleChannel } from '@/lib/couple-interactions'
import PlayerAvatar from '../components/PlayerAvatar'
import { GomokuGameState, BOARD_SIZE, checkWinner, getBotMove, createEmptyBoard } from '../engine/GomokuLogic'

export default function GomokuGameRoom() {
  const { id } = useParams()
  const router = useRouter()
  const { user: currentUser, coupleId, loading: authLoading } = useAuth()
  const { showToast } = useToast()

  const [gameState, setGameState] = useState<GomokuGameState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!currentUser || !coupleId || !id) return
    fetchGame(true)

    const channel = supabase
      .channel(coupleChannel(coupleId, `gomoku_game_${id}`))
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'gomoku_games', filter: `id=eq.${id}` },
        (payload) => {
          const gs = payload.new.game_state
          if (gs && gs.players && gs.board) setGameState(gs as GomokuGameState)
        },
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') console.debug('[gomoku] realtime status:', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [currentUser, coupleId, id, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchGame = async (showLoading = false) => {
    try {
      const { data, error } = await supabase
        .from('gomoku_games').select('*').eq('id', id).single()
      if (error) throw error
      if (data?.game_state?.players && data.game_state.board) {
        setGameState(prev => {
          const next = data.game_state as GomokuGameState
          // Skip update if local state is more advanced (avoid overwriting optimistic moves)
          if (prev && prev.history.length > next.history.length) return prev
          return next
        })
      } else if (showLoading) {
        setGameState(null)
      }
    } catch (err) {
      if (showLoading) {
        console.error(err)
        showToast('获取对局数据失败', 'error')
        router.push('/gomoku')
      }
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  // ── Polling fallback for PvP (in case Realtime isn't configured) ──
  useEffect(() => {
    if (!gameState || !currentUser) return
    if (gameState.gameMode !== 'pvp') return
    if (gameState.status !== 'playing' && gameState.status !== 'waiting') return

    // Only poll when it's the opponent's turn (not my turn)
    const myInfo = gameState.players.find(p => p.id === currentUser)
    const isMyTurn = myInfo && gameState.currentPlayer === myInfo.color
    if (isMyTurn && gameState.status === 'playing') return

    const interval = setInterval(() => { fetchGame(false) }, 2000)
    return () => clearInterval(interval)
  }, [gameState?.currentPlayer, gameState?.status, gameState?.gameMode, currentUser]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Game Mechanics ──

  const handleCellClick = async (row: number, col: number) => {
    if (!gameState || !currentUser || gameState.status !== 'playing') return
    const myInfo = gameState.players.find(p => p.id === currentUser)
    if (!myInfo) { showToast('你正在观战中', 'info'); return }
    if (gameState.currentPlayer !== myInfo.color) { showToast('还没到你的回合', 'warning'); return }
    if (gameState.board[row][col] || gameState.winner) return
    await playMove(row, col, myInfo.color)
  }

  const playMove = async (row: number, col: number, playerColor: 'black' | 'white') => {
    if (!gameState) return
    const newBoard = gameState.board.map(r => [...r])
    newBoard[row][col] = playerColor

    const newHistory = [
      ...gameState.history,
      { board: newBoard.map(r => [...r]), player: playerColor, move: [row, col] as [number, number] },
    ]

    const isWin = checkWinner(newBoard, row, col, playerColor)
    const isDraw = !isWin && newHistory.length >= BOARD_SIZE * BOARD_SIZE
    const nextPlayer = playerColor === 'black' ? 'white' : 'black'

    const nextState: GomokuGameState = {
      ...gameState,
      board: newBoard,
      lastMove: [row, col],
      history: newHistory,
      currentPlayer: isWin ? playerColor : nextPlayer,
      winner: isWin ? playerColor : null,
      status: isWin || isDraw ? 'finished' : 'playing',
    }

    setGameState(nextState)

    try {
      await supabase
        .from('gomoku_games')
        .update({ game_state: nextState, status: nextState.status })
        .eq('id', id)
      if (isWin) {
        showToast(`${playerColor === 'black' ? '⚫ 黑子' : '⚪ 白子'} 获胜!`, 'success')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // ── Bot Automation ──
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing' || !currentUser) return
    if (gameState.hostId !== currentUser) return
    if (gameState.gameMode !== 'pve') return

    const currentPlayerConfig = gameState.players.find(p => p.color === gameState.currentPlayer)
    if (currentPlayerConfig?.isBot) {
      const timer = setTimeout(() => {
        const move = getBotMove(gameState.board, currentPlayerConfig.color)
        if (move) playMove(move[0], move[1], currentPlayerConfig.color)
      }, 700)
      return () => clearTimeout(timer)
    }
  }, [gameState?.currentPlayer, gameState?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Restart Game ──
  const handleRestart = async () => {
    if (!gameState || !currentUser) return
    const next: GomokuGameState = {
      ...gameState,
      board: createEmptyBoard(),
      currentPlayer: 'black',
      status: 'playing',
      winner: null,
      lastMove: null,
      history: [],
    }
    setGameState(next)
    try {
      await supabase.from('gomoku_games').update({ game_state: next, status: 'playing' }).eq('id', id)
    } catch (err) {
      console.error(err)
    }
  }

  // ── Undo Last Move ──
  // Apply undo locally + push to DB (used after consent / for PvE)
  const applyUndo = async (undoCount: number) => {
    if (!gameState || gameState.history.length === 0) return
    const n = Math.min(undoCount, gameState.history.length)
    const newHistory = gameState.history.slice(0, -n)
    const prevBoard = newHistory.length > 0
      ? newHistory[newHistory.length - 1].board.map(r => [...r])
      : createEmptyBoard()
    const prevMove = newHistory.length > 0 ? newHistory[newHistory.length - 1].move : null

    let prevPlayer: 'black' | 'white' = 'black'
    if (newHistory.length > 0) {
      prevPlayer = newHistory[newHistory.length - 1].player === 'black' ? 'white' : 'black'
    }

    const next: GomokuGameState = {
      ...gameState,
      board: prevBoard,
      history: newHistory,
      lastMove: prevMove,
      currentPlayer: prevPlayer,
      winner: null,
      status: 'playing',
      undoRequest: null,
    }
    setGameState(next)
    try {
      await supabase.from('gomoku_games').update({ game_state: next, status: 'playing' }).eq('id', id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleUndo = async () => {
    if (!gameState || gameState.history.length === 0 || !currentUser) return

    // PvE: undo 2 moves (player + bot) immediately
    if (gameState.gameMode === 'pve') {
      await applyUndo(2)
      return
    }

    // PvP: send request, require opponent approval
    if (gameState.undoRequest) {
      showToast('已有悔棋请求在进行中', 'warning')
      return
    }
    const next: GomokuGameState = {
      ...gameState,
      undoRequest: { requesterId: currentUser, requestedAt: Date.now() },
    }
    setGameState(next)
    try {
      await supabase.from('gomoku_games').update({ game_state: next }).eq('id', id)
      showToast('已发送悔棋请求，等待对方同意...', 'info')
    } catch (err) {
      console.error(err)
      showToast('发送请求失败', 'error')
    }
  }

  const approveUndo = async () => {
    if (!gameState || !gameState.undoRequest) return
    // Undo the single move that the requester made
    await applyUndo(1)
    showToast('已同意悔棋', 'success')
  }

  const rejectUndo = async () => {
    if (!gameState || !gameState.undoRequest) return
    const next: GomokuGameState = { ...gameState, undoRequest: null }
    setGameState(next)
    try {
      await supabase.from('gomoku_games').update({ game_state: next }).eq('id', id)
      showToast('已拒绝悔棋请求', 'info')
    } catch (err) {
      console.error(err)
    }
  }

  const cancelUndoRequest = async () => {
    if (!gameState || !gameState.undoRequest) return
    const next: GomokuGameState = { ...gameState, undoRequest: null }
    setGameState(next)
    try {
      await supabase.from('gomoku_games').update({ game_state: next }).eq('id', id)
    } catch (err) { console.error(err) }
  }

  // ── Loading States ──
  if (authLoading || isLoading || !currentUser) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <LoadingSkeleton type="card" count={1} />
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">房间不存在或已解散</h1>
        <BackButton href="/gomoku" text="返回大厅" />
      </div>
    )
  }

  // ── Derived ──
  const { board, winner, currentPlayer, history, lastMove, players, status } = gameState
  const moveCount = history.length
  const blackPlayer = players.find(p => p.color === 'black')
  const whitePlayer = players.find(p => p.color === 'white')

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/gomoku" text="离开房间" />

        <div className="card text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">⚫⚪ 五子棋对战 ⚫⚪</h1>

          {/* Player Info Panel */}
          <div className="flex justify-center items-center gap-8 mb-6 mt-4">
            <div className={`flex flex-col items-center p-3 rounded-lg transition-all ${
              currentPlayer === 'black' && status === 'playing' ? 'bg-yellow-100 ring-2 ring-yellow-400 scale-105' : 'bg-gray-50'
            }`}>
              <div className="text-3xl mb-1"><PlayerAvatar avatar={blackPlayer?.avatar} fallback="👤" /></div>
              <div className="font-bold text-sm max-w-[100px] truncate">{blackPlayer?.name || '等待加入...'}</div>
              <div className="text-xs text-gray-500 mt-1">⚫ 黑子 (先手)</div>
            </div>

            <div className="text-2xl font-bold text-gray-400">VS</div>

            <div className={`flex flex-col items-center p-3 rounded-lg transition-all ${
              currentPlayer === 'white' && status === 'playing' ? 'bg-yellow-100 ring-2 ring-yellow-400 scale-105' : 'bg-gray-50'
            }`}>
              <div className="text-3xl mb-1"><PlayerAvatar avatar={whitePlayer?.avatar} fallback="👻" /></div>
              <div className="font-bold text-sm max-w-[100px] truncate">{whitePlayer?.name || '等待加入...'}</div>
              <div className="text-xs text-gray-500 mt-1">⚪ 白子 (后手)</div>
            </div>
          </div>

          {/* Game Status */}
          <div className="mb-4 h-12 flex items-center justify-center">
            {winner ? (
              <div className="text-2xl md:text-3xl font-bold text-green-600 animate-bounce">
                {winner === 'black' ? `${blackPlayer?.name} (黑子)` : `${whitePlayer?.name} (白子)`} 获胜!
              </div>
            ) : status === 'waiting' ? (
              <div className="text-xl md:text-2xl text-orange-500 animate-pulse">等待对手加入...</div>
            ) : (
              <div className="text-xl md:text-2xl">
                当前回合: {currentPlayer === 'black' ? '⚫ 黑子' : '⚪ 白子'}
                <span className="text-sm text-gray-500 ml-2">(第 {moveCount + 1} 步)</span>
              </div>
            )}
          </div>

          {/* Game Board */}
          <div className="inline-block bg-[#E3A869] p-2 md:p-6 rounded-lg shadow-2xl mb-4 relative ring-8 ring-[#8B5A2B]">
            {status === 'waiting' && (
              <div className="absolute inset-0 bg-black/30 z-20 flex items-center justify-center rounded-lg backdrop-blur-sm">
                <div className="bg-white/90 px-6 py-3 rounded-xl shadow-lg font-bold text-lg text-black">
                  等待对手加入...
                </div>
              </div>
            )}

            <div
              className="grid gap-0 relative"
              style={{
                gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
                width: 'max-content',
              }}
            >
              {board.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const isTop = rowIndex === 0
                  const isBottom = rowIndex === BOARD_SIZE - 1
                  const isLeft = colIndex === 0
                  const isRight = colIndex === BOARD_SIZE - 1
                  const isCenter = rowIndex === 7 && colIndex === 7
                  const isStar = (rowIndex === 3 || rowIndex === 11) && (colIndex === 3 || colIndex === 11)

                  return (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      className="w-7 h-7 md:w-10 md:h-10 relative flex items-center justify-center group"
                      disabled={!!winner || status !== 'playing'}
                    >
                      {/* Grid Lines */}
                      <div className={`absolute bg-gray-800 pointer-events-none z-0
                        ${isTop ? 'top-1/2 bottom-0' : isBottom ? 'top-0 bottom-1/2' : 'top-0 bottom-0'}
                        w-[1.5px] left-1/2 -ml-[0.75px]`}
                      />
                      <div className={`absolute bg-gray-800 pointer-events-none z-0
                        ${isLeft ? 'left-1/2 right-0' : isRight ? 'left-0 right-1/2' : 'left-0 right-0'}
                        h-[1.5px] top-1/2 -mt-[0.75px]`}
                      />

                      {/* Star Points */}
                      {(isCenter || isStar) && (
                        <div className="w-2 h-2 rounded-full bg-gray-800 absolute z-0 pointer-events-none" />
                      )}

                      {/* Hover */}
                      {!cell && status === 'playing' && !winner && (
                        <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 rounded-full transition-opacity m-1 md:m-1.5"
                          style={{
                            background: currentPlayer === 'black'
                              ? 'radial-gradient(circle, rgba(0,0,0,0.3) 0%, transparent 70%)'
                              : 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)',
                          }}
                        />
                      )}

                      {/* Piece */}
                      {cell && (
                        <div
                          className={`absolute z-20 w-6 h-6 md:w-8 md:h-8 rounded-full shadow-md transition-transform ${
                            cell === 'black'
                              ? 'bg-gradient-to-br from-gray-600 to-black'
                              : 'bg-gradient-to-br from-white to-gray-200 border border-gray-300'
                          }`}
                        />
                      )}

                      {/* Last Move */}
                      {lastMove && lastMove[0] === rowIndex && lastMove[1] === colIndex && (
                        <div className="absolute z-30 w-2 h-2 bg-red-500 rounded-full shadow-sm animate-pulse" />
                      )}
                    </button>
                  )
                }),
              )}
            </div>
          </div>

          {/* Undo Request Dialog (PvP) */}
          {gameState.undoRequest && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 animate-pulse">
              {gameState.undoRequest.requesterId === currentUser ? (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-amber-800">
                    <span className="text-xl">⏳</span>
                    <span className="text-sm font-medium">已发送悔棋请求，等待对方回应...</span>
                  </div>
                  <button
                    onClick={cancelUndoRequest}
                    className="text-sm px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-300"
                  >撤回请求</button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-amber-800">
                    <span className="text-xl">🤔</span>
                    <span className="text-sm font-medium">
                      {gameState.players.find(p => p.id === gameState.undoRequest!.requesterId)?.name || '对方'} 请求悔棋
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={approveUndo}
                      className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm shadow active:scale-95"
                    >✓ 同意</button>
                    <button
                      onClick={rejectUndo}
                      className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm shadow active:scale-95"
                    >✗ 拒绝</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-4">
            {status === 'playing' && history.length > 0 && !gameState.undoRequest && (
              <button
                onClick={handleUndo}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors border border-gray-200"
              >
                悔棋{gameState.gameMode === 'pvp' ? '（需对方同意）' : ''}
              </button>
            )}
            {status === 'finished' && (
              <button
                onClick={handleRestart}
                className="px-8 py-3 bg-primary text-white rounded-xl font-bold text-lg hover:bg-pink-600 transition-colors shadow-md"
              >
                再来一局
              </button>
            )}
            {status === 'finished' && (
              <button
                onClick={() => router.push('/gomoku')}
                className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors"
              >
                返回大厅
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
