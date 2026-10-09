import { supabase } from '@/lib/supabase'

/**
 * Realtime broadcast / presence 频道名必须带上情侣 ID，避免不同情侣共用同名频道。
 * postgres_changes 订阅本身受 RLS 限制，但频道名同样建议使用这个函数。
 */
export function coupleChannel(coupleId: string, name: string) {
  return `${name}:${coupleId}`
}

/** 给另一半发送站内通知；还没有另一半时静默跳过。 */
export async function createCoupleNotification({
  actor,
  recipient,
  type,
  title,
  message,
  link,
  metadata = {},
}: {
  actor: string
  recipient: string | null | undefined
  type: string
  title: string
  message: string
  link?: string
  metadata?: Record<string, unknown>
}) {
  if (!recipient) return

  const { error } = await supabase.from('couple_notifications').insert({
    recipient,
    actor,
    notification_type: type,
    title,
    message,
    link: link ?? '/',
    metadata,
  })

  if (error) throw error
}
