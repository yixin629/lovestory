'use client'

import { useState, useEffect, useCallback } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import PageHeader from '@/app/components/ui/PageHeader'
import EmptyState from './components/EmptyState'
import StatCard from './components/StatCard'
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { coupleChannel } from '@/lib/couple-interactions'

interface Expense {
  id: string
  created_at: string
  expense_date: string
  title: string
  amount: number
  category: Category
  /** 付款人的用户 ID；该账号被删除后为 null */
  paid_by: string | null
  split_mode: 'equal' | 'full' | 'custom'
  split_ratio: number
  note?: string
  created_by?: string | null
}

type Category = 'food' | 'date' | 'travel' | 'gift' | 'home' | 'transport' | 'shopping' | 'other'

const CATEGORY_META: Record<Category, { emoji: string; label: string; color: string }> = {
  food:      { emoji: '🍱', label: '吃饭', color: 'from-orange-400 to-red-400' },
  date:      { emoji: '💕', label: '约会', color: 'from-pink-400 to-rose-500' },
  travel:    { emoji: '✈️', label: '旅行', color: 'from-cyan-400 to-blue-500' },
  gift:      { emoji: '🎁', label: '礼物', color: 'from-purple-400 to-pink-500' },
  home:      { emoji: '🏠', label: '家居', color: 'from-amber-400 to-yellow-500' },
  transport: { emoji: '🚕', label: '交通', color: 'from-slate-400 to-gray-500' },
  shopping:  { emoji: '🛍️', label: '购物', color: 'from-emerald-400 to-teal-500' },
  other:     { emoji: '💰', label: '其他', color: 'from-indigo-400 to-violet-500' },
}

export default function ExpensesPage() {
  const { user: currentUser, loading: authLoading, me, partner, coupleId, nameOf } = useAuth()
  const { showToast } = useToast()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>('food')
  const [paidBy, setPaidBy] = useState<string>('')
  const [splitMode, setSplitMode] = useState<'equal' | 'full'>('equal')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')

  // Filter
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all')
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const fetchExpenses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('shared_expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      setExpenses(data || [])
    } catch (err) {
      console.error(err)
      if ((err as { code?: string } | null)?.code === '42P01') {
        showToast('请先运行 database/migrations/expenses-table.sql 创建数据表', 'warning')
      } else {
        showToast('获取账单失败', 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (authLoading) return
    if (!currentUser || !coupleId) { setPaidBy(''); return }
    setPaidBy(currentUser)
    fetchExpenses()

    const channel = supabase
      .channel(coupleChannel(coupleId, 'shared_expenses_realtime'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_expenses' }, () => {
        fetchExpenses()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUser, coupleId, authLoading, fetchExpenses])

  const resetForm = () => {
    setEditId(null)
    setTitle('')
    setAmount('')
    setCategory('food')
    setPaidBy(currentUser ?? '')
    setSplitMode('equal')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setNote('')
  }

  const openEdit = (e: Expense) => {
    setEditId(e.id)
    setTitle(e.title)
    setAmount(e.amount.toString())
    setCategory(e.category)
    setPaidBy(e.paid_by ?? currentUser ?? '')
    setSplitMode(e.split_mode === 'custom' ? 'equal' : e.split_mode)
    setExpenseDate(e.expense_date)
    setNote(e.note || '')
    setShowForm(true)
  }

  const handleSubmit = async () => {
    const parsed = parseFloat(amount)
    if (!title.trim()) { showToast('请输入标题', 'warning'); return }
    if (!parsed || parsed <= 0) { showToast('请输入有效金额', 'warning'); return }
    if (!currentUser || !paidBy) { showToast('请先登录', 'warning'); return }

    const payload = {
      title: title.trim(),
      amount: parsed,
      category,
      paid_by: paidBy,
      split_mode: splitMode,
      split_ratio: splitMode === 'equal' ? 0.5 : 1.0,
      expense_date: expenseDate,
      note: note.trim() || null,
    }

    try {
      if (editId) {
        const { error } = await supabase.from('shared_expenses').update(payload).eq('id', editId)
        if (error) throw error
        showToast('已更新', 'success')
      } else {
        const { error } = await supabase.from('shared_expenses').insert({ ...payload, created_by: currentUser })
        if (error) throw error
        showToast('已记录', 'success')
      }
      setShowForm(false)
      resetForm()
    } catch (err) {
      console.error(err)
      showToast(editId ? '更新失败' : '记录失败', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除这条记录吗？')) return
    try {
      const { error } = await supabase.from('shared_expenses').delete().eq('id', id)
      if (error) throw error
      showToast('已删除', 'success')
    } catch {
      showToast('删除失败', 'error')
    }
  }

  // ── Filtering ──
  const filtered = expenses.filter(e => {
    if (filterCategory !== 'all' && e.category !== filterCategory) return false
    if (filterMonth && !e.expense_date.startsWith(filterMonth)) return false
    return true
  })

  // ── Stats for current filter ──
  const stats = filtered.reduce(
    (acc, e) => {
      acc.total += Number(e.amount)
      // AA：未付款的一方欠付款方一半；全包：不产生欠款
      if (e.split_mode === 'equal' && currentUser && e.paid_by) {
        if (e.paid_by === currentUser) acc.partnerOwesMe += Number(e.amount) / 2
        else acc.iOwePartner += Number(e.amount) / 2
      }
      return acc
    },
    { total: 0, partnerOwesMe: 0, iOwePartner: 0 }
  )

  // Compute net balance (positive = 另一半欠我, negative = 我欠另一半)
  const myName = me?.name ?? '我'
  const partnerName = partner?.name ?? 'Ta'
  const balance = stats.partnerOwesMe - stats.iOwePartner
  const balanceAbs = Math.abs(balance).toFixed(2)
  const balanceText =
    Math.abs(balance) < 0.01
      ? '账目已平 ✨'
      : balance > 0
        ? `${partnerName} 需要付给 ${myName} ¥${balanceAbs}`
        : `${myName} 需要付给 ${partnerName} ¥${balanceAbs}`

  // Group by date
  const grouped = filtered.reduce((acc: Record<string, Expense[]>, e) => {
    (acc[e.expense_date] ||= []).push(e)
    return acc
  }, {})

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <BackButton href="/" />
          <LoadingSkeleton type="card" count={3} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <BackButton href="/" />

        <PageHeader
          title="共同账本"
          emoji="💰"
          subtitle="记录你们的每一笔花销，平分不分手"
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="本月支出" value={`¥${stats.total.toFixed(0)}`} emoji="💳" gradient="from-pink-500 to-rose-500" />
          <StatCard label={`${myName} 付了`} value={`¥${sumByPayer(filtered, currentUser).toFixed(0)}`} emoji={avatarEmoji(me?.avatar)} gradient="from-blue-500 to-cyan-500" />
          <StatCard label={`${partnerName} 付了`} value={`¥${sumByPayer(filtered, partner?.id).toFixed(0)}`} emoji={avatarEmoji(partner?.avatar)} gradient="from-purple-500 to-fuchsia-500" />
        </div>

        {/* Balance badge */}
        <div className={`rounded-2xl p-4 mb-6 text-center font-semibold shadow
          ${Math.abs(balance) < 0.01
            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
            : 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900'}`}
        >
          <div className="text-xs opacity-70 mb-1">当前结算</div>
          <div className="text-lg">{balanceText}</div>
        </div>

        {/* Filters + Add */}
        <div className="card mb-4">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="month"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="input-ghost max-w-[180px]"
            />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as Category | 'all')}
              className="input-ghost max-w-[140px]"
            >
              <option value="all">全部类别</option>
              {(Object.keys(CATEGORY_META) as Category[]).map(c => (
                <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>
              ))}
            </select>
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="btn-primary ml-auto text-sm !py-2 !px-4"
            >
              + 记一笔
            </button>
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="这个月还没有记录"
            description="点击「记一笔」开始记录你们的共同花销"
            actionLabel="记一笔"
            onAction={() => { resetForm(); setShowForm(true) }}
          />
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                  <span>{formatDate(date)}</span>
                  <span className="h-px flex-1 bg-gray-200"></span>
                  <span>¥{items.reduce((s, e) => s + Number(e.amount), 0).toFixed(2)}</span>
                </h3>
                <div className="space-y-2">
                  {items.map(e => {
                    const meta = CATEGORY_META[e.category]
                    return (
                      <div key={e.id}
                        className="card-compact flex items-center gap-3 hover:shadow-md transition-shadow"
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-2xl shrink-0`}>
                          {meta.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 truncate">{e.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className="badge-gray">{nameOf(e.paid_by)} 付</span>
                            <span className="badge-gray">
                              {e.split_mode === 'equal' ? 'AA' : '全包'}
                            </span>
                            {e.note && <span className="truncate">· {e.note}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="font-black text-lg text-gray-800">¥{Number(e.amount).toFixed(2)}</div>
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(e)} className="text-xs text-gray-500 hover:text-primary">编辑</button>
                            <button onClick={() => handleDelete(e.id)} className="text-xs text-gray-500 hover:text-red-500">删除</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="title-h3">{editId ? '编辑一笔' : '记一笔'}</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="label-primary">标题</label>
                  <input
                    type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="例：海底捞晚餐"
                    className="input-primary"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="label-primary">金额 (¥)</label>
                  <input
                    type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="input-primary"
                  />
                </div>

                <div>
                  <label className="label-primary">类别</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.keys(CATEGORY_META) as Category[]).map(c => (
                      <button key={c} onClick={() => setCategory(c)} type="button"
                        className={`p-2 rounded-xl text-xs transition-all ${
                          category === c
                            ? `bg-gradient-to-br ${CATEGORY_META[c].color} text-white shadow-md`
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="text-xl">{CATEGORY_META[c].emoji}</div>
                        <div>{CATEGORY_META[c].label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label-primary">谁付的？</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => currentUser && setPaidBy(currentUser)}
                      className={`p-3 rounded-xl transition-all ${paidBy === currentUser ? 'bg-blue-500 text-white shadow' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >{avatarEmoji(me?.avatar)} {myName}</button>
                    <button type="button" onClick={() => partner && setPaidBy(partner.id)}
                      disabled={!partner}
                      title={partner ? undefined : '等另一半加入后可用'}
                      className={`p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${partner && paidBy === partner.id ? 'bg-pink-500 text-white shadow' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >{partner ? `${avatarEmoji(partner.avatar)} ${partner.name}` : '等另一半加入'}</button>
                  </div>
                </div>

                <div>
                  <label className="label-primary">分摊方式</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setSplitMode('equal')}
                      className={`p-3 rounded-xl text-sm transition-all ${splitMode === 'equal' ? 'bg-primary text-white shadow' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >🤝 AA（平分）</button>
                    <button type="button" onClick={() => setSplitMode('full')}
                      className={`p-3 rounded-xl text-sm transition-all ${splitMode === 'full' ? 'bg-primary text-white shadow' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >💝 我请客</button>
                  </div>
                </div>

                <div>
                  <label className="label-primary">日期</label>
                  <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="input-primary" />
                </div>

                <div>
                  <label className="label-primary">备注（可选）</label>
                  <textarea value={note} onChange={e => setNote(e.target.value)}
                    placeholder="加点描述..." rows={2} className="input-primary resize-none"
                    maxLength={100}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">取消</button>
                  <button onClick={handleSubmit} className="btn-primary flex-1">
                    {editId ? '保存' : '记录'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>
    </div>
  )
}

// Helper: formatDate
function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(iso); target.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff === 2) return '前天'
  if (d.getFullYear() === today.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

function sumByPayer(list: Expense[], payer: string | null | undefined): number {
  if (!payer) return 0
  return list.filter(e => e.paid_by === payer).reduce((s, e) => s + Number(e.amount), 0)
}

// 头像可能是图片 URL，统计卡片和按钮里只展示 emoji
function avatarEmoji(avatar: string | null | undefined): string {
  return avatar && !avatar.startsWith('http') ? avatar : '👤'
}
