'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/app/components/feedback/ToastProvider'

interface AvatarSelectorProps {
  currentAvatar: string
  onSelect: (newAvatar: string) => void
  onClose: () => void
  userId: string
}

const EMOJI_OPTIONS = [
  // 表情
  '😊', '😎', '🤠', '🥳', '🥰', '😍', '🤩', '😇',
  '🤔', '😴', '🥺', '😜', '🤗', '🫠', '😏', '🙃',
  // 情侣 / 爱心
  '💕', '💖', '💘', '💝', '❤️', '💛', '💚', '💙',
  // 动物
  '🐶', '🐱', '🐼', '🦊', '🦁', '🐷', '🐰', '🐨',
  '🐯', '🐻', '🐸', '🐵', '🦄', '🐔', '🐧', '🦋',
  // 自然
  '⭐', '🌟', '🌙', '☀️', '🌈', '⚡', '❄️', '🌸',
  '🌻', '🌵', '🍀', '🔥',
  // 食物
  '🍎', '🍓', '🥑', '🍕', '🍔', '🍜', '🍩', '🍭',
  '🧋', '🍦', '🍉', '🍇',
  // 兴趣 / 其他
  '⚽', '🏀', '🎮', '🎨', '🚀', '💎', '🎸', '📚',
  '🎧', '📷', '✈️', '🎬',
]

export default function AvatarSelector({
  currentAvatar,
  onSelect,
  onClose,
  userId,
}: AvatarSelectorProps) {
  const [activeTab, setActiveTab] = useState<'emoji' | 'image'>('emoji')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const uploadingRef = useRef(uploading)
  const { showToast } = useToast()

  useEffect(() => {
    uploadingRef.current = uploading
  }, [uploading])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !uploadingRef.current) {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [onClose])

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji)
    onClose()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return
      }
      const file = event.target.files[0]

      if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件', 'warning')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast('图片不能超过 5 MB', 'warning')
        return
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '-')
      // Storage 策略要求头像放在 <user_id>/ 目录下
      const filePath = `${safeUserId}/${crypto.randomUUID()}.${fileExt}`

      setUploading(true)

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get Public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

      onSelect(data.publicUrl)
      onClose()
      showToast('头像上传成功！', 'success')
    } catch (error: unknown) {
      console.error('Upload failed:', error)
      showToast('上传失败，请确保已有 avatars 存储桶', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm animate-fade-in"
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-selector-title"
      >
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 id="avatar-selector-title" className="font-bold text-gray-800">
            更换头像
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700"
            disabled={uploading}
            aria-label="关闭头像选择窗口"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="flex border-b" role="tablist" aria-label="头像来源">
          <button
            type="button"
            id="avatar-tab-emoji"
            role="tab"
            aria-selected={activeTab === 'emoji'}
            aria-controls="avatar-panel-emoji"
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'emoji'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('emoji')}
          >
            😊 表情
          </button>
          <button
            type="button"
            id="avatar-tab-image"
            role="tab"
            aria-selected={activeTab === 'image'}
            aria-controls="avatar-panel-image"
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'image'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('image')}
          >
            🖼️ 图片
          </button>
        </div>

        <div className="h-64 overflow-y-auto p-4">
          {activeTab === 'emoji' ? (
            <div
              id="avatar-panel-emoji"
              className="grid grid-cols-5 gap-2"
              role="tabpanel"
              aria-labelledby="avatar-tab-emoji"
            >
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className={`min-h-11 rounded-lg p-2 text-2xl transition-colors hover:bg-gray-100 ${
                    currentAvatar === emoji ? 'bg-pink-100 ring-2 ring-pink-300' : ''
                  }`}
                  aria-label={`选择 ${emoji} 作为头像`}
                  aria-pressed={currentAvatar === emoji}
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              ))}
            </div>
          ) : (
            <div
              id="avatar-panel-image"
              className="flex h-full flex-col items-center justify-center space-y-4"
              role="tabpanel"
              aria-labelledby="avatar-tab-image"
            >
              <button
                type="button"
                className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-100 transition-colors hover:border-primary disabled:cursor-wait"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label={uploading ? '正在上传头像' : '选择一张头像图片'}
              >
                {uploading ? (
                  <span className="animate-spin" aria-hidden="true">
                    ⏳
                  </span>
                ) : (
                  <span className="text-4xl text-gray-500" aria-hidden="true">
                    +
                  </span>
                )}
                {/* Preview current if it's an image */}
                {currentAvatar && currentAvatar.startsWith('http') && !uploading && (
                  <Image
                    src={currentAvatar}
                    alt="当前头像"
                    width={96}
                    height={96}
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                  />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
                disabled={uploading}
              />
              <p className="text-center text-sm text-gray-500">支持 5 MB 以内的图片</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
