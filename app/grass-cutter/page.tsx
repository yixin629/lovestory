'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'

// ─── Types ───────────────────────────────────────────────
interface Vec { x: number; y: number }

interface Enemy {
  id: number
  x: number; y: number
  hp: number; maxHp: number
  speed: number
  type: 'slime' | 'bat' | 'skull' | 'wolf' | 'boss'
  dmg: number
  hitFlash?: number          // frames of white flash remaining
  phase?: number             // boss phase (1, 2, 3)
  lastMinionSpawn?: number
  knockbackVx?: number
  knockbackVy?: number
}

interface Projectile {
  id: number
  x: number; y: number
  vx: number; vy: number
  damage: number
  life: number
  pierce: number
  hitIds: Set<number>
  kind: WeaponKind
  angle?: number
}

interface XpGem {
  id: number; x: number; y: number; value: number
}

interface FloatText {
  id: number; x: number; y: number; text: string; life: number; color: string
}

type WeaponKind = 'knife' | 'aura' | 'orbit' | 'bolt' | 'whip' | 'fire'

interface WeaponState {
  kind: WeaponKind
  level: number
}

interface PlayerStats {
  maxHp: number
  speed: number
  damageMul: number
  cdrMul: number          // cooldown reduction multiplier (lower = faster)
  areaMul: number         // AoE size multiplier
  pickupRange: number
  regen: number           // hp/sec
}

// ─── Game Config ─────────────────────────────────────────
const W = 420, H = 620
const PLAYER_R = 12
const TARGET_TIME_MS = 5 * 60 * 1000 // Survive 5 minutes

const WEAPON_INFO: Record<WeaponKind, { name: string; emoji: string; desc: string }> = {
  knife:  { name: '飞刀', emoji: '🔪', desc: '向面朝方向投掷飞刀' },
  aura:   { name: '气场', emoji: '💫', desc: '身周持续伤害敌人' },
  orbit:  { name: '护盾球', emoji: '⚪', desc: '围绕身周旋转的球体' },
  bolt:   { name: '闪电',  emoji: '⚡', desc: '随机打击敌人' },
  whip:   { name: '皮鞭', emoji: '〰️', desc: '左右横扫' },
  fire:   { name: '火球', emoji: '🔥', desc: '向最近敌人投射爆炸火球' },
}

// Cooldown in ms (scales with level & CDR)
const WEAPON_CD: Record<WeaponKind, (lv: number) => number> = {
  knife: lv => 800 - lv * 80,
  aura:  _lv => 500,
  orbit: _lv => 3000,
  bolt:  lv => 1800 - lv * 150,
  whip:  lv => 1100 - lv * 80,
  fire:  lv => 1600 - lv * 120,
}

type UpgradeOption =
  | { kind: 'weapon'; weapon: WeaponKind; newLevel: number; isNew: boolean }
  | { kind: 'stat'; stat: keyof PlayerStats; desc: string; delta: number }

export default function GrassCutterPage() {
  const toast = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const keysRef = useRef<Set<string>>(new Set())

  // Game state
  const [started, setStarted] = useState(false)
  const [over, setOver] = useState(false)
  const [victory, setVictory] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([])

  // Time & progression
  const [time, setTime] = useState(0)
  const [score, setScore] = useState(0)
  const [kills, setKills] = useState(0)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [xpToNext, setXpToNext] = useState(5)
  const [highScore, setHighScore] = useState(0)
  const [highTime, setHighTime] = useState(0)

  // Player
  const [pos, setPos] = useState<Vec>({ x: W / 2, y: H / 2 })
  const [facing, setFacing] = useState<Vec>({ x: 1, y: 0 })
  const [hp, setHp] = useState(100)
  const [stats, setStats] = useState<PlayerStats>({
    maxHp: 100, speed: 2.2, damageMul: 1, cdrMul: 1, areaMul: 1, pickupRange: 40, regen: 0,
  })
  const [weapons, setWeapons] = useState<WeaponState[]>([{ kind: 'knife', level: 1 }])

  // World
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const [xpGems, setXpGems] = useState<XpGem[]>([])
  const [floatTexts, setFloatTexts] = useState<FloatText[]>([])

  // Refs
  const posRef = useRef(pos)
  const facingRef = useRef(facing)
  const statsRef = useRef(stats)
  const weaponsRef = useRef(weapons)
  const enemiesRef = useRef(enemies)
  const hpRef = useRef(hp)
  const lastWeaponFireRef = useRef<Record<WeaponKind, number>>({} as any)
  const lastSpawnRef = useRef(0)
  const lastDamageRef = useRef(0)
  const lastRegenRef = useRef(0)
  const timeRef = useRef(0)
  const orbitAngleRef = useRef(0)
  const pausedForLevelRef = useRef(false)
  const screenShakeRef = useRef(0)       // intensity of screen shake
  const playerFlashRef = useRef(0)        // red flash when hit
  const hasSpawnedBossRef = useRef<Set<number>>(new Set())

  useEffect(() => { posRef.current = pos }, [pos])
  useEffect(() => { facingRef.current = facing }, [facing])
  useEffect(() => { statsRef.current = stats }, [stats])
  useEffect(() => { weaponsRef.current = weapons }, [weapons])
  useEffect(() => { enemiesRef.current = enemies }, [enemies])
  useEffect(() => { hpRef.current = hp }, [hp])
  useEffect(() => { pausedForLevelRef.current = showLevelUp }, [showLevelUp])

  useEffect(() => {
    const hs = localStorage.getItem('grassCutterHighScore')
    const ht = localStorage.getItem('grassCutterHighTime')
    if (hs) setHighScore(parseInt(hs))
    if (ht) setHighTime(parseInt(ht))
  }, [])

  // Input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
      if (e.key === 'Escape' && !showLevelUp) setPaused(p => !p)
    }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [showLevelUp])

  // Touch: drag in any direction to move
  const dragStartRef = useRef<Vec | null>(null)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    dragStartRef.current = { x: t.clientX, y: t.clientY }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!started || over || paused || showLevelUp) return
    const t = e.touches[0]
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || !dragStartRef.current) return
    const dx = t.clientX - dragStartRef.current.x
    const dy = t.clientY - dragStartRef.current.y
    const mag = Math.hypot(dx, dy)
    if (mag < 5) return
    const fx = dx / mag, fy = dy / mag
    setFacing({ x: fx, y: fy })

    // Move at player speed
    const sp = statsRef.current.speed
    setPos(prev => ({
      x: Math.max(PLAYER_R, Math.min(W - PLAYER_R, prev.x + fx * sp)),
      y: Math.max(PLAYER_R, Math.min(H - PLAYER_R, prev.y + fy * sp)),
    }))
  }, [started, over, paused, showLevelUp])

  // Start / Reset
  const startGame = () => {
    setStarted(true); setOver(false); setVictory(false); setPaused(false); setShowLevelUp(false)
    setTime(0); setScore(0); setKills(0); setLevel(1); setXp(0); setXpToNext(5)
    setPos({ x: W / 2, y: H / 2 })
    setFacing({ x: 1, y: 0 })
    setHp(100)
    setStats({ maxHp: 100, speed: 2.2, damageMul: 1, cdrMul: 1, areaMul: 1, pickupRange: 40, regen: 0 })
    setWeapons([{ kind: 'knife', level: 1 }])
    setEnemies([]); setProjectiles([]); setXpGems([]); setFloatTexts([])
    lastWeaponFireRef.current = {} as any
    lastSpawnRef.current = 0
    timeRef.current = 0
    orbitAngleRef.current = 0
    screenShakeRef.current = 0
    playerFlashRef.current = 0
    hasSpawnedBossRef.current = new Set()
  }

  // Level-up handler
  const triggerLevelUp = useCallback(() => {
    setLevel(l => l + 1)
    setXp(0)
    setXpToNext(prev => Math.floor(prev * 1.5 + 2))

    // Build 3 random upgrade options
    const options: UpgradeOption[] = []
    const pool: UpgradeOption[] = []

    // Weapon upgrades (level up existing OR add new)
    const currentWeapons = weaponsRef.current
    currentWeapons.forEach(w => {
      if (w.level < 5) {
        pool.push({ kind: 'weapon', weapon: w.kind, newLevel: w.level + 1, isNew: false })
      }
    })

    // Add-new-weapon option if we have fewer than 4 weapons
    if (currentWeapons.length < 4) {
      const have = new Set(currentWeapons.map(w => w.kind))
      const available = (Object.keys(WEAPON_INFO) as WeaponKind[]).filter(k => !have.has(k))
      available.forEach(k => pool.push({ kind: 'weapon', weapon: k, newLevel: 1, isNew: true }))
    }

    // Stat upgrades (always available)
    pool.push({ kind: 'stat', stat: 'maxHp', desc: '+20 最大生命', delta: 20 })
    pool.push({ kind: 'stat', stat: 'speed', desc: '+15% 移速', delta: 0.15 })
    pool.push({ kind: 'stat', stat: 'damageMul', desc: '+15% 伤害', delta: 0.15 })
    pool.push({ kind: 'stat', stat: 'cdrMul', desc: '-10% 冷却', delta: -0.1 })
    pool.push({ kind: 'stat', stat: 'areaMul', desc: '+15% 范围', delta: 0.15 })
    pool.push({ kind: 'stat', stat: 'pickupRange', desc: '+20 拾取范围', delta: 20 })
    pool.push({ kind: 'stat', stat: 'regen', desc: '+0.5/s 回血', delta: 0.5 })

    // Shuffle & pick 3 unique
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    const seenKeys = new Set<string>()
    for (const o of pool) {
      const key = o.kind === 'weapon' ? `w-${o.weapon}` : `s-${o.stat}`
      if (seenKeys.has(key)) continue
      seenKeys.add(key)
      options.push(o)
      if (options.length === 3) break
    }

    setUpgradeOptions(options)
    setShowLevelUp(true)
  }, [])

  const pickUpgrade = (opt: UpgradeOption) => {
    if (opt.kind === 'weapon') {
      if (opt.isNew) {
        setWeapons(prev => [...prev, { kind: opt.weapon, level: 1 }])
        toast.success(`获得新武器: ${WEAPON_INFO[opt.weapon].name}`)
      } else {
        setWeapons(prev => prev.map(w => w.kind === opt.weapon ? { ...w, level: opt.newLevel } : w))
        toast.success(`${WEAPON_INFO[opt.weapon].name} 升至 Lv.${opt.newLevel}`)
      }
    } else {
      setStats(prev => {
        const next = { ...prev }
        if (opt.stat === 'maxHp') {
          next.maxHp += opt.delta
          setHp(h => h + opt.delta)
        } else if (opt.stat === 'speed') {
          next.speed = prev.speed * (1 + opt.delta)
        } else if (opt.stat === 'damageMul') {
          next.damageMul = prev.damageMul + opt.delta
        } else if (opt.stat === 'cdrMul') {
          next.cdrMul = prev.cdrMul + opt.delta // delta is negative
        } else if (opt.stat === 'areaMul') {
          next.areaMul = prev.areaMul + opt.delta
        } else if (opt.stat === 'pickupRange') {
          next.pickupRange = prev.pickupRange + opt.delta
        } else if (opt.stat === 'regen') {
          next.regen = prev.regen + opt.delta
        }
        return next
      })
      toast.success(opt.desc)
    }
    setShowLevelUp(false)
  }

  // Float text helper
  const addFloat = useCallback((x: number, y: number, text: string, color: string) => {
    setFloatTexts(prev => [...prev, {
      id: Date.now() + Math.random(), x, y, text, life: 30, color,
    }])
  }, [])

  const spawnBoss = useCallback(() => {
    const t = timeRef.current
    const minute = t / 60000
    setEnemies(prev => [...prev, {
      id: Date.now(),
      x: W / 2, y: -40,
      hp: 400 + minute * 200, maxHp: 400 + minute * 200,
      speed: 0.7, type: 'boss', dmg: 30,
    }])
    toast.error('👿 Boss 降临！')
  }, [toast])

  // Spawn enemies based on time
  const spawnEnemies = useCallback(() => {
    const t = timeRef.current
    const minute = t / 60000
    const enemyCount = enemiesRef.current.length
    const maxEnemies = 50 + minute * 15
    if (enemyCount > maxEnemies) return

    // Pick type based on time
    let type: Enemy['type'] = 'slime'
    const r = Math.random()
    if (minute > 3) type = r < 0.15 ? 'wolf' : r < 0.4 ? 'skull' : r < 0.7 ? 'bat' : 'slime'
    else if (minute > 2) type = r < 0.3 ? 'skull' : r < 0.55 ? 'bat' : 'slime'
    else if (minute > 1) type = r < 0.4 ? 'bat' : 'slime'

    // Boss every 1 minute (fire once per window)
    const bossWindow = Math.floor(t / 60000)
    if (bossWindow > 0 && !hasSpawnedBossRef.current.has(bossWindow)) {
      hasSpawnedBossRef.current.add(bossWindow)
      spawnBoss()
      return
    }

    // Spawn at edge
    const edge = Math.floor(Math.random() * 4)
    let x = 0, y = 0
    if (edge === 0) { x = Math.random() * W; y = -20 }
    else if (edge === 1) { x = W + 20; y = Math.random() * H }
    else if (edge === 2) { x = Math.random() * W; y = H + 20 }
    else { x = -20; y = Math.random() * H }

    const hpScale = 1 + minute * 0.4
    const baseHp = type === 'slime' ? 5 : type === 'bat' ? 8 : type === 'skull' ? 15 : 30
    const baseSpd = type === 'slime' ? 0.7 : type === 'bat' ? 1.3 : type === 'skull' ? 0.9 : 1.5
    const baseDmg = type === 'slime' ? 5 : type === 'bat' ? 8 : type === 'skull' ? 12 : 18

    setEnemies(prev => [...prev, {
      id: Date.now() + Math.random(),
      x, y,
      hp: baseHp * hpScale, maxHp: baseHp * hpScale,
      speed: baseSpd + minute * 0.05,
      type, dmg: baseDmg,
    }])
  }, [spawnBoss])

  // Fire weapons
  const fireWeapons = useCallback((now: number) => {
    const p = posRef.current
    const s = statsRef.current
    const f = facingRef.current

    weaponsRef.current.forEach(w => {
      const last = lastWeaponFireRef.current[w.kind] || 0
      const cd = WEAPON_CD[w.kind](w.level) * s.cdrMul
      if (now - last < cd) return
      lastWeaponFireRef.current[w.kind] = now

      const dmgBase = (20 + w.level * 6) * s.damageMul
      const areaFactor = s.areaMul

      if (w.kind === 'knife') {
        // Throw N knives in facing direction, slight spread
        const count = Math.min(1 + Math.floor(w.level / 2), 3)
        for (let i = 0; i < count; i++) {
          const spread = (i - (count - 1) / 2) * 0.15
          const ang = Math.atan2(f.y, f.x) + spread
          setProjectiles(prev => [...prev, {
            id: Date.now() + Math.random() + i,
            x: p.x, y: p.y,
            vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6,
            damage: dmgBase,
            life: 60, pierce: w.level >= 3 ? 2 : 1,
            hitIds: new Set(), kind: 'knife', angle: ang,
          }])
        }
      } else if (w.kind === 'aura') {
        // Persistent AoE ring around player - apply damage directly
        const radius = 50 * areaFactor + w.level * 8
        enemiesRef.current.forEach(e => {
          const d = Math.hypot(e.x - p.x, e.y - p.y)
          if (d < radius) {
            setEnemies(prev => prev.map(en => en.id === e.id ? { ...en, hp: en.hp - dmgBase * 0.4 } : en))
          }
        })
      } else if (w.kind === 'orbit') {
        // Spawn orbiting projectiles (count = level, last ~3s)
        const count = w.level + 1
        const lifetime = 180
        for (let i = 0; i < count; i++) {
          const ang = (i / count) * Math.PI * 2
          setProjectiles(prev => [...prev, {
            id: Date.now() + Math.random() + i,
            x: p.x + Math.cos(ang) * 40,
            y: p.y + Math.sin(ang) * 40,
            vx: 0, vy: 0,
            damage: dmgBase * 0.7,
            life: lifetime, pierce: 999,
            hitIds: new Set(), kind: 'orbit', angle: ang,
          }])
        }
      } else if (w.kind === 'bolt') {
        // Strike 1-N random nearby enemies
        const count = 1 + Math.floor(w.level / 2)
        const candidates = enemiesRef.current.filter(e => Math.hypot(e.x - p.x, e.y - p.y) < 250)
        for (let i = 0; i < Math.min(count, candidates.length); i++) {
          const target = candidates[Math.floor(Math.random() * candidates.length)]
          setEnemies(prev => prev.map(e => e.id === target.id ? { ...e, hp: e.hp - dmgBase * 1.5 } : e))
          addFloat(target.x, target.y, '⚡', '#fde047')
        }
      } else if (w.kind === 'whip') {
        // Left and right horizontal swing
        const range = 80 * areaFactor + w.level * 10
        const thickness = 35
        const dirs = w.level >= 3 ? [-1, 1, 0] : [-1, 1]
        dirs.forEach(dir => {
          const offX = dir * range * 0.5
          const offY = dir === 0 ? -range * 0.6 : 0
          const cx = p.x + offX
          const cy = p.y + offY
          enemiesRef.current.forEach(e => {
            const dx = e.x - cx, dy = e.y - cy
            if (Math.abs(dx) < range / 2 && Math.abs(dy) < thickness) {
              setEnemies(prev => prev.map(en => en.id === e.id ? { ...en, hp: en.hp - dmgBase * 0.8 } : en))
            }
          })
          setProjectiles(prev => [...prev, {
            id: Date.now() + Math.random() + dir,
            x: cx, y: cy, vx: 0, vy: 0,
            damage: 0, life: 10, pierce: 0,
            hitIds: new Set(), kind: 'whip',
            angle: dir === 0 ? -Math.PI / 2 : 0,
          }])
        })
      } else if (w.kind === 'fire') {
        // Launch fireball at nearest enemy, explodes on impact
        const nearest = enemiesRef.current
          .map(e => ({ e, d: Math.hypot(e.x - p.x, e.y - p.y) }))
          .sort((a, b) => a.d - b.d)[0]
        if (!nearest) return
        const ang = Math.atan2(nearest.e.y - p.y, nearest.e.x - p.x)
        setProjectiles(prev => [...prev, {
          id: Date.now() + Math.random(),
          x: p.x, y: p.y,
          vx: Math.cos(ang) * 4, vy: Math.sin(ang) * 4,
          damage: dmgBase * 1.2,
          life: 80, pierce: 0,
          hitIds: new Set(), kind: 'fire',
        }])
      }
    })
  }, [addFloat])

  // Main game loop
  useEffect(() => {
    if (!started || over || victory || paused || showLevelUp) return

    let lastTick = performance.now()

    const loop = (now: number) => {
      const dt = now - lastTick
      lastTick = now

      timeRef.current += dt
      setTime(t => t + dt)

      // Victory check
      if (timeRef.current >= TARGET_TIME_MS) {
        setVictory(true); setOver(true)
        if (score > highScore) {
          localStorage.setItem('grassCutterHighScore', score.toString())
        }
        if (timeRef.current > highTime) {
          setHighTime(Math.floor(timeRef.current))
          localStorage.setItem('grassCutterHighTime', Math.floor(timeRef.current).toString())
        }
        return
      }

      // Keyboard movement
      const keys = keysRef.current
      let dx = 0, dy = 0
      if (keys.has('arrowleft') || keys.has('a')) dx -= 1
      if (keys.has('arrowright') || keys.has('d')) dx += 1
      if (keys.has('arrowup') || keys.has('w')) dy -= 1
      if (keys.has('arrowdown') || keys.has('s')) dy += 1
      if (dx !== 0 || dy !== 0) {
        const m = Math.hypot(dx, dy)
        dx /= m; dy /= m
        setFacing({ x: dx, y: dy })
        const sp = statsRef.current.speed
        setPos(prev => ({
          x: Math.max(PLAYER_R, Math.min(W - PLAYER_R, prev.x + dx * sp)),
          y: Math.max(PLAYER_R, Math.min(H - PLAYER_R, prev.y + dy * sp)),
        }))
      }

      // Spawn enemies
      const spawnInt = Math.max(200, 900 - timeRef.current * 0.002)
      if (now - lastSpawnRef.current > spawnInt) {
        spawnEnemies()
        lastSpawnRef.current = now
      }

      // Fire weapons
      fireWeapons(now)

      // Regen
      if (statsRef.current.regen > 0 && now - lastRegenRef.current > 1000) {
        setHp(h => Math.min(statsRef.current.maxHp, h + statsRef.current.regen))
        lastRegenRef.current = now
      }

      // Orbit angle advance
      orbitAngleRef.current += 0.05

      // Update projectiles
      setProjectiles(prev => prev.map(pr => {
        if (pr.kind === 'orbit') {
          // Rotate around player
          const p = posRef.current
          const newAng = (pr.angle || 0) + 0.1
          return {
            ...pr,
            x: p.x + Math.cos(newAng) * 45,
            y: p.y + Math.sin(newAng) * 45,
            angle: newAng,
            life: pr.life - 1,
          }
        }
        return { ...pr, x: pr.x + pr.vx, y: pr.y + pr.vy, life: pr.life - 1 }
      }).filter(pr => pr.life > 0 && pr.x > -50 && pr.x < W + 50 && pr.y > -50 && pr.y < H + 50))

      // Move enemies toward player + boss phase logic + decay hitFlash
      const p = posRef.current
      setEnemies(prev => prev.map(e => {
        const dx = p.x - e.x, dy = p.y - e.y
        const d = Math.hypot(dx, dy) || 1
        const next: Enemy = {
          ...e,
          x: e.x + (dx / d) * e.speed,
          y: e.y + (dy / d) * e.speed,
          hitFlash: e.hitFlash ? e.hitFlash - 1 : 0,
        }
        // Boss spawns minions at low HP
        if (e.type === 'boss') {
          const phase = e.hp / e.maxHp < 0.33 ? 3 : e.hp / e.maxHp < 0.66 ? 2 : 1
          next.phase = phase
          next.speed = 0.7 + (phase - 1) * 0.3
          if (phase >= 2 && (!e.lastMinionSpawn || now - e.lastMinionSpawn > 4000)) {
            next.lastMinionSpawn = now
            // Spawn 2 bats around boss
            for (let i = 0; i < 2; i++) {
              const ang = Math.random() * Math.PI * 2
              setEnemies(ps => [...ps, {
                id: Date.now() + Math.random() + i,
                x: e.x + Math.cos(ang) * 30,
                y: e.y + Math.sin(ang) * 30,
                hp: 15, maxHp: 15,
                speed: 1.5, type: 'bat', dmg: 10,
              }])
            }
          }
        }
        return next
      }))

      // Collision: projectiles vs enemies
      setProjectiles(prevPr => {
        const out: Projectile[] = []
        prevPr.forEach(pr => {
          if (pr.kind === 'whip') { out.push(pr); return }
          if (pr.damage <= 0) { out.push(pr); return }
          let consumed = false
          let hits = 0
          setEnemies(prevEn => prevEn.map(e => {
            if (pr.hitIds.has(e.id)) return e
            const hitR = e.type === 'boss' ? 25 : 14
            if (Math.hypot(e.x - pr.x, e.y - pr.y) < hitR) {
              pr.hitIds.add(e.id)
              hits++
              if (hits >= pr.pierce + 1 && pr.kind !== 'orbit') consumed = true
              const dmg = pr.damage
              // Fireball explodes - handled below
              if (pr.kind === 'fire') {
                // Damage all enemies in blast radius
                const blast = 60 * statsRef.current.areaMul
                enemiesRef.current.forEach(other => {
                  if (other.id === e.id) return
                  if (Math.hypot(other.x - pr.x, other.y - pr.y) < blast) {
                    setEnemies(ps => ps.map(en => en.id === other.id ? { ...en, hp: en.hp - pr.damage * 0.7 } : en))
                  }
                })
                addFloat(pr.x, pr.y, '💥', '#fb923c')
                consumed = true
              }
              // Damage number + hit flash
              addFloat(e.x + (Math.random() - 0.5) * 10, e.y - 12, `-${Math.floor(dmg)}`, '#fde047')
              return { ...e, hp: e.hp - dmg, hitFlash: 4 }
            }
            return e
          }))
          if (!consumed) out.push(pr)
        })
        return out
      })

      // Kill enemies with hp <= 0
      setEnemies(prev => {
        const keep: Enemy[] = []
        const drops: XpGem[] = []
        prev.forEach(e => {
          if (e.hp <= 0) {
            setKills(k => k + 1)
            setScore(s => s + (e.type === 'boss' ? 500 : e.type === 'wolf' ? 15 : e.type === 'skull' ? 8 : e.type === 'bat' ? 4 : 2))
            if (e.type === 'boss') {
              // Boss: big explosion of 10 gems scattered around
              screenShakeRef.current = Math.max(screenShakeRef.current, 20)
              for (let i = 0; i < 10; i++) {
                const ang = (i / 10) * Math.PI * 2
                drops.push({
                  id: Date.now() + Math.random() + i,
                  x: e.x + Math.cos(ang) * 30,
                  y: e.y + Math.sin(ang) * 30,
                  value: 10,
                })
              }
              addFloat(e.x, e.y - 40, 'BOSS 击败!', '#fde047')
            } else {
              drops.push({
                id: Date.now() + Math.random(),
                x: e.x, y: e.y,
                value: e.type === 'wolf' ? 5 : e.type === 'skull' ? 3 : e.type === 'bat' ? 2 : 1,
              })
            }
          } else {
            keep.push(e)
          }
        })
        if (drops.length > 0) setXpGems(prevG => [...prevG, ...drops])
        return keep
      })

      // Player takes damage from contact
      const currentPos = posRef.current
      const hitR = PLAYER_R + 12
      if (now - lastDamageRef.current > 500) {
        const hitting = enemiesRef.current.find(e => Math.hypot(e.x - currentPos.x, e.y - currentPos.y) < hitR)
        if (hitting) {
          lastDamageRef.current = now
          // Screen shake + player flash effects
          screenShakeRef.current = hitting.type === 'boss' ? 14 : 8
          playerFlashRef.current = 12
          setHp(h => {
            const nh = h - hitting.dmg
            if (nh <= 0) {
              setOver(true)
              if (score > highScore) {
                setHighScore(score)
                localStorage.setItem('grassCutterHighScore', score.toString())
              }
            }
            return Math.max(0, nh)
          })
          addFloat(currentPos.x, currentPos.y - 20, `-${hitting.dmg}`, '#f87171')
        }
      }

      // XP gems pull + collect
      setXpGems(prev => prev.map(g => {
        const d = Math.hypot(g.x - currentPos.x, g.y - currentPos.y)
        const range = statsRef.current.pickupRange
        if (d < range) {
          const pullSpeed = 3 + (range - d) * 0.08
          const dx = currentPos.x - g.x
          const dy = currentPos.y - g.y
          return { ...g, x: g.x + (dx / d) * pullSpeed, y: g.y + (dy / d) * pullSpeed }
        }
        return g
      }).filter(g => {
        if (Math.hypot(g.x - currentPos.x, g.y - currentPos.y) < PLAYER_R + 4) {
          setXp(x => {
            const nx = x + g.value
            if (nx >= xpToNext) {
              triggerLevelUp()
              return nx - xpToNext
            }
            return nx
          })
          return false
        }
        return true
      }))

      // Float texts fade
      setFloatTexts(prev => prev.map(ft => ({ ...ft, y: ft.y - 1, life: ft.life - 1 })).filter(ft => ft.life > 0))

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [started, over, victory, paused, showLevelUp, spawnEnemies, fireWeapons, triggerLevelUp, addFloat, xpToNext, score, highScore, highTime])

  // ── Render ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Reset transforms
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    // Screen shake: translate canvas randomly based on intensity
    const shake = screenShakeRef.current
    if (shake > 0) {
      const dx = (Math.random() - 0.5) * shake
      const dy = (Math.random() - 0.5) * shake
      ctx.translate(dx, dy)
      screenShakeRef.current = Math.max(0, shake - 1)
    }

    // Grass field background with tile pattern
    ctx.fillStyle = '#2d4a2b'
    ctx.fillRect(0, 0, W, H)
    // Checkerboard tiles
    ctx.fillStyle = '#355a32'
    const tile = 30
    for (let y = 0; y < H; y += tile) {
      for (let x = 0; x < W; x += tile) {
        if (((x / tile) + (y / tile)) % 2 === 0) ctx.fillRect(x, y, tile, tile)
      }
    }
    // Grass tufts
    ctx.fillStyle = '#5a8a3a'
    for (let i = 0; i < 30; i++) {
      const gx = (i * 47 + Math.floor(time / 50)) % W
      const gy = (i * 83) % H
      ctx.fillRect(gx, gy, 2, 4)
    }

    // Aura rings (if player has aura weapon)
    const auraW = weapons.find(w => w.kind === 'aura')
    if (auraW) {
      const radius = (50 * stats.areaMul) + auraW.level * 8
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = 'rgba(168, 85, 247, 0.08)'
      ctx.beginPath(); ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2); ctx.fill()
    }

    // XP gems
    xpGems.forEach(g => {
      ctx.fillStyle = '#60a5fa'
      ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.arc(g.x, g.y, 5, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#dbeafe'
      ctx.beginPath(); ctx.arc(g.x, g.y, 2, 0, Math.PI * 2); ctx.fill()
    })

    // Enemies
    enemies.forEach(e => {
      const emoji = e.type === 'boss' ? '👿' : e.type === 'wolf' ? '🐺' : e.type === 'skull' ? '💀' : e.type === 'bat' ? '🦇' : '🟢'
      const bossPulse = e.type === 'boss' ? 1 + Math.sin(time / 150) * 0.05 : 1
      const size = (e.type === 'boss' ? 52 : 22) * bossPulse
      // Boss aura
      if (e.type === 'boss') {
        const phase = e.phase || 1
        ctx.fillStyle = phase === 3 ? 'rgba(239, 68, 68, 0.3)' : phase === 2 ? 'rgba(249, 115, 22, 0.25)' : 'rgba(168, 85, 247, 0.2)'
        ctx.beginPath(); ctx.arc(e.x, e.y, 40 * bossPulse, 0, Math.PI * 2); ctx.fill()
      }
      ctx.font = `${size}px Arial`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      // Hit flash: draw white overlay
      if (e.hitFlash && e.hitFlash > 0) {
        ctx.save()
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillText(emoji, e.x, e.y)
        ctx.globalCompositeOperation = 'source-atop'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
        ctx.fillRect(e.x - 30, e.y - 30, 60, 60)
        ctx.restore()
      } else {
        ctx.fillText(emoji, e.x, e.y)
      }
      // HP bar
      if (e.hp < e.maxHp) {
        const bw = e.type === 'boss' ? 60 : 22
        const hpp = e.hp / e.maxHp
        ctx.fillStyle = '#00000088'
        ctx.fillRect(e.x - bw / 2 - 1, e.y - size / 2 - 6, bw + 2, 5)
        ctx.fillStyle = hpp > 0.5 ? '#4ade80' : hpp > 0.25 ? '#fbbf24' : '#ef4444'
        ctx.fillRect(e.x - bw / 2, e.y - size / 2 - 5, bw * hpp, 3)
      }
    })

    // Projectiles
    projectiles.forEach(pr => {
      if (pr.kind === 'knife') {
        ctx.save()
        ctx.translate(pr.x, pr.y); ctx.rotate(pr.angle || 0)
        ctx.font = '18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('🔪', 0, 0)
        ctx.restore()
      } else if (pr.kind === 'orbit') {
        ctx.fillStyle = '#e5e7eb'
        ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 7, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
      } else if (pr.kind === 'whip') {
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 10
        ctx.globalAlpha = pr.life / 10
        ctx.beginPath()
        const ang = pr.angle || 0
        const len = 70
        ctx.moveTo(pr.x - Math.cos(ang) * len / 2, pr.y - Math.sin(ang) * len / 2)
        ctx.lineTo(pr.x + Math.cos(ang) * len / 2, pr.y + Math.sin(ang) * len / 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      } else if (pr.kind === 'fire') {
        ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.shadowColor = '#fb923c'; ctx.shadowBlur = 12
        ctx.fillText('🔥', pr.x, pr.y)
        ctx.shadowBlur = 0
      }
    })

    // Player - with damage flash + danger ring when HP low
    const flash = playerFlashRef.current
    if (flash > 0) {
      ctx.fillStyle = `rgba(239, 68, 68, ${flash / 24})`
      ctx.beginPath(); ctx.arc(pos.x, pos.y, PLAYER_R + 8, 0, Math.PI * 2); ctx.fill()
      playerFlashRef.current = flash - 1
    }
    if (hp / stats.maxHp < 0.3) {
      // Pulsing red ring when HP < 30%
      const pulse = Math.sin(time / 100) * 0.3 + 0.5
      ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(pos.x, pos.y, PLAYER_R + 6, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.font = '26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('🧑‍🌾', pos.x, pos.y)

    // Pickup range indicator (subtle)
    if (stats.pickupRange > 50) {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.12)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(pos.x, pos.y, stats.pickupRange, 0, Math.PI * 2); ctx.stroke()
    }

    // Float texts
    floatTexts.forEach(ft => {
      ctx.globalAlpha = ft.life / 30
      ctx.fillStyle = ft.color
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(ft.text, ft.x, ft.y)
    })
    ctx.globalAlpha = 1
  }, [pos, enemies, projectiles, xpGems, floatTexts, stats, weapons, time, hp])

  const minutes = Math.floor(time / 60000)
  const seconds = Math.floor((time % 60000) / 1000)
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(180deg, #1a3a2e 0%, #0a1f14 100%)' }}>
      <div className="max-w-lg mx-auto">
        <BackButton className="bg-white/10 text-white hover:bg-white/20 border-white/20" />

        <div className="rounded-2xl p-4 md:p-6 shadow-2xl" style={{
          background: 'linear-gradient(180deg, rgba(30, 60, 40, 0.95) 0%, rgba(15, 30, 20, 0.95) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <h1 className="text-3xl md:text-4xl font-black text-center mb-1 tracking-wider"
            style={{ color: '#86efac', textShadow: '0 0 20px rgba(134, 239, 172, 0.5)', fontFamily: 'monospace' }}
          >
            🌾 割草大作战 🌾
          </h1>
          <p className="text-center text-green-300/70 text-xs mb-4 tracking-[0.3em] font-mono">SURVIVE 5 MINUTES</p>

          <div className="relative inline-block w-full">
            <canvas
              ref={canvasRef} width={W} height={H}
              className="w-full rounded-lg touch-none"
              style={{ border: '2px solid #3f6212', boxShadow: '0 0 30px rgba(134, 239, 172, 0.2)' }}
              onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
            />

            {/* Start overlay */}
            {!started && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm p-4">
                <div className="text-7xl mb-4 animate-bounce">🧑‍🌾</div>
                <h2 className="text-3xl font-black text-green-300 mb-2 tracking-widest" style={{ textShadow: '0 0 20px #86efac' }}>割草大作战</h2>
                <p className="text-green-200/70 text-sm mb-1">最高分: <span className="font-bold text-yellow-200">{highScore}</span></p>
                <p className="text-green-200/70 text-xs mb-6">最长存活: <span className="font-bold text-yellow-200">
                  {Math.floor(highTime / 60000)}:{String(Math.floor((highTime % 60000) / 1000)).padStart(2, '0')}
                </span></p>
                <button onClick={startGame}
                  className="px-8 py-3 bg-gradient-to-b from-green-400 to-emerald-600 text-black font-black rounded-lg shadow-lg shadow-green-500/40 active:scale-95 transition-all text-lg tracking-wider"
                >▶ 开始战斗</button>
                <div className="mt-6 text-gray-400 text-xs font-mono space-y-1 text-center max-w-xs">
                  <p>WASD / 方向键 移动</p>
                  <p>自动攻击，升级时三选一</p>
                  <p>生存 5 分钟即可获胜</p>
                </div>
              </div>
            )}

            {/* Pause menu with stats */}
            {paused && started && !over && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm p-4 overflow-y-auto">
                <div className="text-4xl mb-2">⏸</div>
                <h2 className="text-xl font-black text-green-300 mb-4 tracking-widest">暂停</h2>

                {/* Current stats */}
                <div className="w-full max-w-xs bg-green-900/40 border border-green-500/30 rounded-xl p-3 mb-3">
                  <div className="text-green-400/70 text-[10px] tracking-wider mb-2 font-mono">角色状态</div>
                  <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                    <span className="text-gray-400">时间</span><span className="text-yellow-300 text-right">{timeStr}</span>
                    <span className="text-gray-400">等级</span><span className="text-cyan-300 text-right">Lv.{level}</span>
                    <span className="text-gray-400">击杀</span><span className="text-green-300 text-right">{kills}</span>
                    <span className="text-gray-400">分数</span><span className="text-yellow-300 text-right">{score}</span>
                    <span className="text-gray-400">最大生命</span><span className="text-red-300 text-right">{stats.maxHp}</span>
                    <span className="text-gray-400">移动速度</span><span className="text-blue-300 text-right">{stats.speed.toFixed(2)}</span>
                    <span className="text-gray-400">伤害倍率</span><span className="text-orange-300 text-right">×{stats.damageMul.toFixed(2)}</span>
                    <span className="text-gray-400">冷却倍率</span><span className="text-purple-300 text-right">×{stats.cdrMul.toFixed(2)}</span>
                    <span className="text-gray-400">范围倍率</span><span className="text-pink-300 text-right">×{stats.areaMul.toFixed(2)}</span>
                    <span className="text-gray-400">拾取范围</span><span className="text-cyan-300 text-right">{stats.pickupRange}</span>
                  </div>
                </div>

                {/* Weapons list */}
                <div className="w-full max-w-xs bg-green-900/40 border border-green-500/30 rounded-xl p-3 mb-4">
                  <div className="text-green-400/70 text-[10px] tracking-wider mb-2 font-mono">装备 ({weapons.length}/4)</div>
                  <div className="space-y-1">
                    {weapons.map(w => (
                      <div key={w.kind} className="flex items-center justify-between text-xs bg-black/30 rounded px-2 py-1">
                        <span className="flex items-center gap-1.5">
                          <span>{WEAPON_INFO[w.kind].emoji}</span>
                          <span className="text-white/90">{WEAPON_INFO[w.kind].name}</span>
                        </span>
                        <span className="text-yellow-300 font-bold">Lv.{w.level}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setPaused(false)} className="px-6 py-2 bg-gradient-to-b from-green-400 to-emerald-600 text-black rounded-lg font-black active:scale-95">▶ 继续</button>
                  <button onClick={() => { setPaused(false); setOver(true) }} className="px-6 py-2 bg-red-500/30 text-red-200 border border-red-500/40 rounded-lg font-bold active:scale-95">放弃</button>
                </div>
              </div>
            )}

            {/* Level up */}
            {showLevelUp && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center rounded-lg p-3 backdrop-blur-sm">
                <div className="text-3xl mb-2">✨</div>
                <h2 className="text-xl font-black text-yellow-300 mb-3">LEVEL UP! 选择强化</h2>
                <div className="space-y-2 w-full max-w-xs">
                  {upgradeOptions.map((opt, idx) => (
                    <button key={idx} onClick={() => pickUpgrade(opt)}
                      className="w-full text-left p-3 rounded-lg bg-gradient-to-r from-green-900/80 to-green-800/80 border border-green-400/30 hover:from-green-800 hover:to-green-700 active:scale-[0.98] transition-all"
                    >
                      {opt.kind === 'weapon' ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{WEAPON_INFO[opt.weapon].emoji}</span>
                            <div className="flex-1">
                              <div className="font-bold text-yellow-200">
                                {opt.isNew ? '新武器: ' : ''}
                                {WEAPON_INFO[opt.weapon].name}
                                {!opt.isNew && ` → Lv.${opt.newLevel}`}
                              </div>
                              <div className="text-xs text-green-200/70">{WEAPON_INFO[opt.weapon].desc}</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">💪</span>
                            <div className="flex-1">
                              <div className="font-bold text-cyan-200">{opt.desc}</div>
                              <div className="text-xs text-green-200/70">被动强化</div>
                            </div>
                          </div>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Game over */}
            {over && !showLevelUp && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center rounded-lg p-4 backdrop-blur-sm">
                <div className="text-5xl mb-2">{victory ? '🏆' : '💀'}</div>
                <h2 className={`text-2xl font-black mb-4 tracking-widest ${victory ? 'text-yellow-300' : 'text-red-400'}`}
                  style={{ textShadow: victory ? '0 0 15px #fde047' : '0 0 15px #ef4444' }}
                >
                  {victory ? 'VICTORY!' : 'GAME OVER'}
                </h2>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-5 font-mono">
                  <p className="text-yellow-300">分数: <span className="font-bold">{score}</span></p>
                  <p className="text-green-300">时间: <span className="font-bold">{timeStr}</span></p>
                  <p className="text-cyan-300">击杀: <span className="font-bold">{kills}</span></p>
                  <p className="text-purple-300">等级: <span className="font-bold">{level}</span></p>
                </div>
                <button onClick={startGame}
                  className="px-6 py-2 bg-gradient-to-b from-green-400 to-emerald-600 text-black rounded-lg font-bold active:scale-95"
                >再来一局</button>
              </div>
            )}
          </div>

          {/* HUD */}
          {started && !over && (
            <>
              <div className="mt-3 grid grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-black/40 border border-red-500/30 rounded p-2">
                  <div className="text-red-400/70 text-[10px]">HP</div>
                  <div className="font-bold text-red-300">{Math.floor(hp)}/{stats.maxHp}</div>
                  <div className="w-full bg-red-900/50 rounded h-1 mt-1">
                    <div className="bg-red-500 h-1 rounded transition-all" style={{ width: `${(hp / stats.maxHp) * 100}%` }} />
                  </div>
                </div>
                <div className="bg-black/40 border border-yellow-500/30 rounded p-2">
                  <div className="text-yellow-400/70 text-[10px]">TIME</div>
                  <div className="font-bold text-yellow-300">{timeStr}</div>
                </div>
                <div className="bg-black/40 border border-blue-500/30 rounded p-2">
                  <div className="text-blue-400/70 text-[10px]">LV.{level}</div>
                  <div className="font-bold text-blue-300">{xp}/{xpToNext}</div>
                  <div className="w-full bg-blue-900/50 rounded h-1 mt-1">
                    <div className="bg-blue-500 h-1 rounded transition-all" style={{ width: `${(xp / xpToNext) * 100}%` }} />
                  </div>
                </div>
                <div className="bg-black/40 border border-green-500/30 rounded p-2">
                  <div className="text-green-400/70 text-[10px]">KILLS</div>
                  <div className="font-bold text-green-300">{kills}</div>
                </div>
              </div>

              {/* Weapons + pause button */}
              <div className="mt-2 flex flex-wrap justify-center items-center gap-1 text-xs font-mono">
                {weapons.map(w => (
                  <span key={w.kind} className="bg-white/10 px-2 py-1 rounded border border-white/10 text-white">
                    {WEAPON_INFO[w.kind].emoji} {WEAPON_INFO[w.kind].name} Lv.{w.level}
                  </span>
                ))}
                <button onClick={() => setPaused(true)}
                  className="bg-white/10 px-2 py-1 rounded border border-white/10 text-white hover:bg-white/20 active:scale-95"
                  title="暂停 (ESC)"
                >⏸ 暂停</button>
              </div>
            </>
          )}

          {/* Info */}
          <div className="mt-4 text-xs text-gray-400 space-y-1 font-mono">
            <p className="text-green-300 font-bold">玩法：</p>
            <p>自动攻击，移动躲避敌人。吸收蓝色经验球升级，三选一强化武器或属性。</p>
            <p>每 1 分钟降临 Boss（多阶段，低血量会召唤小怪）。存活 5 分钟即可胜利！</p>
            <p className="text-green-400/60">ESC 暂停 · HP 低于 30% 会出现红色警告环</p>
          </div>
        </div>
      </div>
    </div>
  )
}
