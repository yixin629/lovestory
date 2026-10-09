'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getUpcomingAnniversaryOccurrence } from '@/lib/anniversaries'
import { useToast } from '@/app/components/feedback/ToastProvider'

interface AnniversaryReminder {
  id: string
  title: string
  occurrenceDate: string
  daysUntil: number
}

export default function AnniversaryReminders() {
  const [reminders, setReminders] = useState<AnniversaryReminder[]>([])
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('default')
  const notifiedOccurrencesRef = useRef(new Set<string>())
  const toast = useToast()

  // 请求通知权限
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission === 'granted') {
        toast.success('通知权限已开启！')
      } else {
        toast.warning('通知权限被拒绝，将无法收到提醒')
      }
    } else {
      toast.error('您的浏览器不支持通知功能')
    }
  }

  // 加载纪念日数据并计算提醒
  const loadAnniversaries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('anniversaries')
        .select('id, title, date, recurring')
        .order('date', { ascending: true })

      if (error) throw error

      if (data) {
        const upcomingReminders: AnniversaryReminder[] = []

        data.forEach((anniversary) => {
          const occurrence = getUpcomingAnniversaryOccurrence(anniversary)
          if (!occurrence) return

          // 检查是否在提醒范围内（今天至未来 7 天）
          if (occurrence.daysUntil >= 0 && occurrence.daysUntil <= 7) {
            upcomingReminders.push({
              id: anniversary.id,
              title: anniversary.title,
              occurrenceDate: occurrence.date.toLocaleDateString('zh-CN'),
              daysUntil: occurrence.daysUntil,
            })
          }
        })

        setReminders(upcomingReminders)
      }
    } catch (error) {
      console.error('加载纪念日失败:', error)
    }
  }, [])

  // 发送通知
  const sendNotification = useCallback(
    (reminder: AnniversaryReminder) => {
      if (notificationPermission === 'granted') {
        const notification = new Notification(`纪念日提醒: ${reminder.title}`, {
          body: `${reminder.daysUntil} 天后是 ${reminder.title}`,
          icon: '/icon.svg',
        })

        // 点击通知跳转到纪念日页面
        notification.onclick = () => {
          window.focus()
          window.location.href = '/anniversaries'
        }

        // 自动关闭通知
        setTimeout(() => {
          notification.close()
        }, 5000)
      }
    },
    [notificationPermission]
  )

  useEffect(() => {
    reminders.forEach((reminder) => {
      if (reminder.daysUntil === 1) {
        const occurrenceKey = `${reminder.id}:${reminder.occurrenceDate}`
        if (notifiedOccurrencesRef.current.has(occurrenceKey)) return

        sendNotification(reminder)
        if (notificationPermission === 'granted') {
          notifiedOccurrencesRef.current.add(occurrenceKey)
        }
      }
    })
  }, [notificationPermission, reminders, sendNotification])

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }

    loadAnniversaries()

    // 定期刷新日期计算，跨过午夜后也能得到正确结果。
    const interval = setInterval(() => {
      loadAnniversaries()
    }, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [loadAnniversaries])

  return (
    <div className="anniversary-reminders">
      {/* 通知权限状态 */}
      {notificationPermission !== 'granted' && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-yellow-800">开启纪念日提醒</h4>
              <p className="text-sm text-yellow-700">允许通知权限，在纪念日临近时收到提醒</p>
            </div>
            <button
              onClick={requestNotificationPermission}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              开启通知
            </button>
          </div>
        </div>
      )}

      {/* 即将到来的纪念日 */}
      {reminders.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-3">即将到来的纪念日</h4>
          <div className="space-y-2">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between p-3 bg-pink-50 rounded-lg border border-pink-200"
              >
                <div>
                  <span className="font-medium">{reminder.title}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    {reminder.daysUntil === 0 ? '今天' : `${reminder.daysUntil} 天后`}
                  </span>
                </div>
                <div className="text-sm text-gray-500">{reminder.occurrenceDate}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 提醒设置说明 */}
      <div className="text-sm text-gray-600">
        <p>💡 纪念日将在1天前自动发送浏览器通知提醒</p>
        <p>🔕 如果不想收到通知，可以在浏览器设置中关闭</p>
      </div>
    </div>
  )
}
