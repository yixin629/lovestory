import type { SkillId, SkillState } from '../types'

export const MAX_SKILL_LEVEL = 5

export const INITIAL_SKILLS: SkillState = {
  attackLevel: 1,
  sweepLevel: 1,
  healLevel: 1,
  points: 1,
}

export const SKILLS: Record<SkillId, {
  name: string
  description: string
  levelKey: 'attackLevel' | 'sweepLevel' | 'healLevel'
  effect: (level: number) => string
}> = {
  attack: {
    name: '破军斩',
    description: '凝聚兵刃锋芒，对当前目标发动稳定重击。',
    levelKey: 'attackLevel',
    effect: (level) => `普通攻击额外伤害 +${(level - 1) * 4}`,
  },
  sweep: {
    name: '横扫千星',
    description: '消耗法力横扫敌方阵列，主目标承受完整伤害。',
    levelKey: 'sweepLevel',
    effect: (level) => `群攻基础伤害 +${(level - 1) * 5}`,
  },
  heal: {
    name: '回春诀',
    description: '引导灵气恢复自身气血，危急时扭转战局。',
    levelKey: 'healLevel',
    effect: (level) => `治疗量 +${(level - 1) * 7}`,
  },
}

export function skillBonuses(skills: SkillState) {
  return {
    attack: (skills.attackLevel - 1) * 4,
    sweep: (skills.sweepLevel - 1) * 5,
    heal: (skills.healLevel - 1) * 7,
  }
}

export function upgradeSkill(skills: SkillState, skillId: SkillId) {
  const definition = SKILLS[skillId]
  const level = skills[definition.levelKey]
  if (skills.points <= 0) return { skills, success: false, message: '当前没有可用技能点。' }
  if (level >= MAX_SKILL_LEVEL) return { skills, success: false, message: `${definition.name}已经修炼至最高境界。` }
  const next = { ...skills, [definition.levelKey]: level + 1, points: skills.points - 1 }
  return {
    skills: next,
    success: true,
    message: `${definition.name}提升至 ${level + 1} 重：${definition.effect(level + 1)}。`,
  }
}
