'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BackButton from '@/app/components/ui/BackButton'
import PageHeader from '@/app/components/ui/PageHeader'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'

interface LoveQuote {
  id: number
  content: string
  author: string
  is_custom: boolean
  created_by: string | null
}

interface QuoteRow {
  id: number
  content: string
  author: string | null
  created_by?: string | null
}

// 头像可能是图片 URL，装饰位置只适合放 emoji
const decorIcon = (avatar: string | undefined, fallback: string) =>
  avatar && !avatar.startsWith('http') ? avatar : fallback

export default function LoveQuotesPage() {
  const toast = useToast()
  const { user, me, partner, nameOf } = useAuth()
  const myIcon = decorIcon(me?.avatar, '✨')
  const partnerIcon = decorIcon(partner?.avatar, '💕')
  const iconOf = (id: string | null) => (id && id === partner?.id ? partnerIcon : myIcon)
  const [quotes, setQuotes] = useState<LoveQuote[]>([])
  const [currentQuote, setCurrentQuote] = useState<LoveQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [newQuote, setNewQuote] = useState({
    content: '',
    author: '匿名',
  })

  useEffect(() => {
    loadQuotes()
  }, [])

  const loadQuotes = async () => {
    try {
      // 内置情话来自只读目录表，情侣自己添加的情话存在 love_quotes（按情侣隔离）
      const [libraryResult, customResult] = await Promise.all([
        supabase.from('love_quote_library').select('id, content, author'),
        supabase
          .from('love_quotes')
          .select('id, content, author, created_by')
          .order('created_at', { ascending: false }),
      ])

      if (libraryResult.error) throw libraryResult.error
      if (customResult.error) throw customResult.error

      const toQuote = (row: QuoteRow, isCustom: boolean): LoveQuote => ({
        id: row.id,
        content: row.content,
        author: row.author || '匿名',
        is_custom: isCustom,
        created_by: row.created_by ?? null,
      })
      const data = [
        ...((customResult.data ?? []) as QuoteRow[]).map((row) => toQuote(row, true)),
        ...((libraryResult.data ?? []) as QuoteRow[]).map((row) => toQuote(row, false)),
      ]
      setQuotes(data)

      // 自动显示一条随机情话
      if (data && data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.length)
        setCurrentQuote(data[randomIndex])
      }
    } catch (error) {
      console.error('加载失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRandomQuote = () => {
    if (quotes.length === 0) return

    const randomIndex = Math.floor(Math.random() * quotes.length)
    setCurrentQuote(quotes[randomIndex])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.warning('请先登录')
      return
    }

    try {
      const { error } = await supabase.from('love_quotes').insert([
        {
          ...newQuote,
          created_by: user,
        },
      ])

      if (error) throw error

      setShowForm(false)
      setNewQuote({
        content: '',
        author: '匿名',
      })
      loadQuotes()
    } catch (error) {
      console.error('添加失败:', error)
      toast.error('添加失败，请重试')
    }
  }

  const deleteQuote = async (id: number) => {
    if (!confirm('确定要删除这条情话吗？')) return

    try {
      const { error } = await supabase.from('love_quotes').delete().eq('id', id)

      if (error) throw error
      loadQuotes()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('已复制到剪贴板！')
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      {/* 背景装饰 - 两个人的头像 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-10 left-10 text-4xl animate-pulse">{myIcon}</div>
        <div className="absolute top-20 right-20 text-3xl animate-bounce">{partnerIcon}</div>
        <div className="absolute top-40 left-1/4 text-2xl animate-pulse delay-100">{myIcon}</div>
        <div className="absolute top-60 right-1/3 text-3xl animate-bounce delay-200">{partnerIcon}</div>
        <div className="absolute bottom-40 left-20 text-3xl animate-pulse delay-300">{myIcon}</div>
        <div className="absolute bottom-20 right-10 text-4xl animate-bounce delay-500">{partnerIcon}</div>
        <div className="absolute top-1/3 right-10 text-2xl animate-pulse">{myIcon}</div>
        <div className="absolute bottom-1/3 left-10 text-2xl animate-bounce">{partnerIcon}</div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <BackButton href="/" text="返回首页" />

        {loading ? (
          <div className="card text-center">
            <div className="text-2xl">加载中...</div>
          </div>
        ) : (
          <>
            <div className="card text-center mb-6">
              <PageHeader
                title="情话生成器"
                emoji="💕"
                subtitle={`${myIcon} 代表 ${me?.name ?? '我'}，${partnerIcon} 代表 ${partner?.name ?? 'Ta'}，我们的专属甜蜜空间`}
                className="!mb-6"
              />

              {/* 当前情话显示 */}
              {currentQuote && (
                <div className="mb-8 p-6 md:p-8 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border-2 border-pink-200 relative">
                  {/* 装饰性头像 */}
                  <div className="absolute top-2 left-2 text-xl md:text-2xl opacity-30">{myIcon}</div>
                  <div className="absolute top-2 right-2 text-xl md:text-2xl opacity-30">{partnerIcon}</div>
                  <div className="absolute bottom-2 left-2 text-xl md:text-2xl opacity-30">{partnerIcon}</div>
                  <div className="absolute bottom-2 right-2 text-xl md:text-2xl opacity-30">{myIcon}</div>

                  <div className="text-4xl md:text-6xl mb-4 md:mb-6">💝</div>
                  <div className="text-lg md:text-2xl font-serif italic mb-4 leading-relaxed text-gray-800 px-4">
                    &ldquo;{currentQuote.content}&rdquo;
                  </div>
                  <div className="text-xs md:text-sm text-gray-600">—— {currentQuote.author}</div>
                  {currentQuote.is_custom && currentQuote.created_by && (
                    <div className="text-xs text-gray-500 mt-2">
                      来自 {iconOf(currentQuote.created_by)}
                      {nameOf(currentQuote.created_by)} 的专属情话 ❤️
                    </div>
                  )}

                  {/* 复制按钮 */}
                  <button
                    onClick={() => copyToClipboard(currentQuote.content)}
                    className="mt-4 px-4 py-2 rounded-lg bg-white hover:bg-gray-50 border border-gray-300 transition-colors text-sm"
                  >
                    📋 复制
                  </button>
                </div>
              )}

              {/* 按钮组 */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-6">
                <button
                  onClick={getRandomQuote}
                  className="btn-primary text-lg md:text-xl px-8 md:px-12 py-3 md:py-4 flex items-center justify-center gap-2"
                >
                  <span>🎲</span>
                  <span>换一句</span>
                  <span className="hidden sm:inline">
                    {myIcon}
                    {partnerIcon}
                  </span>
                </button>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="px-6 md:px-8 py-3 md:py-4 rounded-lg border-2 border-gray-300 hover:border-primary bg-white hover:bg-pink-50 transition-colors text-gray-700 font-semibold"
                >
                  {showForm ? '取消' : '➕ 添加情话'}
                </button>
              </div>

              {/* 添加表单 */}
              {showForm && (
                <div className="mt-6 p-4 md:p-6 bg-pink-50 rounded-lg border-2 border-pink-200 text-left">
                  <h3 className="text-lg md:text-xl font-bold mb-4 text-primary flex items-center gap-2">
                    <span>✨</span>
                    <span>添加专属情话</span>
                    <span>
                      {myIcon}
                      {partnerIcon}
                    </span>
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        情话内容 *
                      </label>
                      <textarea
                        value={newQuote.content}
                        onChange={(e) => setNewQuote({ ...newQuote, content: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary h-32 text-sm md:text-base"
                        placeholder="写下你想说的话..."
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                          署名
                        </label>
                        <input
                          type="text"
                          value={newQuote.author}
                          onChange={(e) => setNewQuote({ ...newQuote, author: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary text-sm md:text-base"
                          placeholder="匿名"
                        />
                      </div>

                      <div>
                        <p className="block text-sm font-semibold mb-2 text-gray-700">创建者</p>
                        <div className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 bg-white text-sm md:text-base">
                          {myIcon} {me?.name ?? '我'}
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="btn-primary w-full">
                      💌 添加
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* 自定义情话列表 */}
            <div className="card">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary flex items-center gap-2">
                <span>💖</span>
                <span>我们的专属情话</span>
                <span>
                      {myIcon}
                      {partnerIcon}
                    </span>
              </h2>
              <div className="space-y-3">
                {quotes.filter((q) => q.is_custom).length === 0 ? (
                  <p className="text-center text-gray-500 py-8">还没有专属情话，快来添加吧！{myIcon}
                    {partnerIcon}
                  </p>
                ) : (
                  quotes
                    .filter((q) => q.is_custom)
                    .map((quote) => (
                      <div
                        key={quote.id}
                        className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200 hover:border-primary transition-all hover:shadow-md"
                      >
                        <div className="flex flex-col md:flex-row justify-between items-start gap-3">
                          <div className="flex-1 w-full">
                            <p className="text-base md:text-lg italic mb-2 text-gray-800">
                              &ldquo;{quote.content}&rdquo;
                            </p>
                            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600">
                              <span>—— {quote.author}</span>
                              <span className="flex items-center gap-1">
                                <span>来自</span>
                                <span>
                                  {iconOf(quote.created_by)}
                                  {nameOf(quote.created_by)}
                                </span>
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full md:w-auto">
                            <button
                              onClick={() => copyToClipboard(quote.content)}
                              className="flex-1 md:flex-none px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 transition-colors text-sm text-blue-700"
                            >
                              📋 复制
                            </button>
                            <button
                              onClick={() => deleteQuote(quote.id)}
                              className="flex-1 md:flex-none px-3 py-1 rounded bg-red-100 hover:bg-red-200 transition-colors text-sm text-red-600"
                            >
                              🗑️ 删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
