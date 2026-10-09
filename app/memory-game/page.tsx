'use client'

import { useState } from 'react'
import BackButton from '@/app/components/ui/BackButton'

const emojis = ['❤️', '💕', '💖', '💗', '💝', '💞', '🌹', '🌺']

interface Card {
  id: number
  emoji: string
  isFlipped: boolean
  isMatched: boolean
}

export default function MemoryGamePage() {
  const [cards, setCards] = useState<Card[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [matchedPairs, setMatchedPairs] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameWon, setGameWon] = useState(false)

  const initializeGame = () => {
    const shuffled = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }))

    setCards(shuffled)
    setFlippedCards([])
    setMoves(0)
    setMatchedPairs(0)
    setGameStarted(true)
    setGameWon(false)
  }

  const handleCardClick = (id: number) => {
    if (flippedCards.length === 2 || cards[id].isMatched || cards[id].isFlipped) {
      return
    }

    const newCards = [...cards]
    newCards[id].isFlipped = true
    setCards(newCards)

    const newFlippedCards = [...flippedCards, id]
    setFlippedCards(newFlippedCards)

    if (newFlippedCards.length === 2) {
      setMoves(moves + 1)

      const [first, second] = newFlippedCards
      if (cards[first].emoji === cards[second].emoji) {
        // 匹配成功
        setTimeout(() => {
          const updatedCards = [...cards]
          updatedCards[first].isMatched = true
          updatedCards[second].isMatched = true
          setCards(updatedCards)
          setFlippedCards([])

          const newMatchedPairs = matchedPairs + 1
          setMatchedPairs(newMatchedPairs)

          if (newMatchedPairs === emojis.length) {
            setGameWon(true)
          }
        }, 500)
      } else {
        // 不匹配
        setTimeout(() => {
          const updatedCards = [...cards]
          updatedCards[first].isFlipped = false
          updatedCards[second].isFlipped = false
          setCards(updatedCards)
          setFlippedCards([])
        }, 1000)
      }
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card">
          <h1 className="text-4xl font-bold text-center mb-8">🃏 记忆翻牌游戏 🃏</h1>

          {!gameStarted ? (
            <div className="text-center">
              <p className="text-lg mb-6 text-gray-300">翻开卡片，找到所有配对！考验你的记忆力！</p>
              <button onClick={initializeGame} className="btn-primary text-xl px-12 py-4">
                🎮 开始游戏
              </button>
            </div>
          ) : (
            <>
              {/* 游戏状态 */}
              <div className="flex justify-center gap-8 mb-8 text-lg">
                <div className="px-6 py-3 bg-white/10 rounded-lg">
                  <span className="text-gray-400">步数：</span>
                  <span className="font-bold text-primary">{moves}</span>
                </div>
                <div className="px-6 py-3 bg-white/10 rounded-lg">
                  <span className="text-gray-400">配对：</span>
                  <span className="font-bold text-green-500">
                    {matchedPairs} / {emojis.length}
                  </span>
                </div>
              </div>

              {/* 卡片网格 */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                {cards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    disabled={card.isMatched}
                    className={`aspect-square rounded-lg text-5xl flex items-center justify-center transition-all transform ${
                      card.isFlipped || card.isMatched
                        ? 'bg-gradient-to-br from-primary to-accent scale-105'
                        : 'bg-white/10 hover:bg-white/20 hover:scale-105'
                    } ${card.isMatched ? 'opacity-50' : ''}`}
                  >
                    {card.isFlipped || card.isMatched ? card.emoji : '❓'}
                  </button>
                ))}
              </div>

              {/* 胜利提示 */}
              {gameWon && (
                <div className="text-center p-6 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg mb-6">
                  <div className="text-4xl mb-2">🎉 恭喜！你赢了！</div>
                  <div className="text-xl mb-4">
                    用了 <span className="font-bold text-primary">{moves}</span> 步完成
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <button onClick={initializeGame} className="btn-primary px-8 py-3">
                  🔄 重新开始
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
