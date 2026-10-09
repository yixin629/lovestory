'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton'
import { useAuth } from '@/hooks/useAuth'
import { coupleChannel } from '@/lib/couple-interactions'

interface ChatMessage {
  id: string
  sender: string
  content: string
  message_type: string
  is_read: boolean
  created_at: string
}

// 快捷表情
const QUICK_EMOJIS = [
  '❤️',
  '😘',
  '🥰',
  '😍',
  '💕',
  '💗',
  '🤗',
  '😊',
  '😂',
  '🥺',
  '😭',
  '👍',
  '🎉',
  '🌹',
  '💋',
  '🤭',
  '🐷',
  '🐰',
  '🐱',
  '🐶',
  '🧸',
  '🎈',
  '✨',
  '🌟',
  '🌙',
  '☀️',
  '🌈',
  '💍',
  '🍫',
  '🍬',
  '🌸',
  '🍉',
]

// 快捷消息
const QUICK_MESSAGES = [
  '想你了 💕',
  '在干嘛呀？',
  '吃饭了吗？',
  '爱你哦 ❤️',
  '晚安 🌙',
  '早安 ☀️',
  '抱抱 🤗',
  '么么哒 😘',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [showQuickMessages, setShowQuickMessages] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const { user: currentUser, me, partner, coupleId } = useAuth()

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // 加载消息
  const loadMessages = useCallback(async () => {
    try {
      if (!currentUser) return // Wait for user

      setIsLoading(true)
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) {
        // Check if error is due to missing table
        if (error.code === '42P01') {
          console.error('Chat table missing:', error)
        showToast('聊天功能未初始化，请联系管理员运行 database/setup/04-interactions.sql', 'error')
          return
        }
        throw error
      }

      if (data) {
        setMessages(data)
        setTimeout(scrollToBottom, 500) // Delay scroll to ensure render
      }
    } catch (error) {
      console.error('加载消息失败:', error)
      showToast('加载消息失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, scrollToBottom, showToast])

  // 标记消息为已读
  const markAsRead = useCallback(async () => {
    if (!currentUser) return

    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .neq('sender', currentUser)
        .eq('is_read', false)
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }, [currentUser])

  // 监听实时消息
  useEffect(() => {
    if (!currentUser || !coupleId) return

    loadMessages()

    const channel = supabase
      .channel(coupleChannel(coupleId, 'chat_room'))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          setMessages((prev) => [...prev, newMessage])
          // 如果也是自己发的，可能会重复显示（如果本地已经optimistic update了）
          // 但这里我们简单处理，filter distinct ids?
          // 或者 relies on React key uniqueness if ID matches?
          // To be safe, wait for real ID.
          setTimeout(scrollToBottom, 100)
        }
      )
      .subscribe()

    // 标记已读
    markAsRead()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser, coupleId, loadMessages, scrollToBottom, markAsRead])

  // 消息更新后滚动到底部
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // 计算未读消息
  useEffect(() => {
    if (!currentUser) return
    const unread = messages.filter((m) => m.sender !== currentUser && !m.is_read).length
    setUnreadCount(unread)
  }, [messages, currentUser])

  // 发送消息
  const sendMessage = async (content?: string) => {
    const messageContent = content || newMessage.trim()

    // Check login
    if (!currentUser) {
      showToast('请先登录', 'warning')
      return
    }

    if (!messageContent) return

    setIsSending(true)
    setNewMessage('') // Optimistic clear
    setShowEmojis(false)
    setShowQuickMessages(false)

    try {
      console.log('Attempting to send message:', {
        sender: currentUser,
        content: messageContent,
      })

      const { data, error } = await supabase
        .from('chat_messages')
        .insert([
          {
            sender: currentUser,
            content: messageContent,
            message_type: 'text',
            is_read: false,
          },
        ])
        .select()

      if (error) {
        throw error
      }

      console.log('Message sent successfully:', data)
      // Realtime subscription will handle the UI update
    } catch (error: any) {
      console.error('发送消息失败:', error)
      showToast(`发送失败: ${error.message || '未知错误'}`, 'error')
      // Restore message if failed
      if (!content) setNewMessage(messageContent)
    } finally {
      setIsSending(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // 处理按键
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // 清空聊天记录
  const clearChat = async () => {
    if (!confirm('确定要清空所有聊天记录吗？这个操作不可恢复！')) return

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000')

      if (error) throw error

      setMessages([])
      showToast('聊天记录已清空', 'success')
    } catch (error) {
      console.error('清空失败:', error)
      showToast('清空失败', 'error')
    }
  }

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isYesterday) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    }

    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 获取对方用户名
  const getPartnerName = () => {
    return partner?.name ?? '等另一半加入'
  }

  // 获取头像（图片 URL 或 emoji）
  const getAvatar = (sender: string | null | undefined) => {
    const avatar = sender === me?.id ? me?.avatar : sender === partner?.id ? partner?.avatar : undefined
    if (!avatar) return '💕'
    if (avatar.startsWith('http')) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={avatar} alt="头像" width={32} height={32} loading="lazy" className="h-full w-full rounded-full object-cover" />
    }
    return avatar
  }

  if (!currentUser) {
    if (isLoading) {
      return (
        <div className="min-h-screen p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="card text-center">
              <LoadingSkeleton type="list" count={3} />
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <BackButton href="/" text="返回首页" />
          <div className="card text-center py-12">
            <h1 className="text-3xl font-bold text-primary mb-4">💬 甜蜜聊天室</h1>
            <p className="text-gray-600 mb-6">请先登录后再使用聊天功能</p>
            <a
              href="/login"
              className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all"
            >
              去登录
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-20 border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between h-[60px]">
          {/* Left Side */}
          <div className="flex items-center gap-3 overflow-hidden pl-12 md:pl-0">
            <BackButton href="/" text="返回首页" className="!mb-0 !px-3 !py-1 text-sm shrink-0" />

            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-9 h-9 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-lg shadow-sm shrink-0 text-white">
                {getAvatar(partner?.id)}
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-gray-800 text-sm md:text-base truncate leading-tight">
                  {getPartnerName()}
                </h1>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0"></span>
                  <p className="text-[10px] md:text-xs text-green-600 truncate">在线</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <button
            onClick={clearChat}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shrink-0 ml-2 pr-12 md:pr-0"
            title="清空聊天"
          >
            <span className="text-xl">🗑️</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-2xl mx-auto w-full">
        {isLoading ? (
          <div className="flex justify-center items-center h-full py-20">
            <LoadingSkeleton type="list" count={5} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
            <div className="text-6xl mb-4 animate-bounce-slow">💬</div>
            <p className="text-lg font-medium">还没有消息</p>
            <p className="text-sm text-gray-400 mt-1">发送第一条消息开始聊天吧！</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isMe = message.sender === currentUser
              const showAvatar = index === 0 || messages[index - 1]?.sender !== message.sender

              return (
                <div
                  key={message.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`flex items-end gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    {showAvatar ? (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 shadow-md ${
                          isMe
                            ? 'bg-gradient-to-br from-pink-400 to-purple-500'
                            : 'bg-gradient-to-br from-purple-400 to-pink-500'
                        }`}
                      >
                        {getAvatar(message.sender)}
                      </div>
                    ) : (
                      <div className="w-8 flex-shrink-0"></div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2 shadow-sm ${
                        isMe
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-sm'
                          : 'bg-white shadow-md text-gray-800 rounded-bl-sm border border-pink-100'
                      }`}
                    >
                      <p className="break-words whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                        {formatTime(message.created_at)}
                        {isMe && <span className="ml-1">{message.is_read ? '✓✓' : '✓'}</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick Messages Panel */}
      {showQuickMessages && (
        <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3 max-w-2xl mx-auto w-full animate-fade-in">
          <div className="flex flex-wrap gap-2">
            {QUICK_MESSAGES.map((msg, i) => (
              <button
                key={i}
                onClick={() => sendMessage(msg)}
                className="px-3 py-1.5 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 rounded-full text-sm text-primary transition-all hover:shadow-md"
              >
                {msg}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Emoji Panel */}
      {showEmojis && (
        <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3 max-w-2xl mx-auto w-full animate-fade-in">
          <div className="flex flex-wrap gap-2">
            {QUICK_EMOJIS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => setNewMessage((prev) => prev + emoji)}
                className="w-10 h-10 text-2xl hover:bg-pink-50 rounded-lg transition-all hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3 sticky bottom-0">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {/* Quick Actions */}
          <button
            onClick={() => {
              setShowEmojis(!showEmojis)
              setShowQuickMessages(false)
            }}
            className={`p-2 rounded-full transition-all ${
              showEmojis ? 'bg-pink-100 text-pink-600 scale-110' : 'hover:bg-gray-100'
            }`}
            title="表情"
          >
            😊
          </button>
          <button
            onClick={() => {
              setShowQuickMessages(!showQuickMessages)
              setShowEmojis(false)
            }}
            className={`p-2 rounded-full transition-all ${
              showQuickMessages ? 'bg-pink-100 text-pink-600 scale-110' : 'hover:bg-gray-100'
            }`}
            title="快捷消息"
          >
            ⚡
          </button>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all"
            disabled={isSending}
          />

          {/* Send Button */}
          <button
            onClick={() => sendMessage()}
            disabled={!newMessage.trim() || isSending}
            className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSending ? <span className="animate-spin">⏳</span> : '发送'}
          </button>
        </div>
      </div>

      {/* Unread Indicator */}
      {unreadCount > 0 && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm shadow-lg animate-bounce hover:shadow-xl transition-all"
        >
          {unreadCount} 条新消息 ↓
        </button>
      )}
    </div>
  )
}
