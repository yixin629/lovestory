'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'

interface ZodiacSign {
  name: string
  emoji: string
  dates: string
  element: string
}

const ZODIAC_SIGNS: ZodiacSign[] = [
  { name: '白羊座', emoji: '♈', dates: '3/21-4/19', element: '火' },
  { name: '金牛座', emoji: '♉', dates: '4/20-5/20', element: '土' },
  { name: '双子座', emoji: '♊', dates: '5/21-6/21', element: '风' },
  { name: '巨蟹座', emoji: '♋', dates: '6/22-7/22', element: '水' },
  { name: '狮子座', emoji: '♌', dates: '7/23-8/22', element: '火' },
  { name: '处女座', emoji: '♍', dates: '8/23-9/22', element: '土' },
  { name: '天秤座', emoji: '♎', dates: '9/23-10/23', element: '风' },
  { name: '天蝎座', emoji: '♏', dates: '10/24-11/22', element: '水' },
  { name: '射手座', emoji: '♐', dates: '11/23-12/21', element: '火' },
  { name: '摩羯座', emoji: '♑', dates: '12/22-1/19', element: '土' },
  { name: '水瓶座', emoji: '♒', dates: '1/20-2/18', element: '风' },
  { name: '双鱼座', emoji: '♓', dates: '2/19-3/20', element: '水' },
]

const LUCKY_COLORS = ['红色', '粉色', '紫色', '蓝色', '绿色', '黄色', '橙色', '白色']
const LOVE_FORTUNES = [
  '今日恋爱运势极佳，适合表白或约会！',
  '感情稳定发展，多关心对方会更甜蜜。',
  '可能会有小摩擦，保持耐心和理解。',
  '浪漫惊喜即将到来，保持期待！',
  '适合深入沟通，增进彼此了解。',
  '爱意满满的一天，大胆表达爱意吧！',
]

const DAILY_ADVICE = [
  '主动制造浪漫，给对方一个惊喜',
  '倾听对方的心声，理解比建议更重要',
  '一起做一件有趣的事，增进感情',
  '适度的空间能让感情更健康',
  '真诚的赞美能温暖对方的心',
  '小小的关怀胜过千言万语',
]

export default function HoroscopePage() {
  const toast = useToast()
  const { user, partner } = useAuth()
  const [myZodiac, setMyZodiac] = useState<ZodiacSign | null>(null)
  const [partnerZodiac, setPartnerZodiac] = useState<ZodiacSign | null>(null)
  const [myReading, setMyReading] = useState<any>(null)
  const [partnerReading, setPartnerReading] = useState<any>(null)

  // 生成今日运势
  const generateReading = async (zodiac: ZodiacSign, isPartner: boolean) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const userId = isPartner ? partner?.id : user
      if (!userId) {
        toast.warning(isPartner ? '等另一半加入后才能查看 TA 的运势' : '请先登录')
        return
      }

      // 检查今天是否已生成
      const { data: existing } = await supabase
        .from('horoscope_readings')
        .select('*')
        .eq('user_id', userId)
        .eq('zodiac_sign', zodiac.name)
        .eq('reading_date', today)
        .maybeSingle()

      if (existing) {
        if (isPartner) {
          setPartnerReading(existing)
        } else {
          setMyReading(existing)
        }
        return
      }

      // 生成新运势
      const reading = {
        user_id: userId,
        zodiac_sign: zodiac.name,
        reading_date: today,
        love_fortune: LOVE_FORTUNES[Math.floor(Math.random() * LOVE_FORTUNES.length)],
        lucky_color: LUCKY_COLORS[Math.floor(Math.random() * LUCKY_COLORS.length)],
        lucky_number: Math.floor(Math.random() * 100) + 1,
        compatibility_score: Math.floor(Math.random() * 30) + 70,
        daily_advice: DAILY_ADVICE[Math.floor(Math.random() * DAILY_ADVICE.length)],
      }

      const { data, error } = await supabase
        .from('horoscope_readings')
        .insert([reading])
        .select()
        .single()

      if (error) throw error

      if (isPartner) {
        setPartnerReading(data)
      } else {
        setMyReading(data)
      }

      toast.success(`${zodiac.name}运势生成成功！`)
    } catch (error) {
      console.error('生成运势失败:', error)
    }
  }

  const handleZodiacSelect = async (zodiac: ZodiacSign, isPartner: boolean) => {
    if (isPartner) {
      setPartnerZodiac(zodiac)
    } else {
      setMyZodiac(zodiac)
    }

    await generateReading(zodiac, isPartner)

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }

  const getCompatibilityLevel = (score: number) => {
    if (score >= 90) return { text: '天生一对', color: 'text-red-600' }
    if (score >= 80) return { text: '非常契合', color: 'text-pink-600' }
    return { text: '相处融洽', color: 'text-purple-600' }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card">
          <h1 className="text-4xl font-bold text-primary mb-2 text-center">⭐ 星座运势</h1>
          <p className="text-gray-600 mb-8 text-center">查看你们的每日双人运势和配对指数</p>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* 我的星座 */}
            <div>
              <h3 className="font-bold text-xl mb-4 text-center text-gray-800">我的星座</h3>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {ZODIAC_SIGNS.map((zodiac) => (
                  <button
                    key={zodiac.name}
                    onClick={() => handleZodiacSelect(zodiac, false)}
                    className={`p-4 rounded-xl transition-all ${
                      myZodiac?.name === zodiac.name
                        ? 'bg-primary text-white shadow-lg scale-105'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-3xl mb-1">{zodiac.emoji}</div>
                    <div className="text-sm font-semibold">{zodiac.name}</div>
                    <div className="text-xs opacity-70">{zodiac.dates}</div>
                  </button>
                ))}
              </div>

              {myReading && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 space-y-4">
                  <div className="text-center">
                    <span className="text-5xl">{myZodiac?.emoji}</span>
                    <h4 className="font-bold text-xl mt-2">{myZodiac?.name}</h4>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">💖 恋爱运势</p>
                    <p className="text-gray-800">{myReading.love_fortune}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white bg-opacity-60 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">幸运色</p>
                      <p className="font-semibold">{myReading.lucky_color}</p>
                    </div>
                    <div className="bg-white bg-opacity-60 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">幸运数字</p>
                      <p className="font-semibold">{myReading.lucky_number}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">💡 今日建议</p>
                    <p className="text-gray-800">{myReading.daily_advice}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 对方的星座 */}
            <div>
              <h3 className="font-bold text-xl mb-4 text-center text-gray-800">{partner ? `${partner.name}的星座` : 'TA的星座'}</h3>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {ZODIAC_SIGNS.map((zodiac) => (
                  <button
                    key={zodiac.name}
                    onClick={() => handleZodiacSelect(zodiac, true)}
                    className={`p-4 rounded-xl transition-all ${
                      partnerZodiac?.name === zodiac.name
                        ? 'bg-pink-500 text-white shadow-lg scale-105'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-3xl mb-1">{zodiac.emoji}</div>
                    <div className="text-sm font-semibold">{zodiac.name}</div>
                    <div className="text-xs opacity-70">{zodiac.dates}</div>
                  </button>
                ))}
              </div>

              {partnerReading && (
                <div className="bg-gradient-to-br from-pink-50 to-red-50 rounded-2xl p-6 space-y-4">
                  <div className="text-center">
                    <span className="text-5xl">{partnerZodiac?.emoji}</span>
                    <h4 className="font-bold text-xl mt-2">{partnerZodiac?.name}</h4>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">💖 恋爱运势</p>
                    <p className="text-gray-800">{partnerReading.love_fortune}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white bg-opacity-60 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">幸运色</p>
                      <p className="font-semibold">{partnerReading.lucky_color}</p>
                    </div>
                    <div className="bg-white bg-opacity-60 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">幸运数字</p>
                      <p className="font-semibold">{partnerReading.lucky_number}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">💡 今日建议</p>
                    <p className="text-gray-800">{partnerReading.daily_advice}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 配对分析 */}
          {myReading && partnerReading && (
            <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 rounded-3xl p-8">
              <h3 className="font-bold text-2xl mb-6 text-center text-gray-800">💕 星座配对分析</h3>
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="text-center">
                  <span className="text-5xl">{myZodiac?.emoji}</span>
                  <p className="font-semibold mt-2">{myZodiac?.name}</p>
                </div>
                <span className="text-4xl">💝</span>
                <div className="text-center">
                  <span className="text-5xl">{partnerZodiac?.emoji}</span>
                  <p className="font-semibold mt-2">{partnerZodiac?.name}</p>
                </div>
              </div>

              {(() => {
                const avgScore = Math.round(
                  (myReading.compatibility_score + partnerReading.compatibility_score) / 2
                )
                const level = getCompatibilityLevel(avgScore)
                return (
                  <div className="bg-white rounded-2xl p-6 text-center">
                    <div className="text-6xl font-bold text-primary mb-2">{avgScore}%</div>
                    <p className={`text-2xl font-semibold mb-4 ${level.color}`}>{level.text}</p>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-pink-500 to-red-500 h-4 rounded-full transition-all duration-1000"
                        style={{ width: `${avgScore}%` }}
                      />
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
