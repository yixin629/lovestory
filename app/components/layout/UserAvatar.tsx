'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import AvatarSelector from '@/app/components/avatar/AvatarSelector'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { updateMyAvatar } from '@/lib/user-profiles'

export default function UserAvatar() {
  const { user: currentUser, me, refresh, signOut } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [unreadReminders, setUnreadReminders] = useState(0)
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const pathname = usePathname()
  const { showToast } = useToast()

  useEffect(() => {
    setAvatarUrl(me?.avatar ?? '')
  }, [me?.avatar])

  useEffect(() => {
    if (!currentUser) return
    let active = true

    const checkReminders = async () => {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)

        const { data } = await supabase
          .from('reminders')
          .select('id')
          .eq('remind_to', currentUser)
          .eq('is_sent', false)
          .gte('remind_date', today.toISOString().split('T')[0])
          .lte('remind_date', in3Days.toISOString().split('T')[0])

        if (active && data) setUnreadReminders(data.length)
      } catch (error) {
        console.error('检查提醒失败:', error)
      }
    }

    void checkReminders()
    // 每分钟检查一次提醒
    const interval = setInterval(checkReminders, 60000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [currentUser, pathname])

  useEffect(() => {
    if (!showDropdown) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDropdown(false)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showDropdown])

  const handleLogout = () => {
    void signOut()
  }

  const handleAvatarUpdate = async (newAvatar: string) => {
    // Determine if it's emoji or url
    const previousAvatar = avatarUrl

    setAvatarUrl(newAvatar)

    try {
      if (!currentUser) throw new Error('请先登录')
      await updateMyAvatar(currentUser, newAvatar)
      await refresh()

      showToast('头像更新成功', 'success')
      setShowAvatarSelector(false)
    } catch (error) {
      setAvatarUrl(previousAvatar)
      console.error('Update avatar failed:', error)
      showToast('更新失败', 'error')
    }
  }

  if (!currentUser) return null

  // Chat page has its own header with avatar, so hide this global one to prevent overlap
  if (pathname === '/chat' || pathname === '/login' || pathname === '/pair' || pathname.startsWith('/mahjong/') || pathname === '/dream-journey') return null

  const displayAvatar = avatarUrl || '👤'
  const isImg = displayAvatar.startsWith('http')

  return (
    <>
      <div className="fixed right-3 top-3 z-50 sm:right-4 sm:top-4">
        <div className="relative">
          {/* User Avatar Button */}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex min-h-11 items-center gap-2 rounded-full border-2 border-primary/20 bg-white px-2 py-1.5 shadow-lg transition-all duration-300 hover:border-primary hover:shadow-xl sm:px-4 sm:py-2"
            aria-expanded={showDropdown}
            aria-haspopup="menu"
            aria-controls="user-menu"
            aria-label={`${me?.name || '用户'}的用户菜单${
              unreadReminders > 0 ? `，有 ${unreadReminders} 条提醒` : ''
            }`}
          >
            {isImg ? (
              <Image
                src={displayAvatar}
                alt={`${me?.name || '用户'}的头像`}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl" aria-hidden="true">
                {displayAvatar}
              </span>
            )}
            <span className="hidden font-semibold text-gray-800 sm:inline">
              {me?.name}
            </span>
            {unreadReminders > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white animate-pulse"
                aria-hidden="true"
              >
                {unreadReminders}
              </span>
            )}
            <svg
              className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <>
              {/* Backdrop */}
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setShowDropdown(false)}
                aria-label="关闭用户菜单"
                tabIndex={-1}
              />

              {/* Menu */}
              <div
                id="user-menu"
                className="absolute right-0 z-50 mt-2 w-[min(16rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border-2 border-gray-100 bg-white shadow-2xl animate-fade-in"
                role="menu"
                aria-label="用户菜单"
              >
                {/* User Info with Clickable Avatar */}
                <div className="px-4 py-3 bg-gradient-to-r from-pink-50 to-purple-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAvatarSelector(true)
                        setShowDropdown(false)
                      }}
                      className="group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm transition-all hover:ring-2 hover:ring-primary"
                      aria-label="更换头像"
                    >
                      {isImg ? (
                        <Image
                          src={displayAvatar}
                          alt={`${me?.name || '用户'}的头像`}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl" aria-hidden="true">
                          {displayAvatar}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/30 group-hover:flex hidden items-center justify-center text-white text-xs">
                        更换
                      </div>
                    </button>
                    <div>
                      <p className="font-bold text-gray-800">{me?.name}</p>
                      <p className="text-sm text-gray-600">已登录</p>
                    </div>
                  </div>
                </div>

                {/* Go to Profile */}
                <Link
                  href="/profile"
                  onClick={() => setShowDropdown(false)}
                  className="block px-4 py-3 hover:bg-pink-50 transition-colors border-b border-gray-100"
                  role="menuitem"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl" aria-hidden="true">
                      👤
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">个人资料</p>
                      <p className="text-xs text-gray-500">管理信息和提醒</p>
                    </div>
                    {unreadReminders > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {unreadReminders}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Quick Actions */}
                <div className="p-2">
                  <Link
                    href="/"
                    onClick={() => setShowDropdown(false)}
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    role="menuitem"
                  >
                    🏠 返回首页
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    role="menuitem"
                  >
                    🚪 退出登录
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Avatar Selector Modal */}
      {showAvatarSelector && (
        <AvatarSelector
          currentAvatar={avatarUrl}
          onSelect={handleAvatarUpdate}
          onClose={() => setShowAvatarSelector(false)}
          userId={currentUser ?? ''}
        />
      )}
    </>
  )
}
