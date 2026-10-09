'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'

const STYLE_TAGS = ['休闲', '正式', '运动', '约会', '甜美', '帅气', '复古', '潮流', '简约', '浪漫']
const OCCASIONS = ['上班', '约会', '聚会', '运动', '居家', '旅行', '特殊场合']

interface OutfitRecord {
  id: number
  user_id: string
  date: string
  photo_url: string | null
  style_tags: string[]
  occasion: string
  notes: string
  created_at: string
}

export default function OutfitRecordsPage() {
  const toast = useToast()
  const { user } = useAuth()
  const [records, setRecords] = useState<OutfitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedOccasion, setSelectedOccasion] = useState('')
  const [notes, setNotes] = useState('')
  const [photoEmoji, setPhotoEmoji] = useState('👕')

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('outfit_records')
        .select('*')
        .order('date', { ascending: false })
        .limit(50)

      if (error) throw error
      if (data) setRecords(data)
    } catch (error) {
      console.error('加载穿搭记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const handleSave = async () => {
    if (!selectedOccasion) {
      toast.error('请选择场合')
      return
    }
    if (!user) {
      toast.error('请先登录')
      return
    }

    try {
      const { data, error } = await supabase
        .from('outfit_records')
        .insert([
          {
            user_id: user,
            date: selectedDate,
            photo_url: photoEmoji,
            style_tags: selectedTags,
            occasion: selectedOccasion,
            notes: notes,
          },
        ])
        .select()

      if (error) throw error

      if (data) {
        setRecords([data[0], ...records])
        resetForm()
        setShowAddDialog(false)
        toast.success('穿搭记录保存成功！')
      }
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败，请重试')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from('outfit_records').delete().eq('id', id)

      if (error) throw error

      setRecords(records.filter((r) => r.id !== id))
      toast.success('已删除')
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败，请重试')
    }
  }

  const resetForm = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
    setSelectedTags([])
    setSelectedOccasion('')
    setNotes('')
    setPhotoEmoji('👕')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const EMOJI_OPTIONS = ['👕', '👔', '👗', '👚', '🥼', '🧥', '👖', '👘', '🥻', '👠', '👟', '👢']

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-2xl">👔 加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold text-primary mb-2">👔 穿搭记录</h1>
              <p className="text-gray-600">记录每天的穿搭风格</p>
            </div>
            <button onClick={() => setShowAddDialog(true)} className="btn-primary">
              + 添加记录
            </button>
          </div>

          {/* 穿搭记录网格 */}
          {records.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 hover:shadow-lg transition-all relative group"
                >
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 flex items-center justify-center shadow-lg"
                  >
                    ×
                  </button>

                  <div className="text-6xl text-center mb-4">{record.photo_url || '👕'}</div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">日期</p>
                      <p className="font-semibold text-gray-800">{formatDate(record.date)}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">风格</p>
                      <div className="flex flex-wrap gap-2">
                        {record.style_tags && record.style_tags.length > 0 ? (
                          record.style_tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">未设置</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">场合</p>
                      <p className="font-semibold text-gray-800">{record.occasion}</p>
                    </div>

                    {record.notes && (
                      <div>
                        <p className="text-sm text-gray-600">备注</p>
                        <p className="text-sm text-gray-700">{record.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">👔</div>
              <p className="text-gray-500 mb-4">还没有穿搭记录</p>
              <button onClick={() => setShowAddDialog(true)} className="btn-primary">
                添加第一条记录
              </button>
            </div>
          )}
        </div>

        {/* 添加对话框 */}
        {showAddDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">添加穿搭记录</h3>

              {/* 日期 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">日期</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              {/* 图标选择 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">选择图标</label>
                <div className="grid grid-cols-6 gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setPhotoEmoji(emoji)}
                      className={`text-4xl p-3 rounded-xl transition-all ${
                        photoEmoji === emoji
                          ? 'bg-primary bg-opacity-20 ring-2 ring-primary scale-110'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* 风格标签 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">风格标签</label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-4 py-2 rounded-full text-sm transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 场合 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">场合*</label>
                <div className="grid grid-cols-3 gap-2">
                  {OCCASIONS.map((occasion) => (
                    <button
                      key={occasion}
                      onClick={() => setSelectedOccasion(occasion)}
                      className={`px-4 py-3 rounded-xl text-sm transition-all ${
                        selectedOccasion === occasion
                          ? 'bg-primary text-white shadow-lg'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {occasion}
                    </button>
                  ))}
                </div>
              </div>

              {/* 备注 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">备注</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="写下今天穿搭的心情或想法..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary resize-none"
                  rows={3}
                />
              </div>

              {/* 按钮 */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowAddDialog(false)
                    resetForm()
                  }}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button onClick={handleSave} className="btn-primary">
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
