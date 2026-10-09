'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

// 惊喜消息列表
const surpriseMessages = [
  { emoji: '💕', message: '今天也要开开心心的哦！' },
  { emoji: '🌟', message: '遇见你是我最大的幸运' },
  { emoji: '🎉', message: '惊喜！发现一个小彩蛋~' },
  { emoji: '💖', message: '爱你爱到月亮再回来' },
  { emoji: '🌈', message: '有你的每一天都是晴天' },
  { emoji: '✨', message: '你是我的小幸运呀' },
  { emoji: '🎈', message: '今天的你也超级可爱！' },
  { emoji: '🌺', message: '想和你一起看遍世界的美好' },
  { emoji: '💝', message: '我们的爱情会一直甜蜜下去' },
  { emoji: '⭐', message: '你是我生命中最闪耀的星' },
]

// 节日特殊消息
const getHolidayMessage = () => {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()

  if (month === 2 && day === 14) return { emoji: '💘', message: '情人节快乐！永远爱你~' }
  if (month === 5 && day === 20) return { emoji: '💕', message: '520，我爱你！' }
  if (month === 8 && day === 7) return { emoji: '💑', message: '七夕快乐！愿我们永远在一起' }
  if (month === 12 && day === 25) return { emoji: '🎄', message: '圣诞快乐！最好的礼物就是有你' }
  if (month === 1 && day === 1) return { emoji: '🎆', message: '新年快乐！新的一年继续爱你' }

  return null
}

export default function RandomSurprise() {
  const [surprise, setSurprise] = useState<{ emoji: string; message: string } | null>(null)
  const [show, setShow] = useState(false)
  const pathname = usePathname()
  const immersiveGame = pathname.startsWith('/mahjong/') || pathname === '/dream-journey'

  useEffect(() => {
    let revealTimer: ReturnType<typeof setTimeout> | undefined
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    let removeTimer: ReturnType<typeof setTimeout> | undefined

    setShow(false)
    setSurprise(null)

    if (immersiveGame) return

    // 10% 概率触发惊喜
    const shouldShowSurprise = Math.random() < 0.1

    if (shouldShowSurprise) {
      // 检查是否是特殊节日
      const holidayMsg = getHolidayMessage()

      if (holidayMsg) {
        setSurprise(holidayMsg)
      } else {
        // 随机选择一条惊喜消息
        const randomMsg = surpriseMessages[Math.floor(Math.random() * surpriseMessages.length)]
        setSurprise(randomMsg)
      }

      // 延迟显示，制造惊喜感
      revealTimer = setTimeout(() => {
        setShow(true)

        // 振动反馈
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!reduceMotion && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100])
        }

        // 3秒后自动消失
        hideTimer = setTimeout(() => {
          setShow(false)
          removeTimer = setTimeout(() => setSurprise(null), reduceMotion ? 0 : 500)
        }, 3000)
      }, 500)
    }

    return () => {
      if (revealTimer) clearTimeout(revealTimer)
      if (hideTimer) clearTimeout(hideTimer)
      if (removeTimer) clearTimeout(removeTimer)
    }
  }, [immersiveGame, pathname]) // 每次页面切换时重新检查

  if (immersiveGame || !surprise) return null

  return (
    <div
      className={`fixed left-1/2 top-20 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 transform transition-all duration-500 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-4 py-3 text-white shadow-2xl animate-bounce-slow sm:px-6 sm:py-4">
        <span className="text-3xl animate-spin-slow sm:text-4xl" aria-hidden="true">
          {surprise.emoji}
        </span>
        <p className="flex-1 text-sm font-medium sm:text-lg">{surprise.message}</p>
        <button
          type="button"
          onClick={() => {
            setShow(false)
            setSurprise(null)
          }}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-2xl text-white/90 hover:bg-white/15 hover:text-white"
          aria-label="关闭惊喜消息"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  )
}
