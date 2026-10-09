'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArcadeGameDefinition, ArcadeGameId } from '../types'

const WIDTH = 800
const HEIGHT = 450

interface Actor { x: number; y: number; vx: number; vy: number; w: number; h: number; hp: number; color: string; kind?: string; alive: boolean; grounded?: boolean; cooldown?: number }
interface Shot { x: number; y: number; vx: number; vy: number; owner: 'player' | 'enemy'; color: string; life: number; size: number }
interface Platform { x: number; y: number; w: number; h: number }
interface Item { x: number; y: number; taken: boolean }
interface World {
  mode: ArcadeGameId
  stage: number
  goalX: number
  targetScore: number
  player: Actor
  enemies: Actor[]
  shots: Shot[]
  platforms: Platform[]
  items: Item[]
  camera: number
  score: number
  time: number
  energy: number
  captured: number
  message: string
  spawnAt: number
  hurtAt: number
  board: number[]
  cursor: number
  selected: number | null
  moves: number
  cursorAt: number
}

interface Controls { left: boolean; right: boolean; up: boolean; down: boolean; action: boolean; special: boolean }
const blankControls = (): Controls => ({ left: false, right: false, up: false, down: false, action: false, special: false })
const STAGE_NAMES: Record<ArcadeGameId, string[]> = {
  'sky-hop': ['青空草原', '熔岩工厂', '月光浮城', '深海遗迹', '彩虹王国'],
  'run-gun': ['密林前线', '钢铁基地', '风暴要塞', '极地列车', '终焉母舰'],
  'cloud-puff': ['糖果原野', '冰晶洞窟', '星云宫殿', '镜面迷城', '许愿星海'],
  'spirit-duel': ['焰尾兽', '潮汐鲸', '雷翼龙', '森罗鹿', '极光圣兽'],
  'energy-brawl': ['荒野擂台', '天空神殿', '宇宙裂隙', '时间回廊', '终极武道会'],
  'fruit-slash': ['果园晨光', '热带派对', '冰镇果盘', '霓虹果市', '水果风暴'],
  'gem-match': ['草莓糖铺', '薄荷冰宫', '葡萄星河', '柠檬工坊', '彩虹庆典'],
}
const overlap = (a: Actor, b: Actor) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const makeEnemy = (x: number, y: number, kind = 'walker', color = '#ef4444', hp = 30): Actor => ({ x, y, vx: -1, vy: 0, w: 32, h: 32, hp, color, kind, alive: true, cooldown: 0 })
const GEM_COLORS = ['#fb7185', '#fbbf24', '#34d399', '#38bdf8', '#a78bfa', '#f472b6']
const FRUIT_EMOJI: Record<string, string> = { apple: '🍎', orange: '🍊', melon: '🍉', berry: '🍓', bomb: '💣' }

function matchedCells(board: number[]) {
  const matched = new Set<number>()
  for (let row = 0; row < 6; row++) for (let column = 0; column < 4; column++) {
    const index = row * 6 + column
    if (board[index] === board[index + 1] && board[index] === board[index + 2]) { matched.add(index); matched.add(index + 1); matched.add(index + 2) }
  }
  for (let column = 0; column < 6; column++) for (let row = 0; row < 4; row++) {
    const index = row * 6 + column
    if (board[index] === board[index + 6] && board[index] === board[index + 12]) { matched.add(index); matched.add(index + 6); matched.add(index + 12) }
  }
  return matched
}

function clearMatches(world: World) {
  let total = 0
  for (let cascade = 0; cascade < 8; cascade++) {
    const matched = matchedCells(world.board)
    if (!matched.size) break
    total += matched.size
    for (const index of matched) world.board[index] = Math.floor(Math.random() * GEM_COLORS.length)
  }
  world.score += total * 80
  return total
}

function createWorld(mode: ArcadeGameId, stage = 0): World {
  const goalX = 1700 + stage * 360
  const base: World = {
    mode, stage, goalX, targetScore: 6000 + stage * 3000,
    player: { x: 70, y: 350, vx: 0, vy: 0, w: 30, h: 38, hp: 100, color: '#38bdf8', alive: true },
    enemies: [], shots: [], platforms: [], items: [], camera: 0, score: 0, time: 0,
    energy: 0, captured: 0, message: '', spawnAt: 0, hurtAt: 0,
    board: [], cursor: 0, selected: null, moves: 24 - stage, cursorAt: 0,
  }
  if (mode === 'sky-hop' || mode === 'cloud-puff') {
    base.platforms = [
      { x: 0, y: 410, w: goalX + 180, h: 40 }, { x: 220, y: 340, w: 120, h: 18 },
      { x: 430, y: 290, w: 110, h: 18 }, { x: 650, y: 350, w: 150, h: 18 },
      { x: 900, y: 270, w: 120, h: 18 }, { x: 1160, y: 330, w: 160, h: 18 },
      { x: 1430, y: 260, w: 130, h: 18 }, { x: 1650, y: 350, w: 150, h: 18 },
    ]
    for (let x = 1840; x < goalX; x += 180) base.platforms.push({ x, y: 250 + ((x / 180) % 3) * 48, w: 115, h: 18 })
    base.items = Array.from({ length: 7 + stage * 3 }, (_, index) => ({ x: 260 + index * 205, y: index % 2 ? 240 : 300, taken: false }))
    base.enemies = [makeEnemy(360, 378), makeEnemy(720, 318, 'spark', '#f59e0b'), makeEnemy(1080, 378, 'frost', '#60a5fa'), makeEnemy(1370, 378, 'flame', '#fb7185'), makeEnemy(1600, 378, 'spark', '#f59e0b')]
    for (let x = 1820; x < goalX; x += 190) base.enemies.push(makeEnemy(x, 378, stage >= 2 ? 'flame' : 'frost', stage >= 2 ? '#fb7185' : '#60a5fa', 30 + stage * 10))
    if (mode === 'cloud-puff') base.player.color = '#f9a8d4'
  } else if (mode === 'run-gun') {
    base.player.y = 360
    base.platforms = [{ x: 0, y: 410, w: WIDTH, h: 40 }]
    base.message = `击败 ${20 + stage * 10} 个机械兵即可通关`
  } else if (mode === 'spirit-duel') {
    base.player = { x: 120, y: 290, vx: 0, vy: 0, w: 90, h: 90, hp: 100, color: '#22c55e', alive: true }
    base.enemies = [makeEnemy(585, 290, 'wild', ['#f97316', '#38bdf8', '#a78bfa', '#22c55e', '#f472b6'][stage], 100 + stage * 25)]
    base.enemies[0].w = 90; base.enemies[0].h = 90; base.enemies[0].vx = 0
    base.message = `野生${STAGE_NAMES[mode][stage]}出现了！先削弱到 45 生命以下`
  } else if (mode === 'energy-brawl') {
    base.player = { x: 140, y: 340, vx: 0, vy: 0, w: 42, h: 58, hp: 100, color: '#fbbf24', alive: true }
    base.enemies = [makeEnemy(620, 340, 'fighter', ['#a78bfa', '#38bdf8', '#f43f5e', '#22c55e', '#f97316'][stage], 100 + stage * 30)]
    base.enemies[0].w = 42; base.enemies[0].h = 58; base.enemies[0].vx = 0
    base.platforms = [{ x: 0, y: 398, w: WIDTH, h: 52 }]
    base.message = `第 ${stage + 1} 战：${STAGE_NAMES[mode][stage]}`
  } else if (mode === 'fruit-slash') {
    base.player = { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0, w: 28, h: 28, hp: 100, color: '#fff', alive: true }
    base.targetScore = 1600 + stage * 900
    base.message = `目标 ${base.targetScore} 分；炸弹会扣除生命`
  } else {
    base.player = { x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 0, hp: 100, color: '#fff', alive: true }
    base.board = Array.from({ length: 36 }, () => Math.floor(Math.random() * 6))
    base.targetScore = 1200 + stage * 600
    base.message = `在 ${base.moves} 步内获得 ${base.targetScore} 分`
  }
  return base
}

export default function ArcadeStage({ game }: { game: ArcadeGameDefinition }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<World>(createWorld(game.id))
  const controlsRef = useRef<Controls>(blankControls())
  const frameRef = useRef<number | null>(null)
  const lastRef = useRef(0)
  const actionLatchRef = useRef(false)
  const specialLatchRef = useRef(false)
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [stage, setStage] = useState(0)
  const [finished, setFinished] = useState<'won' | 'lost' | null>(null)
  const [score, setScore] = useState(0)

  const reset = useCallback(() => {
    worldRef.current = createWorld(game.id, stage)
    controlsRef.current = blankControls()
    actionLatchRef.current = false
    specialLatchRef.current = false
    setScore(0)
    setPaused(false)
    setFinished(null)
    setRunning(true)
    lastRef.current = performance.now()
  }, [game.id, stage])

  useEffect(() => {
    const setKey = (event: KeyboardEvent, value: boolean) => {
      const key = event.key.toLowerCase()
      if (['arrowleft', 'a'].includes(key)) controlsRef.current.left = value
      if (['arrowright', 'd'].includes(key)) controlsRef.current.right = value
      if (['arrowup', 'w', ' '].includes(key)) controlsRef.current.up = value
      if (['arrowdown', 's'].includes(key)) controlsRef.current.down = value
      if (['j', 'x'].includes(key)) controlsRef.current.action = value
      if (['k', 'c'].includes(key)) controlsRef.current.special = value
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key)) event.preventDefault()
    }
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!event.repeat && (key === 'enter' || key === 'r')) { event.preventDefault(); reset(); return }
      if (!event.repeat && key === 'p' && !finished) { event.preventDefault(); setRunning((value) => { setPaused(value); return !value }); return }
      setKey(event, true)
    }
    const up = (event: KeyboardEvent) => setKey(event, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [finished, reset])

  const endGame = useCallback((result: 'won' | 'lost') => {
    setFinished(result)
    setRunning(false)
    setScore(worldRef.current.score)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.imageSmoothingEnabled = false

    const shoot = (world: World, special = false) => {
      if (special && world.energy < 25) return
      if (special) world.energy -= 25
      world.shots.push({ x: world.player.x + world.player.w, y: world.player.y + world.player.h / 2, vx: special ? 9 : 7, vy: 0, owner: 'player', color: special ? '#fde047' : '#67e8f9', life: 100, size: special ? 13 : 6 })
    }

    const platformPhysics = (world: World, dt: number) => {
      const p = world.player
      const c = controlsRef.current
      p.vx = c.left ? -4 : c.right ? 4 : p.vx * 0.72
      if (c.up && p.grounded) { p.vy = -11; p.grounded = false }
      p.vy += 0.55 * dt
      p.x = Math.max(0, Math.min(world.goalX + 80, p.x + p.vx * dt))
      const oldBottom = p.y + p.h
      p.y += p.vy * dt
      p.grounded = false
      for (const platform of world.platforms) {
        if (p.x + p.w > platform.x && p.x < platform.x + platform.w && oldBottom <= platform.y + 5 && p.y + p.h >= platform.y && p.vy >= 0) {
          p.y = platform.y - p.h; p.vy = 0; p.grounded = true
        }
      }
      if (p.y > HEIGHT) p.hp = 0
      world.camera = Math.max(0, Math.min(world.goalX - 700, p.x - 260))
    }

    const update = (dt: number) => {
      const world = worldRef.current
      const c = controlsRef.current
      world.time += dt
      if (world.mode === 'sky-hop' || world.mode === 'cloud-puff') {
        platformPhysics(world, dt)
        for (const item of world.items) {
          if (!item.taken && Math.hypot(world.player.x - item.x, world.player.y - item.y) < 42) { item.taken = true; world.score += 100 }
        }
        for (const enemy of world.enemies) {
          if (!enemy.alive) continue
          enemy.x += enemy.vx * dt
          if (enemy.x < 100 || enemy.x > world.goalX + 40) enemy.vx *= -1
          if (world.mode === 'cloud-puff' && c.action) {
            const distance = enemy.x - world.player.x
            if (distance > -30 && distance < 150 && Math.abs(enemy.y - world.player.y) < 80) {
              enemy.x -= Math.sign(distance) * 2.5 * dt
              if (Math.abs(distance) < 45) { enemy.alive = false; world.energy = 100; world.player.kind = enemy.kind; world.score += 250; world.message = `复制了${enemy.kind === 'flame' ? '火焰' : enemy.kind === 'frost' ? '冰霜' : '闪电'}能力！` }
            }
          } else if (overlap(world.player, enemy)) {
            if (world.player.vy > 2) { enemy.alive = false; world.player.vy = -7; world.score += 200 }
            else if (world.time - world.hurtAt > 60) { world.player.hp -= 25; world.hurtAt = world.time; world.player.vx = -6 }
          }
        }
        if (world.mode === 'cloud-puff' && c.special && !specialLatchRef.current && world.energy > 0) shoot(world, true)
        if (world.player.x > world.goalX) endGame('won')
      } else if (world.mode === 'run-gun') {
        platformPhysics(world, dt)
        world.player.x = Math.min(WIDTH - 60, world.player.x)
        world.camera = 0
        if (c.action && world.time - (world.player.cooldown ?? 0) > 10) { shoot(world); world.player.cooldown = world.time }
        if (world.time > world.spawnAt) {
          const flyer = Math.random() > 0.7
          world.enemies.push(makeEnemy(WIDTH + 20, flyer ? 210 : 378, flyer ? 'drone' : 'bot', flyer ? '#fb7185' : '#ef4444', flyer ? 20 : 35))
          world.spawnAt = world.time + 45 + Math.random() * 35
        }
        for (const enemy of world.enemies) {
          if (!enemy.alive) continue
          enemy.x -= (enemy.kind === 'drone' ? 2.3 : 1.4) * dt
          enemy.cooldown = (enemy.cooldown ?? 0) - dt
          if (enemy.cooldown <= 0) { world.shots.push({ x: enemy.x, y: enemy.y + 15, vx: -4, vy: 0, owner: 'enemy', color: '#fb7185', life: 160, size: 5 }); enemy.cooldown = 80 }
          if (overlap(world.player, enemy)) { world.player.hp -= 0.4 * dt }
        }
      } else if (world.mode === 'spirit-duel') {
        const enemy = world.enemies[0]
        if (c.action && !actionLatchRef.current) {
          const damage = 12 + Math.floor(Math.random() * 12); enemy.hp = Math.max(1, enemy.hp - damage); world.score += damage * 10; world.message = `闪叶冲击造成 ${damage} 点伤害！`
          window.setTimeout(() => { if (worldRef.current.mode === 'spirit-duel' && running) { worldRef.current.player.hp -= 8 + Math.floor(Math.random() * 9) } }, 350)
        }
        if (c.special && !specialLatchRef.current) {
          if (enemy.hp >= 45) world.message = '灵兽体力还很充足，契约球被弹开了！'
          else if (Math.random() < (105 - enemy.hp) / 100) { world.captured += 1; world.score += 1500; world.message = '契约成功！灵兽已经加入图鉴。'; endGame('won') }
          else { world.message = '差一点！再削弱一些试试。'; world.player.hp -= 6 }
        }
      } else if (world.mode === 'energy-brawl') {
        const p = world.player
        const enemy = world.enemies[0]
        p.vx = c.left ? -4.5 : c.right ? 4.5 : p.vx * 0.72
        if (c.up && p.grounded) { p.vy = -11; p.grounded = false }
        p.vy += 0.55 * dt; p.x = Math.max(10, Math.min(WIDTH - p.w - 10, p.x + p.vx * dt)); p.y += p.vy * dt
        if (p.y + p.h >= 398) { p.y = 398 - p.h; p.vy = 0; p.grounded = true }
        const distance = p.x - enemy.x
        enemy.x += Math.sign(distance) * 1.6 * dt
        world.energy = Math.min(100, world.energy + 0.16 * dt)
        if (c.action && !actionLatchRef.current && Math.abs(distance) < 80) { enemy.hp -= 12; world.score += 120; enemy.x -= Math.sign(distance) * 20 }
        if (c.special && !specialLatchRef.current) shoot(world, true)
        if (Math.abs(distance) < 55 && world.time - (enemy.cooldown ?? 0) > 45) { p.hp -= 9; enemy.cooldown = world.time }
      } else if (world.mode === 'fruit-slash') {
        const p = world.player
        p.x = Math.max(20, Math.min(WIDTH - 48, p.x + (c.left ? -6 * dt : c.right ? 6 * dt : 0)))
        p.y = Math.max(85, Math.min(HEIGHT - 48, p.y + (c.up ? -6 * dt : c.down ? 6 * dt : 0)))
        if (world.time > world.spawnAt) {
          const kinds = ['apple', 'orange', 'melon', 'berry', 'bomb']
          const kind = kinds[Math.random() < 0.12 + world.stage * 0.02 ? 4 : Math.floor(Math.random() * 4)]
          const fruit = makeEnemy(80 + Math.random() * 640, HEIGHT + 25, kind, kind === 'bomb' ? '#111827' : '#84cc16', 1)
          fruit.w = 38; fruit.h = 38; fruit.vx = -2.2 + Math.random() * 4.4; fruit.vy = -(8 + Math.random() * 4 + world.stage * .3)
          world.enemies.push(fruit)
          world.spawnAt = world.time + Math.max(18, 42 - world.stage * 5)
        }
        for (const fruit of world.enemies) {
          if (!fruit.alive) continue
          fruit.x += fruit.vx * dt; fruit.y += fruit.vy * dt; fruit.vy += .22 * dt
          if (c.action && Math.hypot(p.x - fruit.x, p.y - fruit.y) < 85) {
            fruit.alive = false
            if (fruit.kind === 'bomb') { p.hp -= 35; world.message = '轰！切到炸弹了' }
            else { world.score += 100; world.message = `${FRUIT_EMOJI[fruit.kind ?? 'apple']} 连斩 +100` }
          }
          if (fruit.y > HEIGHT + 65) { fruit.alive = false; if (fruit.kind !== 'bomb') p.hp -= 8 }
        }
      } else {
        const moveDelay = 7
        if (world.time - world.cursorAt > moveDelay) {
          const row = Math.floor(world.cursor / 6), column = world.cursor % 6
          if (c.left && column > 0) world.cursor--
          else if (c.right && column < 5) world.cursor++
          else if (c.up && row > 0) world.cursor -= 6
          else if (c.down && row < 5) world.cursor += 6
          if (c.left || c.right || c.up || c.down) world.cursorAt = world.time
        }
        if (c.action && !actionLatchRef.current) {
          if (world.selected === null) { world.selected = world.cursor; world.message = '已选中，再移动到相邻星糖并按 J' }
          else {
            const first = world.selected, second = world.cursor
            const adjacent = Math.abs(first - second) === 6 || (Math.abs(first - second) === 1 && Math.floor(first / 6) === Math.floor(second / 6))
            if (adjacent) {
              ;[world.board[first], world.board[second]] = [world.board[second], world.board[first]]
              const cleared = clearMatches(world)
              if (!cleared) { ;[world.board[first], world.board[second]] = [world.board[second], world.board[first]]; world.message = '没有连成三个，交换取消' }
              else { world.moves--; world.message = `消除了 ${cleared} 颗星糖！还剩 ${world.moves} 步` }
            }
            world.selected = null
          }
        }
        if (c.special && !specialLatchRef.current) { world.board = Array.from({ length: 36 }, () => Math.floor(Math.random() * 6)); world.selected = null; world.moves--; world.message = '棋盘已重新洗牌' }
      }

      for (const shot of world.shots) { shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt }
      for (const shot of world.shots) {
        if (shot.owner === 'player') {
          for (const enemy of world.enemies) if (enemy.alive && shot.x > enemy.x && shot.x < enemy.x + enemy.w && shot.y > enemy.y && shot.y < enemy.y + enemy.h) { enemy.hp -= shot.size > 10 ? 28 : 18; shot.life = 0; if (enemy.hp <= 0) { enemy.alive = false; world.score += 300 } }
        } else if (shot.x > world.player.x && shot.x < world.player.x + world.player.w && shot.y > world.player.y && shot.y < world.player.y + world.player.h) { world.player.hp -= 12; shot.life = 0 }
      }
      world.shots = world.shots.filter((shot) => shot.life > 0 && shot.x > -20 && shot.x < 1900)
      if (world.mode === 'run-gun' && world.score >= world.targetScore) endGame('won')
      if (world.mode === 'energy-brawl' && world.enemies[0].hp <= 0) endGame('won')
      if ((world.mode === 'fruit-slash' || world.mode === 'gem-match') && world.score >= world.targetScore) endGame('won')
      if (world.mode === 'gem-match' && world.moves <= 0 && world.score < world.targetScore) endGame('lost')
      if (world.player.hp <= 0) endGame('lost')
      actionLatchRef.current = c.action
      specialLatchRef.current = c.special
    }

    const drawActor = (actor: Actor, camera: number, face = false) => {
      const x = Math.round(actor.x - camera), y = Math.round(actor.y)
      context.fillStyle = 'rgba(0,0,0,.25)'; context.fillRect(x + 4, y + actor.h - 3, actor.w, 7)
      context.fillStyle = actor.color; context.fillRect(x, y, actor.w, actor.h)
      context.fillStyle = '#fff'; context.fillRect(x + actor.w * .55, y + 8, 7, 7)
      context.fillStyle = '#111827'; context.fillRect(x + actor.w * .55 + 3, y + 10, 3, 3)
      if (face) { context.fillStyle = '#fff'; context.fillRect(x + 6, y + 12, 7, 7) }
    }

    const draw = () => {
      const world = worldRef.current
      const gradients: Record<ArcadeGameId, [string, string]> = { 'sky-hop': ['#38bdf8', '#dbeafe'], 'run-gun': ['#1f2937', '#7f1d1d'], 'cloud-puff': ['#f9a8d4', '#ddd6fe'], 'spirit-duel': ['#86efac', '#0f766e'], 'energy-brawl': ['#312e81', '#111827'], 'fruit-slash': ['#65a30d', '#052e16'], 'gem-match': ['#7c3aed', '#1e1b4b'] }
      const gradient = context.createLinearGradient(0, 0, 0, HEIGHT); gradient.addColorStop(0, gradients[world.mode][0]); gradient.addColorStop(1, gradients[world.mode][1]); context.fillStyle = gradient; context.fillRect(0, 0, WIDTH, HEIGHT)
      context.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 12; i++) context.fillRect(((i * 113 - world.camera * .2) % 900) - 50, 40 + (i % 4) * 55, 55, 10)
      for (const platform of world.platforms) { context.fillStyle = world.mode === 'energy-brawl' ? '#4c1d95' : '#166534'; context.fillRect(platform.x - world.camera, platform.y, platform.w, platform.h); context.fillStyle = '#86efac'; context.fillRect(platform.x - world.camera, platform.y, platform.w, 7) }
      for (const item of world.items) if (!item.taken) { context.fillStyle = '#fde047'; context.beginPath(); context.arc(item.x - world.camera, item.y, 10, 0, Math.PI * 2); context.fill(); context.fillStyle = '#fff'; context.fillText('★', item.x - world.camera - 6, item.y + 5) }
      for (const enemy of world.enemies) if (enemy.alive || world.mode === 'spirit-duel' || world.mode === 'energy-brawl') drawActor(enemy, world.camera, true)
      for (const shot of world.shots) { context.fillStyle = shot.color; context.beginPath(); context.arc(shot.x - world.camera, shot.y, shot.size, 0, Math.PI * 2); context.fill() }
      if (world.mode !== 'fruit-slash' && world.mode !== 'gem-match') drawActor(world.player, world.camera)
      if (world.mode === 'fruit-slash') {
        context.font = '34px sans-serif'
        for (const fruit of world.enemies) if (fruit.alive) context.fillText(FRUIT_EMOJI[fruit.kind ?? 'apple'], fruit.x, fruit.y + 30)
        context.strokeStyle = '#fff'; context.lineWidth = 3; context.beginPath(); context.arc(world.player.x + 14, world.player.y + 14, 25, 0, Math.PI * 2); context.moveTo(world.player.x - 5, world.player.y + 14); context.lineTo(world.player.x + 33, world.player.y + 14); context.stroke()
      }
      if (world.mode === 'gem-match') {
        const size = 54, startX = 238, startY = 83
        for (let index = 0; index < 36; index++) {
          const x = startX + (index % 6) * size, y = startY + Math.floor(index / 6) * size
          context.fillStyle = GEM_COLORS[world.board[index]]; context.beginPath(); context.roundRect(x + 4, y + 4, 46, 46, 13); context.fill()
          context.fillStyle = 'rgba(255,255,255,.55)'; context.beginPath(); context.arc(x + 19, y + 17, 7, 0, Math.PI * 2); context.fill()
          if (index === world.cursor || index === world.selected) { context.strokeStyle = index === world.selected ? '#fde047' : '#fff'; context.lineWidth = 4; context.strokeRect(x + 1, y + 1, 52, 52) }
        }
        context.fillStyle = '#fff'; context.font = 'bold 16px sans-serif'; context.fillText(`剩余步数 ${world.moves}`, 610, 95)
      }
      if (world.mode === 'sky-hop' || world.mode === 'cloud-puff') { context.fillStyle = '#fff'; context.fillRect(world.goalX + 45 - world.camera, 245, 7, 165); context.fillStyle = '#fb7185'; context.fillRect(world.goalX + 52 - world.camera, 250, 70, 42); context.fillStyle = '#fff'; context.font = 'bold 18px sans-serif'; context.fillText('GO!', world.goalX + 65 - world.camera, 278) }
      context.fillStyle = 'rgba(3,7,18,.72)'; context.fillRect(14, 14, 230, 64); context.fillStyle = '#fff'; context.font = 'bold 18px sans-serif'; context.fillText(`SCORE ${world.score}`, 28, 39); context.fillStyle = '#fda4af'; context.fillRect(28, 51, Math.max(0, world.player.hp) * 1.7, 11); context.strokeStyle = '#fff'; context.strokeRect(28, 51, 170, 11)
      if (world.mode === 'energy-brawl' || world.mode === 'cloud-puff') { context.fillStyle = '#fde047'; context.fillRect(28, 67, world.energy * 1.7, 5) }
      if (world.mode === 'spirit-duel' || world.mode === 'energy-brawl') { const foe = world.enemies[0]; context.fillStyle = 'rgba(3,7,18,.72)'; context.fillRect(555, 14, 230, 52); context.fillStyle = '#fff'; context.fillText(world.mode === 'spirit-duel' ? `野生${STAGE_NAMES[world.mode][world.stage]}` : `对手·${STAGE_NAMES[world.mode][world.stage]}`, 570, 39); context.fillStyle = '#a78bfa'; context.fillRect(570, 49, Math.max(0, foe.hp) * (170 / (100 + world.stage * (world.mode === 'energy-brawl' ? 30 : 25))), 9) }
      if (world.message) { context.fillStyle = 'rgba(3,7,18,.72)'; context.fillRect(120, 385, 560, 42); context.fillStyle = '#fff'; context.font = 'bold 16px sans-serif'; context.textAlign = 'center'; context.fillText(world.message, 400, 411); context.textAlign = 'left' }
    }

    const loop = (now: number) => {
      const dt = Math.min(2, (now - lastRef.current) / 16.67 || 1); lastRef.current = now
      if (running) update(dt)
      draw()
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current) }
  }, [endGame, running])

  const press = (key: keyof Controls, value: boolean) => { controlsRef.current[key] = value }
  const chooseStage = (nextStage: number) => {
    setStage(nextStage)
    worldRef.current = createWorld(game.id, nextStage)
    setRunning(false)
    setPaused(false)
    setFinished(null)
    setScore(0)
  }
  const buttons: Array<{ key: keyof Controls; label: string }> = game.id === 'spirit-duel'
    ? [{ key: 'action', label: '⚔️ 攻击' }, { key: 'special', label: '🔮 捕捉' }]
    : [{ key: 'left', label: '◀' }, { key: 'down', label: '▼' }, { key: 'up', label: '▲' }, { key: 'right', label: '▶' }, { key: 'action', label: game.id === 'cloud-puff' ? '🌪️ 吸入' : game.id === 'fruit-slash' ? '🔪 挥刀' : game.id === 'gem-match' ? '✅ 选择' : '👊 动作' }, { key: 'special', label: game.id === 'gem-match' ? '🔀 洗牌' : '✨ 绝招' }]

  return (
    <section className="overflow-hidden rounded-3xl border border-white/15 bg-slate-950/80 p-3 shadow-2xl sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><p className="text-xs font-bold tracking-[.2em] text-cyan-300">NOW PLAYING</p><h2 className="text-xl font-black">{game.icon} {game.name}</h2></div>
        <div className="hidden text-right text-xs text-white/60 sm:block"><div>方向键 / WASD 移动 · J 动作 · K 绝招</div><div>Enter 开始 · P 暂停/继续 · R 重开</div></div>
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" aria-label="选择关卡">
        {STAGE_NAMES[game.id].map((name, index) => (
          <button key={name} type="button" onClick={() => chooseStage(index)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${stage === index ? 'bg-cyan-400 text-slate-950' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
            {index + 1}. {name}
          </button>
        ))}
      </div>
      <div className="relative overflow-hidden rounded-2xl border-4 border-slate-700 bg-black shadow-inner">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block aspect-video w-full touch-none bg-black [image-rendering:pixelated]" aria-label={`${game.name}游戏画面`} />
        {!running && (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/65 p-6 text-center backdrop-blur-sm">
            <div><div className="text-6xl">{finished === 'won' ? '🏆' : finished === 'lost' ? '💥' : paused ? '⏸️' : game.icon}</div><h3 className="mt-3 text-3xl font-black">{finished === 'won' ? '挑战成功！' : finished === 'lost' ? '再来一次！' : paused ? '游戏暂停' : STAGE_NAMES[game.id][stage]}</h3>{finished && <p className="mt-2 text-white/70">本局得分：{score}</p>}<div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={paused ? () => { setPaused(false); setRunning(true); lastRef.current = performance.now() } : reset} className={`rounded-full bg-gradient-to-r ${game.accent} px-7 py-3 font-black shadow-xl transition hover:scale-105`}>{paused ? '继续游戏' : finished ? '重新挑战' : '投币开始'}</button>{finished === 'won' && stage < 4 && <button type="button" onClick={() => chooseStage(stage + 1)} className="rounded-full bg-white px-7 py-3 font-black text-slate-900 shadow-xl transition hover:scale-105">下一关 →</button>}</div></div>
          </div>
        )}
      </div>
      <div className="mt-4 flex select-none flex-wrap justify-center gap-2 sm:gap-3">
        {buttons.map((button) => <button key={button.key} type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); press(button.key, true) }} onPointerUp={() => press(button.key, false)} onPointerCancel={() => press(button.key, false)} className="min-h-12 min-w-14 rounded-2xl border border-white/15 bg-white/10 px-4 font-black shadow-lg transition active:scale-95 active:bg-white/25">{button.label}</button>)}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-white/70" aria-label="键盘快捷键">
        {[['方向键/WASD', '移动'], ['J / X', '普通动作'], ['K / C', '绝招'], ['Enter', '开始'], ['P', '暂停'], ['R', '重开']].map(([key, action]) => <span key={key} className="rounded-lg bg-white/5 px-2.5 py-1.5"><kbd className="mr-1 rounded bg-white/15 px-1.5 py-0.5 font-black text-white">{key}</kbd>{action}</span>)}
      </div>
    </section>
  )
}
