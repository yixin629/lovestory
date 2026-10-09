'use client'

import { useState, useEffect, useCallback } from 'react'
import { differenceInDays, format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/app/components/feedback/ToastProvider'
import BackButton from '@/app/components/ui/BackButton'
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton'
import AnniversaryReminders from './components/AnniversaryReminders'
import PageHeader from '@/app/components/ui/PageHeader'

interface Anniversary {
  id: string
  title: string
  date: string
  description: string
  icon: string
  recurring: boolean
  is_start?: boolean
}

export default function AnniversariesPage() {
  const toast = useToast()
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Anniversary | null>(null)

  // 加载数据
  const loadAnniversaries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('anniversaries')
        .select('*')
        .order('date', { ascending: true })

      if (error) throw error

      // 新情侣空间为空时展示空状态，由用户自己添加纪念日
      setAnniversaries(data ?? [])
      setLoading(false)
    } catch (error) {
      console.error('加载纪念日失败:', error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAnniversaries()
  }, [loadAnniversaries])

  const [showForm, setShowForm] = useState(false)
  const [newAnniversary, setNewAnniversary] = useState({
    title: '',
    date: '',
    description: '',
    icon: '💝',
    recurring: false,
    is_start: false,
  })

  const getDaysCount = (dateString: string) => {
    const targetDate = new Date(dateString)
    const today = new Date()
    return differenceInDays(today, targetDate)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { data, error } = await supabase.from('anniversaries').insert([newAnniversary]).select()

      if (error) throw error

      if (data) {
        setAnniversaries([...anniversaries, ...data])
        setNewAnniversary({
          title: '',
          date: '',
          description: '',
          icon: '💝',
          recurring: false,
          is_start: false,
        })
        setShowForm(false)
        toast.success('纪念日添加成功！')
      }
    } catch (error) {
      console.error('添加纪念日失败:', error)
      toast.error('添加失败，请检查网络连接')
    }
  }

  const deleteAnniversary = async (id: string) => {
    if (!confirm('确定要删除这个纪念日吗？')) return

    try {
      const { error } = await supabase.from('anniversaries').delete().eq('id', id)

      if (error) throw error

      setAnniversaries(anniversaries.filter((a) => a.id !== id))
      toast.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败，请重试')
    }
  }

  // 开始编辑
  const startEdit = (anniversary: Anniversary) => {
    setEditingId(anniversary.id)
    setEditForm({ ...anniversary })
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  // 保存编辑
  const saveEdit = async () => {
    if (!editForm || !editingId) return

    try {
      const { error } = await supabase
        .from('anniversaries')
        .update({
          title: editForm.title,
          date: editForm.date,
          description: editForm.description,
          icon: editForm.icon,
          recurring: editForm.recurring,
        })
        .eq('id', editingId)

      if (error) throw error

      setAnniversaries(anniversaries.map((a) => (a.id === editingId ? editForm : a)))
      setEditingId(null)
      setEditForm(null)
      toast.success('更新成功')
    } catch (error) {
      console.error('更新失败:', error)
      toast.error('更新失败，请重试')
    }
  }

  const sortedAnniversaries = [...anniversaries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card">
          <PageHeader title="重要纪念日" emoji="💝" emojiDouble subtitle="永远铭记我们的每个特殊日子" />

          {/* Anniversary Reminders */}
          <AnniversaryReminders />

          {loading ? (
            <LoadingSkeleton type="list" count={3} />
          ) : (
            <>
              {/* Add Button */}
              <div className="mb-6 text-center">
                <button onClick={() => setShowForm(!showForm)} className="btn-primary">
                  {showForm ? '取消' : '+ 添加纪念日'}
                </button>
              </div>

              {/* Add Form */}
              {showForm && (
                <form onSubmit={handleSubmit} className="bg-pink-50 p-6 rounded-xl mb-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">标题</label>
                      <input
                        type="text"
                        value={newAnniversary.title}
                        onChange={(e) =>
                          setNewAnniversary({ ...newAnniversary, title: e.target.value })
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">日期</label>
                      <input
                        type="date"
                        value={newAnniversary.date}
                        onChange={(e) =>
                          setNewAnniversary({ ...newAnniversary, date: e.target.value })
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">描述</label>
                      <textarea
                        value={newAnniversary.description}
                        onChange={(e) =>
                          setNewAnniversary({ ...newAnniversary, description: e.target.value })
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">图标</label>
                      <div className="flex gap-2">
                        {['💕', '💝', '💖', '💗', '🎂', '🎉', '🎊', '🌹'].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setNewAnniversary({ ...newAnniversary, icon: emoji })}
                            className={`text-3xl p-2 rounded-lg ${
                              newAnniversary.icon === emoji
                                ? 'bg-primary'
                                : 'bg-white hover:bg-gray-100'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={newAnniversary.is_start}
                        onChange={(e) =>
                          setNewAnniversary({ ...newAnniversary, is_start: e.target.checked })
                        }
                      />
                      这是我们在一起的日子（首页「我们已经相爱」从这天开始计算）
                    </label>
                    <button type="submit" className="btn-primary w-full">
                      保存
                    </button>
                  </div>
                </form>
              )}

              {/* Anniversaries List */}
              <div className="space-y-4">
                {sortedAnniversaries.map((anniversary) => {
                  const daysCount = getDaysCount(anniversary.date)
                  const isEditing = editingId === anniversary.id

                  return (
                    <div
                      key={anniversary.id}
                      className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-xl shadow hover:shadow-lg transition-all"
                    >
                      {isEditing && editForm ? (
                        // 编辑模式
                        <div className="space-y-4">
                          <div className="flex gap-4 items-start">
                            <select
                              value={editForm.icon}
                              onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                              className="text-4xl bg-transparent border-2 border-gray-300 rounded-lg p-2"
                            >
                              {['💕', '💝', '💖', '💗', '🎂', '🎉', '🎊', '🌹', '💋', '💍'].map(
                                (emoji) => (
                                  <option key={emoji} value={emoji}>
                                    {emoji}
                                  </option>
                                )
                              )}
                            </select>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={editForm.title}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, title: e.target.value })
                                }
                                className="w-full text-2xl font-bold text-primary px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary mb-2"
                              />
                              <input
                                type="date"
                                value={editForm.date}
                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                              />
                            </div>
                          </div>
                          <textarea
                            value={editForm.description}
                            onChange={(e) =>
                              setEditForm({ ...editForm, description: e.target.value })
                            }
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                            rows={2}
                            placeholder="描述（可选）"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={cancelEdit}
                              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                            >
                              取消
                            </button>
                            <button onClick={saveEdit} className="btn-primary">
                              保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 查看模式
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-4xl">{anniversary.icon}</span>
                              <div>
                                <h3 className="text-2xl font-bold text-primary">
                                  {anniversary.title}
                                </h3>
                                <p className="text-gray-600">
                                  {format(new Date(anniversary.date), 'yyyy年MM月dd日')}
                                </p>
                              </div>
                            </div>
                            {anniversary.description && (
                              <p className="text-gray-700 ml-14 mb-2">{anniversary.description}</p>
                            )}
                            <div className="ml-14 text-2xl font-bold text-accent">
                              已经 {daysCount} 天了 ✨
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(anniversary)}
                              className="text-blue-500 hover:text-blue-700 text-xl px-2"
                              title="编辑"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteAnniversary(anniversary.id)}
                              className="text-red-500 hover:text-red-700 text-2xl"
                              title="删除"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {anniversaries.length === 0 && !showForm && (
                <div className="text-center text-gray-500 py-12">还没有添加纪念日哦 💝</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
