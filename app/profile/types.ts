export interface UserProfile {
  id: string
  display_name: string
  nickname: string | null
  birthday: string | null
  avatar_emoji: string | null
  avatar_url: string | null
}

export interface Reminder {
  id: string
  title: string
  description: string | null
  remind_date: string
  /** 被提醒人的用户 ID */
  remind_to: string | null
  /** 创建者用户 ID；系统自动创建的生日提醒为 null */
  created_by: string | null
  is_sent: boolean
  created_at: string
}
