'use client'

import { useState, useEffect } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'

interface SweetWord {
  category: string
  words: string[]
}

const SWEET_WORDS: SweetWord[] = [
  {
    category: '日常甜蜜',
    words: [
      '今天也想你了 💭',
      '你笑起来真好看 😊',
      '有你在身边真好 💕',
      '想抱抱你 🤗',
      '你是我的小太阳 ☀️',
      '遇见你是我最大的幸运 🍀',
      '你的声音是世界上最动听的 🎵',
      '想和你一起慢慢变老 👫',
      '你是我的全世界 🌍',
      '每天最期待的就是见到你 💗',
    ],
  },
  {
    category: '撒娇专用',
    words: [
      '人家想你了嘛~ 🥺',
      '今天有乖乖想你哦 🐱',
      '你今天有没有想我呀？💭',
      '抱抱亲亲举高高！🙆‍♀️',
      '好想rua你的脸蛋 😚',
      '快来哄哄我~ 🥹',
      '想要抱抱，现在，立刻！💕',
      '你是不是又在偷偷想我？😏',
      '今天的我也超爱你哦！💝',
      '想你想到失眠了怎么办？🌙',
    ],
  },
  {
    category: '浪漫告白',
    words: [
      '你是我生命中最美的意外 🌹',
      '想把所有美好都给你 ✨',
      '你是我写过最美的情诗 📝',
      '月亮是我抛向你的石子 🌙',
      '你是我藏在心底的诗 💌',
      '星辰大海不如你 ⭐',
      '我的眼里只有你 👀',
      '你是我此生最美的风景 🏞️',
      '余生请多指教 💍',
      '你是我永远的心动 💓',
    ],
  },
  {
    category: '关心问候',
    words: [
      '今天累不累呀？记得休息 😴',
      '多喝热水，照顾好自己 🍵',
      '天冷了记得添衣服 🧥',
      '按时吃饭，不许饿着 🍚',
      '早点睡，不要熬夜 🌙',
      '工作再忙也要注意身体 💪',
      '有什么不开心的告诉我 🤝',
      '你的健康比什么都重要 ❤️',
      '累了就休息，我一直在 🏠',
      '无论发生什么，我都在你身边 🤗',
    ],
  },
  {
    category: '表白情话',
    words: [
      '我喜欢你，是那种想和你共度余生的喜欢 💑',
      '你是我穷极一生也想抵达的终点 🎯',
      '我想和你一起起床，一起刷牙，一起吃早餐 🏡',
      '我的心动只为你而跳 💓',
      '从遇见你的那天起，我的星星都换了位置 ⭐',
      '我想成为你最美丽的意外 🎁',
      '你是我的诗和远方 ✈️',
      '我喜欢你，像风走了八千里，不问归期 🌬️',
      '你是我见过的最美的风景 🌅',
      '我想把我的心跳，送给你当闹钟 ⏰',
    ],
  },
  {
    category: '搞笑土味',
    words: [
      '你是什么血型？我猜是我的理想型！🤪',
      '你知道我喜欢吃什么吗？痴痴地望着你！👀',
      '你累不累？在我心里跑了一整天！🏃‍♀️',
      '我是九你是三，除了你还是你 ➗',
      '你知道我最喜欢什么神吗？你的眼神！✨',
      '我怀疑你是开挂的，因为你太完美了！🎮',
      '你是不是偷税了？因为你偷走了我的心 💰',
      '我们去吃饭吧，你负责吃，我负责看你 🍽️',
      '你是WiFi吗？因为我感觉我们很来电 📶',
      '今天有点冷，能借你的手暖暖吗？🤝',
    ],
  },
]

export default function SweetWordsPage() {
  const toast = useToast()
  const [currentWord, setCurrentWord] = useState('')
  const [currentCategory, setCurrentCategory] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [showFavorites, setShowFavorites] = useState(false)

  // 加载收藏
  useEffect(() => {
    const saved = localStorage.getItem('sweetWordsFavorites')
    if (saved) {
      setFavorites(JSON.parse(saved))
    }
    // 初始随机一条
    generateRandom()
  }, [])

  const generateRandom = () => {
    setIsAnimating(true)
    setTimeout(() => {
      const randomCategory = SWEET_WORDS[Math.floor(Math.random() * SWEET_WORDS.length)]
      const randomWord =
        randomCategory.words[Math.floor(Math.random() * randomCategory.words.length)]
      setCurrentCategory(randomCategory.category)
      setCurrentWord(randomWord)
      setIsAnimating(false)
    }, 300)
  }

  const generateByCategory = (category: string) => {
    setIsAnimating(true)
    setTimeout(() => {
      const categoryData = SWEET_WORDS.find((c) => c.category === category)
      if (categoryData) {
        const randomWord = categoryData.words[Math.floor(Math.random() * categoryData.words.length)]
        setCurrentCategory(category)
        setCurrentWord(randomWord)
      }
      setIsAnimating(false)
    }, 300)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentWord)
    toast.success('已复制到剪贴板，快去发给TA吧！💕')
  }

  const toggleFavorite = () => {
    let newFavorites: string[]
    if (favorites.includes(currentWord)) {
      newFavorites = favorites.filter((w) => w !== currentWord)
      toast.info('已取消收藏')
    } else {
      newFavorites = [...favorites, currentWord]
      toast.success('已添加到收藏！')
    }
    setFavorites(newFavorites)
    localStorage.setItem('sweetWordsFavorites', JSON.stringify(newFavorites))
  }

  const removeFavorite = (word: string) => {
    const newFavorites = favorites.filter((w) => w !== word)
    setFavorites(newFavorites)
    localStorage.setItem('sweetWordsFavorites', JSON.stringify(newFavorites))
    toast.info('已从收藏中移除')
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">💝 情话生成器</h1>
          <p className="text-gray-600 mb-8">每天一句甜蜜情话，让TA感受你的爱意 💕</p>

          {!showFavorites ? (
            <>
              {/* 情话展示卡片 */}
              <div
                className={`bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 rounded-2xl p-8 mb-6 min-h-[200px] flex flex-col items-center justify-center transition-all duration-300 ${
                  isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}
              >
                {currentWord && (
                  <>
                    <span className="text-sm text-purple-500 mb-2">#{currentCategory}</span>
                    <p className="text-2xl md:text-3xl font-medium text-gray-800 leading-relaxed">
                      {currentWord}
                    </p>
                  </>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 mb-8">
                <button
                  onClick={generateRandom}
                  className="flex-1 btn-primary text-lg py-3"
                  disabled={isAnimating}
                >
                  🎲 换一句
                </button>
                <button
                  onClick={copyToClipboard}
                  className="btn-secondary px-6"
                  disabled={!currentWord}
                >
                  📋 复制
                </button>
                <button
                  onClick={toggleFavorite}
                  className={`px-6 rounded-xl transition-all ${
                    favorites.includes(currentWord)
                      ? 'bg-red-100 text-red-500'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  disabled={!currentWord}
                >
                  {favorites.includes(currentWord) ? '❤️' : '🤍'}
                </button>
              </div>

              {/* 分类选择 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">选择分类</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SWEET_WORDS.map((category) => (
                    <button
                      key={category.category}
                      onClick={() => generateByCategory(category.category)}
                      className={`px-4 py-2 rounded-full text-sm transition-all ${
                        currentCategory === category.category
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {category.category}
                    </button>
                  ))}
                </div>
              </div>

              {/* 收藏入口 */}
              {favorites.length > 0 && (
                <button
                  onClick={() => setShowFavorites(true)}
                  className="text-primary hover:underline"
                >
                  查看我的收藏 ({favorites.length}) →
                </button>
              )}
            </>
          ) : (
            /* 收藏列表 */
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">我的收藏 ❤️</h2>
                <button
                  onClick={() => setShowFavorites(false)}
                  className="text-primary hover:underline"
                >
                  ← 返回
                </button>
              </div>

              {favorites.length === 0 ? (
                <p className="text-gray-500 py-8">还没有收藏哦，快去收藏一些甜蜜情话吧！</p>
              ) : (
                <div className="space-y-3">
                  {favorites.map((word, index) => (
                    <div
                      key={index}
                      className="bg-pink-50 rounded-xl p-4 flex items-center justify-between"
                    >
                      <p className="text-gray-800 flex-1 text-left">{word}</p>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(word)
                            toast.success('已复制！')
                          }}
                          className="text-gray-500 hover:text-primary"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => removeFavorite(word)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
