import { getDaysUntil } from '../lib/dates'
import type { Reminder } from '../types'

interface ReminderListProps {
  reminders: Reminder[]
  nameOf: (id: string | null | undefined) => string
  onMarkSent: (id: string) => void
  onDelete: (id: string) => void
}

export default function ReminderList({
  reminders,
  nameOf,
  onMarkSent,
  onDelete,
}: ReminderListProps) {
  return reminders.length > 0 ? (
    <div className="space-y-4">
      {reminders.map((reminder) => {
        const daysUntil = getDaysUntil(reminder.remind_date)
        const isPast = daysUntil < 0
        const isToday = daysUntil === 0
        const isUrgent = daysUntil > 0 && daysUntil <= 3

        return (
          <div
            key={reminder.id}
            className={`p-4 rounded-xl border-2 ${
              reminder.is_sent
                ? 'bg-gray-50 border-gray-300 opacity-60'
                : isToday
                  ? 'bg-red-50 border-red-400'
                  : isUrgent
                    ? 'bg-orange-50 border-orange-400'
                    : isPast
                      ? 'bg-gray-50 border-gray-300'
                      : 'bg-blue-50 border-blue-300'
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-800">{reminder.title}</h3>
                  {reminder.is_sent && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                      已完成
                    </span>
                  )}
                  {isToday && !reminder.is_sent && (
                    <span className="px-2 py-1 bg-red-500 text-white text-xs rounded animate-pulse">
                      今天！
                    </span>
                  )}
                  {isUrgent && !reminder.is_sent && (
                    <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded">紧急</span>
                  )}
                </div>

                {reminder.description && (
                  <p className="text-gray-700 mb-2">{reminder.description}</p>
                )}

                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  <span>📅 {new Date(reminder.remind_date).toLocaleDateString('zh-CN')}</span>
                  {!isPast && !isToday && (
                    <span className="text-primary font-semibold">({Math.abs(daysUntil)}天后)</span>
                  )}
                  {isPast && <span className="text-gray-500">(已过期)</span>}
                  <span>👤 提醒：{nameOf(reminder.remind_to)}</span>
                  {reminder.created_by ? (
                    <span>✍️ 创建者：{nameOf(reminder.created_by)}</span>
                  ) : (
                    <span>🤖 自动创建</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {!reminder.is_sent && (
                  <button
                    onClick={() => onMarkSent(reminder.id)}
                    className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    ✓ 完成
                  </button>
                )}
                <button
                  onClick={() => onDelete(reminder.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  ) : (
    <div className="text-center py-12 text-gray-500">
      <p className="text-lg mb-2">还没有任何提醒</p>
      <p className="text-sm">填写生日后会在生日前一周自动提醒另一半</p>
    </div>
  )
}
