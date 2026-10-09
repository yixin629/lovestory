'use client'

import { useEffect, useRef, useState } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import ThreeDDice from '@/app/components/ui/ThreeDDice'
import { useToast } from '@/app/components/feedback/ToastProvider'

interface DiceOption {
  id: string
  name: string
  emoji: string
  options: string[]
}

const PRESET_DICE: DiceOption[] = [
  {
    id: 'date',
    name: '约会地点',
    emoji: '🗺️',
    options: ['电影院', '咖啡厅', '公园', '商场', '餐厅', '游乐场'],
  },
  {
    id: 'food',
    name: '今天吃啥',
    emoji: '🍽️',
    options: ['火锅', '烧烤', '寿司', '披萨', '中餐', '西餐'],
  },
  {
    id: 'activity',
    name: '做什么',
    emoji: '🎯',
    options: ['看电影', '打游戏', '散步', '做饭', '聊天', '按摩'],
  },
  {
    id: 'love',
    name: '爱的骰子',
    emoji: '💕',
    options: ['亲亲', '抱抱', '牵手', '撒娇', '表白', '做饭给ta吃'],
  },
  {
    id: 'punishment',
    name: '小惩罚',
    emoji: '😈',
    options: ['唱歌', '跳舞', '大冒险', '说情话', '学动物叫', '做鬼脸'],
  },
  {
    id: 'reward',
    name: '小奖励',
    emoji: '🎁',
    options: ['吃零食', '睡懒觉', '被夸一天', '选择权', '免做家务', '许个愿望'],
  },
]

export default function LoveDicePage() {
  const toast = useToast()
  const [selectedDice, setSelectedDice] = useState<DiceOption>(PRESET_DICE[0])
  const [isRolling, setIsRolling] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [customOptions, setCustomOptions] = useState<string[]>(['', '', '', '', '', ''])
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [history, setHistory] = useState<{ dice: string; result: string; time: string }[]>([])
  const [diceFace, setDiceFace] = useState(1)
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (rollTimerRef.current) clearTimeout(rollTimerRef.current)
  }, [])

  // 掷骰子
  const rollDice = () => {
    if (isRolling) return

    const options = isCustomMode
      ? customOptions.filter((o) => o.trim() !== '')
      : selectedDice.options

    if (options.length < 2) {
      toast.error('至少需要2个选项！')
      return
    }

    const finalIndex = Math.floor(Math.random() * options.length)
    const finalResult = options[finalIndex]
    setDiceFace((finalIndex % 6) + 1)
    setIsRolling(true)
    setResult(null)

    rollTimerRef.current = setTimeout(() => {
      setResult(finalResult)
      setIsRolling(false)
      setHistory((prev) => [{ dice: isCustomMode ? '自定义骰子' : selectedDice.name, result: finalResult, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10))
      toast.success(`🎲 结果是: ${finalResult}！`)
      rollTimerRef.current = null
    }, 1450)
  }

  // 更新自定义选项
  const updateCustomOption = (index: number, value: string) => {
    setCustomOptions((prev) => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  // 清空历史
  const clearHistory = () => {
    setHistory([])
    toast.info('历史记录已清空')
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card">
          <h1 className="text-3xl md:text-4xl font-bold text-primary text-center mb-2">
            🎲 爱情骰子
          </h1>
          <p className="text-gray-600 text-center mb-6">选择困难？让骰子来帮你决定！</p>

          {/* 模式切换 */}
          <div className="flex justify-center gap-2 mb-6">
            <button
              onClick={() => setIsCustomMode(false)}
              className={`px-4 py-2 rounded-xl transition-all ${
                !isCustomMode
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              预设骰子
            </button>
            <button
              onClick={() => setIsCustomMode(true)}
              className={`px-4 py-2 rounded-xl transition-all ${
                isCustomMode
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              自定义骰子
            </button>
          </div>

          {!isCustomMode ? (
            /* 预设骰子选择 */
            <div className="grid grid-cols-3 gap-2 mb-6">
              {PRESET_DICE.map((dice) => (
                <button
                  key={dice.id}
                  onClick={() => {
                    setSelectedDice(dice)
                    setResult(null)
                  }}
                  className={`p-3 rounded-xl transition-all ${
                    selectedDice.id === dice.id
                      ? 'bg-pink-100 ring-2 ring-pink-500'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-2xl mb-1">{dice.emoji}</div>
                  <div className="text-xs font-medium">{dice.name}</div>
                </button>
              ))}
            </div>
          ) : (
            /* 自定义选项输入 */
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-600 mb-3">输入你的选项（至少2个）：</h3>
              <div className="grid grid-cols-2 gap-2">
                {customOptions.map((option, index) => (
                  <input
                    key={index}
                    type="text"
                    placeholder={`选项 ${index + 1}`}
                    value={option}
                    onChange={(e) => updateCustomOption(index, e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                    maxLength={20}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 当前骰子选项预览 */}
          {!isCustomMode && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                {selectedDice.emoji} {selectedDice.name}的选项：
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedDice.options.map((option, index) => (
                  <span key={index} className="bg-white px-3 py-1 rounded-full text-sm shadow-sm">
                    {option}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 骰子动画区域 */}
          <div className="flex flex-col items-center mb-6">
            <div className="rounded-3xl bg-gradient-to-b from-pink-50 to-purple-100 px-8 pt-4 shadow-inner">
              <ThreeDDice value={diceFace} rolling={isRolling} onRoll={rollDice} />
            </div>
            <p className="text-gray-500 text-sm mt-3">{isRolling ? '骰子正在桌面上滚动…' : '点击真实骰子开始'}</p>
          </div>

          {/* 结果显示 */}
          {result && !isRolling && (
            <div className="text-center mb-6 animate-pulse">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-lg font-bold text-gray-800">结果是：</p>
              <p className="text-2xl font-bold text-primary">{result}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={rollDice}
              disabled={isRolling}
              className="btn-primary px-8 py-3 text-lg disabled:opacity-50"
            >
              {isRolling ? '🎲 转动中...' : '🎲 掷骰子'}
            </button>
          </div>

          {/* 历史记录 */}
          {history.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-700">📜 历史记录</h3>
                <button onClick={clearHistory} className="text-xs text-gray-500 hover:text-red-500">
                  清空
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg text-sm"
                  >
                    <span className="text-gray-600">{item.dice}</span>
                    <span className="font-medium text-primary">{item.result}</span>
                    <span className="text-gray-400 text-xs">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
