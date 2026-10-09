import Image from 'next/image'
import { getAge, getDaysUntil, toDateString } from '../lib/dates'
import type { UserProfile } from '../types'

export default function ProfileCard({ profile, label }: { profile: UserProfile; label: string }) {
  let birthdayInfo: React.ReactNode = <p className="text-gray-500">🎂 还没有填写生日</p>
  if (profile.birthday) {
    const age = getAge(profile.birthday)
    const birthday = new Date(profile.birthday)
    const nextBirthday = new Date(new Date().getFullYear(), birthday.getMonth(), birthday.getDate())
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (nextBirthday < today) {
      nextBirthday.setFullYear(nextBirthday.getFullYear() + 1)
    }
    const daysUntilBirthday = getDaysUntil(toDateString(nextBirthday))
    birthdayInfo = (
      <>
        <p>
          🎂 生日：{new Date(profile.birthday).toLocaleDateString('zh-CN')} ({age}岁)
        </p>
        <p className="text-primary font-semibold">⏰ 距离下次生日还有 {daysUntilBirthday} 天</p>
      </>
    )
  }

  return (
    <div className="p-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border-2 border-pink-200">
      <div className="flex items-center gap-4 mb-4">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={`${profile.display_name}的头像`}
            width={64}
            height={64}
            className="rounded-full object-cover"
            style={{ width: 64, height: 64 }}
          />
        ) : (
          <span className="text-6xl">{profile.avatar_emoji || '😊'}</span>
        )}
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <h3 className="text-2xl font-bold text-gray-800">{profile.display_name}</h3>
          {profile.nickname && <p className="text-gray-600">小名：{profile.nickname}</p>}
        </div>
      </div>

      <div className="space-y-2 text-gray-700">{birthdayInfo}</div>
    </div>
  )
}
