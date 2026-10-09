'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Direction, NpcDefinition, Point } from '../types'

const WIDTH = 900
const HEIGHT = 560
const SPEED = 175
const BOSS: NpcDefinition = { id: 'boss', name: '赤焰妖王', icon: '👺', title: '洞窟首领', dialogue: '火焰祭坛正在震颤。', actionLabel: '挑战赤焰妖王', x: 450, y: 145 }
const CHEST: NpcDefinition = { id: 'cave-chest', name: '熔岩宝箱', icon: '🎁', title: '洞窟秘宝', dialogue: '箱盖上刻着已经黯淡的火焰符文。', actionLabel: '开启熔岩宝箱', x: 710, y: 335 }
const EXIT = { x: 450, y: 520 }

interface CaveCanvasProps {
  paused: boolean
  bossActive: boolean
  chestOpened: boolean
  initialPosition: Point
  onInteract: (npc: NpcDefinition) => void
  onNpcChange: (npc: NpcDefinition | null) => void
  onPositionChange: (position: Point) => void
  onLeave: () => void
  navigationRequest: { id: number; target: Point; name: string } | null
  onGuideArrival: () => void
  onGuideCancel: () => void
}

function directionFrom(dx: number, dy: number): Direction {
  const octant = Math.round((Math.atan2(dy, dx) / (Math.PI / 4) + 8)) % 8
  return ([2, 3, 4, 5, 6, 7, 0, 1] as const)[octant]
}

function isWalkable(point: Point) {
  if (point.y > 420) return point.x > 330 && point.x < 570
  if (point.y < 180) return point.x > 310 && point.x < 590 && point.y > 75
  return point.x > 105 && point.x < 795 && point.y < 455
}

export default function CaveCanvas({ paused, bossActive, chestOpened, initialPosition, onInteract, onNpcChange, onPositionChange, onLeave, navigationRequest, onGuideArrival, onGuideCancel }: CaveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const startPosition = isWalkable(initialPosition) ? { ...initialPosition } : { x: 450, y: 475 }
  const positionRef = useRef<Point>(startPosition)
  const targetRef = useRef<Point>(startPosition)
  const keysRef = useRef(new Set<string>())
  const pausedRef = useRef(paused)
  const nearbyRef = useRef<NpcDefinition | null>(null)
  const navigationRequestIdRef = useRef(0)
  const guideActiveRef = useRef(false)
  const callbacksRef = useRef({ onInteract, onNpcChange, onPositionChange, onLeave, onGuideArrival, onGuideCancel })
  const [ready, setReady] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [interactionNpc, setInteractionNpc] = useState<NpcDefinition | null>(null)
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const bossActiveRef = useRef(bossActive)
  const chestOpenedRef = useRef(chestOpened)

  useEffect(() => { bossActiveRef.current = bossActive }, [bossActive])
  useEffect(() => { chestOpenedRef.current = chestOpened }, [chestOpened])
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { callbacksRef.current = { onInteract, onNpcChange, onPositionChange, onLeave, onGuideArrival, onGuideCancel } }, [onGuideArrival, onGuideCancel, onInteract, onLeave, onNpcChange, onPositionChange])
  useEffect(() => {
    if (!navigationRequest || navigationRequest.id === navigationRequestIdRef.current) return
    navigationRequestIdRef.current = navigationRequest.id
    targetRef.current = { ...navigationRequest.target }
    guideActiveRef.current = true
    setNavigatingTo(navigationRequest.name)
  }, [navigationRequest])

  const setTarget = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const next = { x: (clientX - rect.left) / rect.width * WIDTH, y: (clientY - rect.top) / rect.height * HEIGHT }
    const entities = [...(bossActive ? [BOSS] : []), ...(!chestOpened ? [CHEST] : [])]
    const clicked = entities.find((entity) => Math.hypot(next.x - entity.x, next.y - entity.y) < 60)
    if (clicked && nearbyRef.current?.id === clicked.id) callbacksRef.current.onInteract(clicked)
    else if (isWalkable(next)) {
      if (guideActiveRef.current) callbacksRef.current.onGuideCancel()
      guideActiveRef.current = false
      setNavigatingTo(null)
      targetRef.current = clicked ? { x: clicked.x, y: clicked.y } : next
    }
  }, [bossActive, chestOpened])

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        event.preventDefault()
        keysRef.current.add(key)
      }
      if (!pausedRef.current && (key === 'e' || event.code === 'Space') && nearbyRef.current) callbacksRef.current.onInteract(nearbyRef.current)
    }
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    let cancelled = false
    const background = new Image()
    background.onload = () => setReady(true)
    background.onerror = () => { setReady(true); setLoadFailed(true) }
    background.src = '/games/dream-journey/scenes/crimson-cave.png'
    const frames: Record<'run' | 'stand', HTMLImageElement[][]> = { run: [], stand: [] }
    for (const state of ['run', 'stand'] as const) frames[state] = Array.from({ length: 8 }, (_, direction) => Array.from({ length: 8 }, (_, frame) => {
      const image = new Image()
      image.src = `/games/dream-journey/jxk/${state}/${direction.toString().padStart(2, '0')}${frame.toString().padStart(3, '0')}.png`
      return image
    }))
    let requestId = 0
    let previous = performance.now()
    let elapsed = 0
    let direction: Direction = 0
    let lastReport = 0
    const render = (now: number) => {
      if (cancelled) return
      const delta = Math.max(0, Math.min(0.04, (now - previous) / 1000))
      previous = now
      const position = positionRef.current
      let dx = Number(keysRef.current.has('d') || keysRef.current.has('arrowright')) - Number(keysRef.current.has('a') || keysRef.current.has('arrowleft'))
      let dy = Number(keysRef.current.has('s') || keysRef.current.has('arrowdown')) - Number(keysRef.current.has('w') || keysRef.current.has('arrowup'))
      if (!dx && !dy) {
        dx = targetRef.current.x - position.x
        dy = targetRef.current.y - position.y
      } else {
        targetRef.current = { ...position }
        if (guideActiveRef.current) callbacksRef.current.onGuideCancel()
        guideActiveRef.current = false
        setNavigatingTo(null)
      }
      const distance = Math.hypot(dx, dy)
      const moved = !pausedRef.current && distance > 4
      if (moved) {
        dx /= distance; dy /= distance; direction = directionFrom(dx, dy)
        const next = { x: position.x + dx * SPEED * delta, y: position.y + dy * SPEED * delta }
        if (isWalkable(next)) { position.x = next.x; position.y = next.y } else targetRef.current = { ...position }
        if (now - lastReport > 700) { lastReport = now; callbacksRef.current.onPositionChange({ ...position }) }
        if (Math.hypot(position.x - EXIT.x, position.y - EXIT.y) < 28) callbacksRef.current.onLeave()
      }
      if (guideActiveRef.current && Math.hypot(position.x - targetRef.current.x, position.y - targetRef.current.y) < 8) {
        guideActiveRef.current = false
        setNavigatingTo(null)
        callbacksRef.current.onPositionChange({ ...position })
        callbacksRef.current.onGuideArrival()
      }
      const bossOn = bossActiveRef.current
      const chestDone = chestOpenedRef.current
      const entities = [...(bossOn ? [BOSS] : []), ...(!chestDone ? [CHEST] : [])]
      const nearby = entities.find((entity) => Math.hypot(position.x - entity.x, position.y - entity.y) < 130) ?? null
      if (nearby?.id !== nearbyRef.current?.id) { nearbyRef.current = nearby; setInteractionNpc(nearby); callbacksRef.current.onNpcChange(nearby) }
      elapsed += delta
      context.clearRect(0, 0, WIDTH, HEIGHT)
      if (background.complete && background.naturalWidth > 0) context.drawImage(background, 0, 0, WIDTH, HEIGHT)
      if (bossOn) {
        const pulse = 29 + Math.sin(elapsed * 4) * 4
        context.beginPath(); context.arc(BOSS.x, BOSS.y, pulse, 0, Math.PI * 2); context.strokeStyle = '#fde047'; context.lineWidth = 3; context.stroke()
        context.font = '58px sans-serif'; context.textAlign = 'center'; context.fillText(BOSS.icon, BOSS.x, BOSS.y + 16)
        context.fillStyle = '#fef08a'; context.font = 'bold 15px sans-serif'; context.fillText(BOSS.name, BOSS.x, BOSS.y - 48)
      }
      context.font = '42px sans-serif'; context.textAlign = 'center'; context.fillText(chestDone ? '🗃️' : CHEST.icon, CHEST.x, CHEST.y + 12)
      context.fillStyle = chestDone ? '#cbd5e1' : '#fef3c7'; context.font = 'bold 13px sans-serif'; context.fillText(chestDone ? '宝箱已开启' : CHEST.name, CHEST.x, CHEST.y - 35)
      context.beginPath(); context.arc(EXIT.x, EXIT.y, 22 + Math.sin(elapsed * 5) * 3, 0, Math.PI * 2); context.strokeStyle = '#f0abfc'; context.lineWidth = 3; context.stroke()
      context.fillStyle = '#fae8ff'; context.font = 'bold 12px sans-serif'; context.fillText('返回长安', EXIT.x, EXIT.y - 30)
      const frame = Math.floor(elapsed * (moved ? 9 : 5)) % 8
      const sprite = frames[moved ? 'run' : 'stand'][direction]?.[frame]
      if (sprite?.complete && sprite.naturalWidth > 0) context.drawImage(sprite, position.x - sprite.width / 2, position.y - sprite.height + 20)
      requestId = requestAnimationFrame(render)
    }
    requestId = requestAnimationFrame(render)
    return () => { cancelled = true; cancelAnimationFrame(requestId); callbacksRef.current.onNpcChange(null) }
  }, [])

  const control = (label: string, key: string, className: string) => <button type="button" aria-label={label} className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-xl border border-white/30 bg-slate-950/75 font-black ${className}`} onPointerDown={() => keysRef.current.add(key)} onPointerUp={() => keysRef.current.delete(key)} onPointerLeave={() => keysRef.current.delete(key)} onPointerCancel={() => keysRef.current.delete(key)}>{label}</button>

  return (
    <div className="relative overflow-hidden rounded-2xl border-4 border-rose-300/80 bg-slate-950 shadow-2xl">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block aspect-[9/5.6] min-h-[240px] w-full touch-none cursor-crosshair md:min-h-0" onPointerDown={(event) => setTarget(event.clientX, event.clientY)} aria-label="赤焰妖王洞窟，使用方向键、WASD或点击移动" />
      {!ready && <div className="absolute inset-0 grid place-items-center bg-slate-950 text-rose-200">🔥 正在进入赤焰洞窟…</div>}
      {ready && loadFailed && (
        <div className="absolute left-3 top-14 rounded-lg border border-rose-300/50 bg-slate-950/85 px-3 py-1.5 text-xs text-rose-200">
          ⚠️ 场景背景加载失败，已使用简化画面
        </div>
      )}
      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-950/75 px-3 py-1 text-xs">独立场景 · 洞窟祭坛</div>
      {navigatingTo && !paused && <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-rose-200/50 bg-slate-950/80 px-3 py-1 text-xs font-bold text-rose-100">➤ 自动寻路：{navigatingTo}</div>}
      {interactionNpc && !paused && <button type="button" onClick={() => callbacksRef.current.onInteract(interactionNpc)} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border-2 border-amber-200 bg-slate-950/90 px-5 py-2 text-sm font-black text-amber-100">E · {interactionNpc.actionLabel}</button>}
      <div className="pointer-events-none absolute bottom-3 right-3 grid grid-cols-3 gap-1 md:hidden">{control('↑', 'w', 'col-start-2')}{control('←', 'a', 'col-start-1 row-start-2')}{control('↓', 's', 'col-start-2 row-start-2')}{control('→', 'd', 'col-start-3 row-start-2')}</div>
    </div>
  )
}
