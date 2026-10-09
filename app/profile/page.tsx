'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import ProfileCard from './components/ProfileCard'
import ReminderList from './components/ReminderList'
import { toDateString } from './lib/dates'
import type { Reminder, UserProfile } from './types'

interface ProfileForm {
  display_name: string
  nickname: string
  birthday: string
  avatar_emoji: string
  avatar_url: string | null
}

const PROFILE_COLUMNS = 'id, display_name, nickname, birthday, avatar_emoji, avatar_url'
const REMINDER_COLUMNS =
  'id, title, description, remind_date, remind_to, created_by, is_sent, created_at'

export default function ProfilePage() {
  const toast = useToast()
  const { user, partner, nameOf, refresh } = useAuth()
  const partnerId = partner?.id ?? null
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showAddReminder, setShowAddReminder] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingReminder, setSavingReminder] = useState(false)

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    display_name: '',
    nickname: '',
    birthday: '',
    avatar_emoji: '😊',
    avatar_url: null,
  })

  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    remind_date: '',
    remind_to: '',
  })

  const emojiOptions = ['😊', '🥰', '😎', '🤗', '😘', '💕', '⭐', '🍐', '🌟', '💖']

  const myProfile = profiles.find((profile) => profile.id === user) ?? null
  const partnerProfile = partnerId
    ? (profiles.find((profile) => profile.id === partnerId) ?? null)
    : null

  const loadReminders = useCallback(async () => {
    const { data, error } = await supabase
      .from('reminders')
      .select(REMINDER_COLUMNS)
      .order('remind_date', { ascending: true })
    if (error) throw error
    return (data ?? []) as Reminder[]
  }, [])

  // 生日前 7 天内自动给另一半创建生日提醒（同标题同日期只创建一次）
  const ensureBirthdayReminders = useCallback(
    async (rows: UserProfile[], existing: Reminder[]) => {
      if (!user) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      let created = false

      for (const profile of rows) {
        if (!profile.birthday) continue
        const remindTo = profile.id === user ? partnerId : user
        if (!remindTo) continue

        const birthday = new Date(profile.birthday)
        const thisYearBirthday = new Date(
          today.getFullYear(),
          birthday.getMonth(),
          birthday.getDate()
        )
        if (thisYearBirthday < today || thisYearBirthday > in7Days) continue

        const title = `${profile.display_name}的生日`
        const remindDate = toDateString(thisYearBirthday)
        const exists = existing.some(
          (reminder) => reminder.title === title && reminder.remind_date === remindDate
        )
        if (exists) continue

        const { error } = await supabase.from('reminders').insert([
          {
            title,
            description: `别忘了给${profile.nickname || profile.display_name}准备生日惊喜！🎂`,
            remind_date: remindDate,
            remind_to: remindTo,
            created_by: null,
            is_sent: false,
          },
        ])
        if (error) throw error
        created = true
      }
      return created
    },
    [user, partnerId]
  )

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const ids = partnerId ? [user, partnerId] : [user]
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select(PROFILE_COLUMNS)
        .in('id', ids)
      if (profileError) throw profileError
      const rows = (profileData ?? []) as UserProfile[]
      setProfiles(rows)

      let reminderData = await loadReminders()
      try {
        if (await ensureBirthdayReminders(rows, reminderData)) {
          reminderData = await loadReminders()
        }
      } catch (error) {
        console.error('检查生日提醒失败:', error)
      }
      setReminders(reminderData)
    } catch (error) {
      console.error('加载数据失败:', error)
      toast.error('加载资料失败，请刷新重试')
    } finally {
      setLoading(false)
    }
  }, [user, partnerId, loadReminders, ensureBirthdayReminders, toast])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const toggleEditProfile = () => {
    if (!showEditProfile && myProfile) {
      setProfileForm({
        display_name: myProfile.display_name,
        nickname: myProfile.nickname ?? '',
        birthday: myProfile.birthday ?? '',
        avatar_emoji: myProfile.avatar_emoji || '😊',
        avatar_url: myProfile.avatar_url,
      })
    }
    setShowEditProfile(!showEditProfile)
  }

  const handleSaveProfile = async () => {
    if (!user || savingProfile) return
    const displayName = profileForm.display_name.trim()
    const nickname = profileForm.nickname.trim()
    if (!displayName || displayName.length > 30) {
      toast.warning('昵称需要 1-30 个字')
      return
    }
    if (nickname.length > 30) {
      toast.warning('小名不能超过 30 个字')
      return
    }

    setSavingProfile(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: displayName,
          nickname: nickname || null,
          birthday: profileForm.birthday || null,
          avatar_emoji: profileForm.avatar_emoji,
          avatar_url: profileForm.avatar_url,
        })
        .eq('id', user)

      if (error) throw error

      setShowEditProfile(false)
      await refresh()
      await loadData()
      toast.success('个人资料已更新')
    } catch (error) {
      console.error('保存资料失败:', error)
      toast.error('保存失败，请重试')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAddReminder = async () => {
    if (!user || savingReminder) return
    if (!newReminder.title.trim() || !newReminder.remind_date || !newReminder.remind_to) {
      toast.warning('请填写提醒标题、日期和提醒对象')
      return
    }

    setSavingReminder(true)
    try {
      const { error } = await supabase.from('reminders').insert([
        {
          title: newReminder.title.trim(),
          description: newReminder.description,
          remind_date: newReminder.remind_date,
          remind_to: newReminder.remind_to,
          created_by: user,
          is_sent: false,
        },
      ])

      if (error) throw error

      setNewReminder({
        title: '',
        description: '',
        remind_date: '',
        remind_to: '',
      })
      setShowAddReminder(false)
      await loadData()
      toast.success('提醒创建成功！')
    } catch (error) {
      console.error('创建提醒失败:', error)
      toast.error('创建失败')
    } finally {
      setSavingReminder(false)
    }
  }

  const handleDeleteReminder = async (id: string) => {
    if (!confirm('确定要删除这个提醒吗？')) return

    try {
      const { error } = await supabase.from('reminders').delete().eq('id', id)

      if (error) throw error
      await loadData()
      toast.success('提醒已删除')
    } catch (error) {
      console.error('删除提醒失败:', error)
      toast.error('删除失败')
    }
  }

  const markReminderAsSent = async (id: string) => {
    try {
      const { error } = await supabase.from('reminders').update({ is_sent: true }).eq('id', id)

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('标记失败:', error)
      toast.error('标记失败，请重试')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 text-center">
            👥 个人资料
          </h1>
          <p className="text-gray-600 text-center mb-6">管理个人信息和生日提醒</p>

          <button
            onClick={toggleEditProfile}
            className="btn-primary w-full mb-6"
            disabled={!myProfile}
          >
            {showEditProfile ? '取消' : '✏️ 编辑我的资料'}
          </button>

          {/* Edit Profile Form */}
          {showEditProfile && (
            <div className="mb-6 p-6 bg-pink-50 rounded-xl border border-pink-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">我的资料</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-800 mb-2">昵称 *</label>
                    <input
                      type="text"
                      value={profileForm.display_name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, display_name: e.target.value })
                      }
                      placeholder="全站显示的名字"
                      maxLength={30}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-800 mb-2">小名</label>
                    <input
                      type="text"
                      value={profileForm.nickname}
                      onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })}
                      placeholder="另一半对你的爱称（可选）"
                      maxLength={30}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-800 mb-2">生日</label>
                  <input
                    type="date"
                    value={profileForm.birthday}
                    onChange={(e) => setProfileForm({ ...profileForm, birthday: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-gray-800 mb-2">头像表情</label>
                  {profileForm.avatar_url && (
                    <div className="mb-3 flex items-center gap-3 text-sm text-gray-600">
                      <Image
                        src={profileForm.avatar_url}
                        alt="当前图片头像"
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                        style={{ width: 40, height: 40 }}
                      />
                      <span>当前使用图片头像（可在设置页上传）；选择表情会改用表情头像</span>
                    </div>
                  )}
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                    {emojiOptions.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() =>
                          setProfileForm({ ...profileForm, avatar_emoji: emoji, avatar_url: null })
                        }
                        className={`p-3 rounded-lg transition-all ${
                          !profileForm.avatar_url && profileForm.avatar_emoji === emoji
                            ? 'bg-primary/20 scale-110'
                            : 'bg-white hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-3xl">{emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full btn-primary disabled:opacity-50"
                  disabled={savingProfile}
                >
                  {savingProfile ? '保存中...' : '保存资料'}
                </button>
              </div>
            </div>
          )}

          {/* Profiles Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {myProfile ? (
              <ProfileCard profile={myProfile} label="我" />
            ) : (
              <div className="text-center py-12 text-gray-500">资料加载失败，请刷新重试</div>
            )}
            {partnerProfile ? (
              <ProfileCard profile={partnerProfile} label="另一半（只读）" />
            ) : (
              <div className="p-6 rounded-xl border-2 border-dashed border-pink-200 text-center text-gray-500">
                <p className="text-lg mb-2">另一半还没有加入</p>
                <p className="text-sm">
                  到{' '}
                  <Link href="/settings" className="text-primary underline">
                    设置页
                  </Link>{' '}
                  复制邀请码发给 Ta 吧
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Reminders Section */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">🔔 提醒事项</h2>
              <p className="text-gray-600 text-sm">生日提醒会自动创建，你也可以创建其他提醒</p>
            </div>
            <button onClick={() => setShowAddReminder(!showAddReminder)} className="btn-primary">
              {showAddReminder ? '取消' : '+ 新提醒'}
            </button>
          </div>

          {/* Add Reminder Form */}
          {showAddReminder && (
            <div className="mb-6 p-6 bg-yellow-50 rounded-xl border border-yellow-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">创建提醒</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-800 mb-2">提醒标题 *</label>
                  <input
                    type="text"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                    placeholder="例如：买纪念日礼物"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-gray-800 mb-2">提醒内容</label>
                  <textarea
                    value={newReminder.description}
                    onChange={(e) =>
                      setNewReminder({ ...newReminder, description: e.target.value })
                    }
                    placeholder="详细说明..."
                    rows={3}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-800 mb-2">提醒日期 *</label>
                    <input
                      type="date"
                      value={newReminder.remind_date}
                      onChange={(e) =>
                        setNewReminder({ ...newReminder, remind_date: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-800 mb-2">提醒谁 *</label>
                    <select
                      value={newReminder.remind_to}
                      onChange={(e) =>
                        setNewReminder({ ...newReminder, remind_to: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg"
                    >
                      <option value="">选择...</option>
                      {user && <option value={user}>提醒自己</option>}
                      {partner ? (
                        <option value={partner.id}>提醒 {partner.name}</option>
                      ) : (
                        <option value="" disabled>
                          另一半加入后可提醒 Ta
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleAddReminder}
                  className="w-full btn-primary disabled:opacity-50"
                  disabled={savingReminder}
                >
                  {savingReminder ? '创建中...' : '创建提醒'}
                </button>
              </div>
            </div>
          )}

          {/* Reminders List */}
          <ReminderList
            reminders={reminders}
            nameOf={nameOf}
            onMarkSent={markReminderAsSent}
            onDelete={handleDeleteReminder}
          />
        </div>
      </div>
    </div>
  )
}
