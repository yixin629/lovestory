'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface CoupleMember {
  id: string
  name: string
  /** 图片 URL 或 emoji */
  avatar: string
}

export interface AuthState {
  loading: boolean
  session: Session | null
  /** 当前登录用户的 Supabase Auth ID */
  user: string | null
  me: CoupleMember | null
  /** 另一半；尚未配对或对方还没加入时为 null */
  partner: CoupleMember | null
  coupleId: string | null
  inviteCode: string | null
  /** 把身份列里的用户 ID 转成昵称，未知 ID 返回「Ta」 */
  nameOf: (id: string | null | undefined) => string
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

interface ProfileRow {
  id: string
  display_name: string
  avatar_url: string | null
  avatar_emoji: string | null
}

const AuthContext = createContext<AuthState | null>(null)

// 无需登录即可访问的页面
const PUBLIC_PATHS = new Set(['/login'])
// 已登录但还没配对时允许访问的页面
const UNPAIRED_PATHS = new Set(['/pair', '/settings'])

function toMember(row: ProfileRow): CoupleMember {
  return { id: row.id, name: row.display_name, avatar: row.avatar_url || row.avatar_emoji || '😊' }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [coupleLoaded, setCoupleLoaded] = useState(false)
  const [me, setMe] = useState<CoupleMember | null>(null)
  const [partner, setPartner] = useState<CoupleMember | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  const userId = session?.user.id ?? null

  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setSessionLoaded(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setSessionLoaded(true)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const loadCouple = useCallback(async (currentUserId: string | null) => {
    if (!currentUserId) {
      setMe(null)
      setPartner(null)
      setCoupleId(null)
      setInviteCode(null)
      setCoupleLoaded(true)
      return
    }

    const { data: membership, error: membershipError } = await supabase
      .from('couple_members')
      .select('couple_id, couples(invite_code)')
      .eq('user_id', currentUserId)
      .maybeSingle()
    if (membershipError) console.error('读取情侣空间失败:', membershipError)

    const nextCoupleId = membership?.couple_id ?? null
    const couple = membership?.couples as { invite_code: string } | { invite_code: string }[] | null | undefined
    const code = Array.isArray(couple) ? couple[0]?.invite_code : couple?.invite_code

    let memberIds = [currentUserId]
    if (nextCoupleId) {
      const { data: members } = await supabase
        .from('couple_members')
        .select('user_id')
        .eq('couple_id', nextCoupleId)
      memberIds = Array.from(new Set([currentUserId, ...(members ?? []).map((m) => m.user_id as string)]))
    }

    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, display_name, avatar_url, avatar_emoji')
      .in('id', memberIds)
    if (profileError) console.error('读取个人资料失败:', profileError)

    const rows = (profiles ?? []) as ProfileRow[]
    const mine = rows.find((row) => row.id === currentUserId)
    const theirs = rows.find((row) => row.id !== currentUserId)

    setMe(mine ? toMember(mine) : { id: currentUserId, name: '我', avatar: '😊' })
    setPartner(theirs ? toMember(theirs) : null)
    setCoupleId(nextCoupleId)
    setInviteCode(code ?? null)
    setCoupleLoaded(true)
  }, [])

  useEffect(() => {
    if (!sessionLoaded) return
    setCoupleLoaded(false)
    void loadCouple(userId)
  }, [sessionLoaded, userId, loadCouple])

  // 另一半加入或离开时刷新
  useEffect(() => {
    if (!coupleId) return
    const channel = supabase
      .channel(`couple-members:${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_members', filter: `couple_id=eq.${coupleId}` },
        () => void loadCouple(userId)
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [coupleId, userId, loadCouple])

  const loading = !sessionLoaded || !coupleLoaded

  useEffect(() => {
    if (loading) return
    if (!session) {
      if (!PUBLIC_PATHS.has(pathname)) router.replace('/login')
      return
    }
    if (!coupleId) {
      if (!UNPAIRED_PATHS.has(pathname)) router.replace('/pair')
      return
    }
    // 已创建空间但对方未加入时，留在 /pair 展示邀请码
    if (pathname === '/login' || (pathname === '/pair' && partner)) router.replace('/')
  }, [loading, session, coupleId, partner, pathname, router])

  const refresh = useCallback(() => loadCouple(userId), [loadCouple, userId])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }, [router])

  const value = useMemo<AuthState>(() => {
    const names = new Map<string, string>()
    if (me) names.set(me.id, me.name)
    if (partner) names.set(partner.id, partner.name)
    return {
      loading,
      session,
      user: userId,
      me,
      partner,
      coupleId,
      inviteCode,
      nameOf: (id) => (id ? names.get(id) ?? 'Ta' : 'Ta'),
      refresh,
      signOut,
    }
  }, [loading, session, userId, me, partner, coupleId, inviteCode, refresh, signOut])

  const allowedWhileLoading = PUBLIC_PATHS.has(pathname)
  const blocked =
    !allowedWhileLoading &&
    (loading || !session || (!coupleId && !UNPAIRED_PATHS.has(pathname)))

  return (
    <AuthContext.Provider value={value}>
      {blocked ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-6xl">💕</div>
            <p className="text-xl text-gray-600">加载中...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return context
}
