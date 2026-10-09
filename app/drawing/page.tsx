'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'

interface DrawingRow {
  id: number
  image_data: string
  drawer: string | null
  prompt: string
  created_at: string
}

export default function DrawingPage() {
  const toast = useToast()
  const { user, me, partner, nameOf } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#ff6b9d')
  const [lineWidth, setLineWidth] = useState(3)
  const [drawings, setDrawings] = useState<DrawingRow[]>([])
  const [prompt, setPrompt] = useState('')
  const [drawer, setDrawer] = useState(user ?? '')
  const [timer, setTimer] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  useEffect(() => {
    loadDrawings()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer((t) => t + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  const loadDrawings = async () => {
    try {
      const { data, error } = await supabase
        .from('drawings')
        .select('id, image_data, drawer, prompt, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setDrawings((data ?? []) as DrawingRow[])
    } catch (error) {
      console.error('加载作品失败:', error)
    }
  }

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    if (!isTimerRunning) {
      setIsTimerRunning(true)
    }

    // 获取坐标 - 支持鼠标和触摸
    let clientX: number, clientY: number
    if ('touches' in e) {
      // 触摸事件
      e.preventDefault() // 防止滚动
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      // 鼠标事件
      clientX = e.clientX
      clientY = e.clientY
    }

    // 计算缩放比例
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    ctx.beginPath()
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 获取坐标 - 支持鼠标和触摸
    let clientX: number, clientY: number
    if ('touches' in e) {
      // 触摸事件
      e.preventDefault() // 防止滚动
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      // 鼠标事件
      clientX = e.clientX
      clientY = e.clientY
    }

    // 计算缩放比例
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY)
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setTimer(0)
    setIsTimerRunning(false)
  }

  const saveDrawing = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!prompt.trim()) {
      toast.warning('请输入你画的是什么')
      return
    }

    const imageData = canvas.toDataURL('image/png')

    try {
      const { error } = await supabase.from('drawings').insert([
        {
          image_data: imageData,
          drawer: drawer || user,
          prompt: prompt.trim(),
        },
      ])

      if (error) throw error

      toast.success('作品已保存！')
      clearCanvas()
      setPrompt('')
      loadDrawings()
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败，请重试')
    }
  }

  const deleteDrawing = async (id: number) => {
    if (!confirm('确定要删除这幅画吗？')) return

    try {
      const { error } = await supabase.from('drawings').delete().eq('id', id)

      if (error) throw error
      loadDrawings()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const colors = ['#ff6b9d', '#c44569', '#ffa502', '#26de81', '#45aaf2', '#a55eea', '#000000']

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* 画板 */}
          <div className="lg:col-span-2 card">
            <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-primary">
              🎨 猜猜我画的
            </h1>

            {/* 计时器 */}
            <div className="text-center mb-4">
              <div className="text-xl md:text-2xl font-bold text-primary">
                ⏱️ {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
              </div>
            </div>

            {/* 画布 */}
            <div className="mb-4 bg-white rounded-lg overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full cursor-crosshair touch-none"
                style={{ touchAction: 'none' }}
              />
            </div>

            {/* 工具栏 */}
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">颜色</label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all ${
                        color === c
                          ? 'border-primary scale-110 ring-2 ring-primary ring-offset-2'
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`选择颜色 ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  粗细: {lineWidth}px
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    我画的是...
                  </label>
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full px-3 md:px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary text-sm md:text-base"
                    placeholder="例如：爱心"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">画家</label>
                  <select
                    value={drawer}
                    onChange={(e) => setDrawer(e.target.value)}
                    className="w-full px-3 md:px-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary text-sm md:text-base"
                  >
                    {me && <option value={me.id}>{me.name}</option>}
                    {partner && <option value={partner.id}>{partner.name}</option>}
                  </select>
                </div>
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
              <button
                onClick={clearCanvas}
                className="flex-1 px-4 md:px-6 py-2 md:py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors text-sm md:text-base"
              >
                🗑️ 清空
              </button>
              <button onClick={saveDrawing} className="flex-1 btn-primary text-sm md:text-base">
                💾 保存作品
              </button>
            </div>
          </div>

          {/* 作品集 */}
          <div className="card">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary">🖼️ 作品集</h2>
            <div className="space-y-3 md:space-y-4 max-h-[600px] md:max-h-[800px] overflow-y-auto">
              {drawings.length === 0 ? (
                <p className="text-center text-gray-500 py-8">还没有作品</p>
              ) : (
                drawings.map((drawing) => (
                  <div
                    key={drawing.id}
                    className="p-3 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg border border-pink-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={drawing.image_data}
                      alt={drawing.prompt}
                      className="w-full rounded mb-2"
                    />
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-800 text-sm md:text-base">
                          {drawing.prompt}
                        </div>
                        <div className="text-xs md:text-sm text-gray-600">by {nameOf(drawing.drawer)}</div>
                      </div>
                      <button
                        onClick={() => deleteDrawing(drawing.id)}
                        className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 transition-colors text-sm text-red-600"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
