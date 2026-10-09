'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/app/components/feedback/ToastProvider'
import BackButton from '@/app/components/ui/BackButton'

interface CheckInRecord {
  id: string
  user_id: string
  check_in_date: string
  message: string
  created_at: string
}

interface Challenge {
  id: number
  day: number
  title: string
  description: string
  emoji: string
}

const challenges: Challenge[] = [
  { id: 1, day: 1, title: '初次见面', description: '记录今天最开心的事情', emoji: '👋' },
  { id: 2, day: 2, title: '爱的小确幸', description: '分享一个让你心动的瞬间', emoji: '💝' },
  { id: 3, day: 3, title: '感恩时刻', description: '写下你感谢对方的一件事', emoji: '🙏' },
  { id: 4, day: 4, title: '美食时光', description: '分享今天吃了什么好吃的', emoji: '🍔' },
  { id: 5, day: 5, title: '梦想清单', description: '说说你最近的小目标', emoji: '🎯' },
  { id: 6, day: 6, title: '回忆杀', description: '回忆一个美好的过去', emoji: '📸' },
  { id: 7, day: 7, title: '一周总结', description: '这一周最难忘的事', emoji: '⭐' },
  { id: 8, day: 8, title: '音乐分享', description: '推荐一首最近喜欢的歌', emoji: '🎵' },
  { id: 9, day: 9, title: '天气心情', description: '今天的天气和心情如何', emoji: '🌤️' },
  { id: 10, day: 10, title: '小秘密', description: '分享一个小秘密', emoji: '🤫' },
  { id: 11, day: 11, title: '电影时光', description: '推荐一部想一起看的电影', emoji: '🎬' },
  { id: 12, day: 12, title: '宠物时间', description: '如果养宠物想养什么', emoji: '🐱' },
  { id: 13, day: 13, title: '旅行计划', description: '最想去的地方', emoji: '✈️' },
  { id: 14, day: 14, title: '两周纪念', description: '坚持签到的感受', emoji: '🎉' },
  { id: 15, day: 15, title: '美丽瞬间', description: '今天觉得最美的东西', emoji: '🌺' },
  { id: 16, day: 16, title: '学习时光', description: '最近学到了什么', emoji: '📚' },
  { id: 17, day: 17, title: '运动打卡', description: '今天有运动吗', emoji: '🏃' },
  { id: 18, day: 18, title: '美容觉', description: '睡眠质量如何', emoji: '😴' },
  { id: 19, day: 19, title: '购物清单', description: '最近想买的东西', emoji: '🛍️' },
  { id: 20, day: 20, title: '二十天啦', description: '给自己一个鼓励', emoji: '💪' },
  { id: 21, day: 21, title: '时尚搭配', description: '分享今天的穿搭', emoji: '👗' },
  { id: 22, day: 22, title: '美食制作', description: '想学的一道菜', emoji: '👩‍🍳' },
  { id: 23, day: 23, title: '护肤日记', description: '分享护肤心得', emoji: '💆' },
  { id: 24, day: 24, title: '星座运势', description: '今天的运势如何', emoji: '♈' },
  { id: 25, day: 25, title: '闺蜜时光', description: '和朋友的快乐时光', emoji: '👯' },
  { id: 26, day: 26, title: '甜品时间', description: '最喜欢的甜品', emoji: '🍰' },
  { id: 27, day: 27, title: '香水物语', description: '喜欢什么味道', emoji: '🌸' },
  { id: 28, day: 28, title: '浪漫时刻', description: '最浪漫的事情', emoji: '💑' },
  { id: 29, day: 29, title: '奇思妙想', description: '突然的奇怪想法', emoji: '💭' },
  { id: 30, day: 30, title: '满月成就', description: '30天坚持的收获', emoji: '🏆' },
]

export default function CheckInPage() {
  const { showToast } = useToast()

  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([])
  const [todayChecked, setTodayChecked] = useState(false)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const userId = user ?? ''
  const [achievements, setAchievements] = useState<string[]>([])

  // 成就徽章定义
  const achievementsList = [
    { id: 'first', name: '初次签到', desc: '完成第1次签到', emoji: '🌟', requirement: 1 },
    { id: 'week', name: '坚持一周', desc: '连续签到7天', emoji: '🔥', requirement: 7 },
    { id: 'twoweeks', name: '半月之约', desc: '连续签到14天', emoji: '💪', requirement: 14 },
    { id: 'month', name: '满月成就', desc: '连续签到30天', emoji: '🏆', requirement: 30 },
    { id: 'hundred', name: '百日之恋', desc: '累计签到100天', emoji: '👑', requirement: 100 },
    { id: 'explorer', name: '探索者', desc: '完成10个不同挑战', emoji: '🗺️', requirement: 10 },
  ]

  useEffect(() => {
    if (userId) {
      loadCheckIns()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const loadCheckIns = async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', userId)
        .order('check_in_date', { ascending: false })

      if (error) throw error

      setCheckIns(data || [])
      calculateStreak(data || [])
      checkTodayStatus(data || [])
      calculateAchievements(data || [])
    } catch (error) {
      console.error('加载签到记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAchievements = (records: CheckInRecord[]) => {
    const totalCheckIns = records.length
    const unlocked: string[] = []

    // 初次签到
    if (totalCheckIns >= 1) unlocked.push('first')

    // 累计100天
    if (totalCheckIns >= 100) unlocked.push('hundred')

    // 连续签到成就（基于当前连续天数）
    const streak = calculateCurrentStreak(records)
    if (streak >= 7) unlocked.push('week')
    if (streak >= 14) unlocked.push('twoweeks')
    if (streak >= 30) unlocked.push('month')

    // 探索者（完成10个不同的挑战日）
    const uniqueDays = new Set(records.map((r) => new Date(r.check_in_date).getDate() % 30))
    if (uniqueDays.size >= 10) unlocked.push('explorer')

    setAchievements(unlocked)
  }

  const calculateCurrentStreak = (records: CheckInRecord[]): number => {
    if (records.length === 0) return 0

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < records.length; i++) {
      const recordDate = new Date(records[i].check_in_date)
      recordDate.setHours(0, 0, 0, 0)

      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i)
      expectedDate.setHours(0, 0, 0, 0)

      if (recordDate.getTime() === expectedDate.getTime()) {
        streak++
      } else {
        break
      }
    }

    return streak
  }

  const checkTodayStatus = (records: CheckInRecord[]) => {
    const today = new Date().toISOString().split('T')[0]
    const checkedToday = records.some((record) => record.check_in_date === today)
    setTodayChecked(checkedToday)
  }

  const calculateStreak = (records: CheckInRecord[]) => {
    if (records.length === 0) {
      setCurrentStreak(0)
      return
    }

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < records.length; i++) {
      const recordDate = new Date(records[i].check_in_date)
      recordDate.setHours(0, 0, 0, 0)

      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i)
      expectedDate.setHours(0, 0, 0, 0)

      if (recordDate.getTime() === expectedDate.getTime()) {
        streak++
      } else {
        break
      }
    }

    setCurrentStreak(streak)
  }

  const handleCheckIn = async () => {
    if (!userId || todayChecked) return

    if (!message.trim()) {
      showToast('请写下今天的心情吧 💝', 'error')
      return
    }

    try {
      const today = new Date().toISOString().split('T')[0]

      const { error } = await supabase.from('check_ins').insert({
        user_id: userId,
        check_in_date: today,
        message: message.trim(),
      })

      if (error) throw error

      showToast('签到成功！连续 ' + (currentStreak + 1) + ' 天 🎉', 'success')
      setMessage('')
      loadCheckIns()
    } catch (error) {
      console.error('签到失败:', error)
      showToast('签到失败，请重试', 'error')
    }
  }

  const getTodayChallenge = () => {
    const dayOfMonth = new Date().getDate()
    return challenges[(dayOfMonth - 1) % 30]
  }

  const todayChallenge = getTodayChallenge()

  if (loading) {
    return (
      <div className="min-h-screen p-6 pt-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-gray-600">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 pt-24 pb-20">
      <div className="max-w-4xl mx-auto">
        <BackButton />

        {/* 标题和统计 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-purple-600 text-transparent bg-clip-text">
            每日签到 💖
          </h1>
          <div className="flex justify-center gap-6">
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <div className="text-3xl font-bold text-pink-600">{currentStreak}</div>
              <div className="text-sm text-gray-600">连续签到</div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <div className="text-3xl font-bold text-purple-600">{checkIns.length}</div>
              <div className="text-sm text-gray-600">累计签到</div>
            </div>
          </div>
        </div>

        {/* 今日挑战 */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl p-6 text-white shadow-xl mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{todayChallenge.emoji}</span>
            <div>
              <div className="text-sm opacity-90">第 {todayChallenge.day} 天挑战</div>
              <h2 className="text-2xl font-bold">{todayChallenge.title}</h2>
            </div>
          </div>
          <p className="text-lg opacity-95">{todayChallenge.description}</p>
        </div>

        {/* 成就徽章展示 */}
        {achievements.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">🏆 已获得的成就</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {achievementsList.map((achievement) => {
                const isUnlocked = achievements.includes(achievement.id)
                return (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isUnlocked
                        ? 'border-pink-500 bg-gradient-to-br from-pink-50 to-purple-50'
                        : 'border-gray-200 bg-gray-50 opacity-50'
                    }`}
                  >
                    <div className="text-4xl mb-2 text-center">{achievement.emoji}</div>
                    <div className="text-center">
                      <div className="font-bold text-gray-800">{achievement.name}</div>
                      <div className="text-xs text-gray-600 mt-1">{achievement.desc}</div>
                      {isUnlocked && (
                        <div className="text-xs text-green-600 mt-2 font-semibold">✓ 已解锁</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 签到日历视图 */}
        <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">📅 本月签到日历</h3>
          <div className="grid grid-cols-7 gap-2">
            {/* 星期标题 */}
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}

            {/* 日期格子 */}
            {(() => {
              const today = new Date()
              const year = today.getFullYear()
              const month = today.getMonth()
              const firstDay = new Date(year, month, 1).getDay()
              const daysInMonth = new Date(year, month + 1, 0).getDate()

              const checkInDates = new Set(
                checkIns
                  .map((record) => {
                    const date = new Date(record.check_in_date)
                    if (date.getMonth() === month && date.getFullYear() === year) {
                      return date.getDate()
                    }
                    return null
                  })
                  .filter(Boolean)
              )

              const days = []

              // 前面的空格
              for (let i = 0; i < firstDay; i++) {
                days.push(<div key={`empty-${i}`} className="aspect-square"></div>)
              }

              // 实际日期
              for (let day = 1; day <= daysInMonth; day++) {
                const isChecked = checkInDates.has(day)
                const isToday = day === today.getDate()
                const checkInRecord = checkIns.find((record) => {
                  const date = new Date(record.check_in_date)
                  return (
                    date.getDate() === day &&
                    date.getMonth() === month &&
                    date.getFullYear() === year
                  )
                })

                days.push(
                  <div
                    key={day}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-semibold cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-gradient-to-br from-pink-400 to-purple-400 text-white hover:shadow-lg scale-105'
                        : isToday
                        ? 'bg-blue-100 text-blue-600 border-2 border-blue-400'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                    title={checkInRecord ? checkInRecord.message : isToday ? '今天' : ''}
                  >
                    {day}
                    {isChecked && <div className="absolute text-xs">✓</div>}
                  </div>
                )
              }

              return days
            })()}
          </div>
          <div className="flex gap-4 mt-4 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-pink-400 to-purple-400"></div>
              <span>已签到</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-400"></div>
              <span>今天</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-50"></div>
              <span>未签到</span>
            </div>
          </div>
        </div>

        {/* 签到表单 */}
        {!todayChecked ? (
          <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">今日心情 ✍️</h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="记录今天的心情、发生的趣事、或是想说的话..."
              className="w-full p-4 border-2 border-pink-200 rounded-xl resize-none focus:outline-none focus:border-pink-400 transition-colors"
              rows={4}
            />
            <button
              onClick={handleCheckIn}
              className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all transform hover:scale-105"
            >
              签到打卡 ✨
            </button>
          </div>
        ) : (
          <div className="bg-green-100 border-2 border-green-400 rounded-2xl p-6 text-center mb-6">
            <div className="text-5xl mb-2">✅</div>
            <div className="text-xl font-bold text-green-700">今天已经签到啦！</div>
            <div className="text-sm text-green-600 mt-1">明天再来吧 💕</div>
          </div>
        )}

        {/* 签到记录 */}
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold mb-4 text-gray-800">签到记录 📝</h3>
          {checkIns.length === 0 ? (
            <div className="text-center text-gray-500 py-8">还没有签到记录，开始你的第一天吧！</div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {checkIns.map((record, index) => {
                const date = new Date(record.check_in_date)
                const dayNum = date.getDate()
                const challenge = challenges[(dayNum - 1) % 30]

                return (
                  <div
                    key={record.id}
                    className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 border-2 border-pink-200"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{challenge.emoji}</span>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{challenge.title}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(record.check_in_date).toLocaleDateString('zh-CN')}
                          {index === 0 && ' · 最新'}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 ml-11">{record.message}</p>
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
