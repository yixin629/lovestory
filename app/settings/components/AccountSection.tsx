'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const MIN_PASSWORD_LENGTH = 6

function errorMessage(err: unknown, fallback: string) {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

/** 账号与情侣：登录邮箱、修改密码、邀请码、解除配对、退出登录。未配对用户也能访问。 */
export default function AccountSection() {
  const router = useRouter()
  const toast = useToast()
  const { session, coupleId, inviteCode, partner, refresh, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const email = session?.user.email ?? '未知邮箱'

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (savingPassword) return
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.warning(`新密码至少 ${MIN_PASSWORD_LENGTH} 位`)
      return
    }
    if (password !== confirmPassword) {
      toast.warning('两次输入的密码不一致')
      return
    }

    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setPassword('')
      setConfirmPassword('')
      toast.success('密码已更新')
    } catch (err) {
      console.error('修改密码失败:', err)
      toast.error(errorMessage(err, '修改密码失败，请重试'))
    } finally {
      setSavingPassword(false)
    }
  }

  const copyInviteCode = async () => {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      toast.success('邀请码已复制')
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  const handleLeaveCouple = async () => {
    if (leaving || !coupleId) return
    const confirmed = window.confirm(
      '确定要解除配对吗？\n\n解除后你将离开当前情侣空间。若你是最后一个离开的人，情侣空间里的全部数据（照片、日记、账本、聊天等）会被永久删除，无法恢复。'
    )
    if (!confirmed) return
    if (
      !partner &&
      !window.confirm(
        '另一半目前不在这个空间里，你就是最后一个成员。继续将永久删除全部数据，确定吗？'
      )
    ) {
      return
    }

    setLeaving(true)
    try {
      const { error } = await supabase.rpc('leave_couple')
      if (error) throw error
      await refresh()
      toast.success('已解除配对')
      router.replace('/pair')
    } catch (err) {
      console.error('解除配对失败:', err)
      toast.error(errorMessage(err, '解除配对失败，请重试'))
    } finally {
      setLeaving(false)
    }
  }

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
    } catch (err) {
      console.error('退出登录失败:', err)
      toast.error('退出登录失败，请重试')
      setSigningOut(false)
    }
  }

  return (
    <div className="card mt-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">🔐 账号与情侣</h2>

      <div className="space-y-6">
        <div>
          <p className="text-sm text-gray-500">登录邮箱</p>
          <p className="text-lg font-medium text-gray-800 break-all">{email}</p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <p className="text-gray-700 font-medium">修改密码</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`新密码（至少 ${MIN_PASSWORD_LENGTH} 位）`}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            aria-label="新密码"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="再次输入新密码"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            aria-label="确认新密码"
          />
          <button
            type="submit"
            disabled={savingPassword}
            className="w-full btn-primary disabled:opacity-50"
          >
            {savingPassword ? '保存中...' : '更新密码'}
          </button>
        </form>

        <div className="rounded-xl bg-pink-50 p-4">
          <p className="text-gray-700 font-medium mb-2">💞 情侣空间</p>
          {coupleId ? (
            <>
              {inviteCode && (
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-2xl font-black tracking-[0.2em] text-gray-800">
                    {inviteCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyInviteCode}
                    className="text-sm text-primary hover:underline"
                  >
                    复制
                  </button>
                </div>
              )}
              {partner ? (
                <p className="text-gray-700">另一半：{partner.name}</p>
              ) : (
                <p className="text-sm text-gray-600">
                  另一半还没有加入，把上面的邀请码发给 Ta，Ta 注册登录后输入即可配对。
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-600">
              你还没有加入情侣空间。
              <Link href="/pair" className="text-primary underline ml-1">
                去创建或加入
              </Link>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {coupleId && (
            <button
              type="button"
              onClick={handleLeaveCouple}
              disabled={leaving}
              className="p-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium disabled:opacity-50"
            >
              {leaving ? '处理中...' : '💔 解除配对'}
            </button>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="p-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
          >
            {signingOut ? '退出中...' : '🚪 退出登录'}
          </button>
        </div>
      </div>
    </div>
  )
}
