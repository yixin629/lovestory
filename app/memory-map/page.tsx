'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import PageHeader from '@/app/components/ui/PageHeader'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { createCoupleNotification } from '@/lib/couple-interactions'
import { supabase } from '@/lib/supabase'

type SourceType = 'manual' | 'photo' | 'diary' | 'schedule'
interface MemoryPlace { id: string; title: string; location_name: string; latitude: number | null; longitude: number | null; memory_date: string; description: string | null; cover_url: string | null; source_type: SourceType; source_id: string | null; created_by: string }
interface SourceOption { id: string; type: SourceType; title: string; date: string; description?: string; image?: string; location?: string }
const initialDraft = { title: '', location_name: '', memory_date: new Date().toISOString().slice(0, 10), description: '', cover_url: '', latitude: '', longitude: '', source: '' }

export default function MemoryMapPage() {
  const { user, partner, nameOf } = useAuth()
  const toast = useToast()
  const [places, setPlaces] = useState<MemoryPlace[]>([])
  const [sources, setSources] = useState<SourceOption[]>([])
  const [selected, setSelected] = useState<MemoryPlace | null>(null)
  const [draft, setDraft] = useState(initialDraft)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    const [memoryResult, photoResult, diaryResult, scheduleResult] = await Promise.all([
      supabase.from('memory_places').select('*').order('memory_date', { ascending: false }),
      supabase.from('photos').select('id, title, description, image_url, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('diary_entries').select('id, title, content, date, photos').order('date', { ascending: false }).limit(50),
      supabase.from('schedules').select('id, title, description, event_date, location').order('event_date', { ascending: false }).limit(50),
    ])
    if (!memoryResult.error) {
      const next = (memoryResult.data ?? []) as MemoryPlace[]
      setPlaces(next); setSelected((current) => current ?? next[0] ?? null)
    }
    const photoSources: SourceOption[] = (photoResult.data ?? []).map((row) => ({ id: String(row.id), type: 'photo', title: `照片 · ${row.title || '未命名'}`, date: String(row.created_at).slice(0, 10), description: row.description || '', image: row.image_url || '' }))
    const diarySources: SourceOption[] = (diaryResult.data ?? []).map((row) => ({ id: String(row.id), type: 'diary', title: `日记 · ${row.title}`, date: String(row.date), description: row.content || '', image: Array.isArray(row.photos) ? row.photos[0] : '' }))
    const scheduleSources: SourceOption[] = (scheduleResult.data ?? []).map((row) => ({ id: String(row.id), type: 'schedule', title: `约会 · ${row.title}`, date: String(row.event_date).slice(0, 10), description: row.description || '', location: row.location || '' }))
    setSources([...photoSources, ...diarySources, ...scheduleSources])
  }, [])
  useEffect(() => { void load() }, [load])

  const linkedSource = useMemo(() => selected?.source_id ? sources.find((item) => item.id === selected.source_id && item.type === selected.source_type) : undefined, [selected, sources])
  const chooseSource = (value: string) => {
    const source = sources.find((item) => `${item.type}:${item.id}` === value)
    setDraft(source ? { ...draft, source: value, title: source.title.replace(/^.+ · /, ''), memory_date: source.date, description: source.description ?? '', cover_url: source.image ?? '', location_name: source.location ?? draft.location_name } : { ...draft, source: '' })
  }
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !draft.title.trim() || !draft.location_name.trim()) return
    const [sourceType = 'manual', sourceId] = draft.source.split(':')
    const payload = { created_by: user, title: draft.title.trim(), location_name: draft.location_name.trim(), memory_date: draft.memory_date, description: draft.description.trim(), cover_url: draft.cover_url.trim(), latitude: draft.latitude ? Number(draft.latitude) : null, longitude: draft.longitude ? Number(draft.longitude) : null, source_type: sourceType as SourceType, source_id: sourceId || null }
    const { data, error } = await supabase.from('memory_places').insert(payload).select().single()
    if (error) return toast.error('保存失败，请先执行最新数据库迁移')
    const memory = data as MemoryPlace
    setPlaces((current) => [memory, ...current]); setSelected(memory); setDraft(initialDraft); setShowForm(false)
    toast.success('这段回忆已经放到地图上')
    try { await createCoupleNotification({ actor: user, recipient: partner?.id, type: 'memory', title: '回忆地图有新地点', message: `把「${memory.title}」留在了 ${memory.location_name}`, link: '/memory-map' }) } catch { /* 记录已保存，通知失败不回滚 */ }
  }
  const deletePlace = async (place: MemoryPlace) => {
    if (!window.confirm(`删除「${place.title}」这个地图标记吗？原照片或日记不会被删除。`)) return
    const { error } = await supabase.from('memory_places').delete().eq('id', place.id)
    if (!error) { const next = places.filter((item) => item.id !== place.id); setPlaces(next); setSelected(next[0] ?? null); toast.success('地图标记已删除') }
  }
  const mapUrl = selected?.latitude != null && selected.longitude != null ? `https://www.openstreetmap.org/export/embed.html?bbox=${selected.longitude - 0.02}%2C${selected.latitude - 0.015}%2C${selected.longitude + 0.02}%2C${selected.latitude + 0.015}&layer=mapnik&marker=${selected.latitude}%2C${selected.longitude}` : null

  return <main className="min-h-screen px-4 pb-8 pt-20 sm:px-6"><div className="mx-auto max-w-7xl">
    <BackButton href="/" text="返回首页" />
    <div className="flex flex-wrap items-end justify-between gap-4"><PageHeader title="回忆地图" emoji="📍" subtitle="照片、日记和约会不只属于某一天，也属于我们一起走过的地方" className="!mb-0" /><button type="button" onClick={() => setShowForm((value) => !value)} className="btn-primary">{showForm ? '收起' : '＋ 添加回忆地点'}</button></div>
    {showForm && <form onSubmit={save} className="card my-6 grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2"><label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="memory-source">关联已有内容（可选）</label><select id="memory-source" value={draft.source} onChange={(e) => chooseSource(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3"><option value="">不关联，手动创建</option><optgroup label="照片">{sources.filter((x) => x.type === 'photo').map((x) => <option key={`${x.type}:${x.id}`} value={`${x.type}:${x.id}`}>{x.title} · {x.date}</option>)}</optgroup><optgroup label="日记">{sources.filter((x) => x.type === 'diary').map((x) => <option key={`${x.type}:${x.id}`} value={`${x.type}:${x.id}`}>{x.title} · {x.date}</option>)}</optgroup><optgroup label="约会日程">{sources.filter((x) => x.type === 'schedule').map((x) => <option key={`${x.type}:${x.id}`} value={`${x.type}:${x.id}`}>{x.title} · {x.date}</option>)}</optgroup></select></div>
      <Field label="回忆标题" value={draft.title} onChange={(value) => setDraft({ ...draft, title: value })} required /><Field label="地点名称" value={draft.location_name} onChange={(value) => setDraft({ ...draft, location_name: value })} placeholder="例如：南岸公园" required /><Field label="日期" value={draft.memory_date} onChange={(value) => setDraft({ ...draft, memory_date: value })} type="date" required /><Field label="封面图片网址（可选）" value={draft.cover_url} onChange={(value) => setDraft({ ...draft, cover_url: value })} /><Field label="纬度（可选，有坐标会显示真实地图）" value={draft.latitude} onChange={(value) => setDraft({ ...draft, latitude: value })} type="number" step="any" /><Field label="经度（可选）" value={draft.longitude} onChange={(value) => setDraft({ ...draft, longitude: value })} type="number" step="any" />
      <div className="md:col-span-2"><label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="memory-description">当天的文字</label><textarea id="memory-description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={4} className="w-full rounded-xl border border-gray-200 px-3 py-3" /></div><button type="submit" className="btn-primary md:col-span-2">保存到回忆地图</button>
    </form>}
    <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
      <aside className="card max-h-[72vh] overflow-y-auto"><h2 className="mb-4 text-lg font-bold text-gray-800">去过的地方 <span className="text-sm font-normal text-gray-400">{places.length}</span></h2>{places.length === 0 ? <div className="py-12 text-center text-gray-500"><div className="mb-2 text-5xl">🗺️</div>第一段地图回忆，等你放上来</div> : <div className="space-y-2">{places.map((place) => <button type="button" key={place.id} onClick={() => setSelected(place)} className={`w-full rounded-2xl border p-3 text-left transition ${selected?.id === place.id ? 'border-pink-300 bg-pink-50 shadow-sm' : 'border-gray-100 hover:border-pink-200'}`}><div className="flex items-center justify-between gap-2"><strong className="truncate text-gray-800">📍 {place.location_name}</strong><span className="shrink-0 text-xs text-gray-400">{place.memory_date}</span></div><p className="mt-1 truncate text-sm text-gray-600">{place.title}</p></button>)}</div>}</aside>
      <section className="card overflow-hidden !p-0">{selected ? <>{mapUrl ? <iframe title={`${selected.location_name}地图`} src={mapUrl} className="h-72 w-full border-0 sm:h-96" loading="lazy" /> : <div className="grid h-72 place-items-center bg-gradient-to-br from-emerald-100 via-sky-100 to-amber-100 sm:h-96"><div className="text-center"><div className="text-7xl">📍</div><p className="mt-3 text-xl font-black text-gray-700">{selected.location_name}</p><p className="mt-1 text-sm text-gray-500">补充经纬度后可显示真实地图</p></div></div>}<div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:p-7"><div>{selected.cover_url && <div className="mb-5 aspect-[16/7] rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url("${selected.cover_url.replace(/["\\\n\r]/g, '')}")` }} role="img" aria-label={`${selected.title}的封面`} />}<p className="text-sm font-semibold text-pink-600">{selected.memory_date} · {nameOf(selected.created_by)}</p><h2 className="mt-1 text-2xl font-black text-gray-800">{selected.title}</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-gray-600">{selected.description || linkedSource?.description || '那天的故事还没有写下来。'}</p>{linkedSource && <p className="mt-4 inline-flex rounded-full bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-700">🔗 已关联：{linkedSource.title}</p>}</div><button type="button" onClick={() => void deletePlace(selected)} className="self-start text-sm text-gray-400 hover:text-red-500">删除地图标记</button></div></> : <div className="grid min-h-[28rem] place-items-center text-center text-gray-500"><div><div className="text-6xl">🧭</div><p className="mt-3">选择一个地点查看回忆</p></div></div>}</section>
    </div>
  </div></main>
}

function Field({ label, value, onChange, type = 'text', placeholder, required, step }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean; step?: string }) {
  const id = `memory-${label}`
  return <div><label htmlFor={id} className="mb-1 block text-sm font-semibold text-gray-700">{label}</label><input id={id} type={type} step={step} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className="w-full rounded-xl border border-gray-200 px-3 py-3" /></div>
}
