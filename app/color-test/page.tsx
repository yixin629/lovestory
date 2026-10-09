'use client'

import { useState } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'

interface ColorOption {
  name: string
  hex: string
  personality: string[]
  loveStyle: string
  compatibility: Record<string, number>
}

const COLOR_OPTIONS: ColorOption[] = [
  {
    name: '热情红',
    hex: '#FF6B6B',
    personality: ['热情奔放', '充满活力', '勇敢直接', '领导力强'],
    loveStyle: '你是一个热情如火的恋人，喜欢主动表达爱意，追求刺激和浪漫。你的爱情充满激情与活力！',
    compatibility: {
      热情红: 85,
      活力橙: 90,
      阳光黄: 75,
      自然绿: 65,
      海洋蓝: 70,
      梦幻紫: 80,
      温柔粉: 95,
      纯净白: 60,
    },
  },
  {
    name: '活力橙',
    hex: '#FFA500',
    personality: ['乐观开朗', '富有创意', '善于交际', '积极向上'],
    loveStyle: '你是一个充满阳光的恋人，总能给对方带来快乐和惊喜。你的爱情就像温暖的阳光！',
    compatibility: {
      热情红: 90,
      活力橙: 80,
      阳光黄: 95,
      自然绿: 85,
      海洋蓝: 75,
      梦幻紫: 70,
      温柔粉: 88,
      纯净白: 65,
    },
  },
  {
    name: '阳光黄',
    hex: '#FFD93D',
    personality: ['快乐积极', '真诚友善', '充满希望', '天真浪漫'],
    loveStyle: '你是一个阳光般的恋人，永远保持乐观和热情。你的爱情像春天般温暖明媚！',
    compatibility: {
      热情红: 75,
      活力橙: 95,
      阳光黄: 85,
      自然绿: 90,
      海洋蓝: 80,
      梦幻紫: 75,
      温柔粉: 92,
      纯净白: 88,
    },
  },
  {
    name: '自然绿',
    hex: '#6BCB77',
    personality: ['平和稳定', '善解人意', '值得信赖', '注重和谐'],
    loveStyle: '你是一个温和体贴的恋人，善于倾听和理解对方。你的爱情像绿洲般舒适安宁！',
    compatibility: {
      热情红: 65,
      活力橙: 85,
      阳光黄: 90,
      自然绿: 95,
      海洋蓝: 88,
      梦幻紫: 80,
      温柔粉: 85,
      纯净白: 92,
    },
  },
  {
    name: '海洋蓝',
    hex: '#4D96FF',
    personality: ['冷静理智', '深思熟虑', '值得依赖', '有智慧'],
    loveStyle: '你是一个深沉专一的恋人，用心经营每一段感情。你的爱情像大海般深邃而宽广！',
    compatibility: {
      热情红: 70,
      活力橙: 75,
      阳光黄: 80,
      自然绿: 88,
      海洋蓝: 90,
      梦幻紫: 95,
      温柔粉: 78,
      纯净白: 85,
    },
  },
  {
    name: '梦幻紫',
    hex: '#B185DB',
    personality: ['浪漫唯美', '富有想象力', '神秘优雅', '敏感细腻'],
    loveStyle: '你是一个浪漫梦幻的恋人，追求唯美和仪式感。你的爱情像星空般神秘浪漫！',
    compatibility: {
      热情红: 80,
      活力橙: 70,
      阳光黄: 75,
      自然绿: 80,
      海洋蓝: 95,
      梦幻紫: 88,
      温柔粉: 92,
      纯净白: 82,
    },
  },
  {
    name: '温柔粉',
    hex: '#FFB6C1',
    personality: ['温柔体贴', '细心周到', '浪漫甜蜜', '充满爱心'],
    loveStyle: '你是一个温柔贴心的恋人，总能察觉对方的需要。你的爱情像棉花糖般甜蜜柔软！',
    compatibility: {
      热情红: 95,
      活力橙: 88,
      阳光黄: 92,
      自然绿: 85,
      海洋蓝: 78,
      梦幻紫: 92,
      温柔粉: 90,
      纯净白: 94,
    },
  },
  {
    name: '纯净白',
    hex: '#F5F5F5',
    personality: ['纯真简单', '心思纯净', '追求完美', '善良真诚'],
    loveStyle: '你是一个纯真真诚的恋人，用最真挚的心去爱。你的爱情像雪花般纯洁美好！',
    compatibility: {
      热情红: 60,
      活力橙: 65,
      阳光黄: 88,
      自然绿: 92,
      海洋蓝: 85,
      梦幻紫: 82,
      温柔粉: 94,
      纯净白: 80,
    },
  },
]

export default function ColorTestPage() {
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [selections, setSelections] = useState<ColorOption[]>([])
  const [result, setResult] = useState<ColorOption | null>(null)
  const [partnerColor, setPartnerColor] = useState<ColorOption | null>(null)

  const questions = [
    '选择一个最能代表你的颜色',
    '选择一个你最喜欢的颜色',
    '选择一个让你感到平静的颜色',
  ]

  const handleColorSelect = (color: ColorOption) => {
    const newSelections = [...selections, color]
    setSelections(newSelections)

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    if (step < questions.length - 1) {
      setStep(step + 1)
    } else {
      // 计算结果（选择最多的颜色）
      const colorCount: Record<string, number> = {}
      newSelections.forEach((c) => {
        colorCount[c.name] = (colorCount[c.name] || 0) + 1
      })

      const maxCount = Math.max(...Object.values(colorCount))
      const resultColorName = Object.keys(colorCount).find((name) => colorCount[name] === maxCount)!
      const resultColor = COLOR_OPTIONS.find((c) => c.name === resultColorName)!

      setResult(resultColor)

      // 触觉反馈
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100])
      }

      toast.success('测试完成！查看你的性格分析 💖')
    }
  }

  const selectPartnerColor = (color: ColorOption) => {
    setPartnerColor(color)

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(100)
    }
  }

  const reset = () => {
    setStep(0)
    setSelections([])
    setResult(null)
    setPartnerColor(null)
  }

  const getCompatibilityLevel = (score: number) => {
    if (score >= 90) return { text: '天生一对', color: 'text-red-600', bg: 'bg-red-50' }
    if (score >= 80) return { text: '非常契合', color: 'text-pink-600', bg: 'bg-pink-50' }
    if (score >= 70) return { text: '相处融洽', color: 'text-purple-600', bg: 'bg-purple-50' }
    if (score >= 60) return { text: '互补搭档', color: 'text-blue-600', bg: 'bg-blue-50' }
    return { text: '需要磨合', color: 'text-gray-600', bg: 'bg-gray-50' }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card">
          <h1 className="text-4xl font-bold text-primary mb-2 text-center">🌈 颜色性格测试</h1>
          <p className="text-gray-600 mb-8 text-center">
            选择你喜欢的颜色，测试你的性格特点和恋爱风格
          </p>

          {!result ? (
            <div className="space-y-6">
              {/* 进度条 */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>
                    问题 {step + 1}/{questions.length}
                  </span>
                  <span>{Math.round(((step + 1) / questions.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${((step + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* 当前问题 */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{questions[step]}</h2>
                <p className="text-gray-600">点击你最有感觉的颜色</p>
              </div>

              {/* 颜色选项 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => handleColorSelect(color)}
                    className="group relative aspect-square rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
                    style={{ backgroundColor: color.hex }}
                  >
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-2xl transition-all" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-white bg-opacity-90 rounded-b-2xl">
                      <span className="font-semibold text-gray-800">{color.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 测试结果 */}
              <div
                className="rounded-3xl p-8 shadow-lg"
                style={{ backgroundColor: result.hex + '20' }}
              >
                <div className="text-center mb-6">
                  <div
                    className="w-32 h-32 rounded-full mx-auto mb-4 shadow-lg"
                    style={{ backgroundColor: result.hex }}
                  />
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    你的性格颜色：{result.name}
                  </h2>
                </div>

                {/* 性格特点 */}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg text-gray-700 mb-3">性格特点：</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.personality.map((trait) => (
                      <span
                        key={trait}
                        className="px-4 py-2 bg-white rounded-full text-gray-700 shadow"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 恋爱风格 */}
                <div className="bg-white bg-opacity-80 rounded-xl p-6">
                  <h3 className="font-semibold text-lg text-gray-700 mb-3">恋爱风格：</h3>
                  <p className="text-gray-700 leading-relaxed">{result.loveStyle}</p>
                </div>
              </div>

              {/* 配对分析 */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6">
                <h3 className="font-semibold text-xl text-gray-800 mb-4 text-center">
                  💕 情侣配对分析
                </h3>
                <p className="text-gray-600 text-center mb-4">选择对方的颜色，查看你们的配对指数</p>

                <div className="grid grid-cols-4 gap-3 mb-6">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => selectPartnerColor(color)}
                      className={`aspect-square rounded-xl shadow transition-all ${
                        partnerColor?.name === color.name
                          ? 'ring-4 ring-primary scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>

                {partnerColor && (
                  <div className="bg-white rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full"
                          style={{ backgroundColor: result.hex }}
                        />
                        <span className="font-semibold">{result.name}</span>
                      </div>
                      <span className="text-2xl">💝</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{partnerColor.name}</span>
                        <div
                          className="w-12 h-12 rounded-full"
                          style={{ backgroundColor: partnerColor.hex }}
                        />
                      </div>
                    </div>

                    {(() => {
                      const score = result.compatibility[partnerColor.name]
                      const level = getCompatibilityLevel(score)
                      return (
                        <>
                          <div className="text-center mb-4">
                            <div className="text-5xl font-bold text-primary mb-2">{score}分</div>
                            <span className={`text-xl font-semibold ${level.color}`}>
                              {level.text}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-1000"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* 重新测试 */}
              <div className="text-center">
                <button onClick={reset} className="btn-primary">
                  🔄 重新测试
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
