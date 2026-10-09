'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'

interface TruthOrDare {
  id: number
  type: 'truth' | 'dare'
  content: string
  difficulty: 'easy' | 'medium' | 'hard'
  is_custom: boolean
  created_by: string | null
}

// 内置题库：数据按情侣隔离后不再把全局种子写入数据库，内置题目直接放在代码里
const BUILTIN_ITEMS: TruthOrDare[] = (
  [
    ['truth', '你最喜欢我的哪一点？', 'easy'],
    ['truth', '如果只能选一个，你会选择爱情还是面包？', 'medium'],
    ['truth', '你做过最浪漫的梦是什么？', 'easy'],
    ['truth', '你觉得我们的关系中最需要改进的是什么？', 'hard'],
    ['dare', '给对方一个拥抱，保持30秒', 'easy'],
    ['dare', '唱一首情歌给对方听', 'medium'],
    ['dare', '说出你爱对方的10个理由', 'medium'],
    ['dare', '做10个俯卧撑', 'easy'],
    ['dare', '模仿对方最常见的动作', 'easy'],
    ['dare', '用方言说"我爱你"', 'medium'],
  ] as const
).map(([type, content, difficulty], index) => ({
  id: -(index + 1),
  type,
  content,
  difficulty,
  is_custom: false,
  created_by: null,
}))

export default function TruthOrDarePage() {
  const toast = useToast()
  const { user, me, partner, nameOf } = useAuth()
  const [items, setItems] = useState<TruthOrDare[]>([])
  const [currentItem, setCurrentItem] = useState<TruthOrDare | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState<'truth' | 'dare' | 'random'>('random')
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    'easy' | 'medium' | 'hard' | 'random'
  >('random')

  const [newItem, setNewItem] = useState({
    type: 'truth' as 'truth' | 'dare',
    content: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    created_by: user ?? '',
  })

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('truth_or_dare')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems([...(data || []), ...BUILTIN_ITEMS])
    } catch (error) {
      console.error('加载失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRandomItem = () => {
    let filtered = items

    // 按类型筛选
    if (selectedType !== 'random') {
      filtered = filtered.filter((item) => item.type === selectedType)
    }

    // 按难度筛选
    if (selectedDifficulty !== 'random') {
      filtered = filtered.filter((item) => item.difficulty === selectedDifficulty)
    }

    if (filtered.length === 0) {
      toast.warning('没有符合条件的题目，请调整筛选条件')
      return
    }

    const randomIndex = Math.floor(Math.random() * filtered.length)
    setCurrentItem(filtered[randomIndex])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { error } = await supabase.from('truth_or_dare').insert([
        {
          ...newItem,
          created_by: newItem.created_by || user,
          is_custom: true,
        },
      ])

      if (error) throw error

      setShowForm(false)
      setNewItem({
        type: 'truth',
        content: '',
        difficulty: 'medium',
        created_by: user ?? '',
      })
      loadItems()
    } catch (error) {
      console.error('添加失败:', error)
      toast.error('添加失败，请重试')
    }
  }

  const deleteItem = async (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) return

    try {
      const { error } = await supabase.from('truth_or_dare').delete().eq('id', id)

      if (error) throw error
      loadItems()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-500'
      case 'medium':
        return 'text-yellow-500'
      case 'hard':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '简单'
      case 'medium':
        return '中等'
      case 'hard':
        return '困难'
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/" text="返回首页" />

        {loading ? (
          <div className="card text-center">
            <div className="text-2xl">加载中...</div>
          </div>
        ) : (
          <>
            <div className="card text-center mb-6">
              <h1 className="text-4xl font-bold mb-8">💖 真心话大冒险 💖</h1>

              {/* 筛选条件 */}
              <div className="grid grid-cols-2 gap-4 mb-8 max-w-md mx-auto">
                <div>
                  <label className="block text-sm font-semibold mb-2">类型</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none"
                  >
                    <option value="random">🎲 随机</option>
                    <option value="truth">💬 真心话</option>
                    <option value="dare">🎯 大冒险</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">难度</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none"
                  >
                    <option value="random">🎲 随机</option>
                    <option value="easy">🟢 简单</option>
                    <option value="medium">🟡 中等</option>
                    <option value="hard">🔴 困难</option>
                  </select>
                </div>
              </div>

              {/* 当前题目显示 */}
              {currentItem && (
                <div className="mb-8 p-8 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl">
                  <div className="text-6xl mb-4">{currentItem.type === 'truth' ? '💬' : '🎯'}</div>
                  <div className="text-2xl font-bold mb-2">
                    {currentItem.type === 'truth' ? '真心话' : '大冒险'}
                  </div>
                  <div className={`text-sm mb-4 ${getDifficultyColor(currentItem.difficulty)}`}>
                    ⭐ {getDifficultyText(currentItem.difficulty)}
                  </div>
                  <div className="text-xl mb-4">{currentItem.content}</div>
                  {currentItem.is_custom && (
                    <div className="text-sm text-gray-400">
                      自定义题目 by {nameOf(currentItem.created_by)}
                    </div>
                  )}
                </div>
              )}

              {/* 抽取按钮 */}
              <button onClick={getRandomItem} className="btn-primary text-xl px-12 py-4 mb-6">
                🎲 随机抽取
              </button>

              {/* 添加自定义题目按钮 */}
              <div>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  {showForm ? '取消' : '➕ 添加自定义题目'}
                </button>
              </div>

              {/* 添加表单 */}
              {showForm && (
                <div className="mt-6 p-6 bg-white/5 rounded-lg border border-white/10 text-left">
                  <h3 className="text-xl font-bold mb-4">添加自定义题目</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">类型</label>
                      <select
                        value={newItem.type}
                        onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none"
                      >
                        <option value="truth">💬 真心话</option>
                        <option value="dare">🎯 大冒险</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">内容 *</label>
                      <textarea
                        value={newItem.content}
                        onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none h-24"
                        placeholder="输入题目内容..."
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">难度</label>
                        <select
                          value={newItem.difficulty}
                          onChange={(e) =>
                            setNewItem({ ...newItem, difficulty: e.target.value as any })
                          }
                          className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none"
                        >
                          <option value="easy">🟢 简单</option>
                          <option value="medium">🟡 中等</option>
                          <option value="hard">🔴 困难</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">创建者</label>
                        <select
                          value={newItem.created_by}
                          onChange={(e) => setNewItem({ ...newItem, created_by: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none"
                        >
                          {me && <option value={me.id}>{me.name}</option>}
                          {partner && <option value={partner.id}>{partner.name}</option>}
                        </select>
                      </div>
                    </div>

                    <button type="submit" className="btn-primary w-full">
                      ✅ 添加
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* 自定义题目列表 */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">📝 自定义题目列表</h2>
              <div className="space-y-3">
                {items.filter((item) => item.is_custom).length === 0 ? (
                  <p className="text-center text-gray-400 py-8">还没有自定义题目</p>
                ) : (
                  items
                    .filter((item) => item.is_custom)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-4 bg-white/5 rounded-lg border border-white/10 flex justify-between items-center"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{item.type === 'truth' ? '💬' : '🎯'}</span>
                            <span className="font-semibold">
                              {item.type === 'truth' ? '真心话' : '大冒险'}
                            </span>
                            <span className={`text-sm ${getDifficultyColor(item.difficulty)}`}>
                              {getDifficultyText(item.difficulty)}
                            </span>
                          </div>
                          <p className="text-gray-300">{item.content}</p>
                          <p className="text-sm text-gray-500 mt-1">by {nameOf(item.created_by)}</p>
                        </div>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="ml-4 px-3 py-1 rounded bg-red-500 hover:bg-red-600 transition-colors text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
