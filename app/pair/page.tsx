'use client'

import { useState } from 'react'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function PairPage() {
  const { me, coupleId, inviteCode, partner, refresh, signOut } = useAuth()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const { success, error } = useToast()

  const createSpace = async () => {
    if (busy) return
    setBusy(true)
    try {
      const { error: rpcError } = await supabase.rpc('create_couple')
      if (rpcError) throw rpcError
      await refresh()
      success('情侣空间已创建，把邀请码发给另一半吧')
    } catch (err) {
      error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  const joinSpace = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (busy || trimmed.length !== 8) {
      if (trimmed.length !== 8) error('邀请码是 8 位字母或数字')
      return
    }
    setBusy(true)
    try {
      const { error: rpcError } = await supabase.rpc('join_couple', { code: trimmed })
      if (rpcError) throw rpcError
      success('配对成功！')
      await refresh()
    } catch (err) {
      error(err instanceof Error ? err.message : '加入失败')
    } finally {
      setBusy(false)
    }
  }

  const copyCode = async () => {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      success('邀请码已复制')
    } catch {
      error('复制失败，请手动复制')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="card text-center">
          <h1 className="mb-2 text-3xl font-bold text-primary">💞 和另一半配对</h1>
          <p className="text-gray-600">
            {me ? `嗨，${me.name}！` : ''}创建一个情侣空间并把邀请码发给对方，或者输入对方给你的邀请码。
          </p>
        </div>

        {coupleId && inviteCode && !partner ? (
          <div className="card text-center">
            <p className="text-sm text-gray-500">你的邀请码</p>
            <p className="my-3 font-mono text-4xl font-black tracking-[0.3em] text-gray-800">{inviteCode}</p>
            <button type="button" onClick={copyCode} className="btn-primary w-full">
              复制邀请码
            </button>
            <p className="mt-4 text-sm text-gray-500">对方注册登录后输入这个邀请码即可加入。你现在也可以先进入小世界。</p>
          </div>
        ) : (
          <>
            <div className="card">
              <h2 className="mb-2 text-lg font-bold text-gray-800">我先创建</h2>
              <p className="mb-4 text-sm text-gray-500">生成一个 8 位邀请码，发给另一半。</p>
              <button type="button" onClick={createSpace} disabled={busy} className="btn-primary w-full disabled:opacity-50">
                {busy ? '请稍候...' : '创建情侣空间'}
              </button>
            </div>

            <form className="card" onSubmit={joinSpace}>
              <h2 className="mb-2 text-lg font-bold text-gray-800">我有邀请码</h2>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={8}
                placeholder="例如 3F9A2C7B"
                className="mb-4 w-full rounded-lg border-2 border-gray-300 px-4 py-3 font-mono text-lg tracking-widest focus:border-primary focus:ring-2 focus:ring-primary"
                aria-label="邀请码"
                autoCapitalize="characters"
              />
              <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
                加入情侣空间
              </button>
            </form>
          </>
        )}

        <button type="button" onClick={() => void signOut()} className="w-full text-sm text-gray-500 hover:underline">
          退出登录
        </button>
      </div>
    </div>
  )
}
