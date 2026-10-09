import type { BattleAction, BattleState, Enemy, EnemyIntent, HeroStats, PetState, SkillState } from '../types'
import { INITIAL_PET, petAttack } from './pet'
import { INITIAL_SKILLS, skillBonuses } from './skills'

const ENEMIES: Omit<Enemy, 'hp' | 'maxHp'>[] = [
  { kind: 'mob', name: '泡泡精', icon: '🫧', attack: 8, exp: 18, gold: 12 },
  { kind: 'mob', name: '花妖', icon: '🌺', attack: 10, exp: 22, gold: 15 },
  { kind: 'mob', name: '巡山小妖', icon: '👹', attack: 12, exp: 28, gold: 20 },
  { kind: 'mob', name: '青竹灵', icon: '🎋', attack: 11, exp: 25, gold: 18 },
  { kind: 'mob', name: '月影狐', icon: '🌙', attack: 13, exp: 31, gold: 22 },
  { kind: 'mob', name: '石甲卫', icon: '🪨', attack: 14, exp: 34, gold: 25 },
  { kind: 'mob', name: '沧澜羽蛇', icon: '🐉', attack: 15, exp: 38, gold: 28 },
]

const BOSS: Omit<Enemy, 'hp' | 'maxHp'> = {
  kind: 'boss',
  name: '赤焰妖王',
  icon: '👺',
  attack: 16,
  exp: 90,
  gold: 68,
}

const MOON_BOSS: Omit<Enemy, 'hp' | 'maxHp'> = {
  kind: 'boss',
  name: '月蚀妖狐',
  icon: '🌘',
  attack: 19,
  exp: 145,
  gold: 108,
}

const MOON_GUARDS: Omit<Enemy, 'hp' | 'maxHp'>[] = [
  { kind: 'mob', name: '星灯侍灵', icon: '🏮', attack: 13, exp: 0, gold: 0 },
  { kind: 'mob', name: '镜魇', icon: '🪞', attack: 15, exp: 0, gold: 0 },
]

export const ENEMY_TRAITS: Record<string, { name: string; description: string }> = {
  青竹灵: { name: '竹影迅袭', description: '身法迅捷，反击伤害略高。' },
  月影狐: { name: '噬月妖术', description: '反击时会额外削减法力。' },
  石甲卫: { name: '玄岩重甲', description: '普通攻击伤害降低，法术伤害不受影响。' },
  沧澜羽蛇: { name: '穿云毒息', description: '攻击会穿透一部分防御。' },
  赤焰妖王: { name: '妖焰轮转', description: '每回合更换技能意图，半血后进入狂暴。' },
  月蚀妖狐: { name: '月蚀轮转', description: '会交替施放摄魂与月焰重击，半血后进入月蚀狂暴。' },
  星灯侍灵: { name: '星灯护月', description: '与首领共同反击，应优先削减敌方数量。' },
  镜魇: { name: '镜影噬心', description: '攻击较高，建议尽早集中击破。' },
}

export function enemyTrait(name: string) {
  return ENEMY_TRAITS[name] ?? { name: '寻常妖物', description: '没有额外战斗特性。' }
}

export const INITIAL_STATS: HeroStats = {
  level: 1,
  hp: 100,
  maxHp: 100,
  mp: 45,
  maxMp: 45,
  exp: 0,
  gold: 36,
  potions: 3,
  questProgress: 0,
  patrolWins: 0,
  eliteWins: 0,
  attack: 6,
  defense: 2,
  crit: 5,
}

export function createBattle(level: number, kind: Enemy['kind'] = 'mob', pet: PetState = INITIAL_PET, elite = false, bossVariant: 'crimson' | 'moon' = 'crimson'): BattleState {
  const moonBoss = kind === 'boss' && bossVariant === 'moon'
  const template = kind === 'boss' ? (moonBoss ? MOON_BOSS : BOSS) : ENEMIES[Math.floor(Math.random() * ENEMIES.length)]
  const reinforcementCount = kind === 'boss' || elite ? 2 : level >= 4 && Math.random() < 0.3 ? 2 : level >= 2 && Math.random() < 0.55 ? 1 : 0
  const reinforcementTemplates = kind === 'boss'
    ? moonBoss ? MOON_GUARDS : [ENEMIES[2], ENEMIES[1]]
    : [...ENEMIES]
        .filter((enemy) => enemy.name !== template.name)
        .sort(() => Math.random() - 0.5)
        .slice(0, reinforcementCount)
  const reinforcements = reinforcementTemplates.map((unit, index) => {
    const unitHp = (kind === 'boss' ? 42 : elite ? 38 : 30)
      + level * (kind === 'boss' ? 10 : elite ? 9 : 8)
      + level * level
      + index * 5
    return {
      ...unit,
      hp: unitHp,
      maxHp: unitHp,
      attack: Math.max(4, unit.attack - 5 + level + (elite ? 2 : 0)),
      exp: 0,
      gold: 0,
    }
  })
  const groupExp = reinforcementTemplates.reduce((total, unit) => total + Math.round(unit.exp * 0.45), 0)
  const groupGold = reinforcementTemplates.reduce((total, unit) => total + Math.round(unit.gold * 0.45), 0)
  const baseMaxHp = kind === 'boss'
    ? (moonBoss ? 190 + level * 28 : 145 + level * 24)
    : 52 + level * 14 + Math.round(level * level * 1.5) + Math.floor(Math.random() * 12)
  const maxHp = elite ? Math.round(baseMaxHp * 1.55) : baseMaxHp
  const rewardMultiplier = elite ? 1.75 : 1

  return {
    enemy: {
      ...template,
      hp: maxHp,
      maxHp,
      attack: template.attack + level * (kind === 'boss' ? 3 : 2) + (elite ? 4 : 0),
      exp: Math.round((template.exp + groupExp) * rewardMultiplier),
      gold: Math.round((template.gold + groupGold) * rewardMultiplier),
    },
    reinforcements,
    arena: moonBoss ? 'moon' : kind === 'boss' ? 'city' : 'bamboo',
    elite,
    companion: { name: '泡泡灵宠', model: '泡泡精', attack: petAttack(pet) },
    lastCompanionAttack: null,
    log: [kind === 'boss'
      ? moonBoss
        ? '月轮被阴影吞没，月蚀妖狐与两名侍从降临秘境！'
        : `妖气冲天，${template.name}率领两名护卫降临！点击敌人可切换目标。`
      : elite
        ? `悬赏妖气爆发，精英${template.name}率领护卫现身！`
        : `野外突然跳出一只${template.name}！`],
    guarding: false,
    turn: 1,
    intent: 'strike',
    enraged: false,
    cooldowns: { sweep: 0, heal: 0 },
    heroShield: 0,
    enemyEffects: Array.from({ length: 1 + reinforcements.length }, () => ({ armorBreak: 0 })),
  }
}

export const INTENT_LABELS: Record<EnemyIntent, { name: string; description: string; icon: string }> = {
  strike: { name: '妖爪突袭', description: '普通单体攻击', icon: '⚔️' },
  inferno: { name: '焚天重击', description: '高额伤害，建议防御', icon: '🔥' },
  roar: { name: '摄魂咆哮', description: '造成伤害并削减法力', icon: '🌋' },
}

const ENEMY_INTENT_LABELS: Partial<Record<string, Partial<Record<EnemyIntent, { name: string; description: string; icon: string }>>>> = {
  泡泡精: { roar: { name: '灵泡震荡', description: '震散法力，技能施放会受到影响', icon: '🫧' } },
  花妖: { roar: { name: '迷魂花粉', description: '造成伤害并削减法力', icon: '🌺' } },
  巡山小妖: { inferno: { name: '开山重斩', description: '高额伤害，防御可以显著减伤', icon: '🪓' } },
  青竹灵: { inferno: { name: '竹影连刺', description: '迅捷重击，建议提前防御', icon: '🎋' } },
  月影狐: { roar: { name: '噬月妖术', description: '造成伤害并大量削减法力', icon: '🌙' } },
  石甲卫: { inferno: { name: '玄岩震地', description: '蓄力砸击，建议提前防御', icon: '🪨' } },
  沧澜羽蛇: { roar: { name: '穿云毒息', description: '无视防御并削减法力', icon: '🐉' } },
  月蚀妖狐: {
    inferno: { name: '月焰坠落', description: '高额月焰伤害，建议防御', icon: '🌘' },
    roar: { name: '月蚀摄魂', description: '造成伤害并削减法力', icon: '🌑' },
  },
}

export function enemyIntentLabel(enemyName: string, intent: EnemyIntent) {
  return ENEMY_INTENT_LABELS[enemyName]?.[intent] ?? INTENT_LABELS[intent]
}

function nextIntent(enemy: Enemy, turn: number, enraged: boolean): EnemyIntent {
  if (enemy.kind === 'boss') {
    if (enraged && turn % 2 === 0) return 'inferno'
    if (turn % 3 === 0) return 'inferno'
    if (turn % 2 === 0) return 'roar'
    return 'strike'
  }
  if (['巡山小妖', '青竹灵', '石甲卫'].includes(enemy.name) && turn % 3 === 0) return 'inferno'
  if (['泡泡精', '花妖'].includes(enemy.name) && turn % 3 === 0) return 'roar'
  if (['月影狐', '沧澜羽蛇'].includes(enemy.name) && turn % 2 === 0) return 'roar'
  return 'strike'
}

function levelUp(stats: HeroStats) {
  let next = { ...stats }
  while (next.exp >= next.level * 60) {
    const needed = next.level * 60
    const maxHp = next.maxHp + 18
    const maxMp = next.maxMp + 8
    next = {
      ...next,
      level: next.level + 1,
      exp: next.exp - needed,
      maxHp,
      hp: maxHp,
      maxMp,
      mp: maxMp,
    }
  }
  return next
}

export function settleBattleStats(stats: HeroStats, battle: BattleState, result: 'victory' | 'defeat', heroHp: number) {
  if (result === 'victory') {
    return levelUp({
      ...stats,
      hp: Math.max(1, Math.min(stats.maxHp, heroHp)),
      exp: stats.exp + battle.enemy.exp,
      gold: stats.gold + battle.enemy.gold,
    })
  }
  return { ...stats, hp: stats.maxHp, mp: stats.maxMp, gold: Math.max(0, stats.gold - 10) }
}

export function resolveRound(
  stats: HeroStats,
  battle: BattleState,
  action: BattleAction,
  bonuses = { attack: 0, defense: 0, crit: 0 },
  targetIndex = 0,
  skills: SkillState = INITIAL_SKILLS,
): { stats: HeroStats; battle: BattleState | null; result?: 'victory' | 'defeat' } {
  let nextStats = { ...stats }
  const enemy = { ...battle.enemy }
  const reinforcements = battle.reinforcements.map((unit) => ({ ...unit }))
  const enemies = [enemy, ...reinforcements]
  const companion = { ...battle.companion }
  const log: string[] = []
  let guarding = false
  const mastery = skillBonuses(skills)

  if (action === 'skill' && battle.cooldowns.sweep > 0) {
    return { stats, battle: { ...battle, log: [`横扫千星仍需等待 ${battle.cooldowns.sweep} 回合。`, ...battle.log] } }
  }
  if (action === 'heal' && battle.cooldowns.heal > 0) {
    return { stats, battle: { ...battle, log: [`回春诀仍需等待 ${battle.cooldowns.heal} 回合。`, ...battle.log] } }
  }

  const cooldowns = {
    sweep: Math.max(0, battle.cooldowns.sweep - 1),
    heal: Math.max(0, battle.cooldowns.heal - 1),
  }
  const enemyEffects = enemies.map((_, index) => ({
    armorBreak: Math.max(0, (battle.enemyEffects[index]?.armorBreak ?? 0) - 1),
  }))
  let heroShield = battle.heroShield

  if (action === 'potion') {
    if (nextStats.potions <= 0) return { stats, battle: { ...battle, log: ['包里已经没有金创药了。', ...battle.log] } }
    if (nextStats.hp >= nextStats.maxHp) return { stats, battle: { ...battle, log: ['气血已满，无需使用金创药。', ...battle.log] } }
    const healed = Math.min(42, nextStats.maxHp - nextStats.hp)
    nextStats = { ...nextStats, hp: nextStats.hp + healed, potions: nextStats.potions - 1 }
    log.push(`你服下金创药，恢复 ${healed} 点气血。`)
  } else if (action === 'heal') {
    if (nextStats.mp < 10) return { stats, battle: { ...battle, log: ['法力不足，无法施展回春诀。', ...battle.log] } }
    if (nextStats.hp >= nextStats.maxHp && battle.heroShield > 0) return { stats, battle: { ...battle, log: ['气血已满且已有护盾，无需施展回春诀。', ...battle.log] } }
    const healed = Math.min(26 + nextStats.level * 5 + mastery.heal, nextStats.maxHp - nextStats.hp)
    nextStats = { ...nextStats, hp: nextStats.hp + healed, mp: nextStats.mp - 10 }
    const shieldGained = 10 + nextStats.level * 2 + skills.healLevel * 2
    heroShield = Math.min(99, heroShield + shieldGained)
    cooldowns.heal = 2
    log.push(`回春诀·${skills.healLevel}重恢复 ${healed} 点气血，并获得 ${shieldGained} 点灵气护盾。`)
  } else if (action === 'guard') {
    guarding = true
    const shieldGained = 18 + nextStats.level * 4
    heroShield = Math.min(99, heroShield + shieldGained)
    log.push(`你凝神架势，本回合伤害减半并获得 ${shieldGained} 点护盾。`)
  } else {
    const skill = action === 'skill'
    if (skill && nextStats.mp < 12) {
      return { stats, battle: { ...battle, log: ['法力不足，无法施展横扫千星。', ...battle.log] } }
    }
    const critical = Math.random() * 100 < nextStats.crit + bonuses.crit
    const baseDamage = skill
      ? 18 + nextStats.level * 7 + mastery.sweep + Math.floor(Math.random() * 9)
      : 8 + nextStats.level * 4 + mastery.attack + Math.floor(Math.random() * 7)
    const damage = Math.round((baseDamage + nextStats.attack + bonuses.attack) * (critical ? 1.6 : 1))
    nextStats.mp -= skill ? 12 : 0
    if (skill) {
      cooldowns.sweep = 2
      let totalDamage = 0
      let targetsHit = 0
      enemies.forEach((target, index) => {
        if (target.hp <= 0) return
        const formationDamage = index === targetIndex ? damage : Math.max(1, Math.round(damage * 0.7))
        const targetDamage = (battle.enemyEffects[index]?.armorBreak ?? 0) > 0
          ? Math.round(formationDamage * 1.3)
          : formationDamage
        target.hp = Math.max(0, target.hp - targetDamage)
        totalDamage += targetDamage
        targetsHit += 1
      })
      const linkedTargets = enemies.filter((_, index) => (battle.enemyEffects[index]?.armorBreak ?? 0) > 0).length
      log.push(`横扫千星·${skills.sweepLevel}重席卷 ${targetsHit} 个目标，造成 ${totalDamage} 点伤害${linkedTargets > 0 ? `（引爆 ${linkedTargets} 个破甲目标）` : critical ? '（暴击）' : ''}。`)
    } else {
      const fallbackIndex = enemies.findIndex((target) => target.hp > 0)
      const resolvedTargetIndex = enemies[targetIndex]?.hp > 0 ? targetIndex : fallbackIndex
      const target = resolvedTargetIndex >= 0 ? enemies[resolvedTargetIndex] : null
      if (target) {
        const resolvedDamage = target.name === '石甲卫' ? Math.max(1, Math.round(damage * 0.65)) : damage
        target.hp = Math.max(0, target.hp - resolvedDamage)
        enemyEffects[resolvedTargetIndex] = { armorBreak: 2 }
        log.push(`破军斩·${skills.attackLevel}重命中${target.name}，造成 ${resolvedDamage} 点伤害${target.name === '石甲卫' ? '（玄岩重甲减伤）' : critical ? '（暴击）' : ''}，并施加 2 回合破甲。`)
      }
    }
  }

  let lastCompanionAttack: BattleState['lastCompanionAttack'] = null
  const companionTargetIndex = enemies[targetIndex]?.hp > 0
    ? targetIndex
    : enemies.findIndex((target) => target.hp > 0)
  if (companionTargetIndex >= 0) {
    const target = enemies[companionTargetIndex]
    const companionDamage = companion.attack + Math.floor(Math.random() * 5)
    const previousHp = target.hp
    target.hp = Math.max(0, target.hp - companionDamage)
    lastCompanionAttack = { targetIndex: companionTargetIndex, damage: previousHp - target.hp }
    log.push(`${companion.name}施展灵泡追击，对${target.name}造成 ${lastCompanionAttack.damage} 点伤害。`)
  }

  if (enemies.every((target) => target.hp <= 0)) {
    nextStats = levelUp({
      ...nextStats,
      exp: nextStats.exp + enemy.exp,
      gold: nextStats.gold + enemy.gold,
    })
    return { stats: nextStats, battle: null, result: 'victory' }
  }

  const enraged = battle.enraged || (enemy.kind === 'boss' && enemy.hp > 0 && enemy.hp <= enemy.maxHp / 2)
  if (enraged && !battle.enraged) log.push(`${enemy.name}进入狂暴阶段，焚天重击将更加频繁！`)

  let totalIncomingDamage = 0
  if (enemy.hp > 0) {
    let rawDamage = enemy.attack + Math.floor(Math.random() * 7)
    let ignoresDefense = enemy.name === '沧澜羽蛇'
    const enemyMove = enemyIntentLabel(enemy.name, battle.intent)
    if (battle.intent === 'inferno') {
      const multiplier = enemy.kind === 'boss' ? (enraged ? 1.85 : 1.6) : 1.45
      rawDamage = Math.round(enemy.attack * multiplier) + Math.floor(Math.random() * 6)
      log.push(`${enemy.name}释放${enemyMove.name}！`)
    } else if (battle.intent === 'roar') {
      rawDamage = Math.round(enemy.attack * 0.8) + Math.floor(Math.random() * 5)
      const drained = Math.min(8, nextStats.mp)
      nextStats.mp -= drained
      ignoresDefense = ignoresDefense || enemy.kind === 'boss'
      log.push(`${enemy.name}施展${enemyMove.name}，震散 ${drained} 点法力！`)
    } else if (enemy.name === '青竹灵') {
      rawDamage = Math.round(rawDamage * 1.2)
      log.push('青竹灵踏影连刺，攻势变得更加迅猛！')
    } else if (enemy.name === '月影狐') {
      const drained = Math.min(5, nextStats.mp)
      nextStats.mp -= drained
      log.push(`月影狐施展噬月妖术，削减 ${drained} 点法力！`)
    } else if (enemy.name === '沧澜羽蛇') {
      ignoresDefense = true
      log.push('沧澜羽蛇喷出穿云毒息，无视了防御！')
    }
    const reducedDamage = Math.max(1, rawDamage - (ignoresDefense ? 0 : nextStats.defense + bonuses.defense))
    totalIncomingDamage += guarding ? Math.ceil(reducedDamage / 2) : reducedDamage
  }
  reinforcements.forEach((unit) => {
    if (unit.hp <= 0) return
    const reducedDamage = Math.max(1, unit.attack + Math.floor(Math.random() * 4) - nextStats.defense - bonuses.defense)
    totalIncomingDamage += guarding ? Math.ceil(reducedDamage / 2) : reducedDamage
  })
  const absorbedDamage = Math.min(heroShield, totalIncomingDamage)
  heroShield -= absorbedDamage
  totalIncomingDamage -= absorbedDamage
  nextStats.hp = Math.max(0, nextStats.hp - totalIncomingDamage)
  const attackers = enemies.filter((target) => target.hp > 0).length
  if (absorbedDamage > 0) log.push(`灵气护盾吸收 ${absorbedDamage} 点伤害，剩余护盾 ${heroShield}。`)
  log.push(`${attackers} 名敌人联手反击，造成 ${totalIncomingDamage} 点气血伤害。`)

  if (nextStats.hp <= 0) {
    nextStats = { ...nextStats, hp: nextStats.maxHp, mp: nextStats.maxMp, gold: Math.max(0, nextStats.gold - 10) }
    return { stats: nextStats, battle: null, result: 'defeat' }
  }

  const turn = battle.turn + 1
  return {
    stats: nextStats,
    battle: {
      enemy,
      reinforcements,
      arena: battle.arena,
      elite: battle.elite,
      companion,
      lastCompanionAttack,
      guarding: false,
      turn,
      intent: nextIntent(enemy, turn, enraged),
      enraged,
      cooldowns,
      heroShield,
      enemyEffects,
      log: [...log, ...battle.log].slice(0, 7),
    },
  }
}
