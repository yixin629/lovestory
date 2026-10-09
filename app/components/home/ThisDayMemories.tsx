'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Memory {
  kind: 'photo' | 'diary' | 'note' | 'anniversary'
  id: string
  title: string
  subtitle?: string
  date: string
  yearsAgo: number
  imageUrl?: string
  emoji?: string
  href: string
}

export default function ThisDayMemories() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const today = new Date()
      const md = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const collected: Memory[] = []

      // Photos from same date past years
      try {
        const { data: photos } = await supabase
          .from('photos')
          .select('id, title, description, image_url, created_at')
          .order('created_at', { ascending: false })
          .limit(50)
        photos?.forEach((p: any) => {
          const dateStr = p.created_at
          if (!dateStr) return
          const d = new Date(dateStr)
          const pmd = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          if (pmd === md && d.getFullYear() < today.getFullYear()) {
            collected.push({
              kind: 'photo', id: String(p.id),
              title: p.title || '那时的回忆',
              subtitle: (p.description || '').slice(0, 40),
              date: dateStr.slice(0, 10),
              yearsAgo: today.getFullYear() - d.getFullYear(),
              imageUrl: p.image_url,
              emoji: '📸',
              href: '/photos',
            })
          }
        })
      } catch {}

      // Diary entries from same date past years
      try {
        const { data: diaries } = await supabase
          .from('diary_entries')
          .select('id, title, content, mood, date')
          .order('date', { ascending: false })
          .limit(100)
        diaries?.forEach((d: any) => {
          if (!d.date) return
          const dd = new Date(d.date)
          const pmd = `${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`
          if (pmd === md && dd.getFullYear() < today.getFullYear()) {
            collected.push({
              kind: 'diary', id: String(d.id),
              title: d.title || '日记',
              subtitle: (d.content || '').slice(0, 40),
              date: d.date,
              yearsAgo: today.getFullYear() - dd.getFullYear(),
              emoji: d.mood || '📖',
              href: '/diary',
            })
          }
        })
      } catch {}

      // Anniversaries matching today's MM-DD
      try {
        const { data: annivs } = await supabase
          .from('anniversaries')
          .select('id, title, date')
          .limit(50)
        annivs?.forEach((a: any) => {
          if (!a.date) return
          const ad = new Date(a.date)
          const pmd = `${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`
          if (pmd === md) {
            const years = today.getFullYear() - ad.getFullYear()
            collected.push({
              kind: 'anniversary', id: String(a.id),
              title: a.title,
              subtitle: years > 0 ? `${years} 周年纪念日！` : '今天是这个纪念日',
              date: a.date,
              yearsAgo: years,
              emoji: '💝',
              href: '/anniversaries',
            })
          }
        })
      } catch {}

      // Sort: anniversaries first, then by years ago descending
      collected.sort((a, b) => {
        if (a.kind === 'anniversary' && b.kind !== 'anniversary') return -1
        if (b.kind === 'anniversary' && a.kind !== 'anniversary') return 1
        return b.yearsAgo - a.yearsAgo
      })

      setMemories(collected.slice(0, 6))
    } catch (err) {
      console.debug('ThisDayMemories load failed', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || memories.length === 0) return null

  return (
    <div className="card-gradient mb-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">⏳</span>
        <h2 className="title-h3 title-gradient">那年今日</h2>
        <span className="badge-pink ml-auto">{memories.length} 条回忆</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {memories.map((m, i) => (
          <Link key={`${m.kind}-${m.id}-${i}`} href={m.href}>
            <div className="bg-white/70 hover:bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
              {m.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.imageUrl} alt={m.title} className="w-full h-24 object-cover" />
              ) : (
                <div className="w-full h-24 bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-4xl">
                  {m.emoji}
                </div>
              )}
              <div className="p-2.5">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-xs">{m.emoji}</span>
                  <span className="text-[10px] text-pink-600 font-bold">
                    {m.yearsAgo > 0 ? `${m.yearsAgo} 年前` : '今天'}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-800 truncate">{m.title}</div>
                {m.subtitle && (
                  <div className="text-xs text-gray-500 truncate">{m.subtitle}</div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
