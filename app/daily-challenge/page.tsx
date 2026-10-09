'use client'

import { useState, useEffect } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'

interface Challenge {
  id: number
  title: string
  description: string
  emoji: string
  category: 'love' | 'fun' | 'care' | 'adventure' | 'creative'
  points: number
}

interface CompletedChallenge {
  challengeId: number
  date: string
  note?: string
}

const CHALLENGES: Challenge[] = [
  // 爱意类
  {
    id: 1,
    title: '说出10个ta的优点',
    description: '认真想想ta身上让你心动的地方',
    emoji: '💝',
    category: 'love',
    points: 10,
  },
  {
    id: 2,
    title: '给ta一个长达10秒的拥抱',
    description: '紧紧抱住ta，感受彼此的温度',
    emoji: '🤗',
    category: 'love',
    points: 10,
  },
  {
    id: 3,
    title: '写一张小纸条藏起来给ta',
    description: '可以写情话，也可以写感谢的话',
    emoji: '📝',
    category: 'love',
    points: 15,
  },
  {
    id: 4,
    title: '偷偷亲ta一下',
    description: '趁ta不注意，给ta一个惊喜',
    emoji: '😘',
    category: 'love',
    points: 10,
  },
  {
    id: 5,
    title: '说一句今天最想对ta说的话',
    description: '真诚地表达你的心意',
    emoji: '💬',
    category: 'love',
    points: 10,
  },

  // 有趣类
  {
    id: 6,
    title: '一起学一个新表情包',
    description: '创造属于你们的专属表情',
    emoji: '😜',
    category: 'fun',
    points: 15,
  },
  {
    id: 7,
    title: '玩一局石头剪刀布',
    description: '输的人要接受一个小惩罚',
    emoji: '✊',
    category: 'fun',
    points: 10,
  },
  {
    id: 8,
    title: '给对方取一个新昵称',
    description: '今天就用这个昵称叫对方',
    emoji: '🏷️',
    category: 'fun',
    points: 10,
  },
  {
    id: 9,
    title: '一起跳一段舞',
    description: '不管跳得好不好，开心就好',
    emoji: '💃',
    category: 'fun',
    points: 20,
  },
  {
    id: 10,
    title: '模仿对方的口头禅',
    description: '看谁模仿得更像',
    emoji: '🎭',
    category: 'fun',
    points: 15,
  },

  // 关心类
  {
    id: 11,
    title: '给ta倒一杯水',
    description: '简单的事情也是爱的表达',
    emoji: '💧',
    category: 'care',
    points: 5,
  },
  {
    id: 12,
    title: '帮ta按摩5分钟',
    description: '缓解ta一天的疲劳',
    emoji: '💆',
    category: 'care',
    points: 15,
  },
  {
    id: 13,
    title: '问问ta今天过得怎么样',
    description: '认真倾听ta的分享',
    emoji: '🎧',
    category: 'care',
    points: 10,
  },
  {
    id: 14,
    title: '帮ta做一件事',
    description: '可以是家务、工作上的小忙等',
    emoji: '🤝',
    category: 'care',
    points: 15,
  },
  {
    id: 15,
    title: '给ta准备一个小零食',
    description: '爱ta就要投喂ta',
    emoji: '🍪',
    category: 'care',
    points: 10,
  },

  // 冒险类
  {
    id: 16,
    title: '尝试一家新餐厅',
    description: '一起探索新的美食',
    emoji: '🍽️',
    category: 'adventure',
    points: 20,
  },
  {
    id: 17,
    title: '一起散步30分钟',
    description: '边走边聊，感受彼此的陪伴',
    emoji: '🚶',
    category: 'adventure',
    points: 15,
  },
  {
    id: 18,
    title: '一起看日落或星星',
    description: '浪漫的时刻需要一起分享',
    emoji: '🌅',
    category: 'adventure',
    points: 25,
  },
  {
    id: 19,
    title: '交换今天的手机壁纸',
    description: '换成对方的照片',
    emoji: '📱',
    category: 'adventure',
    points: 15,
  },
  {
    id: 20,
    title: '一起做一道新菜',
    description: '不管成功与否，过程最重要',
    emoji: '👨‍🍳',
    category: 'adventure',
    points: 25,
  },

  // 创意类
  {
    id: 21,
    title: '画一幅对方的画像',
    description: '不管画得好不好，心意最重要',
    emoji: '🎨',
    category: 'creative',
    points: 20,
  },
  {
    id: 22,
    title: '编一个关于你们的小故事',
    description: '可以是未来的美好憧憬',
    emoji: '📖',
    category: 'creative',
    points: 20,
  },
  {
    id: 23,
    title: '一起拍一张合照',
    description: '记录今天的美好时刻',
    emoji: '📸',
    category: 'creative',
    points: 15,
  },
  {
    id: 24,
    title: '给对方唱一首歌',
    description: '哪怕跑调也是爱的声音',
    emoji: '🎤',
    category: 'creative',
    points: 20,
  },
  {
    id: 25,
    title: '用一个词形容今天的ta',
    description: '并解释为什么',
    emoji: '✨',
    category: 'creative',
    points: 10,
  },
]

const CATEGORY_INFO: Record<string, { name: string; color: string; bg: string }> = {
  love: { name: '爱意满满', color: 'text-pink-600', bg: 'bg-pink-100' },
  fun: { name: '趣味互动', color: 'text-orange-600', bg: 'bg-orange-100' },
  care: { name: '贴心关怀', color: 'text-blue-600', bg: 'bg-blue-100' },
  adventure: { name: '浪漫冒险', color: 'text-purple-600', bg: 'bg-purple-100' },
  creative: { name: '创意表达', color: 'text-green-600', bg: 'bg-green-100' },
}

export default function DailyChallengePage() {
  const toast = useToast()
  const [todayChallenge, setTodayChallenge] = useState<Challenge | null>(null)
  const [completedChallenges, setCompletedChallenges] = useState<CompletedChallenge[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [streak, setStreak] = useState(0)
  const [note, setNote] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // 加载数据
  useEffect(() => {
    const saved = localStorage.getItem('dailyChallengeData')
    if (saved) {
      const data = JSON.parse(saved)
      setCompletedChallenges(data.completed || [])
      setTotalPoints(data.totalPoints || 0)
      setStreak(data.streak || 0)
    }

    generateTodayChallenge()
  }, [])

  // 保存数据
  const saveData = (completed: CompletedChallenge[], points: number, currentStreak: number) => {
    localStorage.setItem(
      'dailyChallengeData',
      JSON.stringify({
        completed,
        totalPoints: points,
        streak: currentStreak,
      })
    )
  }

  // 生成今日挑战
  const generateTodayChallenge = () => {
    const today = new Date().toDateString()
    // 用日期作为种子，确保每天的挑战是固定的
    const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const index = seed % CHALLENGES.length
    setTodayChallenge(CHALLENGES[index])
  }

  // 完成挑战
  const completeChallenge = (challenge: Challenge) => {
    const today = new Date().toDateString()

    // 检查今天是否已完成这个挑战
    if (completedChallenges.some((c) => c.challengeId === challenge.id && c.date === today)) {
      toast.info('今天已经完成这个挑战了！')
      return
    }

    const newCompleted: CompletedChallenge = {
      challengeId: challenge.id,
      date: today,
      note: note || undefined,
    }

    const updatedCompleted = [newCompleted, ...completedChallenges]
    const newPoints = totalPoints + challenge.points

    // 计算连续天数
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const completedYesterday = completedChallenges.some((c) => c.date === yesterday.toDateString())
    const newStreak = completedYesterday ? streak + 1 : 1

    setCompletedChallenges(updatedCompleted)
    setTotalPoints(newPoints)
    setStreak(newStreak)
    setNote('')

    saveData(updatedCompleted, newPoints, newStreak)

    toast.success(`🎉 完成挑战！获得 ${challenge.points} 积分！`)
  }

  // 换一个挑战
  const refreshChallenge = () => {
    const available = CHALLENGES.filter(
      (c) =>
        !completedChallenges.some(
          (cc) => cc.challengeId === c.id && cc.date === new Date().toDateString()
        )
    )
    if (available.length > 0) {
      const randomIndex = Math.floor(Math.random() * available.length)
      setTodayChallenge(available[randomIndex])
      toast.info('换了一个新挑战！')
    } else {
      toast.info('今天的挑战都完成啦！')
    }
  }

  // 筛选挑战列表
  const filteredChallenges = selectedCategory
    ? CHALLENGES.filter((c) => c.category === selectedCategory)
    : CHALLENGES

  // 检查挑战今天是否已完成
  const isChallengeCompletedToday = (challengeId: number) => {
    const today = new Date().toDateString()
    return completedChallenges.some((c) => c.challengeId === challengeId && c.date === today)
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card">
          <h1 className="text-3xl md:text-4xl font-bold text-primary text-center mb-2">
            📋 每日挑战
          </h1>
          <p className="text-gray-600 text-center mb-6">每天一个小任务，让爱情保鲜！</p>

          {/* 统计数据 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-pink-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-pink-500">{totalPoints}</div>
              <div className="text-xs text-gray-600">总积分</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-orange-500">{streak}</div>
              <div className="text-xs text-gray-600">连续天数</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-purple-500">{completedChallenges.length}</div>
              <div className="text-xs text-gray-600">完成次数</div>
            </div>
          </div>

          {/* 今日挑战 */}
          {todayChallenge && !showAll && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                ⭐ 今日挑战
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    CATEGORY_INFO[todayChallenge.category].bg
                  } ${CATEGORY_INFO[todayChallenge.category].color}`}
                >
                  {CATEGORY_INFO[todayChallenge.category].name}
                </span>
              </h2>

              <div
                className={`p-6 rounded-2xl ${
                  CATEGORY_INFO[todayChallenge.category].bg
                } border-2 border-opacity-50 ${
                  isChallengeCompletedToday(todayChallenge.id) ? 'opacity-50' : ''
                }`}
              >
                <div className="text-4xl mb-3 text-center">{todayChallenge.emoji}</div>
                <h3 className="text-xl font-bold text-center mb-2">{todayChallenge.title}</h3>
                <p className="text-gray-600 text-center mb-4">{todayChallenge.description}</p>
                <div className="text-center text-sm text-gray-500 mb-4">
                  🏆 完成可获得 {todayChallenge.points} 积分
                </div>

                {!isChallengeCompletedToday(todayChallenge.id) && (
                  <>
                    <input
                      type="text"
                      placeholder="记录一下完成的心得（可选）"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 mb-3 text-sm"
                      maxLength={50}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => completeChallenge(todayChallenge)}
                        className="flex-1 btn-primary"
                      >
                        ✅ 完成挑战
                      </button>
                      <button onClick={refreshChallenge} className="btn-secondary">
                        🔄 换一个
                      </button>
                    </div>
                  </>
                )}

                {isChallengeCompletedToday(todayChallenge.id) && (
                  <div className="text-center text-green-600 font-semibold">✅ 今天已完成！</div>
                )}
              </div>
            </div>
          )}

          {/* 查看全部按钮 */}
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-primary hover:underline text-sm"
            >
              {showAll ? '← 返回今日挑战' : '查看全部挑战 →'}
            </button>
          </div>

          {/* 全部挑战列表 */}
          {showAll && (
            <div>
              {/* 分类筛选 */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 rounded-full text-xs ${
                    !selectedCategory ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  全部
                </button>
                {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`px-3 py-1 rounded-full text-xs ${
                      selectedCategory === key
                        ? `${info.bg} ${info.color}`
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {info.name}
                  </button>
                ))}
              </div>

              {/* 挑战列表 */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredChallenges.map((challenge) => {
                  const completed = isChallengeCompletedToday(challenge.id)
                  return (
                    <div
                      key={challenge.id}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        completed ? 'bg-gray-100 opacity-60' : CATEGORY_INFO[challenge.category].bg
                      }`}
                    >
                      <span className="text-2xl">{challenge.emoji}</span>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{challenge.title}</div>
                        <div className="text-xs text-gray-500">+{challenge.points}分</div>
                      </div>
                      {completed ? (
                        <span className="text-xs text-green-600">✅ 已完成</span>
                      ) : (
                        <button
                          onClick={() => {
                            setTodayChallenge(challenge)
                            setShowAll(false)
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          去完成
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 最近完成记录 */}
          {completedChallenges.length > 0 && !showAll && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-gray-700 mb-3">📜 最近完成</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {completedChallenges.slice(0, 5).map((completed, index) => {
                  const challenge = CHALLENGES.find((c) => c.id === completed.challengeId)
                  if (!challenge) return null
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded-lg"
                    >
                      <span>{challenge.emoji}</span>
                      <span className="flex-1">{challenge.title}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(completed.date).toLocaleDateString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
