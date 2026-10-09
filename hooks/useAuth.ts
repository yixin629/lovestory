'use client'

import { useAuthContext } from '@/app/components/providers/AuthProvider'

/**
 * 当前登录状态。user 为 Supabase Auth 用户 ID；身份列（作者、发送者等）统一存这个 ID，
 * 显示时用 nameOf(id) 转成昵称。数据隔离由数据库 RLS 保证。
 */
export function useAuth() {
  return useAuthContext()
}
