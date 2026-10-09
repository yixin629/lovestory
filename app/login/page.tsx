'use client'

import { useState } from 'react'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { supabase } from '@/lib/supabase'

type Mode = 'signin' | 'signup' | 'reset'

const MODE_TITLES: Record<Mode, string> = {
  signin: '💕 欢迎回来 💕',
  signup: '💕 创建账号 💕',
  reset: '🔑 找回密码',
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const { success, error, warning } = useToast()

  const switchMode = (next: Mode) => {
    setMode(next)
    setNotice('')
    setPassword('')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting) return

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      warning('请输入邮箱')
      return
    }
    if (mode !== 'reset' && password.length < 6) {
      warning('密码至少 6 位')
      return
    }
    if (mode === 'signup' && !displayName.trim()) {
      warning('请填写昵称')
      return
    }

    setSubmitting(true)
    setNotice('')
    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })
        if (signInError) throw signInError
        success('登录成功！')
        // 跳转由 AuthProvider 根据配对状态完成
      } else if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { display_name: displayName.trim().slice(0, 30) },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setNotice(`验证邮件已发送到 ${trimmedEmail}，点击邮件里的链接后回来登录。`)
          switchModeKeepNotice('signin')
        } else {
          success('注册成功！')
        }
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: `${window.location.origin}/settings`,
        })
        if (resetError) throw resetError
        setNotice('如果这个邮箱已注册，重置密码的邮件已经发出，请查收。')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败'
      error(translateAuthError(message))
    } finally {
      setSubmitting(false)
    }
  }

  const switchModeKeepNotice = (next: Mode) => {
    setMode(next)
    setPassword('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <form className="card text-center" onSubmit={handleSubmit}>
          <h1 className="mb-2 text-4xl font-bold text-primary">{MODE_TITLES[mode]}</h1>
          <p className="mb-8 text-gray-600">
            {mode === 'signup'
              ? '注册后可以邀请另一半，一起拥有专属小世界'
              : mode === 'reset'
                ? '输入注册邮箱，我们会发送重置链接'
                : '用邮箱登录你们的小世界'}
          </p>

          <div className="space-y-4 text-left">
            {mode === 'signup' && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">昵称</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={30}
                  placeholder="对方会看到的名字"
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 transition-all focus:border-primary focus:ring-2 focus:ring-primary"
                  autoComplete="nickname"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">邮箱</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 transition-all focus:border-primary focus:ring-2 focus:ring-primary"
                autoComplete="email"
                autoFocus
              />
            </label>

            {mode !== 'reset' && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">密码</span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 位"
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 transition-all focus:border-primary focus:ring-2 focus:ring-primary"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </label>
            )}
          </div>

          {notice && (
            <p className="mt-4 rounded-lg bg-pink-50 px-4 py-3 text-left text-sm text-pink-700" role="status">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? '请稍候...'
              : mode === 'signin'
                ? '登录'
                : mode === 'signup'
                  ? '注册'
                  : '发送重置邮件'}
          </button>

          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
            {mode !== 'signin' && (
              <button type="button" className="text-primary hover:underline" onClick={() => switchMode('signin')}>
                已有账号，去登录
              </button>
            )}
            {mode !== 'signup' && (
              <button type="button" className="text-primary hover:underline" onClick={() => switchMode('signup')}>
                没有账号？注册
              </button>
            )}
            {mode === 'signin' && (
              <button type="button" className="text-gray-500 hover:underline" onClick={() => switchMode('reset')}>
                忘记密码
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

function translateAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return '邮箱或密码错误'
  if (/email not confirmed/i.test(message)) return '邮箱还没验证，请先点击验证邮件里的链接'
  if (/already registered/i.test(message)) return '这个邮箱已经注册过了'
  if (/rate limit/i.test(message)) return '操作太频繁，请稍后再试'
  if (/password/i.test(message)) return `密码不符合要求：${message}`
  return message
}
