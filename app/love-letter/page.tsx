'use client'

import { useState } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'

interface WordLibrary {
  adjectives: string[]
  verbs: string[]
  nouns: string[]
  places: string[]
  times: string[]
}

const WORD_LIBRARY: WordLibrary = {
  adjectives: ['美丽的', '温柔的', '可爱的', '迷人的', '甜蜜的', '浪漫的', '深情的', '真挚的'],
  verbs: ['爱着', '想念', '守护', '珍惜', '陪伴', '拥抱', '亲吻', '倾听'],
  nouns: ['星星', '月亮', '阳光', '花朵', '海洋', '梦想', '誓言', '回忆'],
  places: ['星空下', '海边', '花园里', '咖啡馆', '图书馆', '公园', '山顶', '湖畔'],
  times: ['每个清晨', '每个夜晚', '春天', '夏日', '秋天', '冬季', '永远', '此刻'],
}

const LETTER_TEMPLATES = [
  {
    id: 1,
    name: '经典情书',
    template:
      '亲爱的，在{time}，我总会想起{adjective}你。你就像{noun}一样，照亮了我的世界。我想在{place}，永远{verb}你。',
  },
  {
    id: 2,
    name: '浪漫告白',
    template:
      '{adjective}的你，是我生命中最{adjective}存在。{time}，我都在{verb}你。愿我们能在{place}，一起看{noun}。',
  },
  {
    id: 3,
    name: '深情表白',
    template:
      '遇见你是我最{adjective}的幸运。{time}，我都想{verb}你。你的笑容像{noun}，让我的心在{place}都能感受到温暖。',
  },
  {
    id: 4,
    name: '甜蜜誓言',
    template:
      '我想在{place}对你说：我会{time}{verb}你，给你{adjective}的爱。你是我心中永恒的{noun}。',
  },
  {
    id: 5,
    name: '诗意情话',
    template: '{adjective}的{noun}，{adjective}的你，{time}在{place}，我都在{verb}着你。',
  },
]

export default function LoveLetterPage() {
  const toast = useToast()
  const [selectedTemplate, setSelectedTemplate] = useState(LETTER_TEMPLATES[0])
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [generatedLetter, setGeneratedLetter] = useState('')
  const [showResult, setShowResult] = useState(false)

  // 生成情书
  const generateLetter = () => {
    let letter = selectedTemplate.template

    // 替换所有占位符
    letter = letter.replace(/{time}/g, selections.time || '[时间]')
    letter = letter.replace(/{place}/g, selections.place || '[地点]')
    letter = letter.replace(/{noun}/g, selections.noun || '[名词]')
    letter = letter.replace(/{verb}/g, selections.verb || '[动词]')

    // 处理形容词（可能有多个）
    let adjCount = 0
    letter = letter.replace(/{adjective}/g, () => {
      const result = selections[`adjective${adjCount}`] || '[形容词]'
      adjCount++
      return result
    })

    setGeneratedLetter(letter)
    setShowResult(true)

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }

    toast.success('情书生成成功！💌')
  }

  // 随机选择所有词语
  const randomizeAll = () => {
    const newSelections: Record<string, string> = {}

    // 随机选择时间、地点、名词、动词
    newSelections.time = WORD_LIBRARY.times[Math.floor(Math.random() * WORD_LIBRARY.times.length)]
    newSelections.place =
      WORD_LIBRARY.places[Math.floor(Math.random() * WORD_LIBRARY.places.length)]
    newSelections.noun = WORD_LIBRARY.nouns[Math.floor(Math.random() * WORD_LIBRARY.nouns.length)]
    newSelections.verb = WORD_LIBRARY.verbs[Math.floor(Math.random() * WORD_LIBRARY.verbs.length)]

    // 为每个形容词位置随机选择
    for (let i = 0; i < 3; i++) {
      newSelections[`adjective${i}`] =
        WORD_LIBRARY.adjectives[Math.floor(Math.random() * WORD_LIBRARY.adjectives.length)]
    }

    setSelections(newSelections)

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50, 30, 50])
    }
  }

  // 复制情书
  const copyLetter = () => {
    navigator.clipboard.writeText(generatedLetter)
    toast.success('情书已复制到剪贴板！')
  }

  // 重新开始
  const reset = () => {
    setSelections({})
    setGeneratedLetter('')
    setShowResult(false)
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card">
          <h1 className="text-4xl font-bold text-primary mb-2 text-center">💌 制作情书游戏</h1>
          <p className="text-gray-600 mb-8 text-center">选择词语，创作属于你们的浪漫情书</p>

          {!showResult ? (
            <div className="space-y-6">
              {/* 选择模板 */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">选择情书模板</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {LETTER_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        setSelectedTemplate(template)
                        if (navigator.vibrate) navigator.vibrate(30)
                      }}
                      className={`p-4 rounded-xl text-left transition-all ${
                        selectedTemplate.id === template.id
                          ? 'bg-primary text-white shadow-lg scale-105'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <span className="font-semibold">{template.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 选择词语 */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* 形容词 */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">形容词</h3>
                  <div className="flex flex-wrap gap-2">
                    {WORD_LIBRARY.adjectives.map((word) => (
                      <button
                        key={word}
                        onClick={() => {
                          const key = Object.keys(selections).filter((k) =>
                            k.startsWith('adjective')
                          ).length
                          setSelections({ ...selections, [`adjective${key}`]: word })
                          if (navigator.vibrate) navigator.vibrate(30)
                        }}
                        className="px-4 py-2 rounded-full bg-pink-100 hover:bg-pink-200 text-pink-700 transition-colors text-sm"
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 动词 */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">动词</h3>
                  <div className="flex flex-wrap gap-2">
                    {WORD_LIBRARY.verbs.map((word) => (
                      <button
                        key={word}
                        onClick={() => {
                          setSelections({ ...selections, verb: word })
                          if (navigator.vibrate) navigator.vibrate(30)
                        }}
                        className={`px-4 py-2 rounded-full transition-colors text-sm ${
                          selections.verb === word
                            ? 'bg-purple-500 text-white'
                            : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                        }`}
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 名词 */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">名词</h3>
                  <div className="flex flex-wrap gap-2">
                    {WORD_LIBRARY.nouns.map((word) => (
                      <button
                        key={word}
                        onClick={() => {
                          setSelections({ ...selections, noun: word })
                          if (navigator.vibrate) navigator.vibrate(30)
                        }}
                        className={`px-4 py-2 rounded-full transition-colors text-sm ${
                          selections.noun === word
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                        }`}
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 地点 */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">地点</h3>
                  <div className="flex flex-wrap gap-2">
                    {WORD_LIBRARY.places.map((word) => (
                      <button
                        key={word}
                        onClick={() => {
                          setSelections({ ...selections, place: word })
                          if (navigator.vibrate) navigator.vibrate(30)
                        }}
                        className={`px-4 py-2 rounded-full transition-colors text-sm ${
                          selections.place === word
                            ? 'bg-green-500 text-white'
                            : 'bg-green-100 hover:bg-green-200 text-green-700'
                        }`}
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 时间 */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">时间</h3>
                <div className="flex flex-wrap gap-2">
                  {WORD_LIBRARY.times.map((word) => (
                    <button
                      key={word}
                      onClick={() => {
                        setSelections({ ...selections, time: word })
                        if (navigator.vibrate) navigator.vibrate(30)
                      }}
                      className={`px-4 py-2 rounded-full transition-colors text-sm ${
                        selections.time === word
                          ? 'bg-amber-500 text-white'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                      }`}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 justify-center pt-4">
                <button onClick={randomizeAll} className="btn-secondary">
                  🎲 随机填充
                </button>
                <button onClick={generateLetter} className="btn-primary">
                  ✨ 生成情书
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 生成的情书 */}
              <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 rounded-2xl p-8 shadow-inner">
                <div className="bg-white bg-opacity-80 rounded-xl p-6 shadow-lg">
                  <div className="text-center mb-4">
                    <span className="text-4xl">💌</span>
                  </div>
                  <p className="text-lg leading-relaxed text-gray-800 font-serif text-center">
                    {generatedLetter}
                  </p>
                  <div className="text-center mt-6">
                    <span className="text-2xl">💕</span>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 justify-center">
                <button onClick={reset} className="btn-secondary">
                  🔄 重新创作
                </button>
                <button onClick={copyLetter} className="btn-primary">
                  📋 复制情书
                </button>
              </div>
            </div>
          )}

          {/* 说明 */}
          <div className="mt-8 pt-6 border-t text-left">
            <h3 className="font-bold text-lg mb-3 text-gray-700">💡 使用说明：</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• 选择一个情书模板</li>
              <li>• 点击不同类别的词语进行填充</li>
              <li>• 可以使用&quot;随机填充&quot;快速生成</li>
              <li>• 点击&quot;生成情书&quot;查看完整情书</li>
              <li>• 满意后可以复制分享给对方 💖</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
