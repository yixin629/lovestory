'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import BackButton from '@/app/components/ui/BackButton'
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton'

interface Note {
  id: string
  author: string
  content: string
  toPerson: string
  createdAt: string
  isRead: boolean
  letterStyle?: string
  isSealed?: boolean
  emojis?: string[]
}

export default function NotesPage() {
  const toast = useToast()
  const { user, me, partner, nameOf } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState({
    content: '',
    letterStyle: 'classic',
    emojis: [] as string[],
  })
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  // 加载数据
  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('love_notes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        setNotes(
          data.map((item) => ({
            id: item.id,
            author: item.author,
            content: item.content,
            toPerson: item.to_person,
            createdAt: item.created_at,
            isRead: item.is_read,
            letterStyle: item.letter_style || 'classic',
            isSealed: item.is_sealed !== false,
            emojis: item.emojis || [],
          }))
        )
      }
    } catch (error) {
      console.error('加载留言失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 信纸样式定义
  const letterStyles = [
    { id: 'classic', name: '经典', bg: 'bg-amber-50', border: 'border-amber-200', icon: '📜' },
    { id: 'love', name: '爱心', bg: 'bg-pink-50', border: 'border-pink-200', icon: '💕' },
    { id: 'cute', name: '可爱', bg: 'bg-purple-50', border: 'border-purple-200', icon: '🎀' },
    { id: 'elegant', name: '优雅', bg: 'bg-blue-50', border: 'border-blue-200', icon: '🌸' },
  ]

  // 表情包选项
  const emojiOptions = [
    '❤️',
    '💕',
    '💖',
    '💗',
    '💝',
    '💘',
    '💞',
    '💓',
    '😘',
    '😍',
    '🥰',
    '😊',
    '🤗',
    '🥳',
    '😂',
    '🤣',
    '🌹',
    '🌸',
    '🌺',
    '🌻',
    '🌼',
    '🌷',
    '⭐',
    '✨',
  ]

  const handleEmojiToggle = (emoji: string) => {
    const currentEmojis = newNote.emojis || []
    if (currentEmojis.includes(emoji)) {
      setNewNote({
        ...newNote,
        emojis: currentEmojis.filter((e) => e !== emoji),
      })
    } else if (currentEmojis.length < 5) {
      setNewNote({
        ...newNote,
        emojis: [...currentEmojis, emoji],
      })
    }
  }

  const handleUnseal = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('love_notes')
        .update({ is_sealed: false })
        .eq('id', noteId)

      if (error) throw error

      setNotes(notes.map((note) => (note.id === noteId ? { ...note, isSealed: false } : note)))
      toast.success('信件已拆封！')
    } catch (error) {
      console.error('拆封失败:', error)
      toast.error('拆封失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.content.trim()) return
    if (!user || !partner) {
      toast.warning('等另一半加入后才能写留言哦')
      return
    }

    try {
      const { data, error } = await supabase
        .from('love_notes')
        .insert([
          {
            author: user,
            content: newNote.content,
            to_person: partner.id,
            is_read: false,
            letter_style: newNote.letterStyle,
            is_sealed: true,
            emojis: newNote.emojis,
          },
        ])
        .select()

      if (error) throw error

      if (data) {
        const newNoteData = {
          id: data[0].id,
          author: data[0].author,
          content: data[0].content,
          toPerson: data[0].to_person,
          createdAt: data[0].created_at,
          isRead: data[0].is_read,
          letterStyle: data[0].letter_style,
          isSealed: data[0].is_sealed,
          emojis: data[0].emojis,
        }
        setNotes([newNoteData, ...notes])
        setNewNote({ content: '', letterStyle: 'classic', emojis: [] })
        toast.success('留言发送成功！')
      }
    } catch (error) {
      console.error('发送留言失败:', error)
      toast.error('发送失败，请检查网络连接')
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from('love_notes').update({ is_read: true }).eq('id', id)

      if (error) throw error

      setNotes(notes.map((note) => (note.id === id ? { ...note, isRead: true } : note)))
    } catch (error) {
      console.error('标记失败:', error)
    }
  }

  const deleteNote = async (id: string) => {
    if (!confirm('确定要删除这条留言吗？')) return

    try {
      const { error } = await supabase.from('love_notes').delete().eq('id', id)

      if (error) throw error

      setNotes(notes.filter((note) => note.id !== id))
      toast.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败，请重试')
    }
  }

  const filteredNotes = notes.filter((note) => (filter === 'unread' ? !note.isRead : true))

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-8 text-center">
            💌 甜蜜留言板 💌
          </h1>

          {loading ? (
            <LoadingSkeleton type="list" count={4} />
          ) : (
            <>
              {/* New Note Form */}
              <form onSubmit={handleSubmit} className="bg-pink-50 p-4 md:p-6 rounded-xl mb-8">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">你的名字</label>
                      <div className="px-3 md:px-4 py-2 border-2 border-gray-300 rounded-lg text-sm md:text-base bg-white">
                        {me?.name ?? '我'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">给谁</label>
                      <div className="px-3 md:px-4 py-2 border-2 border-gray-300 rounded-lg text-sm md:text-base bg-white">
                        {partner ? (
                          partner.name
                        ) : (
                          <span className="text-gray-500">
                            等另一半加入后可用，
                            <Link href="/pair" className="text-primary underline">
                              去邀请 Ta
                            </Link>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">留言内容</label>
                    <textarea
                      value={newNote.content}
                      onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                      rows={4}
                      placeholder="写下想对 TA 说的话..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">选择信纸样式</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {letterStyles.map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setNewNote({ ...newNote, letterStyle: style.id })}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            newNote.letterStyle === style.id
                              ? `${style.bg} ${style.border} scale-105 shadow-lg`
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-3xl mb-1">{style.icon}</div>
                          <div className="text-sm font-medium">{style.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      添加表情包 (最多5个){' '}
                      {newNote.emojis &&
                        newNote.emojis.length > 0 &&
                        `(已选${newNote.emojis.length})`}
                    </label>
                    <div className="grid grid-cols-8 md:grid-cols-12 gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                      {emojiOptions.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleEmojiToggle(emoji)}
                          disabled={
                            (newNote.emojis?.length || 0) >= 5 && !newNote.emojis?.includes(emoji)
                          }
                          className={`p-2 rounded-lg transition-all text-2xl ${
                            newNote.emojis?.includes(emoji)
                              ? 'bg-pink-200 scale-110 ring-2 ring-pink-400'
                              : 'bg-white hover:bg-gray-100'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="btn-primary w-full" disabled={!partner}>
                    💌 发送留言
                  </button>
                </div>
              </form>

              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2 md:gap-4 mb-6">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-full font-semibold transition-all text-sm md:text-base ${
                    filter === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  全部 ({notes.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-full font-semibold transition-all text-sm md:text-base ${
                    filter === 'unread'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  未读 ({notes.filter((n) => !n.isRead).length})
                </button>
              </div>

              {/* Notes List */}
              <div className="space-y-4">
                {filteredNotes.map((note) => {
                  const currentStyle =
                    letterStyles.find((s) => s.id === note.letterStyle) || letterStyles[0]
                  return (
                    <div
                      key={note.id}
                      className={`relative p-4 md:p-6 rounded-xl shadow transition-all border-2 ${
                        note.isSealed
                          ? 'bg-gradient-to-br from-amber-100 to-amber-50 border-amber-300'
                          : `${currentStyle.bg} ${currentStyle.border}`
                      } ${!note.isRead && 'ring-2 ring-pink-400'}`}
                    >
                      {/* 封口状态显示 */}
                      {note.isSealed && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className="bg-red-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                            🔒 密封信件
                          </div>
                        </div>
                      )}

                      {/* 信纸样式图标 */}
                      {!note.isSealed && (
                        <div className="absolute top-2 right-2 text-2xl">{currentStyle.icon}</div>
                      )}

                      <div className="flex flex-col md:flex-row items-start md:items-start justify-between mb-4 gap-2 mt-4">
                        <div className="w-full md:w-auto">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-primary text-base md:text-lg">
                              {nameOf(note.author)}
                            </span>
                            <span className="text-gray-500">→</span>
                            <span className="font-bold text-secondary text-base md:text-lg">
                              {nameOf(note.toPerson)}
                            </span>
                          </div>
                          <span className="text-xs md:text-sm text-gray-500">
                            {new Date(note.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        {!note.isRead && (
                          <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full self-start">
                            NEW
                          </span>
                        )}
                      </div>

                      {note.isSealed ? (
                        <div className="text-center py-8">
                          <div className="text-6xl mb-4">💌</div>
                          <p className="text-gray-600 mb-4">这是一封密封的信件</p>
                          <button onClick={() => handleUnseal(note.id)} className="btn-primary">
                            🔓 拆封阅读
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-gray-800 text-base md:text-lg mb-4 whitespace-pre-wrap break-words">
                            {note.content}
                          </p>

                          {/* 表情包显示 */}
                          {note.emojis && note.emojis.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-white/50 rounded-lg">
                              {note.emojis.map((emoji, i) => (
                                <span
                                  key={i}
                                  className="text-3xl animate-bounce"
                                  style={{ animationDelay: `${i * 0.1}s` }}
                                >
                                  {emoji}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {!note.isRead && (
                              <button
                                onClick={() => markAsRead(note.id)}
                                className="btn-primary text-xs md:text-sm py-2 px-3 md:px-4"
                              >
                                ✓ 标记已读
                              </button>
                            )}
                            <button
                              onClick={() => deleteNote(note.id)}
                              className="text-red-500 hover:text-red-700 text-xs md:text-sm px-3 md:px-4 py-2"
                            >
                              删除
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {filteredNotes.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">💌</div>
                  <p className="text-gray-500 text-lg">
                    {filter === 'unread' ? '没有未读留言' : '还没有留言，写下第一条吧！'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
