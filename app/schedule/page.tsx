'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/app/components/feedback/ToastProvider'
import BackButton from '@/app/components/ui/BackButton'
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton'
import { useAuth } from '@/hooks/useAuth'

interface Schedule {
  id: string
  title: string
  description: string
  event_date: string
  location?: string
  reminder_minutes?: number
  status: 'upcoming' | 'completed' | 'cancelled'
  created_by: string | null
  created_at: string
}

export default function SchedulePage() {
  const toast = useToast()
  const { user, me, nameOf } = useAuth()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all')
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    reminder_minutes: 30,
  })

  const loadSchedules = useCallback(async () => {
    try {
      let query = supabase.from('schedules').select('*').order('event_date', { ascending: true })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setSchedules(data || [])
    } catch (error) {
      console.error('Error loading schedules:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  const handleAddSchedule = async () => {
    if (!newSchedule.title || !newSchedule.event_date) {
      toast.warning('请填写标题和日期')
      return
    }
    if (!user) {
      toast.error('请先登录')
      return
    }

    try {
      const { error } = await supabase.from('schedules').insert([
        {
          ...newSchedule,
          status: 'upcoming',
          created_by: user,
        },
      ])

      if (error) throw error

      setNewSchedule({
        title: '',
        description: '',
        event_date: '',
        location: '',
        reminder_minutes: 30,
      })
      setShowAddForm(false)
      toast.success('日程添加成功！')
      loadSchedules()
    } catch (error) {
      console.error('Error adding schedule:', error)
      toast.error('添加失败，请重试')
    }
  }

  const handleUpdateStatus = async (id: string, status: 'upcoming' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase.from('schedules').update({ status }).eq('id', id)

      if (error) throw error
      toast.success('状态更新成功')
      loadSchedules()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('更新失败，请重试')
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('确定要删除这个日程吗？')) return

    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id)

      if (error) throw error
      toast.success('删除成功')
      loadSchedules()
    } catch (error) {
      console.error('Error deleting schedule:', error)
      toast.error('删除失败，请重试')
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
    })
  }

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <BackButton href="/" text="返回首页" />
          <h1 className="text-4xl font-bold text-gray-800 mb-2">恋爱日程</h1>
          <p className="text-gray-600 mb-8">安排我们的每一天</p>
          <LoadingSkeleton type="list" count={3} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-primary mb-2">📅 共享日程</h1>
              <p className="text-gray-600">记录两人的约会计划</p>
            </div>
            <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
              {showAddForm ? '取消' : '+ 添加日程'}
            </button>
          </div>

          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={filter === 'upcoming' ? 'btn-primary' : 'btn-secondary'}
            >
              即将到来
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={filter === 'completed' ? 'btn-primary' : 'btn-secondary'}
            >
              已完成
            </button>
          </div>

          {showAddForm && (
            <div className="mb-8 p-6 bg-pink-50 rounded-xl border border-pink-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">添加新日程</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-semibold">标题 *</label>
                  <input
                    type="text"
                    value={newSchedule.title}
                    onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="例如：周末约会、看电影"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-semibold">描述</label>
                  <textarea
                    value={newSchedule.description}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, description: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="详细说明..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2 font-semibold">日期时间 *</label>
                    <input
                      type="datetime-local"
                      value={newSchedule.event_date}
                      onChange={(e) =>
                        setNewSchedule({ ...newSchedule, event_date: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2 font-semibold">地点</label>
                    <input
                      type="text"
                      value={newSchedule.location}
                      onChange={(e) => setNewSchedule({ ...newSchedule, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="约会地点"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2 font-semibold">
                      提前提醒（分钟）
                    </label>
                    <select
                      value={newSchedule.reminder_minutes}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          reminder_minutes: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value={15}>15分钟</option>
                      <option value={30}>30分钟</option>
                      <option value={60}>1小时</option>
                      <option value={120}>2小时</option>
                      <option value={1440}>1天</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2 font-semibold">创建者</label>
                    <input
                      type="text"
                      value={me?.name ?? ''}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>

                <button onClick={handleAddSchedule} className="btn-primary w-full">
                  添加日程
                </button>
              </div>
            </div>
          )}

          {schedules.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-xl text-gray-600">还没有添加任何日程</p>
              <p className="text-gray-500 mt-2">点击&ldquo;添加日程&rdquo;开始规划约会</p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`p-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border border-pink-200 hover:shadow-lg transition-all ${
                    schedule.status === 'completed' ? 'opacity-75' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-gray-800">{schedule.title}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            schedule.status === 'upcoming'
                              ? 'bg-green-100 text-green-700'
                              : schedule.status === 'completed'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {schedule.status === 'upcoming'
                            ? '即将到来'
                            : schedule.status === 'completed'
                            ? '已完成'
                            : '已取消'}
                        </span>
                        {isUpcoming(schedule.event_date) && schedule.status === 'upcoming' && (
                          <span className="animate-pulse text-yellow-500">🔔</span>
                        )}
                      </div>

                      <p className="text-lg text-gray-600 mb-3">
                        {formatDateTime(schedule.event_date)}
                      </p>

                      {schedule.description && (
                        <p className="text-gray-700 mb-3">{schedule.description}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {schedule.location && (
                          <div className="flex items-center gap-1">
                            <span>📍</span>
                            <span>{schedule.location}</span>
                          </div>
                        )}
                        {schedule.reminder_minutes && (
                          <div className="flex items-center gap-1">
                            <span>⏰</span>
                            <span>
                              提前
                              {schedule.reminder_minutes >= 60
                                ? `${schedule.reminder_minutes / 60}小时`
                                : `${schedule.reminder_minutes}分钟`}
                              提醒
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span>👤</span>
                          <span>{nameOf(schedule.created_by)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      {schedule.status === 'upcoming' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(schedule.id, 'completed')}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-semibold"
                          >
                            完成
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(schedule.id, 'cancelled')}
                            className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold"
                          >
                            取消
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
