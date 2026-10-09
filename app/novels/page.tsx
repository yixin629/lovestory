'use client'

import { useState, useEffect, useCallback } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton'

interface Novel {
  id: string
  title: string
  author: string
  cover_url?: string
  description?: string
  link?: string
  added_by: string
  likes: string[] // Array of user_ids
  status: 'want_to_read' | 'reading' | 'read'
  created_at: string
}

const STATUS_LABELS = {
  want_to_read: '想读',
  reading: '在读',
  read: '已读',
}

const STATUS_COLORS = {
  want_to_read: 'bg-blue-100 text-blue-600',
  reading: 'bg-green-100 text-green-600',
  read: 'bg-gray-100 text-gray-600',
}

export default function NovelsPage() {
  const { showToast } = useToast()
  const [novels, setNovels] = useState<Novel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user: currentUser, nameOf } = useAuth()
  const [filterStatus, setFilterStatus] = useState<'all' | 'want_to_read' | 'reading' | 'read'>(
    'all'
  )

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newNovel, setNewNovel] = useState({
    title: '',
    author: '',
    description: '',
    link: '',
    status: 'want_to_read',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadNovels = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('novels')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') {
          showToast('小说数据库未初始化，请运行数据库脚本', 'error')
        } else {
          throw error
        }
      } else {
        setNovels(data || [])
      }
    } catch (error) {
      console.error('Failed to load novels:', error)
      showToast('加载小说列表失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (currentUser) {
      loadNovels()
    } else {
      setIsLoading(false)
    }
  }, [currentUser, loadNovels])

  const handleAdd = async () => {
    if (!newNovel.title || !newNovel.author) {
      showToast('标题和作者不能为空', 'warning')
      return
    }
    if (!currentUser) return

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('novels')
        .insert({
          title: newNovel.title,
          author: newNovel.author,
          description: newNovel.description,
          link: newNovel.link,
          status: newNovel.status,
          added_by: currentUser,
          likes: [],
        })
        .select()

      if (error) throw error

      setNovels([data[0], ...novels])
      showToast('添加成功！', 'success')
      setShowAddModal(false)
      setNewNovel({ title: '', author: '', description: '', link: '', status: 'want_to_read' })
    } catch (error: any) {
      showToast('添加失败: ' + error.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStatus = async (novel: Novel, newStatus: string) => {
    // Optimistic update
    setNovels(novels.map((n) => (n.id === novel.id ? { ...n, status: newStatus as any } : n)))

    try {
      const { error } = await supabase
        .from('novels')
        .update({ status: newStatus })
        .eq('id', novel.id)
      if (error) throw error
      showToast('状态更新成功', 'success')
    } catch (error) {
      console.error('Update status failed:', error)
      showToast('更新状态失败', 'error')
      loadNovels() // Revert
    }
  }

  const handleLike = async (novel: Novel) => {
    if (!currentUser) return

    const isLiked = novel.likes?.includes(currentUser)
    const newLikes = isLiked
      ? novel.likes.filter((id) => id !== currentUser)
      : [...(novel.likes || []), currentUser]

    // Optimistic update
    setNovels(novels.map((n) => (n.id === novel.id ? { ...n, likes: newLikes } : n)))

    try {
      const { error } = await supabase.from('novels').update({ likes: newLikes }).eq('id', novel.id)

      if (error) throw error
    } catch (error) {
      console.error('Like failed:', error)
      showToast('点赞失败', 'error')
      loadNovels() // Revert
    }
  }

  const filteredNovels =
    filterStatus === 'all' ? novels : novels.filter((n) => n.status === filterStatus)

  if (!currentUser) {
    if (isLoading)
      return (
        <div className="p-8 text-center">
          <LoadingSkeleton type="list" count={3} />
        </div>
      )
    return (
      <div className="min-h-screen p-8 max-w-2xl mx-auto">
        <BackButton href="/" text="返回首页" />
        <div className="card text-center py-12">
          <h1 className="text-3xl font-bold text-primary mb-4">📚 情侣书架</h1>
          <p className="text-gray-600 mb-6">请先登录后再使用书架功能</p>
          <a
            href="/login"
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full"
          >
            去登录
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-primary">📚 情侣书架</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full shadow-md hover:shadow-lg transition-all"
          >
            + 添加小说
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'want_to_read', 'reading', 'read'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {status === 'all' ? '全部书籍' : STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <LoadingSkeleton type="card" count={3} />
        ) : filteredNovels.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="text-6xl mb-4 text-gray-300">📖</div>
            <p className="text-gray-500">
              {filterStatus === 'all'
                ? '书架还是空的，快去添加第一本喜欢的小说吧！'
                : '没有找到对应状态的小说哦'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNovels.map((novel) => (
              <div
                key={novel.id}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col relative group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3
                      className="font-bold text-lg text-gray-800 line-clamp-1"
                      title={novel.title}
                    >
                      {novel.title}
                    </h3>
                    <p className="text-sm text-gray-500">作者：{novel.author}</p>
                  </div>
                  {/* Status Badge */}
                  <select
                    value={novel.status || 'want_to_read'}
                    onChange={(e) => handleUpdateStatus(novel, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full border-none outline-none appearance-none cursor-pointer ${
                      STATUS_COLORS[novel.status as keyof typeof STATUS_COLORS] ||
                      'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <option value="want_to_read">想读</option>
                    <option value="reading">在读</option>
                    <option value="read">已读</option>
                  </select>
                </div>

                {novel.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-grow">
                    {novel.description}
                  </p>
                )}

                <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-50">
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                      {nameOf(novel.added_by)}推荐
                    </span>
                    {novel.link && (
                      <a
                        href={novel.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-xs hover:underline flex items-center bg-gray-50 px-2 py-1 rounded-full"
                      >
                        阅读 ↗
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => handleLike(novel)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-all ${
                      novel.likes?.includes(currentUser)
                        ? 'bg-pink-100 text-pink-500'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {novel.likes?.includes(currentUser) ? '❤️' : '🤍'} {novel.likes?.length || 0}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-fade-in shadow-2xl">
              <h2 className="text-xl font-bold mb-4 text-center">添加小说</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="小说标题 *"
                  value={newNovel.title}
                  onChange={(e) => setNewNovel({ ...newNovel, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                />
                <input
                  type="text"
                  placeholder="作者 *"
                  value={newNovel.author}
                  onChange={(e) => setNewNovel({ ...newNovel, author: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                />
                <div className="grid grid-cols-3 gap-2">
                  {['want_to_read', 'reading', 'read'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setNewNovel({ ...newNovel, status })}
                      className={`py-2 text-sm rounded-lg border transition-all ${
                        newNovel.status === status
                          ? 'bg-primary text-white border-primary'
                          : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="推荐理由 / 简介"
                  value={newNovel.description}
                  onChange={(e) => setNewNovel({ ...newNovel, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none h-24 resize-none transition-all"
                />
                <input
                  type="text"
                  placeholder="阅读链接 (可选)"
                  value={newNovel.link}
                  onChange={(e) => setNewNovel({ ...newNovel, link: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleAdd}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50"
                >
                  {isSubmitting ? '提交中...' : '添加'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
