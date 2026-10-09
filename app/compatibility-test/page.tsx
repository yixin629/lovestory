'use client'

import { useState } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'

interface Question {
  id: number
  question: string
  options: { text: string; score: number }[]
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: '你们吵架后通常谁先道歉？',
    options: [
      { text: '我先', score: 3 },
      { text: '对方先', score: 3 },
      { text: '一起道歉', score: 5 },
      { text: '冷战到忘记', score: 1 },
    ],
  },
  {
    id: 2,
    question: '周末最想一起做什么？',
    options: [
      { text: '宅家看剧', score: 4 },
      { text: '出门约会', score: 4 },
      { text: '各做各的', score: 2 },
      { text: '一起做饭', score: 5 },
    ],
  },
  {
    id: 3,
    question: '对方的哪个小习惯最让你心动？',
    options: [
      { text: '笑起来的样子', score: 5 },
      { text: '认真工作的样子', score: 4 },
      { text: '撒娇的样子', score: 5 },
      { text: '睡着的样子', score: 4 },
    ],
  },
  {
    id: 4,
    question: '你们多久说一次"我爱你"？',
    options: [
      { text: '每天都说', score: 5 },
      { text: '偶尔说', score: 3 },
      { text: '用行动表达', score: 4 },
      { text: '很少说', score: 2 },
    ],
  },
  {
    id: 5,
    question: '如果对方生病了，你会？',
    options: [
      { text: '请假照顾', score: 5 },
      { text: '下班后照顾', score: 4 },
      { text: '买药送过去', score: 3 },
      { text: '打电话关心', score: 2 },
    ],
  },
  {
    id: 6,
    question: '你们的未来规划是？',
    options: [
      { text: '已经规划好了', score: 5 },
      { text: '正在讨论中', score: 4 },
      { text: '走一步看一步', score: 3 },
      { text: '还没想过', score: 1 },
    ],
  },
  {
    id: 7,
    question: '对方最吸引你的是？',
    options: [
      { text: '性格', score: 5 },
      { text: '外表', score: 3 },
      { text: '才华', score: 4 },
      { text: '说不清，就是喜欢', score: 5 },
    ],
  },
  {
    id: 8,
    question: '你们会因为什么吵架？',
    options: [
      { text: '很少吵架', score: 5 },
      { text: '小事情', score: 3 },
      { text: '误会', score: 3 },
      { text: '原则问题', score: 2 },
    ],
  },
  {
    id: 9,
    question: '你觉得你们的默契度如何？',
    options: [
      { text: '心有灵犀', score: 5 },
      { text: '还不错', score: 4 },
      { text: '有时候', score: 3 },
      { text: '需要提高', score: 2 },
    ],
  },
  {
    id: 10,
    question: '如果有来生，你还会选择TA吗？',
    options: [
      { text: '一定会', score: 5 },
      { text: '应该会', score: 4 },
      { text: '要看情况', score: 2 },
      { text: '不确定', score: 1 },
    ],
  },
]

const getResult = (score: number) => {
  if (score >= 45) {
    return {
      level: '天生一对 💕',
      title: '你们简直是天造地设的一对！',
      description:
        '你们的默契度爆表，彼此之间有着深厚的感情基础。继续保持这份甜蜜，你们的爱情会越来越美好！',
      color: 'from-pink-500 to-red-500',
      emoji: '💕💕💕💕💕',
    }
  } else if (score >= 35) {
    return {
      level: '甜蜜恋人 💗',
      title: '你们是让人羡慕的情侣！',
      description: '你们的感情非常稳定，有着良好的沟通和理解。偶尔的小摩擦只会让你们更加珍惜彼此。',
      color: 'from-pink-400 to-purple-500',
      emoji: '💗💗💗💗',
    }
  } else if (score >= 25) {
    return {
      level: '潜力股 💝',
      title: '你们的爱情正在升温中！',
      description: '你们之间还有很多可以探索和磨合的地方。多一些耐心和包容，你们的感情会越来越好。',
      color: 'from-purple-400 to-blue-500',
      emoji: '💝💝💝',
    }
  } else {
    return {
      level: '需要加油 💪',
      title: '感情需要更多经营哦！',
      description: '每段感情都需要用心经营。多沟通、多理解、多包容，你们一定可以变得更好！',
      color: 'from-blue-400 to-cyan-500',
      emoji: '💪💪',
    }
  }
}

export default function CompatibilityTestPage() {
  const toast = useToast()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [showResult, setShowResult] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleAnswer = (score: number) => {
    setIsAnimating(true)
    const newAnswers = [...answers, score]
    setAnswers(newAnswers)

    setTimeout(() => {
      if (currentQuestion < QUESTIONS.length - 1) {
        setCurrentQuestion(currentQuestion + 1)
        setIsAnimating(false)
      } else {
        setShowResult(true)
        setIsAnimating(false)
        toast.success('测试完成！')
      }
    }, 300)
  }

  const resetTest = () => {
    setCurrentQuestion(0)
    setAnswers([])
    setShowResult(false)
  }

  const totalScore = answers.reduce((sum, score) => sum + score, 0)
  const result = getResult(totalScore)
  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">💕 默契度测试</h1>
          <p className="text-gray-600 mb-8">测测你们的默契有多高！</p>

          {!showResult ? (
            <>
              {/* 进度条 */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>
                    问题 {currentQuestion + 1}/{QUESTIONS.length}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* 问题卡片 */}
              <div
                className={`transition-all duration-300 ${
                  isAnimating ? 'opacity-0 transform translate-x-10' : 'opacity-100'
                }`}
              >
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 mb-6">
                  <p className="text-xl md:text-2xl font-semibold text-gray-800">
                    {QUESTIONS[currentQuestion].question}
                  </p>
                </div>

                <div className="grid gap-3">
                  {QUESTIONS[currentQuestion].options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(option.score)}
                      className="w-full p-4 text-left rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-pink-50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span className="text-lg">{option.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* 结果展示 */
            <div className="animate-fade-in">
              <div className={`bg-gradient-to-br ${result.color} rounded-2xl p-8 text-white mb-6`}>
                <div className="text-6xl mb-4">{result.emoji}</div>
                <h2 className="text-3xl font-bold mb-2">{result.level}</h2>
                <p className="text-xl opacity-90">{result.title}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="text-5xl font-bold text-primary mb-2">
                  {totalScore}
                  <span className="text-2xl text-gray-500">/50</span>
                </div>
                <p className="text-gray-600">{result.description}</p>
              </div>

              <div className="flex gap-4">
                <button onClick={resetTest} className="flex-1 btn-secondary">
                  🔄 重新测试
                </button>
                <button
                  onClick={() => {
                    const text = `我和TA的默契度测试结果：${result.level}！得分：${totalScore}/50 💕`
                    navigator.clipboard.writeText(text)
                    toast.success('已复制到剪贴板！')
                  }}
                  className="flex-1 btn-primary"
                >
                  📤 分享结果
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
