'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { callAI } from './client'
import { getLocalResponse } from './local-responses'
import type { Message } from './types'

const STORAGE_KEY = 'aiChatHistory_v2'
const MAX_HISTORY = 50

// ── Quick Questions ───────────────────────────────────────
const QUICK_QUESTIONS = [
  { emoji: '🍽️', text: '今天吃什么' },
  { emoji: '🎁', text: '送什么礼物好' },
  { emoji: '💕', text: '说句情话给ta' },
  { emoji: '🎯', text: '推荐约会活动' },
  { emoji: '😊', text: '感情淡了怎么办' },
  { emoji: '🌃', text: '周末干什么好' },
  { emoji: '🤗', text: '怎么哄ta开心' },
  { emoji: '💌', text: '写一段小情书' },
]

// ── Welcome Message ──
const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    '你好！我是你的 AI 小助手 💕\n\n可以问我：\n🎯 约会建议 · 🎁 礼物推荐\n💕 情话 · 🍽️ 今天吃什么\n😊 感情问题 · 💌 写情书\n\n聊点什么？',
  timestamp: Date.now(),
}

// ── Component ──────────────────────────────────────────────
export default function AIChatbot() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const triggerButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const shouldRestoreTriggerFocusRef = useRef(false)
  const hideFloatingAssistant =
    pathname === '/login' || pathname === '/chat' || pathname.startsWith('/chat/') || pathname.startsWith('/mahjong/') || pathname === '/dream-journey'

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Message[]
        if (parsed.length > 0) setMessages(parsed)
      }
    } catch {}
  }, [])

  // Persist history on change
  useEffect(() => {
    try {
      // Only persist if we have real messages beyond the welcome
      if (messages.length > 1 || messages[0]?.id !== 'welcome') {
        const trimmed = messages.slice(-MAX_HISTORY)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
      }
    } catch {}
  }, [messages])

  const scrollToBottom = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }
  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  useEffect(() => {
    if (hideFloatingAssistant) {
      setIsOpen(false)
    }
  }, [hideFloatingAssistant])

  useEffect(() => {
    if (isOpen || !shouldRestoreTriggerFocusRef.current) return

    shouldRestoreTriggerFocusRef.current = false
    if (hideFloatingAssistant) return

    const focusFrame = window.requestAnimationFrame(() => triggerButtonRef.current?.focus())
    return () => window.cancelAnimationFrame(focusFrame)
  }, [hideFloatingAssistant, isOpen])

  useEffect(() => {
    if (!isOpen || hideFloatingAssistant) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (
        event.shiftKey &&
        (document.activeElement === firstElement ||
          !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    window.addEventListener('keydown', handleDialogKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', handleDialogKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [hideFloatingAssistant, isOpen])

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || isLoading) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const recent = [...messages.slice(-10), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))
      const response = await callAI(recent)
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: response, timestamp: Date.now() },
      ])
    } catch {
      const local = getLocalResponse(msg, messages)
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: local, timestamp: Date.now() },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const regenerate = async () => {
    // Find last user message + remove last assistant message, re-ask
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user')
    if (lastUserIdx === -1) return
    const realIdx = messages.length - 1 - lastUserIdx
    const lastUser = messages[realIdx]
    // Remove everything after the last user msg
    const upTo = messages.slice(0, realIdx + 1)
    setMessages(upTo)
    setIsLoading(true)
    try {
      const recent = upTo.slice(-10).map((m) => ({ role: m.role, content: m.content }))
      const response = await callAI(recent)
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: response, timestamp: Date.now() },
      ])
    } catch {
      const local = getLocalResponse(lastUser.content, upTo)
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: local, timestamp: Date.now() },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const copyMessage = async (msg: Message) => {
    try {
      await navigator.clipboard.writeText(msg.content)
      setCopiedId(msg.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {}
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    if (!window.confirm('确定清空聊天记录吗？')) return
    setMessages([WELCOME])
    localStorage.removeItem(STORAGE_KEY)
  }

  if (hideFloatingAssistant) return null

  if (!isOpen) {
    // Show unread indicator if there are saved messages
    const hasHistory = messages.length > 1
    return (
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={() => {
          shouldRestoreTriggerFocusRef.current = true
          setIsOpen(true)
        }}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-3 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xl text-white shadow-lg transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-xl sm:bottom-6 sm:right-6 sm:h-14 sm:w-14 sm:text-2xl"
        aria-label="打开 AI 助手"
        data-global-utility="assistant"
        aria-haspopup="dialog"
        aria-controls="ai-chatbot-dialog"
      >
        <span aria-hidden="true">🤖</span>
        {hasHistory && (
          <span
            className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
            aria-hidden="true"
          />
        )}
      </button>
    )
  }

  return (
    <section
      ref={dialogRef}
      id="ai-chatbot-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-chatbot-title"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[70] flex h-[calc(100dvh-1.5rem)] max-h-[42rem] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-fade-in dark:border-slate-700 dark:bg-slate-900 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:max-h-[80vh] sm:w-96"
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-primary to-secondary p-3 text-white sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl"
            aria-hidden="true"
          >
            🤖
          </div>
          <div className="min-w-0">
            <h2 id="ai-chatbot-title" className="truncate font-bold">
              AI 情侣助手 · 小爱
            </h2>
            <p className="text-xs text-white/80">随时为你服务 · 聊天记录已保存</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={clearChat}
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            title="清空聊天"
            aria-label="清空聊天记录"
          >
            <span aria-hidden="true">🗑️</span>
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-white transition-colors hover:bg-white/20"
            aria-label="关闭 AI 助手"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      {/* Quick Questions */}
      <div
        className="flex gap-2 overflow-x-auto border-b border-gray-200 bg-gray-50 p-2 dark:border-slate-700 dark:bg-slate-950"
        aria-label="快捷问题"
      >
        {QUICK_QUESTIONS.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => sendMessage(q.text)}
            className="flex-shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <span aria-hidden="true">{q.emoji}</span> {q.text}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div
        className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4 dark:bg-slate-950"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={isLoading}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in group`}
          >
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 relative ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white'
                  : 'bg-white text-gray-800 shadow-sm dark:bg-slate-800 dark:text-slate-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <div
                className={`flex items-center justify-between gap-2 mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}
              >
                <p className="text-xs">
                  {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {msg.role === 'assistant' && msg.id !== 'welcome' && (
                  <button
                    onClick={() => copyMessage(msg)}
                    type="button"
                    className="text-xs opacity-0 transition-opacity hover:text-primary group-hover:opacity-100 focus-visible:opacity-100"
                    title="复制"
                    aria-label="复制这条回复"
                  >
                    {copiedId === msg.id ? '✓ 已复制' : '📋'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div
            className="flex justify-start animate-fade-in"
            role="status"
            aria-label="AI 正在回复"
          >
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-800">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Regenerate button */}
      {!isLoading &&
        messages.length > 1 &&
        messages[messages.length - 1].role === 'assistant' &&
        messages[messages.length - 1].id !== 'welcome' && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-1 dark:border-slate-700 dark:bg-slate-950">
            <button
              type="button"
              onClick={regenerate}
              className="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-primary"
            >
              🔄 重新生成
            </button>
          </div>
        )}

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter发送)"
            className="min-w-0 flex-1 resize-none rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            rows={1}
            maxLength={2000}
            disabled={isLoading}
            aria-label="发送给 AI 助手的消息"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-2 font-semibold text-white transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
          >
            发送
          </button>
        </div>
      </div>
    </section>
  )
}
