'use client'

import { useEffect, useState } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import { useAuth } from '@/hooks/useAuth'

type Cell = 'X' | 'O' | null
type Board = Cell[]
type GameMode = 'local' | 'cpu'

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

const EMPTY_BOARD: Board = Array(9).fill(null)

interface Scores {
  X: number
  O: number
  draws: number
}

const SCORES_STORAGE_KEY = 'tic-tac-toe-scores-v1'
const CPU_MOVE_DELAY_MS = 500

function calculateWinner(board: Board): { winner: 'X' | 'O' | null; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line }
    }
  }
  return { winner: null, line: null }
}

function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== null)
}

/**
 * 极小化极大搜索：3x3 棋盘状态空间很小，可以直接穷举，电脑永远不会走出
 * 会输的一步（要么赢要么逼平），不需要引入外部依赖。
 */
function minimax(board: Board, player: 'X' | 'O', cpuMark: 'X' | 'O', humanMark: 'X' | 'O'): number {
  const { winner } = calculateWinner(board)
  if (winner === cpuMark) return 10
  if (winner === humanMark) return -10
  if (isBoardFull(board)) return 0

  const scores: number[] = []
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) continue
    const next = [...board]
    next[i] = player
    scores.push(minimax(next, player === 'X' ? 'O' : 'X', cpuMark, humanMark))
  }
  return player === cpuMark ? Math.max(...scores) : Math.min(...scores)
}

function pickCpuMove(board: Board, cpuMark: 'X' | 'O', humanMark: 'X' | 'O'): number {
  let bestScore = -Infinity
  let bestMove = -1
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) continue
    const next = [...board]
    next[i] = cpuMark
    const score = minimax(next, humanMark, cpuMark, humanMark)
    if (score > bestScore) {
      bestScore = score
      bestMove = i
    }
  }
  return bestMove
}

export default function TicTacToePage() {
  const { me, partner } = useAuth()
  // 同一台设备轮流下：X 是我，O 是另一半（未加入时显示「Ta」）
  const xName = me?.name ?? '我'
  const oName = partner?.name ?? 'Ta'
  const [mode, setMode] = useState<GameMode>('local')
  const [humanMark, setHumanMark] = useState<'X' | 'O'>('X')
  const [board, setBoard] = useState<Board>(EMPTY_BOARD)
  const [isXNext, setIsXNext] = useState(true)
  const [scores, setScores] = useState<Scores>({ X: 0, O: 0, draws: 0 })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SCORES_STORAGE_KEY)
      if (saved) setScores(JSON.parse(saved))
    } catch {
      // 本地存储不可用时忽略，比分从零开始
    }
  }, [])

  const { winner, line: winningLine } = calculateWinner(board)
  const isDraw = !winner && isBoardFull(board)
  const cpuMark: 'X' | 'O' = humanMark === 'X' ? 'O' : 'X'
  const isCpuTurn = mode === 'cpu' && !winner && !isDraw && (isXNext ? 'X' : 'O') === cpuMark

  const saveScores = (next: Scores) => {
    setScores(next)
    try {
      localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // 本地存储不可用时不阻塞游戏
    }
  }

  const applyMove = (nextBoard: Board, mark: 'X' | 'O') => {
    setBoard(nextBoard)
    const result = calculateWinner(nextBoard)
    if (result.winner) {
      saveScores({ ...scores, [result.winner]: scores[result.winner] + 1 })
    } else if (isBoardFull(nextBoard)) {
      saveScores({ ...scores, draws: scores.draws + 1 })
    }
    setIsXNext(mark === 'X' ? false : true)
  }

  const handleCellClick = (index: number) => {
    if (board[index] || winner || isDraw || isCpuTurn) return
    const mark = isXNext ? 'X' : 'O'
    const nextBoard = [...board]
    nextBoard[index] = mark
    applyMove(nextBoard, mark)
  }

  useEffect(() => {
    if (!isCpuTurn) return
    const timer = setTimeout(() => {
      const move = pickCpuMove(board, cpuMark, humanMark)
      if (move === -1) return
      const nextBoard = [...board]
      nextBoard[move] = cpuMark
      applyMove(nextBoard, cpuMark)
    }, CPU_MOVE_DELAY_MS)
    return () => clearTimeout(timer)
    // 只在"轮到电脑"这个状态刚变为 true 时触发一次；board/scores 等值
    // 在触发瞬间已经是最新的，重复声明进依赖会导致电脑重复落子。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCpuTurn])

  const resetBoard = () => {
    setBoard(EMPTY_BOARD)
    setIsXNext(true)
  }

  const resetScores = () => {
    saveScores({ X: 0, O: 0, draws: 0 })
  }

  const switchMode = (nextMode: GameMode) => {
    setMode(nextMode)
    resetBoard()
  }

  const switchHumanMark = (mark: 'X' | 'O') => {
    setHumanMark(mark)
    resetBoard()
  }

  const playerLabel = (mark: 'X' | 'O') => {
    if (mode === 'local') return mark === 'X' ? `${xName}（X）` : `${oName}（O）`
    return mark === humanMark ? `你（${mark}）` : `电脑（${mark}）`
  }

  const statusText = winner
    ? `🎉 ${playerLabel(winner)} 获胜！`
    : isDraw
      ? '🤝 平局！'
      : isCpuTurn
        ? '🤖 电脑思考中…'
        : `轮到 ${playerLabel(isXNext ? 'X' : 'O')}`

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card text-center">
          <h1 className="text-4xl font-bold mb-2">⭕ 井字棋 ❌</h1>
          <p className="text-sm mb-6">选择对战模式，然后轮流点击棋盘</p>

          <div className="flex gap-3 justify-center mb-6 flex-wrap">
            <button
              onClick={() => switchMode('local')}
              className={`px-5 py-2 rounded-lg border-2 transition-colors ${
                mode === 'local' ? 'border-primary bg-primary/10 font-bold' : 'border-gray-300 bg-gray-50'
              }`}
            >
              👫 双人对战（同屏轮流）
            </button>
            <button
              onClick={() => switchMode('cpu')}
              className={`px-5 py-2 rounded-lg border-2 transition-colors ${
                mode === 'cpu' ? 'border-primary bg-primary/10 font-bold' : 'border-gray-300 bg-gray-50'
              }`}
            >
              🤖 单机对战电脑
            </button>
          </div>

          {mode === 'cpu' && (
            <div className="flex gap-3 justify-center mb-6 items-center text-sm">
              <span>你执：</span>
              <button
                onClick={() => switchHumanMark('X')}
                className={`px-4 py-1.5 rounded-lg border-2 transition-colors ${
                  humanMark === 'X' ? 'border-primary bg-primary/10 font-bold' : 'border-gray-300 bg-gray-50'
                }`}
              >
                ❌ X（先手）
              </button>
              <button
                onClick={() => switchHumanMark('O')}
                className={`px-4 py-1.5 rounded-lg border-2 transition-colors ${
                  humanMark === 'O' ? 'border-primary bg-primary/10 font-bold' : 'border-gray-300 bg-gray-50'
                }`}
              >
                ⭕ O（后手）
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6 max-w-xs mx-auto">
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="text-sm">{mode === 'local' ? `${xName}（X）` : humanMark === 'X' ? '你' : '电脑'}</div>
              <div className="text-2xl font-bold text-primary">{scores.X}</div>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="text-sm">平局</div>
              <div className="text-2xl font-bold text-primary">{scores.draws}</div>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="text-sm">{mode === 'local' ? `${oName}（O）` : humanMark === 'O' ? '你' : '电脑'}</div>
              <div className="text-2xl font-bold text-primary">{scores.O}</div>
            </div>
          </div>

          <div className="text-2xl font-bold mb-6">{statusText}</div>

          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-8">
            {board.map((cell, index) => {
              const isWinningCell = winningLine?.includes(index)
              return (
                <button
                  key={index}
                  onClick={() => handleCellClick(index)}
                  disabled={!!cell || !!winner || isDraw || isCpuTurn}
                  aria-label={`第 ${index + 1} 格${cell ? `，已是 ${cell}` : '，空'}`}
                  className={`aspect-square rounded-lg text-5xl font-bold flex items-center justify-center transition-all border-2 ${
                    isWinningCell
                      ? 'bg-primary/25 border-primary'
                      : 'bg-gray-50 border-gray-300 hover:border-primary/60 hover:bg-primary/10'
                  } ${cell || winner || isDraw || isCpuTurn ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {cell === 'X' && '❌'}
                  {cell === 'O' && '⭕'}
                </button>
              )
            })}
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            <button onClick={resetBoard} className="btn-primary px-8 py-3">
              🔄 再来一局
            </button>
            <button
              onClick={resetScores}
              className="px-8 py-3 rounded-lg border border-gray-300 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              🗑️ 清空比分
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
