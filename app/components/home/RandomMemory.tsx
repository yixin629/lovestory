'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Photo {
  id: string
  title: string
  description: string
  image_url: string
  uploaded_by: string
  created_at: string
}

interface Note {
  id: string
  author: string
  to_person: string
  content: string
  created_at: string
}

type Memory = { type: 'photo'; data: Photo } | { type: 'note'; data: Note } | null

export default function RandomMemory() {
  const { nameOf } = useAuth()
  const [memory, setMemory] = useState<Memory>(null)
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const loadRandomMemory = async () => {
    setLoading(true)
    setShow(false)
    setStatusMessage('')

    try {
      const [photosResult, notesResult] = await Promise.all([
        supabase
          .from('photos')
          .select('id, title, description, image_url, uploaded_by, created_at')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('love_notes')
          .select('id, author, to_person, content, created_at')
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (photosResult.error) throw photosResult.error
      if (notesResult.error) throw notesResult.error

      const memories: Exclude<Memory, null>[] = [
        ...(photosResult.data || []).map((data) => ({ type: 'photo' as const, data })),
        ...(notesResult.data || []).map((data) => ({ type: 'note' as const, data })),
      ]

      if (memories.length === 0) {
        setMemory(null)
        setStatusMessage('还没有可抽取的照片或留言，先记录一份回忆吧。')
        return
      }

      const randomIndex = Math.floor(Math.random() * memories.length)
      setMemory(memories[randomIndex])
      setShow(true)
    } catch (error) {
      console.error('加载回忆失败:', error)
      setStatusMessage('回忆暂时加载失败，请稍后再试。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-primary mb-2">
          <span aria-hidden="true">💫</span> 随机回忆 <span aria-hidden="true">💫</span>
        </h2>
        <p className="text-gray-600">让我们看看有什么美好的回忆吧</p>
      </div>

      <button
        type="button"
        onClick={loadRandomMemory}
        disabled={loading}
        className="btn-primary mb-6 min-h-11 w-full"
        aria-busy={loading}
      >
        {loading ? '加载中...' : '🎲 抽取一个回忆'}
      </button>

      {statusMessage && (
        <p className="rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-900" role="status">
          {statusMessage}
        </p>
      )}

      {show && memory && (
        <div className="animate-fade-in" aria-live="polite">
          {memory.type === 'photo' ? (
            <div className="bg-pink-50 rounded-xl p-6 border border-pink-200">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl" aria-hidden="true">
                  📸
                </span>
                <h3 className="text-xl font-bold text-gray-800">{memory.data.title}</h3>
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={memory.data.image_url}
                alt={memory.data.title}
                className="w-full max-h-96 object-contain rounded-lg mb-4 bg-gray-50"
              />

              {memory.data.description && (
                <p className="text-gray-700 mb-3">{memory.data.description}</p>
              )}

              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>📷 {nameOf(memory.data.uploaded_by)}</span>
                <span>{new Date(memory.data.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl" aria-hidden="true">
                  💌
                </span>
                <h3 className="text-xl font-bold text-gray-800">甜蜜留言</h3>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
                  {memory.data.content}
                </p>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>
                  From: <span className="font-semibold text-primary">{nameOf(memory.data.author)}</span>
                  {' → '}
                  To: <span className="font-semibold text-secondary">{nameOf(memory.data.to_person)}</span>
                </span>
                <span>{new Date(memory.data.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
