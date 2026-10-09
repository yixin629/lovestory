'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useToast } from '@/app/components/feedback/ToastProvider'
import BackButton from '@/app/components/ui/BackButton'
import { useAuth } from '@/hooks/useAuth'

interface Quiz {
  id: number
  question: string
  options: string[]
  correct_answer: string
  category: string | null
}

interface QuizResult {
  quiz_id: number
  player_id: string
  selected_answer: string
  is_correct: boolean
}

const normalizeQuizOptions = (value: unknown): string[] => {
  let options = value

  if (typeof options === 'string') {
    try {
      options = JSON.parse(options)
    } catch {
      return []
    }
  }

  if (!Array.isArray(options)) return []

  return options
    .filter((option): option is string => typeof option === 'string')
    .map((option) => option.trim())
    .filter(Boolean)
}

export default function CoupleQuizPage() {
  const toast = useToast()
  const { me, partner } = useAuth()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playerId, setPlayerId] = useState('')
  const [showNameInput, setShowNameInput] = useState(true)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [results, setResults] = useState<QuizResult[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  const [newQuiz, setNewQuiz] = useState({
    question: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correct_answer: '',
    category: '基本信息',
  })

  useEffect(() => {
    loadQuizzes()
  }, [])

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('couple_quiz')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setQuizzes(
        (data || []).map((quiz) => ({
          ...quiz,
          options: normalizeQuizOptions(quiz.options),
          correct_answer: quiz.correct_answer.trim(),
        }))
      )
    } catch (error) {
      console.error('加载失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const startQuiz = () => {
    if (!playerId) {
      toast.warning('请选择答题的人')
      return
    }
    setShowNameInput(false)
    setCurrentIndex(0)
    setResults([])
    if (quizzes.length > 0) {
      setCurrentQuiz(quizzes[0])
    }
  }

  const handleAnswer = async (answer: string) => {
    if (!currentQuiz) return

    setSelectedAnswer(answer)
    const isCorrect = answer === currentQuiz.correct_answer

    // 保存答题结果到数据库
    try {
      await supabase.from('quiz_results').insert([
        {
          quiz_id: currentQuiz.id,
          player_id: playerId,
          selected_answer: answer,
          is_correct: isCorrect,
        },
      ])
    } catch (error) {
      console.error('保存结果失败:', error)
    }

    setResults([
      ...results,
      {
        quiz_id: currentQuiz.id,
        player_id: playerId,
        selected_answer: answer,
        is_correct: isCorrect,
      },
    ])

    setShowResult(true)

    // 2秒后自动跳到下一题
    setTimeout(() => {
      nextQuestion()
    }, 2000)
  }

  const nextQuestion = () => {
    setShowResult(false)
    setSelectedAnswer(null)

    if (currentIndex + 1 < quizzes.length) {
      setCurrentIndex(currentIndex + 1)
      setCurrentQuiz(quizzes[currentIndex + 1])
    } else {
      // 答题结束
      setCurrentQuiz(null)
    }
  }

  const restartQuiz = () => {
    setShowNameInput(true)
    setPlayerId('')
    setCurrentIndex(0)
    setResults([])
    setSelectedAnswer(null)
    setShowResult(false)
  }

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault()

    const question = newQuiz.question.trim()
    const options = [newQuiz.option1, newQuiz.option2, newQuiz.option3, newQuiz.option4]
      .map((option) => option.trim())
      .filter(Boolean)
    const correctAnswer = newQuiz.correct_answer.trim()

    if (!question) {
      toast.warning('请输入题目')
      return
    }

    if (options.length < 2) {
      toast.warning('至少需要2个选项')
      return
    }

    if (new Set(options).size !== options.length) {
      toast.warning('选项不能重复')
      return
    }

    if (!correctAnswer || !options.includes(correctAnswer)) {
      toast.warning('正确答案必须是选项之一')
      return
    }

    try {
      const { error } = await supabase.from('couple_quiz').insert([
        {
          question,
          options,
          correct_answer: correctAnswer,
          category: newQuiz.category,
        },
      ])

      if (error) throw error

      setShowAddForm(false)
      setNewQuiz({
        question: '',
        option1: '',
        option2: '',
        option3: '',
        option4: '',
        correct_answer: '',
        category: '基本信息',
      })
      toast.success('题目添加成功！')
      loadQuizzes()
    } catch (error) {
      console.error('添加失败:', error)
      toast.error('添加失败，请重试')
    }
  }

  const deleteQuiz = async (id: number) => {
    if (!confirm('确定要删除这道题吗？')) return

    try {
      const { error } = await supabase.from('couple_quiz').delete().eq('id', id)

      if (error) throw error
      loadQuizzes()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const correctCount = results.filter((r) => r.is_correct).length
  const matchRate = results.length > 0 ? ((correctCount / results.length) * 100).toFixed(1) : 0

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
            {/* 输入名字 */}
            {showNameInput ? (
              <div className="card text-center">
                <h1 className="text-4xl font-bold mb-8">🤔 情侣默契问答 🤔</h1>
                <div className="text-lg mb-6 text-gray-300">测试一下你们有多了解彼此！</div>
                <div className="max-w-md mx-auto space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">谁来答题</label>
                    <select
                      value={playerId}
                      onChange={(e) => setPlayerId(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none text-lg"
                    >
                      <option value="">选择...</option>
                      {me && <option value={me.id}>{me.name}</option>}
                      {partner && <option value={partner.id}>{partner.name}</option>}
                    </select>
                  </div>
                  <button
                    onClick={startQuiz}
                    className="btn-primary w-full text-xl py-4"
                    disabled={quizzes.length === 0}
                  >
                    {quizzes.length === 0 ? '还没有题目' : '开始答题 🎯'}
                  </button>

                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    {showAddForm ? '取消' : '➕ 添加题目'}
                  </button>

                  {showAddForm && (
                    <div className="mt-6 p-6 bg-white/5 rounded-lg border border-white/10 text-left">
                      <h3 className="text-xl font-bold mb-4">添加新题目</h3>
                      <form onSubmit={handleSubmitQuiz} className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold mb-2">问题 *</label>
                          <input
                            type="text"
                            value={newQuiz.question}
                            onChange={(e) => setNewQuiz({ ...newQuiz, question: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none"
                            placeholder="例如：我最喜欢的颜色是？"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold mb-2">选项1 *</label>
                            <input
                              type="text"
                              value={newQuiz.option1}
                              onChange={(e) => setNewQuiz({ ...newQuiz, option1: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2">选项2 *</label>
                            <input
                              type="text"
                              value={newQuiz.option2}
                              onChange={(e) => setNewQuiz({ ...newQuiz, option2: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2">选项3</label>
                            <input
                              type="text"
                              value={newQuiz.option3}
                              onChange={(e) => setNewQuiz({ ...newQuiz, option3: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2">选项4</label>
                            <input
                              type="text"
                              value={newQuiz.option4}
                              onChange={(e) => setNewQuiz({ ...newQuiz, option4: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold mb-2">正确答案 *</label>
                            <input
                              type="text"
                              value={newQuiz.correct_answer}
                              onChange={(e) =>
                                setNewQuiz({ ...newQuiz, correct_answer: e.target.value })
                              }
                              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none"
                              placeholder="输入正确的选项"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2">分类</label>
                            <select
                              value={newQuiz.category}
                              onChange={(e) => setNewQuiz({ ...newQuiz, category: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none"
                            >
                              <option value="基本信息">基本信息</option>
                              <option value="喜好">喜好</option>
                              <option value="纪念日">纪念日</option>
                              <option value="趣事">趣事</option>
                            </select>
                          </div>
                        </div>

                        <button type="submit" className="btn-primary w-full">
                          ✅ 添加题目
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* 题目列表 */}
                {quizzes.length > 0 && (
                  <div className="mt-8 text-left">
                    <h3 className="text-xl font-bold mb-4">📝 当前题库 ({quizzes.length}题)</h3>
                    <div className="space-y-3">
                      {quizzes.map((quiz, index) => (
                        <div
                          key={quiz.id}
                          className="p-4 bg-white/5 rounded-lg border border-white/10"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-primary font-bold">Q{index + 1}.</span>
                                <span className="font-semibold">{quiz.question}</span>
                                {quiz.category && (
                                  <span className="text-xs px-2 py-1 rounded bg-primary/20">
                                    {quiz.category}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-400">
                                选项: {quiz.options.join(' / ')}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteQuiz(quiz.id)}
                              className="ml-4 px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/40 transition-colors text-sm"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : currentQuiz ? (
              /* 答题界面 */
              <div className="card">
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-400 mb-2">
                    第 {currentIndex + 1} / {quizzes.length} 题
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-4">
                    <div
                      className="bg-gradient-to-r from-primary to-accent h-full rounded-full transition-all"
                      style={{ width: `${((currentIndex + 1) / quizzes.length) * 100}%` }}
                    />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{currentQuiz.question}</h2>
                  {currentQuiz.category && (
                    <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-sm">
                      {currentQuiz.category}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {currentQuiz.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(option)}
                      disabled={showResult}
                      className={`p-6 rounded-lg border-2 transition-all text-lg font-semibold ${
                        showResult
                          ? option === currentQuiz.correct_answer
                            ? 'bg-green-500/20 border-green-500'
                            : option === selectedAnswer
                            ? 'bg-red-500/20 border-red-500'
                            : 'bg-white/5 border-white/10 opacity-50'
                          : 'bg-white/5 border-white/20 hover:border-primary hover:bg-primary/10'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}. {option}
                    </button>
                  ))}
                </div>

                {showResult && (
                  <div
                    className={`text-center p-6 rounded-lg ${
                      selectedAnswer === currentQuiz.correct_answer
                        ? 'bg-green-500/20'
                        : 'bg-red-500/20'
                    }`}
                  >
                    <div className="text-4xl mb-2">
                      {selectedAnswer === currentQuiz.correct_answer ? '🎉 答对了！' : '❌ 答错了'}
                    </div>
                    <div className="text-lg">
                      正确答案是: <span className="font-bold">{currentQuiz.correct_answer}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* 结果页面 */
              <div className="card text-center">
                <h2 className="text-4xl font-bold mb-8">🎊 答题完成！</h2>

                <div className="max-w-md mx-auto mb-8">
                  <div className="text-6xl font-bold text-primary mb-4">{matchRate}%</div>
                  <div className="text-2xl mb-6">默契度</div>

                  <div className="p-6 bg-white/5 rounded-lg">
                    <div className="flex justify-between text-lg mb-2">
                      <span>答对：</span>
                      <span className="text-green-500 font-bold">{correctCount} 题</span>
                    </div>
                    <div className="flex justify-between text-lg mb-2">
                      <span>答错：</span>
                      <span className="text-red-500 font-bold">
                        {results.length - correctCount} 题
                      </span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span>总计：</span>
                      <span className="font-bold">{results.length} 题</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <button onClick={restartQuiz} className="btn-primary px-8 py-3">
                    🔄 再来一次
                  </button>
                  <Link
                    href="/"
                    className="px-8 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center"
                  >
                    🏠 返回首页
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
