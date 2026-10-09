'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'

type Choice = 'rock' | 'paper' | 'scissors'

interface Game {
  player1: string
  player2: string
  player1_choice: Choice | null
  player2_choice: Choice | null
  winner: string | null
}

interface GameRow {
  player1: string | null
  player2: string | null
  winner: string | null
}

interface Stats {
  total: number
  wins: number
  losses: number
  draws: number
}

const emptyStats = (): Stats => ({ total: 0, wins: 0, losses: 0, draws: 0 })

function AvatarGlyph({ avatar }: { avatar: string | undefined }) {
  const value = avatar || '😊'
  if (value.startsWith('http')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value} alt="头像" width={32} height={32} loading="lazy" className="inline-block h-[1em] w-[1em] rounded-full object-cover align-middle" />
  }
  return <>{value}</>
}

const choices: { value: Choice; emoji: string; label: string }[] = [
  { value: 'rock', emoji: '✊', label: '石头' },
  { value: 'paper', emoji: '✋', label: '布' },
  { value: 'scissors', emoji: '✌️', label: '剪刀' },
]

export default function RPSPage() {
  const toast = useToast()
  const { user, me, partner } = useAuth()
  const playerName = user ?? ''
  const opponentId = partner?.id ?? ''
  const [showNameInput, setShowNameInput] = useState(true)
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [stats, setStats] = useState<{ mine: Stats; theirs: Stats }>({
    mine: emptyStats(),
    theirs: emptyStats(),
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadStats()
  }, [user, partner?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('rps_games')
        .select('player1, player2, winner')
        .order('played_at', { ascending: false })

      if (error) throw error

      // 计算统计数据
      const tally = (id: string) => {
        const result = emptyStats()
        if (!id) return result
        ;((data ?? []) as GameRow[]).forEach((game) => {
          if (game.player1 !== id && game.player2 !== id) return
          result.total++
          if (game.winner === id) result.wins++
          else if (game.winner) result.losses++
          else result.draws++
        })
        return result
      }

      setStats({ mine: tally(playerName), theirs: tally(opponentId) })
    } catch (error) {
      console.error('加载统计失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const startGame = () => {
    if (!playerName || !opponentId) {
      toast.warning('等另一半加入后才能开始')
      return
    }
    setShowNameInput(false)
    setCurrentGame({
      player1: playerName,
      player2: opponentId,
      player1_choice: null,
      player2_choice: null,
      winner: null,
    })
  }

  const makeChoice = (choice: Choice) => {
    // 对手随机选择
    const opponentChoice = choices[Math.floor(Math.random() * 3)].value

    // 判断胜负
    const winner = determineWinner(choice, opponentChoice)

    // 保存到数据库
    saveGame(choice, opponentChoice, winner)

    // 显示结果
    setCurrentGame({
      ...currentGame!,
      player1_choice: choice,
      player2_choice: opponentChoice,
      winner,
    })

    setResult(winner === playerName ? '🎉 你赢了！' : winner === null ? '🤝 平局！' : '😢 你输了！')
  }

  const determineWinner = (p1: Choice, p2: Choice): string | null => {
    if (p1 === p2) return null // 平局

    if (
      (p1 === 'rock' && p2 === 'scissors') ||
      (p1 === 'paper' && p2 === 'rock') ||
      (p1 === 'scissors' && p2 === 'paper')
    ) {
      return playerName
    }

    return opponentId
  }

  const saveGame = async (p1Choice: Choice, p2Choice: Choice, winner: string | null) => {
    try {
      const { error } = await supabase.from('rps_games').insert([
        {
          player1: playerName,
          player2: opponentId,
          player1_choice: p1Choice,
          player2_choice: p2Choice,
          winner: winner,
        },
      ])
      if (error) throw error

      loadStats()
    } catch (error) {
      console.error('保存游戏失败:', error)
      toast.error('保存对局失败')
    }
  }

  const playAgain = () => {
    setResult(null)
    setCurrentGame({
      player1: playerName,
      player2: opponentId,
      player1_choice: null,
      player2_choice: null,
      winner: null,
    })
  }

  const resetGame = () => {
    setShowNameInput(true)
    setCurrentGame(null)
    setResult(null)
  }

  const getWinRate = (playerStats: Stats) => {
    if (playerStats.total === 0) return 0
    return ((playerStats.wins / playerStats.total) * 100).toFixed(1)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/" text="返回首页" />

        {loading ? (
          <div className="card text-center">
            <div className="text-2xl">加载中...</div>
          </div>
        ) : (
          <>
            {showNameInput ? (
              <div className="card text-center">
                <h1 className="text-4xl font-bold mb-8">✊✋✌️ 石头剪刀布 ✊✋✌️</h1>

                {/* 统计数据 */}
                <div className="grid grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
                  <div className="p-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
                    <div className="text-3xl mb-2"><AvatarGlyph avatar={me?.avatar} /> {me?.name ?? '我'}</div>
                    <div className="text-4xl font-bold text-primary mb-4">
                      {getWinRate(stats.mine)}%
                    </div>
                    <div className="space-y-1 text-sm">
                      <div>总场次: {stats.mine.total}</div>
                      <div className="text-green-500">胜: {stats.mine.wins}</div>
                      <div className="text-red-500">负: {stats.mine.losses}</div>
                      <div className="text-gray-400">平: {stats.mine.draws}</div>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-lg">
                    <div className="text-3xl mb-2">{partner ? <><AvatarGlyph avatar={partner.avatar} /> {partner.name}</> : '等待 Ta 加入'}</div>
                    <div className="text-4xl font-bold text-primary mb-4">
                      {getWinRate(stats.theirs)}%
                    </div>
                    <div className="space-y-1 text-sm">
                      <div>总场次: {stats.theirs.total}</div>
                      <div className="text-green-500">胜: {stats.theirs.wins}</div>
                      <div className="text-red-500">负: {stats.theirs.losses}</div>
                      <div className="text-gray-400">平: {stats.theirs.draws}</div>
                    </div>
                  </div>
                </div>

                <div className="max-w-md mx-auto">
                  {!partner && (
                    <p className="mb-4 text-gray-500">
                      等另一半加入后可用，<Link href="/pair" className="text-primary underline">去分享邀请码</Link>
                    </p>
                  )}
                  <button onClick={startGame} disabled={!partner} className="btn-primary w-full text-xl py-4 disabled:opacity-50">
                    🎮 开始游戏
                  </button>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-2">
                    <AvatarGlyph avatar={me?.avatar} /> {me?.name ?? '我'} VS{' '}
                    <AvatarGlyph avatar={partner?.avatar} /> {partner?.name ?? 'Ta'}
                  </h2>
                  <div className="text-gray-400">做出你的选择</div>
                </div>

                {!result ? (
                  /* 选择界面 */
                  <div className="grid grid-cols-3 gap-6 mb-8">
                    {choices.map((choice) => (
                      <button
                        key={choice.value}
                        onClick={() => makeChoice(choice.value)}
                        className="p-8 rounded-lg bg-white/5 border-2 border-white/20 hover:border-primary hover:bg-primary/10 transition-all transform hover:scale-105"
                      >
                        <div className="text-6xl mb-4">{choice.emoji}</div>
                        <div className="text-xl font-bold">{choice.label}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* 结果显示 */
                  <>
                    <div className="grid grid-cols-3 gap-6 mb-8 items-center">
                      <div className="text-center p-6 bg-blue-500/20 rounded-lg">
                        <div className="text-sm text-gray-400 mb-2">你的选择</div>
                        <div className="text-6xl mb-2">
                          {choices.find((c) => c.value === currentGame?.player1_choice)?.emoji}
                        </div>
                        <div className="text-lg font-bold">
                          {choices.find((c) => c.value === currentGame?.player1_choice)?.label}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-4xl font-bold text-primary mb-2">{result}</div>
                        <div className="text-6xl">
                          {currentGame?.winner === null
                            ? '🤝'
                            : currentGame?.winner === playerName
                            ? '🎉'
                            : '😢'}
                        </div>
                      </div>

                      <div className="text-center p-6 bg-pink-500/20 rounded-lg">
                        <div className="text-sm text-gray-400 mb-2">对手选择</div>
                        <div className="text-6xl mb-2">
                          {choices.find((c) => c.value === currentGame?.player2_choice)?.emoji}
                        </div>
                        <div className="text-lg font-bold">
                          {choices.find((c) => c.value === currentGame?.player2_choice)?.label}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                      <button onClick={playAgain} className="btn-primary px-8 py-3">
                        🔄 再来一局
                      </button>
                      <button
                        onClick={resetGame}
                        className="px-8 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        📊 查看统计
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
