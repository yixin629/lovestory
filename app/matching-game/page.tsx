'use client'

import { useState, useEffect } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'

interface Card {
  id: number
  emoji: string
  name: string
  matched: boolean
  flipped: boolean
}

const COUPLE_ITEMS = [
  { emoji: '💍', name: '戒指' },
  { emoji: '💐', name: '鲜花' },
  { emoji: '💝', name: '礼物' },
  { emoji: '💌', name: '情书' },
  { emoji: '🎂', name: '蛋糕' },
  { emoji: '🍫', name: '巧克力' },
  { emoji: '🌹', name: '玫瑰' },
  { emoji: '💕', name: '爱心' },
]

export default function MatchingGamePage() {
  const toast = useToast()
  const [cards, setCards] = useState<Card[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [timer, setTimer] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameWon, setGameWon] = useState(false)
  const [bestScore, setBestScore] = useState<number | null>(null)

  // 初始化游戏
  const initGame = () => {
    const gameCards = [...COUPLE_ITEMS, ...COUPLE_ITEMS].map((item, index) => ({
      id: index,
      emoji: item.emoji,
      name: item.name,
      matched: false,
      flipped: false,
    }))

    // 洗牌
    for (let i = gameCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[gameCards[i], gameCards[j]] = [gameCards[j], gameCards[i]]
    }

    setCards(gameCards)
    setFlippedCards([])
    setMoves(0)
    setMatches(0)
    setTimer(0)
    setIsPlaying(true)
    setGameWon(false)
  }

  // 加载最佳成绩
  useEffect(() => {
    const saved = localStorage.getItem('matchingGameBestScore')
    if (saved) setBestScore(parseInt(saved))
  }, [])

  // 计时器
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && !gameWon) {
      interval = setInterval(() => {
        setTimer((t) => t + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, gameWon])

  // 检查游戏胜利
  useEffect(() => {
    if (matches === COUPLE_ITEMS.length && isPlaying) {
      setGameWon(true)
      setIsPlaying(false)

      // 更新最佳成绩
      if (!bestScore || moves < bestScore) {
        setBestScore(moves)
        localStorage.setItem('matchingGameBestScore', moves.toString())
        toast.success(`🎉 新纪录！用 ${moves} 步完成！`)
      } else {
        toast.success(`🎊 完成！用了 ${moves} 步`)
      }

      // 触觉反馈
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200])
      }
    }
  }, [matches, isPlaying, moves, bestScore, toast])

  // 翻牌
  const handleCardClick = (id: number) => {
    if (!isPlaying || flippedCards.length >= 2) return

    const card = cards.find((c) => c.id === id)
    if (!card || card.matched || card.flipped) return

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    const newCards = cards.map((c) => (c.id === id ? { ...c, flipped: true } : c))
    setCards(newCards)

    const newFlipped = [...flippedCards, id]
    setFlippedCards(newFlipped)

    // 检查配对
    if (newFlipped.length === 2) {
      setMoves((m) => m + 1)

      const [firstId, secondId] = newFlipped
      const firstCard = newCards.find((c) => c.id === firstId)
      const secondCard = newCards.find((c) => c.id === secondId)

      if (firstCard && secondCard && firstCard.name === secondCard.name) {
        // 配对成功
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, matched: true } : c))
          )
          setMatches((m) => m + 1)
          setFlippedCards([])

          // 触觉反馈
          if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50])
          }
        }, 500)
      } else {
        // 配对失败
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, flipped: false } : c))
          )
          setFlippedCards([])
        }, 1000)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">🧩 情侣配对游戏</h1>
          <p className="text-gray-600 mb-6">翻开卡片，找到所有配对的情侣物品！</p>

          {/* 游戏统计 */}
          <div className="flex justify-center gap-6 mb-6 flex-wrap">
            <div className="bg-pink-50 px-6 py-3 rounded-full">
              <span className="text-sm text-gray-600">时间：</span>
              <span className="font-bold text-primary ml-2">{formatTime(timer)}</span>
            </div>
            <div className="bg-purple-50 px-6 py-3 rounded-full">
              <span className="text-sm text-gray-600">步数：</span>
              <span className="font-bold text-primary ml-2">{moves}</span>
            </div>
            <div className="bg-blue-50 px-6 py-3 rounded-full">
              <span className="text-sm text-gray-600">配对：</span>
              <span className="font-bold text-primary ml-2">
                {matches}/{COUPLE_ITEMS.length}
              </span>
            </div>
            {bestScore && (
              <div className="bg-yellow-50 px-6 py-3 rounded-full">
                <span className="text-sm text-gray-600">最佳：</span>
                <span className="font-bold text-amber-600 ml-2">{bestScore} 步</span>
              </div>
            )}
          </div>

          {/* 开始按钮 */}
          {!isPlaying && !gameWon && (
            <button onClick={initGame} className="btn-primary text-xl px-8 py-4 mb-8">
              开始游戏 🎮
            </button>
          )}

          {/* 重新开始按钮 */}
          {isPlaying && (
            <button onClick={initGame} className="btn-secondary mb-8">
              重新开始 🔄
            </button>
          )}

          {/* 胜利消息 */}
          {gameWon && (
            <div className="mb-8 p-6 bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 rounded-2xl animate-pulse">
              <h2 className="text-3xl font-bold text-primary mb-2">🎉 恭喜完成！</h2>
              <p className="text-lg text-gray-700">
                用时 {formatTime(timer)}，共 {moves} 步
              </p>
              <button onClick={initGame} className="btn-primary mt-4">
                再玩一次 ✨
              </button>
            </div>
          )}

          {/* 卡片网格 */}
          {cards.length > 0 && (
            <div className="grid grid-cols-4 gap-3 md:gap-4 max-w-2xl mx-auto">
              {cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  disabled={!isPlaying || card.matched || card.flipped}
                  className={`aspect-square rounded-2xl text-5xl md:text-6xl transition-all duration-300 transform
                    ${
                      card.flipped || card.matched
                        ? 'bg-gradient-to-br from-pink-100 to-purple-100 scale-100'
                        : 'bg-gradient-to-br from-gray-200 to-gray-300 hover:scale-105 hover:shadow-lg'
                    }
                    ${card.matched ? 'opacity-60 cursor-default' : 'cursor-pointer'}
                    ${!isPlaying && 'cursor-not-allowed opacity-50'}
                    active:scale-95 shadow-md
                  `}
                  style={{
                    backfaceVisibility: 'hidden',
                  }}
                >
                  {card.flipped || card.matched ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <span>{card.emoji}</span>
                      {card.matched && (
                        <span className="text-sm text-green-600 font-bold mt-1">✓</span>
                      )}
                    </div>
                  ) : (
                    <span>❓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* 游戏说明 */}
          <div className="mt-8 pt-6 border-t text-left max-w-2xl mx-auto">
            <h3 className="font-bold text-lg mb-3 text-gray-700">🎯 游戏规则：</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• 点击卡片翻开，找到两张相同的卡片即可配对</li>
              <li>• 每次可以翻开两张卡片</li>
              <li>• 用最少的步数完成所有配对</li>
              <li>• 挑战自己的最佳记录！</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
