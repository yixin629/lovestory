'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { ANSWER_TONES, BookAnswer, pickAnswer } from '../lib/answers'

interface AnswerHistoryEntry {
  id: string
  question: string
  answer: BookAnswer
  createdAt: string
}

const STORAGE_KEY = 'answer-book-history-v1'
const MAX_HISTORY = 10

function isHistoryEntry(value: unknown): value is AnswerHistoryEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<AnswerHistoryEntry>
  return (
    typeof entry.id === 'string' &&
    typeof entry.question === 'string' &&
    typeof entry.createdAt === 'string' &&
    Boolean(entry.answer) &&
    typeof entry.answer?.id === 'string' &&
    typeof entry.answer?.text === 'string'
  )
}

function createEntryId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function AnswerBook() {
  const toast = useToast()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<BookAnswer | null>(null)
  const [isOpening, setIsOpening] = useState(false)
  const [history, setHistory] = useState<AnswerHistoryEntry[]>([])
  const [historyReady, setHistoryReady] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (Array.isArray(parsed)) setHistory(parsed.filter(isHistoryEntry).slice(0, MAX_HISTORY))
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    } finally {
      setHistoryReady(true)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!historyReady) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  }, [history, historyReady])

  const askBook = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isOpening) return

    setIsOpening(true)
    setAnswer(null)
    timerRef.current = setTimeout(() => {
      const nextAnswer = pickAnswer(history[0]?.answer.id)
      const nextEntry: AnswerHistoryEntry = {
        id: createEntryId(),
        question: question.trim(),
        answer: nextAnswer,
        createdAt: new Date().toISOString(),
      }

      setAnswer(nextAnswer)
      setHistory((current) => [nextEntry, ...current].slice(0, MAX_HISTORY))
      setIsOpening(false)
      timerRef.current = null
    }, 900)
  }

  const copyAnswer = async () => {
    if (!answer) return
    const text = question.trim()
      ? `我的问题：${question.trim()}\n答案之书：${answer.text}`
      : `答案之书：${answer.text}`

    try {
      await navigator.clipboard.writeText(text)
      toast.success('答案已复制')
    } catch {
      toast.error('复制失败，请长按答案手动复制')
    }
  }

  const tone = answer ? ANSWER_TONES[answer.tone] : null

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 px-5 py-8 text-white shadow-2xl shadow-purple-900/20 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <span className="absolute left-[8%] top-[12%] text-sm text-amber-200/70">✦</span>
          <span className="absolute right-[12%] top-[20%] text-xl text-violet-200/60">✧</span>
          <span className="absolute bottom-[20%] left-[14%] text-lg text-rose-200/50">✦</span>
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />
        </div>

        <form onSubmit={askBook} className="relative mx-auto max-w-2xl">
          <label
            htmlFor="answer-book-question"
            className="mb-3 block text-center text-sm text-violet-100/80"
          >
            写下你的问题，或者只在心里默念
          </label>
          <textarea
            id="answer-book-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={80}
            rows={2}
            disabled={isOpening}
            placeholder="例如：我现在应该勇敢迈出这一步吗？"
            className="w-full resize-none rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-center text-base text-white outline-none backdrop-blur-sm transition placeholder:text-violet-200/45 focus:border-amber-200/60 focus:bg-white/15 focus:ring-4 focus:ring-amber-200/10 disabled:opacity-60 sm:text-lg"
          />
          <div className="mt-2 text-right text-xs text-violet-200/55">{question.length}/80</div>

          <div className="mx-auto mt-7 max-w-xl [perspective:1200px]">
            <div
              className={`relative min-h-64 rounded-2xl border border-amber-200/25 bg-gradient-to-br from-[#352350] to-[#17142c] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.45)] transition-all duration-700 sm:min-h-72 ${
                isOpening ? 'scale-[1.03]' : 'scale-100'
              }`}
            >
              <div className="absolute -left-2 top-5 h-[calc(100%-2.5rem)] w-3 rounded-l-md bg-gradient-to-b from-amber-200/70 via-amber-500/50 to-amber-200/60" />
              <div className="relative flex min-h-60 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#201936] px-6 py-10 text-center sm:min-h-68 sm:px-12">
                {tone && (
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${tone.glow} via-transparent to-transparent`}
                    aria-hidden="true"
                  />
                )}

                <div className="relative" aria-live="polite">
                  {isOpening ? (
                    <div className="space-y-5">
                      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-violet-200/20 border-t-amber-200" />
                      <p className="tracking-[0.25em] text-violet-100/70">正在翻开答案…</p>
                    </div>
                  ) : answer && tone ? (
                    <div className="animate-[fadeIn_0.6s_ease-out]">
                      <div className={`mb-5 text-xs font-semibold tracking-[0.3em] ${tone.accent}`}>
                        {tone.label}
                      </div>
                      <blockquote className="text-2xl font-bold leading-relaxed text-white sm:text-3xl">
                        “{answer.text}”
                      </blockquote>
                      <div className="mx-auto mt-6 h-px w-20 bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
                    </div>
                  ) : (
                    <div>
                      <div className="mb-5 text-5xl" aria-hidden="true">
                        📖
                      </div>
                      <p className="text-xl font-semibold tracking-[0.18em] text-amber-100">
                        答案之书
                      </p>
                      <p className="mt-3 text-sm text-violet-100/55">
                        深呼吸，然后翻开属于你的这一页
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              type="submit"
              disabled={isOpening}
              className="min-h-12 rounded-full bg-gradient-to-r from-amber-300 to-rose-300 px-7 py-3 font-bold text-slate-900 shadow-lg shadow-rose-500/15 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-amber-200/30 disabled:cursor-wait disabled:opacity-60"
            >
              {answer ? '再翻一页' : '翻开答案'}
            </button>
            {answer && !isOpening && (
              <button
                type="button"
                onClick={copyAnswer}
                className="min-h-12 rounded-full border border-white/20 bg-white/10 px-6 py-3 font-medium text-white transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/10"
              >
                复制答案
              </button>
            )}
          </div>
        </form>
      </section>

      {historyReady && history.length > 0 && (
        <section className="rounded-[2rem] border border-pink-100 bg-white/90 p-5 shadow-lg shadow-pink-100/40 backdrop-blur-sm sm:p-7">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">最近翻过的页</h2>
              <p className="mt-1 text-sm text-gray-500">仅保存在当前浏览器</p>
            </div>
            <button
              type="button"
              onClick={() => setHistory([])}
              className="min-h-11 rounded-xl px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              清空记录
            </button>
          </div>

          <ol className="grid gap-3 sm:grid-cols-2">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-gray-500">{entry.question || '心里的问题'}</p>
                  <time className="shrink-0 text-xs text-gray-400" dateTime={entry.createdAt}>
                    {formatTime(entry.createdAt)}
                  </time>
                </div>
                <p className="mt-3 font-semibold leading-relaxed text-purple-900">
                  {entry.answer.text}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="text-center text-xs leading-relaxed text-gray-400">
        答案是一份灵感，不替代你的判断；重要决定也要考虑现实信息与真实感受。
      </p>
    </div>
  )
}
