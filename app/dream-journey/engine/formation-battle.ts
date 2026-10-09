import type { BattleState, HeroStats, PartnerId, PartnerRosterState, SkillState } from '../types'

export type { PartnerId } from '../types'
export type FormationSide = 'ally' | 'enemy'
export type FormationRole = 'hero' | 'striker' | 'healer' | 'mage' | 'breaker' | 'pet' | 'boss' | 'guard'
export type FormationPose = 'idle' | 'windup' | 'hit' | 'down'
type PartnerQuadrant = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface PartnerDefinition {
  id: PartnerId
  name: string
  title: string
  skill: string
  description: string
  role: FormationRole
  quadrant: PartnerQuadrant
  color: string
}

export interface FormationUnit {
  id: string
  name: string
  side: FormationSide
  role: FormationRole
  slot: number
  hp: number
  maxHp: number
  attack: number
  speed: number
  model: string
  partnerId?: PartnerId
  summoned?: boolean
  level?: number
  stars?: number
  shield: number
}

export interface FormationEvent {
  actorId: string | null
  targetIds: string[]
  skillName: string
  message: string
  kind: 'damage' | 'heal' | 'phase'
  amounts: Record<string, number>
  critical?: boolean
  effect?: 'slash' | 'lotus' | 'thunder' | 'dragon' | 'moon' | 'shield' | 'combo'
}

export interface FormationBattleState {
  units: FormationUnit[]
  round: number
  cursor: number
  actionNumber: number
  bossPhase: 1 | 2
  outcome: 'victory' | 'defeat' | null
  log: string[]
}

export interface FormationBattleResult {
  outcome: 'victory' | 'defeat'
  heroHp: number
  lineup: PartnerId[]
}

export const PARTNERS: Record<PartnerId, PartnerDefinition> = {
  'jade-sword': {
    id: 'jade-sword',
    name: '青衡剑君',
    title: '破阵先锋',
    skill: '青霄破阵',
    description: '优先击破护卫；护卫全部倒下后猛攻首领。',
    role: 'breaker',
    quadrant: 'top-left',
    color: 'from-emerald-500 to-teal-700',
  },
  'moon-lotus': {
    id: 'moon-lotus',
    name: '月莲仙子',
    title: '群体治疗',
    skill: '月华莲灯',
    description: '队友气血不足时治疗最低气血目标。',
    role: 'healer',
    quadrant: 'top-right',
    color: 'from-indigo-400 to-violet-700',
  },
  'thunder-seal': {
    id: 'thunder-seal',
    name: '赤符灵童',
    title: '群体法术',
    skill: '九霄雷符',
    description: '偶数回合攻击所有敌人，适合清理召唤物。',
    role: 'mage',
    quadrant: 'bottom-left',
    color: 'from-amber-400 to-orange-700',
  },
  'azure-dragon': {
    id: 'azure-dragon',
    name: '沧溟龙姬',
    title: '单体爆发',
    skill: '苍龙逐月',
    description: '对当前气血最高的敌人发动强力追击。',
    role: 'striker',
    quadrant: 'bottom-right',
    color: 'from-sky-400 to-blue-800',
  },
}

export const DEFAULT_LINEUP: PartnerId[] = ['jade-sword', 'moon-lotus', 'thunder-seal']

function enemyTarget(units: FormationUnit[]) {
  const enemies = units.filter((unit) => unit.side === 'enemy' && unit.hp > 0)
  const guards = enemies.filter((unit) => unit.role === 'guard')
  return guards[0] ?? enemies[0]
}

function lowestAlly(units: FormationUnit[]) {
  return units
    .filter((unit) => unit.side === 'ally' && unit.hp > 0)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]
}

function applyDamage(units: FormationUnit[], targetIds: string[], damageFor: (target: FormationUnit) => number) {
  const amounts: Record<string, number> = {}
  const nextUnits = units.map((unit) => {
    if (!targetIds.includes(unit.id) || unit.hp <= 0) return unit
    const incoming = Math.max(1, Math.round(damageFor(unit)))
    const absorbed = Math.min(unit.shield, incoming)
    const damage = Math.min(unit.hp, incoming - absorbed)
    amounts[unit.id] = damage
    return { ...unit, hp: unit.hp - damage, shield: unit.shield - absorbed }
  })
  return { units: nextUnits, amounts }
}

function actionOrder(units: FormationUnit[]) {
  return [...units]
    .sort((a, b) => b.speed - a.speed)
    .map((unit) => unit.id)
}

export function createFormationBattle(battle: BattleState, stats: HeroStats, skills: SkillState, lineup: PartnerId[], roster: PartnerRosterState): FormationBattleState {
  const level = stats.level
  const allies: FormationUnit[] = [
    { id: 'hero', name: '逍遥少侠', side: 'ally', role: 'hero', slot: 0, hp: stats.hp, maxHp: stats.maxHp, attack: stats.attack + 22 + skills.attackLevel * 3, speed: 102, model: 'hero', shield: 0 },
    ...lineup.map((partnerId, index) => {
      const partner = PARTNERS[partnerId]
      const progress = roster[partnerId]
      const power = progress.level * 4 + progress.stars * 10
      return {
        id: partnerId,
        name: partner.name,
        side: 'ally' as const,
        role: partner.role,
        slot: index + 1,
        hp: 92 + level * 15 + power * 2,
        maxHp: 92 + level * 15 + power * 2,
        attack: 20 + level * 5 + power + (partner.role === 'striker' ? 8 : 0),
        speed: 96 - index * 4 + progress.stars * 2,
        model: partnerId,
        partnerId,
        level: progress.level,
        stars: progress.stars,
        shield: 0,
      }
    }),
    { id: 'pet', name: battle.companion.name, side: 'ally', role: 'pet', slot: 4, hp: 70 + level * 12, maxHp: 70 + level * 12, attack: battle.companion.attack + 12, speed: 72, model: battle.companion.model, shield: 0 },
  ]
  const legacyEnemies = [battle.enemy, ...battle.reinforcements]
  const enemies: FormationUnit[] = legacyEnemies.map((enemy, index) => ({
    id: index === 0 ? 'enemy-main' : `enemy-${index}`,
    name: enemy.name,
    side: 'enemy',
    role: index === 0 && enemy.kind === 'boss' ? 'boss' : index > 0 ? 'guard' : 'striker',
    slot: index,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    attack: enemy.attack,
    speed: 82 - index * 3,
    model: enemy.name,
    shield: 0,
  }))
  return {
    units: [...allies, ...enemies],
    round: 1,
    cursor: 0,
    actionNumber: 0,
    bossPhase: 1,
    outcome: null,
    log: [`第 1 回合开始：${allies.length} 人阵容迎战 ${enemies.length} 名敌人。`],
  }
}

function phaseTransition(state: FormationBattleState): { state: FormationBattleState; event: FormationEvent } | null {
  const boss = state.units.find((unit) => unit.role === 'boss' && unit.hp > 0)
  if (!boss || state.bossPhase === 2 || boss.hp > boss.maxHp / 2) return null
  const guardHp = Math.round(boss.maxHp * 0.36)
  const guards: FormationUnit[] = [0, 1].map((index) => ({
    id: `summoned-guard-${index}`,
    name: index === 0 ? '月轮护卫' : '星灯护卫',
    side: 'enemy',
    role: 'guard',
    slot: Math.min(5, 3 + index),
    hp: guardHp,
    maxHp: guardHp,
    attack: Math.max(10, Math.round(boss.attack * 0.55)),
    speed: 120 - index * 4,
    model: index === 0 ? '镜魇' : '星灯侍灵',
    summoned: true,
    shield: 0,
  }))
  const event: FormationEvent = {
    actorId: boss.id,
    targetIds: guards.map((guard) => guard.id),
    skillName: '第二阶段 · 月轮再临',
    message: `${boss.name}进入第二阶段，召唤月轮护卫与星灯护卫！必须先破除护卫。`,
    kind: 'phase',
    amounts: {},
  }
  return {
    state: { ...state, units: [...state.units, ...guards], bossPhase: 2, log: [event.message, ...state.log].slice(0, 8) },
    event,
  }
}

export function advanceFormationBattle(state: FormationBattleState): { state: FormationBattleState; event: FormationEvent } {
  const transition = phaseTransition(state)
  if (transition) return transition

  const order = actionOrder(state.units)
  let cursor = state.cursor
  let actor = state.units.find((unit) => unit.id === order[cursor] && unit.hp > 0)
  let scanned = 0
  while (!actor && scanned < order.length) {
    cursor = (cursor + 1) % order.length
    actor = state.units.find((unit) => unit.id === order[cursor] && unit.hp > 0)
    scanned += 1
  }
  if (!actor) {
    const event: FormationEvent = { actorId: null, targetIds: [], skillName: '战斗结束', message: '双方已经无法继续战斗。', kind: 'phase', amounts: {} }
    return { state: { ...state, outcome: 'defeat' }, event }
  }

  let units = state.units
  let event: FormationEvent
  if (actor.side === 'ally') {
    const target = enemyTarget(units)
    const wounded = lowestAlly(units)
    if (actor.role === 'healer' && wounded && wounded.hp / wounded.maxHp < 0.76) {
      const healed = Math.min(wounded.maxHp - wounded.hp, Math.round(actor.attack * 1.35))
      units = units.map((unit) => unit.id === wounded.id ? { ...unit, hp: unit.hp + healed } : unit)
      const groupHeal = state.bossPhase === 2 && state.round % 3 === 0
      const targets = groupHeal ? units.filter((unit) => unit.side === 'ally' && unit.hp > 0) : [wounded]
      const amounts: Record<string, number> = {}
      units = units.map((unit) => {
        if (!targets.some((target) => target.id === unit.id)) return unit
        const amount = Math.min(unit.maxHp - unit.hp, Math.round(actor.attack * (groupHeal ? 0.82 : 1.35)))
        amounts[unit.id] = amount
        return { ...unit, hp: unit.hp + amount }
      })
      event = { actorId: actor.id, targetIds: targets.map((target) => target.id), skillName: groupHeal ? '月华净世' : PARTNERS['moon-lotus'].skill, message: `${actor.name}施展${groupHeal ? '月华净世' : '月华莲灯'}，恢复 ${Object.values(amounts).reduce((sum, amount) => sum + amount, 0)} 点气血。`, kind: 'heal', amounts, effect: 'lotus' }
    } else if (target) {
      const livingEnemies = units.filter((unit) => unit.side === 'enemy' && unit.hp > 0)
      const aoe = actor.role === 'mage' && state.round % 2 === 0
      const targetIds = aoe ? livingEnemies.map((unit) => unit.id) : [target.id]
      const critical = (state.actionNumber + actor.speed) % 5 === 0
      const combo = actor.role === 'hero' && units.some((unit) => unit.partnerId === 'azure-dragon' && unit.hp > 0) && state.round % 3 === 0
      const multiplier = actor.role === 'striker' ? 1.55 : actor.role === 'breaker' ? 1.32 : actor.role === 'hero' ? 1.38 : actor.role === 'pet' ? 0.95 : 1.08
      const guardsAlive = units.some((unit) => unit.side === 'enemy' && unit.role === 'guard' && unit.hp > 0)
      const applied = applyDamage(units, targetIds, (unit) => actor.attack * multiplier * (combo ? 1.45 : 1) * (aoe ? 0.78 : 1) * (critical ? 1.6 : 1) * (actor.role === 'breaker' && unit.role === 'guard' ? 1.45 : 1) * (unit.role === 'boss' && guardsAlive ? 0.38 : 1))
      units = applied.units
      const skillName = actor.role === 'hero'
        ? combo ? '苍龙合击 · 破军逐月' : '破军连斩'
        : actor.role === 'pet'
          ? '灵泡追击'
          : actor.role === 'healer' ? '莲光弹' : actor.partnerId ? PARTNERS[actor.partnerId].skill : '协同攻击'
      const total = Object.values(applied.amounts).reduce((sum, amount) => sum + amount, 0)
      const effect = combo ? 'combo' : actor.role === 'mage' ? 'thunder' : actor.role === 'striker' ? 'dragon' : actor.role === 'healer' ? 'lotus' : 'slash'
      event = { actorId: actor.id, targetIds, skillName, message: `${actor.name}施展${skillName}，对 ${targetIds.length} 个目标造成 ${total} 点伤害${critical ? '（暴击）' : ''}${guardsAlive && target.role === 'boss' ? '，护卫使首领大幅减伤' : ''}。`, kind: 'damage', amounts: applied.amounts, critical, effect }
    } else {
      event = { actorId: actor.id, targetIds: [], skillName: '胜负已分', message: '敌方阵容已经瓦解。', kind: 'phase', amounts: {} }
    }
  } else {
    const allies = units.filter((unit) => unit.side === 'ally' && unit.hp > 0)
    const boss = units.find((unit) => unit.role === 'boss' && unit.hp > 0)
    if (actor.name === '星灯护卫' && boss) {
      const healed = Math.min(boss.maxHp - boss.hp, Math.round(boss.maxHp * 0.08))
      units = units.map((unit) => unit.id === boss.id ? { ...unit, hp: unit.hp + healed } : unit)
      event = { actorId: actor.id, targetIds: [boss.id], skillName: '星灯回春', message: `星灯护卫为${boss.name}恢复 ${healed} 点气血。`, kind: 'heal', amounts: { [boss.id]: healed }, effect: 'lotus' }
    } else if (actor.name === '月轮护卫' && boss) {
      const shield = Math.round(boss.maxHp * 0.1)
      units = units.map((unit) => unit.id === boss.id ? { ...unit, shield: unit.shield + shield } : unit)
      event = { actorId: actor.id, targetIds: [boss.id], skillName: '月轮守护', message: `月轮护卫为${boss.name}附加 ${shield} 点护盾。`, kind: 'phase', amounts: { [boss.id]: shield }, effect: 'shield' }
    } else {
    const target = allies[(state.actionNumber + actor.slot) % Math.max(1, allies.length)]
    const aoe = actor.role === 'boss' && state.round % 3 === 0
    const targetIds = aoe ? allies.map((unit) => unit.id) : target ? [target.id] : []
    const enraged = actor.role === 'boss' && state.bossPhase === 2
    const applied = applyDamage(units, targetIds, () => actor.attack * (aoe ? 0.82 : 1) * (enraged ? 1.28 : 1))
    units = applied.units
    const skillName = actor.role === 'boss' ? (aoe ? '月蚀天幕' : enraged ? '蚀月追魂' : '妖王震击') : '护卫突袭'
    const total = Object.values(applied.amounts).reduce((sum, amount) => sum + amount, 0)
    event = { actorId: actor.id, targetIds, skillName, message: `${actor.name}施展${skillName}，造成 ${total} 点伤害。`, kind: 'damage', amounts: applied.amounts, effect: actor.role === 'boss' ? 'moon' : 'slash' }
    }
  }

  if (state.bossPhase === 1) {
    units = units.map((unit) => unit.role === 'boss' && unit.hp <= unit.maxHp / 2
      ? { ...unit, hp: Math.max(1, unit.hp) }
      : unit)
  }
  const alliesAlive = units.some((unit) => unit.side === 'ally' && unit.hp > 0)
  const enemiesAlive = units.some((unit) => unit.side === 'enemy' && unit.hp > 0)
  const nextCursor = (cursor + 1) % order.length
  const nextRound = nextCursor === 0 ? state.round + 1 : state.round
  const outcome = !enemiesAlive ? 'victory' : !alliesAlive ? 'defeat' : null
  const nextState: FormationBattleState = {
    ...state,
    units,
    round: nextRound,
    cursor: nextCursor,
    actionNumber: state.actionNumber + 1,
    outcome,
    log: [event.message, ...(nextRound > state.round ? [`第 ${nextRound} 回合开始。`] : []), ...state.log].slice(0, 8),
  }
  return { state: nextState, event }
}

export function finishFormationBattle(state: FormationBattleState) {
  let next = state
  let guard = 0
  while (!next.outcome && guard < 240) {
    next = advanceFormationBattle(next).state
    guard += 1
  }
  if (!next.outcome) {
    const allyHp = next.units.filter((unit) => unit.side === 'ally').reduce((sum, unit) => sum + unit.hp, 0)
    const enemyHp = next.units.filter((unit) => unit.side === 'enemy').reduce((sum, unit) => sum + unit.hp, 0)
    next = { ...next, outcome: allyHp >= enemyHp ? 'victory' : 'defeat' }
  }
  return next
}

export function formationResult(state: FormationBattleState): FormationBattleResult | null {
  if (!state.outcome) return null
  const hero = state.units.find((unit) => unit.id === 'hero')
  return { outcome: state.outcome, heroHp: Math.max(1, hero?.hp ?? 1), lineup: state.units.filter((unit): unit is FormationUnit & { partnerId: PartnerId } => Boolean(unit.partnerId)).map((unit) => unit.partnerId) }
}
