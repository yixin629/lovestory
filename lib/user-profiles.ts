import { supabase } from '@/lib/supabase'

/** 更新当前用户头像；图片 URL 存 avatar_url，emoji 存 avatar_emoji。 */
export async function updateMyAvatar(userId: string, avatar: string) {
  const isUrl = avatar.startsWith('http')
  const { error } = await supabase
    .from('user_profiles')
    .update({
      avatar_emoji: isUrl ? null : avatar,
      avatar_url: isUrl ? avatar : null,
    })
    .eq('id', userId)

  if (error) throw error
}
