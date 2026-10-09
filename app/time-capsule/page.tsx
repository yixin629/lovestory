'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/app/components/feedback/ToastProvider'
import BackButton from '@/app/components/ui/BackButton'

interface TimeCapsule {
  id: string
  title: string
  sender: string
  receiver: string | null
  unlock_date: string
  is_opened: boolean
  opened_at: string | null
  created_at: string
}

interface TimeCapsuleDetails {
  content: string
  sender: string
  receiver: string | null
  unlock_date: string
  is_opened: boolean
  opened_at: string | null
}

const isParticipant = (
  capsule: Pick<TimeCapsule, 'sender' | 'receiver'>,
  currentUser: string
) => capsule.sender === currentUser || capsule.receiver === currentUser

export default function TimeCapsulePage() {
  const {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
  } = useToast()
  const { user: currentUser, loading: authLoading, me, partner, nameOf } = useAuth()
  const [capsules, setCapsules] = useState<TimeCapsule[]>([])
  const [capsuleContents, setCapsuleContents] = useState<Record<string, string>>({})
  const [contentLoadingId, setContentLoadingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'locked' | 'opened'>('all')
  const [newCapsule, setNewCapsule] = useState({
    title: '',
    content: '',
    receiver: '',
    unlock_date: '',
  })

  const loadCapsules = useCallback(async () => {
    if (authLoading) return

    if (!currentUser) {
      setCapsules([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('time_capsules')
        .select('id, title, sender, receiver, unlock_date, is_opened, opened_at, created_at')
        .order('unlock_date', { ascending: true })

      if (filter === 'locked') {
        query = query.eq('is_opened', false)
      } else if (filter === 'opened') {
        query = query.eq('is_opened', true)
      }

      const { data, error } = await query

      if (error) throw error
      setCapsules((data || []).filter((capsule) => isParticipant(capsule, currentUser)))
    } catch (error) {
      console.error('Error loading time capsules:', error)
      showError('加载时光胶囊失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [authLoading, currentUser, filter, showError])

  useEffect(() => {
    loadCapsules()
  }, [loadCapsules])

  const handleAddCapsule = async () => {
    if (!currentUser) {
      showWarning('请先登录')
      return
    }

    if (!newCapsule.title || !newCapsule.content || !newCapsule.unlock_date) {
      showWarning('请填写所有必填字段')
      return
    }

    const openDate = new Date(newCapsule.unlock_date)
    if (openDate <= new Date()) {
      showWarning('开启日期必须是未来的时间')
      return
    }

    try {
      const { error } = await supabase.from('time_capsules').insert([
        {
          ...newCapsule,
          receiver: newCapsule.receiver || null,
          sender: currentUser,
          is_opened: false,
        },
      ])

      if (error) throw error

      setNewCapsule({
        title: '',
        content: '',
        receiver: '',
        unlock_date: '',
      })
      setShowAddForm(false)
      showSuccess('时光胶囊创建成功！')
      loadCapsules()
    } catch (error) {
      console.error('Error adding time capsule:', error)
      showError('添加失败，请重试')
    }
  }

  const handleOpenCapsule = async (capsule: TimeCapsule) => {
    if (!currentUser || !isParticipant(capsule, currentUser)) {
      showWarning('只有创建者或收件人可以开启这个胶囊')
      return
    }

    const openDate = new Date(capsule.unlock_date)
    const now = new Date()

    if (openDate > now) {
      showInfo(`时光胶囊还未到开启时间！将在 ${openDate.toLocaleString('zh-CN')} 开启`)
      return
    }

    if (!confirm('确定要开启这个时光胶囊吗？')) return

    setContentLoadingId(capsule.id)
    try {
      const { data: details, error: detailsError } = await supabase
        .from('time_capsules')
        .select('content, sender, receiver, unlock_date, is_opened, opened_at')
        .eq('id', capsule.id)
        .single()

      if (detailsError) throw detailsError

      const capsuleDetails = details as TimeCapsuleDetails
      if (!isParticipant(capsuleDetails, currentUser)) {
        showWarning('当前用户无权开启这个胶囊')
        return
      }

      const verifiedOpenDate = new Date(capsuleDetails.unlock_date)
      if (verifiedOpenDate > new Date()) {
        showInfo(
          `时光胶囊还未到开启时间！将在 ${verifiedOpenDate.toLocaleString('zh-CN')} 开启`
        )
        return
      }

      if (!capsuleDetails.is_opened) {
        const openedAt = new Date().toISOString()
        const { data: updatedRows, error: updateError } = await supabase
          .from('time_capsules')
          .update({
            is_opened: true,
            opened_at: openedAt,
          })
          .eq('id', capsule.id)
          .eq('is_opened', false)
          .select('id')

        if (updateError) throw updateError
        if (!updatedRows || updatedRows.length === 0) {
          showInfo('这个胶囊已经被开启，请刷新后查看')
          loadCapsules()
          return
        }

        setCapsules((previous) =>
          previous.map((item) =>
            item.id === capsule.id ? { ...item, is_opened: true, opened_at: openedAt } : item
          )
        )
      } else {
        setCapsules((previous) =>
          previous.map((item) =>
            item.id === capsule.id
              ? { ...item, is_opened: true, opened_at: capsuleDetails.opened_at }
              : item
          )
        )
      }

      setCapsuleContents((previous) => ({
        ...previous,
        [capsule.id]: capsuleDetails.content,
      }))
      if (filter === 'locked') {
        setFilter('opened')
      }
      showSuccess(capsuleDetails.is_opened ? '胶囊内容已载入' : '时光胶囊已开启！')
    } catch (error) {
      console.error('Error opening time capsule:', error)
      showError('开启失败，请重试')
    } finally {
      setContentLoadingId(null)
    }
  }

  const handleViewCapsule = async (capsule: TimeCapsule) => {
    if (!currentUser || !isParticipant(capsule, currentUser)) {
      showWarning('只有创建者或收件人可以查看这个胶囊')
      return
    }

    setContentLoadingId(capsule.id)
    try {
      const { data, error } = await supabase
        .from('time_capsules')
        .select('content, sender, receiver, unlock_date, is_opened, opened_at')
        .eq('id', capsule.id)
        .single()

      if (error) throw error

      const details = data as TimeCapsuleDetails
      if (!isParticipant(details, currentUser) || !details.is_opened) {
        showWarning('当前用户无法查看这个胶囊')
        return
      }

      setCapsuleContents((previous) => ({ ...previous, [capsule.id]: details.content }))
    } catch (error) {
      console.error('Error loading time capsule content:', error)
      showError('读取胶囊内容失败，请重试')
    } finally {
      setContentLoadingId(null)
    }
  }

  const handleDeleteCapsule = async (capsule: TimeCapsule) => {
    if (!currentUser || capsule.sender !== currentUser) {
      showWarning('只有创建者可以删除这个胶囊')
      return
    }

    if (!confirm('确定要删除这个时光胶囊吗？')) return

    try {
      const { data, error } = await supabase
        .from('time_capsules')
        .delete()
        .eq('id', capsule.id)
        .eq('sender', currentUser)
        .select('id')

      if (error) throw error
      if (!data || data.length === 0) {
        showWarning('未删除任何胶囊，请刷新后重试')
        return
      }

      showSuccess('删除成功')
      loadCapsules()
    } catch (error) {
      console.error('Error deleting time capsule:', error)
      showError('删除失败，请重试')
    }
  }

  const canOpen = (openDate: string) => {
    return new Date(openDate) <= new Date()
  }

  const getDaysUntilOpen = (openDate: string) => {
    const target = new Date(openDate)
    const now = new Date()
    const diff = target.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">加载中...</div>
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
              <h1 className="text-4xl font-bold text-gray-800 mb-2">🎁 时光胶囊</h1>
              <p className="text-gray-600">写给未来的信，封存此刻的心意</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-primary"
              disabled={!currentUser}
            >
              {showAddForm ? '取消' : '+ 创建胶囊'}
            </button>
          </div>

          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            当前身份：{me?.name ?? '未登录'}。页面会按创建者/收件人和开启时间做防误操作检查，
            但这只是页面体验，不是数据库授权：情侣双方在数据库层都能读取空间内的胶囊。
          </div>

          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('locked')}
              className={filter === 'locked' ? 'btn-primary' : 'btn-secondary'}
            >
              🔒 未开启
            </button>
            <button
              onClick={() => setFilter('opened')}
              className={filter === 'opened' ? 'btn-primary' : 'btn-secondary'}
            >
              📖 已开启
            </button>
          </div>

          {showAddForm && (
            <div className="mb-8 p-6 bg-pink-50 rounded-xl border border-pink-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">创建新的时光胶囊</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-800 mb-2">标题 *</label>
                  <input
                    type="text"
                    value={newCapsule.title}
                    onChange={(e) => setNewCapsule({ ...newCapsule, title: e.target.value })}
                    className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-gray-800 placeholder-gray-400"
                    placeholder="给这个时光胶囊取个名字"
                  />
                </div>

                <div>
                  <label className="block text-gray-800 mb-2">写给未来的话 *</label>
                  <textarea
                    value={newCapsule.content}
                    onChange={(e) => setNewCapsule({ ...newCapsule, content: e.target.value })}
                    className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-gray-800 placeholder-gray-400"
                    placeholder="把想对未来说的话写在这里..."
                    rows={6}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-800 mb-2">创建者 *</label>
                    <input
                      type="text"
                      value={me?.name ?? ''}
                      readOnly
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-gray-800 placeholder-gray-400"
                      placeholder="请先登录"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-800 mb-2">收件人</label>
                    <select
                      value={newCapsule.receiver}
                      onChange={(e) => setNewCapsule({ ...newCapsule, receiver: e.target.value })}
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-gray-800"
                    >
                      <option value="">不指定（只有自己可开启）</option>
                      {currentUser && <option value={currentUser}>写给自己</option>}
                      {partner ? (
                        <option value={partner.id}>写给 {partner.name}</option>
                      ) : (
                        <option value="" disabled>
                          另一半加入后可写给 Ta
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-800 mb-2">开启日期 *</label>
                  <input
                    type="datetime-local"
                    value={newCapsule.unlock_date}
                    onChange={(e) => setNewCapsule({ ...newCapsule, unlock_date: e.target.value })}
                    className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-gray-800"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-sm text-gray-500 mt-1">在此日期之前，胶囊将保持封存状态</p>
                </div>

                <button onClick={handleAddCapsule} className="w-full btn-primary">
                  封存时光胶囊
                </button>
              </div>
            </div>
          )}

          {capsules.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🎁</div>
              <p className="text-xl text-gray-600">还没有创建任何时光胶囊</p>
              <p className="text-gray-500 mt-2">点击&ldquo;创建胶囊&rdquo;写下对未来的期许</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {capsules.map((capsule) => {
                const isLocked = !capsule.is_opened
                const canOpenNow = canOpen(capsule.unlock_date)
                const daysUntil = getDaysUntilOpen(capsule.unlock_date)
                const hasLoadedContent = Object.prototype.hasOwnProperty.call(
                  capsuleContents,
                  capsule.id
                )

                return (
                  <div
                    key={capsule.id}
                    className={`p-6 rounded-xl border transition-all ${
                      isLocked && canOpenNow
                        ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-400/40 shadow-lg shadow-yellow-500/20 animate-pulse'
                        : isLocked
                        ? 'bg-pink-50 border-pink-200'
                        : 'bg-pink-100 backdrop-blur-md border-white/30'
                    } hover:bg-white/20`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">
                          {isLocked ? (canOpenNow ? '🔓' : '🔒') : '📖'}
                        </span>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{capsule.title}</h3>
                          <p className="text-sm text-gray-600">
                            来自 {nameOf(capsule.sender)}
                            {capsule.receiver && ` 给 ${nameOf(capsule.receiver)}`}
                          </p>
                        </div>
                      </div>
                      {capsule.sender === currentUser && (
                        <button
                          onClick={() => handleDeleteCapsule(capsule)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          aria-label={`删除${capsule.title}`}
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    {isLocked ? (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">🎁</div>
                        <p className="text-gray-800 font-semibold mb-2">
                          {canOpenNow ? '可以开启了！' : '尚未到开启时间'}
                        </p>
                        <p className="text-sm text-gray-600 mb-4">
                          开启日期：{new Date(capsule.unlock_date).toLocaleString('zh-CN')}
                        </p>
                        {!canOpenNow && (
                          <p className="text-lg text-yellow-300 font-bold mb-4">
                            还有 {daysUntil} 天
                          </p>
                        )}
                        {canOpenNow && (
                          <button
                            onClick={() => handleOpenCapsule(capsule)}
                            className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-800 font-bold rounded-lg hover:from-yellow-500 hover:to-orange-500 transition-all transform hover:scale-105"
                            disabled={contentLoadingId === capsule.id}
                          >
                            {contentLoadingId === capsule.id ? '开启中...' : '开启胶囊'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        {hasLoadedContent ? (
                          <div className="bg-white/10 rounded-lg p-4 mb-4">
                            <p className="text-gray-800 whitespace-pre-wrap">
                              {capsuleContents[capsule.id]}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleViewCapsule(capsule)}
                            className="btn-secondary mb-4 w-full"
                            disabled={contentLoadingId === capsule.id}
                          >
                            {contentLoadingId === capsule.id ? '读取中...' : '查看胶囊内容'}
                          </button>
                        )}
                        <div className="text-sm text-gray-500">
                          <p>创建于：{new Date(capsule.created_at).toLocaleString('zh-CN')}</p>
                          <p>
                            开启于：
                            {capsule.opened_at &&
                              new Date(capsule.opened_at).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
