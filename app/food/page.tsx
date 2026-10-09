'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import PageHeader from '@/app/components/ui/PageHeader'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { createCoupleNotification } from '@/lib/couple-interactions'
import { supabase } from '@/lib/supabase'
import type { CoupleMember } from '@/app/components/providers/AuthProvider'

type Kind = 'choice' | 'punishment'
type WheelOption = {
  id: string
  label: string
  emoji: string
  kind: Kind
  category: string
  custom?: boolean
  wheelType?: string
}
type Preset = {
  id: string
  label: string
  icon: string
  question: string
  color: string
  fallback: WheelOption[]
}

const option = (id: string, emoji: string, label: string): WheelOption => ({
  id, emoji, label, kind: 'choice', category: '基础选项',
})

// 仅在内置目录表（food_options / decision_option_presets）读取失败时兜底；正常情况下以数据库内容为准。
// 「谁洗碗」「谁先道歉」「今天听谁的」里与具体人相关的选项由 personalChoices 根据当前情侣生成。
const PRESETS: Preset[] = [
  { id: 'food', label: '今晚吃什么', icon: '🍜', question: '今晚就吃……', color: 'from-orange-400 to-rose-500', fallback: [option('fallback-f1', '🍲', '火锅'), option('fallback-f2', '🥩', '烤肉'), option('fallback-f3', '🍣', '寿司'), option('fallback-f4', '🍕', '披萨')] },
  { id: 'dishes', label: '谁洗碗', icon: '🫧', question: '今天洗碗的是……', color: 'from-cyan-400 to-blue-500', fallback: [option('fallback-d3', '🫶', '一起洗'), option('fallback-d4', '✊', '猜拳决定')] },
  { id: 'movie', label: '看什么电影', icon: '🎬', question: '今晚的片单是……', color: 'from-violet-500 to-fuchsia-500', fallback: [option('fallback-m1', '😂', '喜剧'), option('fallback-m2', '💥', '动作片'), option('fallback-m3', '💗', '爱情片'), option('fallback-m4', '🚀', '科幻片')] },
  { id: 'weekend', label: '周末去哪', icon: '🗺️', question: '周末目的地是……', color: 'from-emerald-400 to-teal-500', fallback: [option('fallback-w1', '🏠', '宅家做饭'), option('fallback-w2', '🌳', '公园散步'), option('fallback-w3', '☕', '探一家咖啡店'), option('fallback-w4', '🚗', '周边一日游')] },
  { id: 'apology', label: '谁先道歉', icon: '🤝', question: '先迈出一步的是……', color: 'from-pink-400 to-rose-500', fallback: [option('fallback-a3', '🫂', '先抱抱再一起说'), option('fallback-a4', '💌', '各写一句真心话')] },
  { id: 'boss', label: '今天听谁的', icon: '👑', question: '今天的决定权属于……', color: 'from-amber-400 to-orange-500', fallback: [option('fallback-b3', '🔁', '一人决定一件'), option('fallback-b4', '🎲', '再转一次')] },
]

const PERSONAL_TEMPLATES: Record<string, { category: string; label: (name: string) => string }> = {
  dishes: { category: '直接决定', label: (name) => `${name} 洗碗` },
  apology: { category: '谁先开口', label: (name) => `${name} 先道歉` },
  boss: { category: '今日主理人', label: (name) => `今天听 ${name} 的` },
}

// 头像可能是图片 URL，转盘里只能展示 emoji
function personalChoices(wheelId: string, members: (CoupleMember | null)[]): WheelOption[] {
  const template = PERSONAL_TEMPLATES[wheelId]
  if (!template) return []
  return members
    .filter((member): member is CoupleMember => Boolean(member))
    .map((member, index) => ({
      id: `personal-${wheelId}-${member.id}`,
      label: template.label(member.name),
      emoji: member.avatar.startsWith('http') ? (index === 0 ? '🙋' : '💁') : member.avatar,
      kind: 'choice',
      category: template.category,
    }))
}

export default function FoodPage() {
  const { user, me, partner } = useAuth()
  const toast = useToast()
  const [wheelId, setWheelId] = useState('food')
  const [databaseOptions, setDatabaseOptions] = useState<WheelOption[]>([])
  const [legacyFoods, setLegacyFoods] = useState<WheelOption[]>([])
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [draft, setDraft] = useState({ label: '', emoji: '✨', kind: 'choice' as Kind })
  const [result, setResult] = useState<WheelOption | null>(null)
  const [punishment, setPunishment] = useState<WheelOption | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const preset = PRESETS.find((item) => item.id === wheelId) ?? PRESETS[0]

  const loadOptions = useCallback(async () => {
    // food_options、decision_option_presets 是所有情侣共享的只读目录；decision_options 是本情侣的自定义内容
    const [foodResult, presetResult, customResult] = await Promise.all([
      supabase.from('food_options').select('id, name, category, emoji').order('category').order('name'),
      supabase.from('decision_option_presets').select('id, wheel_type, option_kind, label, emoji, category').order('sort_order'),
      supabase.from('decision_options').select('id, wheel_type, option_kind, label, emoji, category').order('created_at'),
    ])
    if (foodResult.error) console.error('读取食物目录失败:', foodResult.error)
    if (presetResult.error) console.error('读取内置转盘选项失败:', presetResult.error)
    if (customResult.error) {
      console.error('读取自定义转盘选项失败:', customResult.error)
      toast.error('读取自定义选项失败，请稍后再试')
    }

    setLegacyFoods((foodResult.data ?? []).map((row) => ({
      id: `food-${String(row.id)}`,
      label: String(row.name),
      emoji: String(row.emoji || '🍱'),
      kind: 'choice',
      category: String(row.category || '其他'),
      wheelType: 'food',
    })))

    const toOption = (custom: boolean) => (row: Record<string, unknown>): WheelOption => ({
      id: `${custom ? '' : 'preset-'}${String(row.id)}`,
      label: String(row.label),
      emoji: String(row.emoji || '✨'),
      kind: row.option_kind as Kind,
      category: String(row.category || '自定义'),
      custom,
      wheelType: String(row.wheel_type),
    })
    setDatabaseOptions([
      ...(presetResult.data ?? []).map(toOption(false)),
      ...(customResult.data ?? []).map(toOption(true)),
    ])
  }, [toast])

  useEffect(() => { void loadOptions() }, [loadOptions])
  useEffect(() => {
    setResult(null)
    setPunishment(null)
    setSelectedCategory('全部')
  }, [wheelId])

  const wheelDatabaseOptions = useMemo(
    () => databaseOptions.filter((item) => item.wheelType === wheelId),
    [databaseOptions, wheelId],
  )
  const storedChoices = useMemo(
    () => [
      ...(wheelId === 'food' ? legacyFoods : []),
      ...wheelDatabaseOptions.filter((item) => item.kind === 'choice'),
    ],
    [legacyFoods, wheelDatabaseOptions, wheelId],
  )
  const allChoices = useMemo(
    () => [...personalChoices(wheelId, [me, partner]), ...(storedChoices.length > 0 ? storedChoices : preset.fallback)],
    [wheelId, me, partner, storedChoices, preset.fallback],
  )
  const categories = useMemo(
    () => ['全部', ...Array.from(new Set(allChoices.map((item) => item.category)))],
    [allChoices],
  )
  const choices = useMemo(
    () => selectedCategory === '全部' ? allChoices : allChoices.filter((item) => item.category === selectedCategory),
    [allChoices, selectedCategory],
  )
  const punishments = wheelDatabaseOptions.filter((item) => item.kind === 'punishment')
  const usingFallback = storedChoices.length === 0

  const spin = () => {
    if (spinning || !choices.length) return
    setSpinning(true)
    setResult(null)
    setPunishment(null)
    const chosen = choices[Math.floor(Math.random() * choices.length)]
    setRotation((value) => value + 1440 + Math.floor(Math.random() * 360))
    window.setTimeout(() => {
      setResult(chosen)
      setPunishment(punishments.length ? punishments[Math.floor(Math.random() * punishments.length)] : null)
      setSpinning(false)
    }, 1500)
  }

  const add = async () => {
    if (!user || !draft.label.trim()) return
    const { error } = await supabase.from('decision_options').insert({
      user_id: user,
      wheel_type: wheelId,
      option_kind: draft.kind,
      label: draft.label.trim(),
      emoji: draft.emoji.trim() || '✨',
    })
    if (error) return toast.error('保存失败，请先执行最新数据库迁移')
    setDraft((value) => ({ ...value, label: '' }))
    await loadOptions()
    toast.success(draft.kind === 'choice' ? '选项已存入数据库' : '小惩罚已存入数据库')
  }

  const remove = async (item: WheelOption) => {
    if (!item.custom) return
    const { error } = await supabase.from('decision_options').delete().eq('id', item.id)
    if (error) return toast.error('删除失败，请稍后再试')
    setDatabaseOptions((items) => items.filter((current) => current.id !== item.id))
    toast.success('自定义内容已删除')
  }

  const share = async () => {
    if (!user || !result) return
    if (!partner) {
      toast.warning('等另一半加入后才能告诉 TA')
      return
    }
    try {
      await createCoupleNotification({
        actor: user,
        recipient: partner?.id,
        type: 'wheel',
        title: `${preset.icon} ${preset.label}有结果了`,
        message: `${result.emoji} ${result.label}${punishment ? `；附加挑战：${punishment.emoji} ${punishment.label}` : ''}`,
        link: '/food',
        metadata: { wheelId, result: result.label },
      })
      toast.success('结果已经告诉对方啦')
    } catch {
      toast.error('发送失败，请检查数据库迁移')
    }
  }

  return (
    <main className="min-h-screen px-4 pb-8 pt-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <BackButton href="/" text="返回首页" />
        <PageHeader title="万能转盘" emoji="🎡" subtitle="所有选项都从数据库读取，难选的事交给一点运气" />

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2" aria-label="选择转盘主题">
          {PRESETS.map((item) => (
            <button key={item.id} type="button" onClick={() => setWheelId(item.id)} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${wheelId === item.id ? 'bg-gray-900 text-white shadow-lg' : 'border border-gray-200 bg-white text-gray-600 hover:border-pink-300'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <section className="card overflow-hidden !p-0">
            <div className={`bg-gradient-to-br ${preset.color} px-5 py-8 text-center text-white sm:px-8`}>
              <p className="text-sm font-medium text-white/80">{preset.question}</p>
              <p className="mt-1 text-xs font-semibold text-white/75">当前将从 {choices.length} 个选项中抽取</p>
              <div className="relative mx-auto my-6 h-64 w-64 sm:h-72 sm:w-72">
                <div className="absolute left-1/2 top-[-8px] z-10 -translate-x-1/2 text-4xl drop-shadow">🔻</div>
                <div className="grid h-full w-full place-items-center rounded-full border-[10px] border-white/90 bg-[conic-gradient(#fda4af_0_45deg,#fde68a_45deg_90deg,#86efac_90deg_135deg,#93c5fd_135deg_180deg,#c4b5fd_180deg_225deg,#f9a8d4_225deg_270deg,#fdba74_270deg_315deg,#67e8f9_315deg)] shadow-2xl transition-transform duration-[1500ms] ease-out" style={{ transform: `rotate(${rotation}deg)` }}>
                  <div className="grid h-28 w-28 place-items-center rounded-full border-4 border-white bg-white/95 text-center text-gray-800 shadow-lg">
                    <span><span className="block text-4xl">{spinning ? '✨' : result?.emoji ?? preset.icon}</span><span className="mt-1 block max-w-20 text-xs font-bold">{spinning ? '转动中' : result?.label ?? '准备好'}</span></span>
                  </div>
                </div>
              </div>
              <button type="button" onClick={spin} disabled={spinning || choices.length === 0} className="rounded-full bg-white px-10 py-3.5 text-lg font-black text-gray-900 shadow-xl transition hover:-translate-y-0.5 disabled:opacity-60">{spinning ? '命运正在选择…' : '开始转动'}</button>
            </div>
            {result && (
              <div className="p-5 text-center">
                <p className="text-sm text-gray-500">本次结果</p>
                <p className="mt-1 text-2xl font-black text-gray-800">{result.emoji} {result.label}</p>
                {punishment && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">附加挑战：{punishment.emoji} {punishment.label}</p>}
                <button type="button" onClick={() => void share()} className="mt-4 rounded-full bg-pink-100 px-5 py-2 text-sm font-bold text-pink-700 hover:bg-pink-200">💌 告诉对方</button>
              </div>
            )}
          </section>

          <section className="card min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-bold text-gray-800">这个转盘的内容</h2><p className="mt-1 text-sm text-gray-500">已读取 {allChoices.length} 个选项；只有你添加的内容可以删除。</p></div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">数据库同步</span>
            </div>

            {usingFallback && <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">当前显示备用选项。执行 database/setup/04-interactions.sql 后会自动显示完整内置选项。</p>}

            {categories.length > 2 && (
              <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="筛选选项分类">
                {categories.map((category) => (
                  <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${selectedCategory === category ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{category}</button>
                ))}
              </div>
            )}

            <div className="my-5 max-h-72 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
              <div className="flex flex-wrap gap-2">
                {choices.map((item) => (
                  <span key={item.id} className="inline-flex items-center gap-1 rounded-full border border-white bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
                    {item.emoji} {item.label}
                    {item.custom && <button type="button" onClick={() => void remove(item)} className="ml-1 text-gray-400 hover:text-red-500" aria-label={`删除${item.label}`}>×</button>}
                  </span>
                ))}
              </div>
            </div>

            {punishments.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-bold text-amber-800">🎯 随结果抽取的小惩罚</h3>
                <div className="flex flex-wrap gap-2">
                  {punishments.map((item) => (
                    <span key={item.id} className="rounded-full bg-amber-50 px-3 py-2 text-sm text-amber-800">{item.emoji} {item.label}{item.custom && <button type="button" onClick={() => void remove(item)} className="ml-1" aria-label={`删除${item.label}`}>×</button>}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-4">
              <h3 className="font-bold text-gray-800">添加自定义内容</h3>
              <p className="mt-1 text-xs text-gray-500">添加后立即写入两个人共用的数据库。</p>
              <div className="mt-3 grid grid-cols-[4.5rem_1fr] gap-2">
                <input value={draft.emoji} onChange={(event) => setDraft({ ...draft, emoji: event.target.value })} aria-label="表情" maxLength={4} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-center text-xl" />
                <input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') void add() }} placeholder="例如：唱一首歌" className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-pink-400" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setDraft({ ...draft, kind: 'choice' })} className={`rounded-full px-3 py-2 text-sm ${draft.kind === 'choice' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'}`}>普通选项</button>
                <button type="button" onClick={() => setDraft({ ...draft, kind: 'punishment' })} className={`rounded-full px-3 py-2 text-sm ${draft.kind === 'punishment' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600'}`}>小惩罚</button>
                <button type="button" onClick={() => void add()} disabled={!draft.label.trim()} className="ml-auto rounded-full bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">存入数据库</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
