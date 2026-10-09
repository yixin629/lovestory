'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { coupleChannel } from '@/lib/couple-interactions'
import { getUpcomingAnniversaryOccurrence, parseLocalDate } from '@/lib/anniversaries'
import {
  FEATURE_CATEGORIES,
  homeFeatures,
  quickAccessFeatures,
  type FeatureDefinition,
} from '@/lib/features'
import FeatureCard from '@/app/components/home/FeatureCard'
import RandomMemory from '@/app/components/home/RandomMemory'
import ThisDayMemories from '@/app/components/home/ThisDayMemories'
import { useToast } from '@/app/components/feedback/ToastProvider'

interface Stats {
  photos: number
  wishes: number
  checkIns: number
  /** 没有设置「在一起的日子」时为 null */
  daysTogether: number | null
  startDate: string | null
}

interface NextAnniversary {
  title: string
  date: string
  daysLeft: number
}

const groupedHomeFeatures = FEATURE_CATEGORIES.map((category) => ({
  ...category,
  features: homeFeatures.filter(
    (feature) => feature.category === category.id && feature.quickAccessOrder === undefined
  ),
})).filter((category) => category.features.length > 0)

export default function Home() {
  const { success, error: showError } = useToast()
  const { user: currentUser, me, partner, coupleId, inviteCode } = useAuth()
  const [stats, setStats] = useState<Stats>({
    photos: 0,
    wishes: 0,
    checkIns: 0,
    daysTogether: null,
    startDate: null,
  })
  const [dailyQuote, setDailyQuote] = useState('爱你，是我做过最好的决定 💕')
  const [nextAnniversary, setNextAnniversary] = useState<NextAnniversary | null>(null)
  const [unreadChat, setUnreadChat] = useState(0)
  const [unreadNotes, setUnreadNotes] = useState(0)

  const loadStats = useCallback(async () => {
    try {
      const [photosResult, wishesResult, checkInsResult, startResult] = await Promise.all([
        supabase.from('photos').select('*', { count: 'exact', head: true }),
        supabase.from('wishlist').select('*', { count: 'exact', head: true }),
        supabase.from('check_ins').select('*', { count: 'exact', head: true }),
        // 「在一起的日子」由纪念日页面标记 is_start
        supabase
          .from('anniversaries')
          .select('date')
          .eq('is_start', true)
          .order('date', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ])

      if (startResult.error) console.error('加载在一起的日子失败:', startResult.error)
      const startDate = startResult.data?.date ? parseLocalDate(startResult.data.date) : null
      const today = new Date()
      const daysTogether = startDate
        ? Math.max(
            0,
            Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          )
        : null

      setStats({
        photos: photosResult.count ?? 0,
        wishes: wishesResult.count ?? 0,
        checkIns: checkInsResult.count ?? 0,
        daysTogether,
        startDate: startDate
          ? startDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
          : null,
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }, [])

  const loadDailyQuote = useCallback(async () => {
    try {
      // 内置情话库 + 我们自己添加的情话
      const [libraryResult, customResult] = await Promise.all([
        supabase.from('love_quote_library').select('content').limit(50),
        supabase.from('love_quotes').select('content').limit(50),
      ])

      if (libraryResult.error) throw libraryResult.error
      if (customResult.error) throw customResult.error

      const data = [...(customResult.data ?? []), ...(libraryResult.data ?? [])]
      if (data.length > 0) {
        const randomQuote = data[Math.floor(Math.random() * data.length)]
        setDailyQuote(randomQuote.content)
      }
    } catch (error) {
      console.error('加载每日情话失败:', error)
    }
  }, [])

  const loadNextAnniversary = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('anniversaries')
        .select('title, date, recurring')

      if (error) throw error

      const candidates = (data ?? [])
        .map((anniversary) => {
          if (!anniversary.title) return null

          const occurrence = getUpcomingAnniversaryOccurrence(anniversary)
          if (!occurrence) return null

          return {
            title: anniversary.title,
            date: occurrence.date.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            daysLeft: occurrence.daysUntil,
          }
        })
        .filter((anniversary): anniversary is NextAnniversary => anniversary !== null)
        .sort((a, b) => a.daysLeft - b.daysLeft)

      setNextAnniversary(candidates[0] ?? null)
    } catch (error) {
      console.error('加载纪念日失败:', error)
    }
  }, [])

  const loadUnreadCounts = useCallback(async () => {
    try {
      if (!currentUser) return

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const [chatResult, notesResult] = await Promise.all([
        supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .neq('sender', currentUser)
          .eq('is_read', false),
        supabase
          .from('love_notes')
          .select('*', { count: 'exact', head: true })
          .neq('author', currentUser)
          .gte('created_at', yesterday.toISOString()),
      ])

      setUnreadChat(chatResult.count ?? 0)
      setUnreadNotes(notesResult.count ?? 0)
    } catch {
      // 可选数据表未初始化时，首页仍然保持可用。
    }
  }, [currentUser])

  useEffect(() => {
    void Promise.allSettled([
      loadStats(),
      loadDailyQuote(),
      loadNextAnniversary(),
      loadUnreadCounts(),
    ])

    const refreshUnread = () => {
      if (document.visibilityState === 'visible') void loadUnreadCounts()
    }
    const refreshUnreadOnFocus = () => void loadUnreadCounts()

    document.addEventListener('visibilitychange', refreshUnread)
    window.addEventListener('focus', refreshUnreadOnFocus)

    const chatChannel = coupleId
      ? supabase
          .channel(coupleChannel(coupleId, 'home_unread_chat'))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
            void loadUnreadCounts()
          })
          .subscribe()
      : null

    const notesChannel = coupleId
      ? supabase
          .channel(coupleChannel(coupleId, 'home_unread_notes'))
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'love_notes' },
            () => {
              void loadUnreadCounts()
            }
          )
          .subscribe()
      : null

    return () => {
      document.removeEventListener('visibilitychange', refreshUnread)
      window.removeEventListener('focus', refreshUnreadOnFocus)
      if (chatChannel) void supabase.removeChannel(chatChannel)
      if (notesChannel) void supabase.removeChannel(notesChannel)
    }
  }, [coupleId, loadDailyQuote, loadNextAnniversary, loadStats, loadUnreadCounts])

  const badgeForFeature = (feature: FeatureDefinition) => {
    if (feature.path === '/chat') return unreadChat
    if (feature.path === '/notes') return unreadNotes
    return 0
  }

  const worldName = `${me?.name ?? '我'}和${partner?.name ?? 'Ta'}的小世界`

  const copyAnniversary = async () => {
    if (!nextAnniversary) return

    const posterText = [
      nextAnniversary.title,
      `距离这个特殊的日子还有 ${nextAnniversary.daysLeft} 天`,
      nextAnniversary.date,
      `💕 ${worldName} 💕`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(posterText)
      success('纪念日文案已复制到剪贴板')
    } catch {
      showError('复制失败，请稍后重试')
    }
  }

  return (
    <main className="min-h-screen px-4 pb-6 pt-6 sm:px-6 md:pb-12 md:pt-10">
      <div className="mx-auto max-w-7xl">
        <header className="relative mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-pink-600 to-purple-700 px-5 py-8 text-center shadow-xl sm:px-8 sm:py-10 md:mb-9">
          <span
            className="pointer-events-none absolute -left-4 -top-8 text-8xl opacity-10"
            aria-hidden="true"
          >
            💕
          </span>
          <span
            className="pointer-events-none absolute -bottom-8 -right-4 text-8xl opacity-10"
            aria-hidden="true"
          >
            ✨
          </span>
          <p className="mb-2 text-sm font-semibold tracking-[0.24em] text-white/90 drop-shadow">
            OUR LITTLE WORLD
          </p>
          <h1 className="text-3xl font-black text-white drop-shadow-lg sm:text-4xl md:text-5xl">
            {worldName}
          </h1>
          <p className="mt-3 text-base text-white/90 drop-shadow sm:text-lg">
            今天也一起，把平凡生活过得闪闪发光
          </p>
        </header>

        {!partner && (
          <section
            className="card !rounded-3xl !p-5 mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            aria-label="邀请另一半"
          >
            <div>
              <p className="text-sm font-semibold text-pink-500">另一半还没有加入</p>
              <p className="mt-1 text-gray-700">
                把邀请码{' '}
                <strong className="rounded-lg bg-pink-50 px-2 py-0.5 font-mono text-lg tracking-widest text-primary">
                  {inviteCode ?? '—'}
                </strong>{' '}
                发给 Ta，让 Ta 注册后输入邀请码，就能一起使用啦 💕
              </p>
            </div>
            <Link href="/pair" className="btn-primary shrink-0 text-center">
              查看邀请方式
            </Link>
          </section>
        )}

        <section className="mb-8" aria-labelledby="quick-access-title">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">常用入口</p>
              <h2 id="quick-access-title" className="mt-1 text-xl font-bold text-gray-900">
                想做什么？
              </h2>
            </div>
            <span className="hidden text-sm text-gray-600 sm:block">最常用的功能放在这里</span>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-6">
            {quickAccessFeatures.map((feature) => (
              <div key={feature.path} className="min-w-[15rem] snap-start md:min-w-0">
                <FeatureCard
                  feature={feature}
                  variant="quick"
                  badge={badgeForFeature(feature)}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8" aria-labelledby="today-overview-title">
          <h2 id="today-overview-title" className="sr-only">
            今天的共同生活概览
          </h2>
          <div className="grid gap-4 lg:grid-cols-12">
            <article className="card !rounded-3xl !p-5 sm:!p-6 lg:col-span-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-pink-500">我们已经相爱</p>
                  <div className="mt-1 flex items-end gap-2">
                    <strong className="text-5xl font-black tracking-tight text-gray-900 sm:text-6xl">
                      {stats.daysTogether ?? '—'}
                    </strong>
                    <span className="pb-2 text-lg font-bold text-gray-500">天</span>
                  </div>
                  {stats.startDate ? (
                    <p className="mt-2 text-sm text-gray-500">从 {stats.startDate} 开始计算</p>
                  ) : (
                    <Link
                      href="/anniversaries"
                      className="mt-2 inline-flex text-sm font-semibold text-pink-600 hover:text-pink-700"
                    >
                      去纪念日里标记「在一起的日子」 <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>
                <span
                  className="flex h-20 w-20 items-center justify-center self-end rounded-full bg-gradient-to-br from-pink-100 via-rose-100 to-purple-100 text-4xl shadow-inner sm:self-auto"
                  aria-hidden="true"
                >
                  ❤️
                </span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { value: stats.photos, label: '共同回忆', icon: '📸' },
                  { value: stats.checkIns, label: '签到次数', icon: '💖' },
                  { value: stats.wishes, label: '心愿数量', icon: '✨' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-pink-50/80 p-3 text-center sm:p-4">
                    <span className="text-lg" aria-hidden="true">
                      {item.icon}
                    </span>
                    <strong className="mt-1 block text-xl font-black text-gray-900 sm:text-2xl">
                      {item.value}
                    </strong>
                    <span className="mt-0.5 block text-[11px] text-gray-500 sm:text-xs">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
              <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-pink-500 to-purple-500 p-5 text-white shadow-xl sm:p-6">
                <span
                  className="absolute -right-4 -top-6 text-8xl opacity-15"
                  aria-hidden="true"
                >
                  💝
                </span>
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white/80">下一个特别日子</p>
                    <Link
                      href="/anniversaries"
                      className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      全部纪念日
                    </Link>
                  </div>
                  {nextAnniversary ? (
                    <>
                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-black sm:text-2xl">
                            {nextAnniversary.title}
                          </h3>
                          <p className="mt-1 text-sm text-white/80">{nextAnniversary.date}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <strong className="block text-4xl font-black">
                            {nextAnniversary.daysLeft}
                          </strong>
                          <span className="text-xs text-white/80">
                            {nextAnniversary.daysLeft === 0 ? '就是今天' : '天后'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyAnniversary()}
                        className="mt-4 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        📋 复制纪念日文案
                      </button>
                    </>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-white/85">
                      还没有即将到来的纪念日，去记录一个值得期待的日子吧。
                    </p>
                  )}
                </div>
              </article>

              <article className="relative overflow-hidden rounded-3xl bg-white/90 p-5 shadow-lg backdrop-blur-sm sm:p-6">
                <span
                  className="absolute -bottom-3 -right-2 text-7xl opacity-10"
                  aria-hidden="true"
                >
                  “
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-500">今日情话</p>
                <blockquote className="relative mt-3 text-base font-semibold leading-7 text-gray-800">
                  “{dailyQuote}”
                </blockquote>
                <Link
                  href="/love-quotes"
                  className="mt-3 inline-flex text-sm font-semibold text-pink-600 transition hover:text-pink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                >
                  再抽一句 <span aria-hidden="true">→</span>
                </Link>
              </article>
            </div>
          </div>
        </section>

        <ThisDayMemories />

        <div className="space-y-6">
          {groupedHomeFeatures.map((category) => (
            <section
              key={category.id}
              className="rounded-3xl border border-white/50 bg-white/25 p-4 shadow-sm backdrop-blur-sm sm:p-5"
              aria-labelledby={`category-${category.id}`}
            >
              <div className="mb-4 flex items-start gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/85 text-2xl shadow-sm"
                  aria-hidden="true"
                >
                  {category.icon}
                </span>
                <div>
                  <h2
                    id={`category-${category.id}`}
                    className="text-xl font-black text-gray-900 sm:text-2xl"
                  >
                    {category.label}
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-600">{category.description}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {category.features.map((feature) => (
                  <FeatureCard
                    key={feature.path}
                    feature={feature}
                    badge={badgeForFeature(feature)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-8" aria-label="随机回忆">
          <RandomMemory />
        </section>

        <footer className="mt-12 text-center font-medium text-gray-600">
          <p className="text-base sm:text-lg">❤️ 愿我们的爱情永远甜蜜 ❤️</p>
        </footer>
      </div>
    </main>
  )
}
