'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { coupleChannel } from '@/lib/couple-interactions'

interface CoupleNotification {
  id: string
  actor: string
  notification_type: string
  title: string
  message: string
  link: string | null
  read_at: string | null
  created_at: string
}

export default function NotificationCenter() {
  const { user, coupleId, nameOf } = useAuth()
  const pathname = usePathname()
  const [items, setItems] = useState<CoupleNotification[]>([])
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    // 未配对用户（/pair、/settings）也会渲染本组件，此时不查询
    if (!user || !coupleId) {
      setItems([])
      return
    }
    const { data, error } = await supabase
      .from('couple_notifications')
      .select('id, actor, notification_type, title, message, link, read_at, created_at')
      .eq('recipient', user)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      console.error('读取互动通知失败:', error)
      return
    }
    setItems((data ?? []) as CoupleNotification[])
  }, [user, coupleId])

  useEffect(() => {
    void load()
    if (!user || !coupleId) return
    const channel = supabase
      .channel(coupleChannel(coupleId, `couple-notifications-${user}`))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'couple_notifications', filter: `recipient=eq.${user}` },
        () => void load()
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load, user, coupleId])

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!user || !coupleId || pathname === '/login' || pathname === '/chat' || pathname.startsWith('/mahjong/') || pathname === '/dream-journey') return null

  const unread = items.filter((item) => !item.read_at).length
  const markRead = async (id: string) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read_at: new Date().toISOString() } : item)))
    await supabase.from('couple_notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  }
  const markAllRead = async () => {
    const now = new Date().toISOString()
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })))
    await supabase.from('couple_notifications').update({ read_at: now }).eq('recipient', user).is('read_at', null)
  }

  return (
    <div ref={panelRef} className="fixed right-[5.75rem] top-3 z-50 sm:right-[10rem] sm:top-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-11 w-11 place-items-center rounded-full border border-pink-100 bg-white/95 text-xl shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl"
        aria-label={`互动通知${unread ? `，${unread} 条未读` : ''}`}
        aria-expanded={open}
      >
        🔔
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <section className="absolute right-0 mt-2 w-[min(23rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-2xl" aria-label="互动通知列表">
          <header className="flex items-center justify-between border-b border-pink-100 bg-gradient-to-r from-pink-50 to-purple-50 px-4 py-3">
            <div>
              <h2 className="font-bold text-gray-800">我们的消息</h2>
              <p className="text-xs text-gray-500">礼物、互动和共同记录都在这里</p>
            </div>
            {unread > 0 && <button type="button" onClick={() => void markAllRead()} className="text-xs font-semibold text-primary hover:underline">全部已读</button>}
          </header>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500"><div className="mb-2 text-4xl">💌</div>还没有新消息</div>
            ) : items.map((item) => {
              const content = (
                <div className={`rounded-xl px-3 py-3 transition hover:bg-pink-50 ${item.read_at ? '' : 'bg-rose-50/70'}`}>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-xl" aria-hidden="true">{item.notification_type === 'gift' ? '🎁' : item.notification_type === 'memory' ? '📍' : '💞'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><p className="font-semibold text-gray-800">{item.title}</p>{!item.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />}</div>
                      <p className="mt-1 text-sm leading-5 text-gray-600">{nameOf(item.actor)}：{item.message}</p>
                      <time className="mt-1 block text-[11px] text-gray-400">{new Date(item.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                    </div>
                  </div>
                </div>
              )
              return item.link ? <Link key={item.id} href={item.link} onClick={() => void markRead(item.id)}>{content}</Link> : <button key={item.id} type="button" onClick={() => void markRead(item.id)} className="block w-full text-left">{content}</button>
            })}
          </div>
        </section>
      )}
    </div>
  )
}
