import 'server-only'
import { createClient, type User } from '@supabase/supabase-js'

/** 校验请求里的 Bearer 令牌，返回登录用户；未登录或令牌无效时返回 null。 */
export async function authenticatedUser(request: Request): Promise<User | null> {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice(7).trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!token || !url || !anonKey) return null

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser(token)
  return error ? null : data.user
}
