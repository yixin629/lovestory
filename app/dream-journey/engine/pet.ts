import type { HeroStats, PetState } from '../types'

export const INITIAL_PET: PetState = {
  level: 1,
  exp: 0,
  stars: 0,
  skillLevel: 1,
}

export function petExpNeeded(level: number) {
  return 30 + (level - 1) * 18
}

export function petTrainCost(level: number) {
  return 12 + level * 5
}

export function petStarCost(stars: number) {
  return 55 + stars * 45
}

export function petSkillCost(skillLevel: number) {
  return 30 + skillLevel * 20
}

export function petAttack(pet: PetState) {
  return 6 + pet.level * 3 + pet.stars * 6 + pet.skillLevel * 2 + (pet.stars >= 2 ? 4 : 0)
}

export function petPower(pet: PetState) {
  return petAttack(pet) * 58 + pet.level * 35 + pet.stars * 420 + pet.skillLevel * 160
}

interface PetProgressResult {
  pet: PetState
  stats: HeroStats
  message: string
  success: boolean
}

export function trainPet(pet: PetState, stats: HeroStats): PetProgressResult {
  const cost = petTrainCost(pet.level)
  if (stats.gold < cost) return { pet, stats, message: `银两不足，本次修炼需要 ${cost} 两。`, success: false }
  if (pet.level >= 30) return { pet, stats, message: '泡泡灵宠已达到当前版本的等级上限。', success: false }

  let level = pet.level
  let exp = pet.exp + 24
  let leveledUp = false
  while (level < 30 && exp >= petExpNeeded(level)) {
    exp -= petExpNeeded(level)
    level += 1
    leveledUp = true
  }
  return {
    pet: { ...pet, level, exp },
    stats: { ...stats, gold: stats.gold - cost },
    message: leveledUp ? `泡泡灵宠升到 ${level} 级，协战攻击提升！` : '泡泡灵宠获得 24 点修炼经验。',
    success: true,
  }
}

export function starUpPet(pet: PetState, stats: HeroStats): PetProgressResult {
  if (pet.stars >= 5) return { pet, stats, message: '泡泡灵宠已经达到五星。', success: false }
  const requiredLevel = (pet.stars + 1) * 3
  if (pet.level < requiredLevel) return { pet, stats, message: `升到 ${requiredLevel} 级后才能进行下一次升星。`, success: false }
  const cost = petStarCost(pet.stars)
  if (stats.gold < cost) return { pet, stats, message: `银两不足，本次升星需要 ${cost} 两。`, success: false }
  return {
    pet: { ...pet, stars: pet.stars + 1 },
    stats: { ...stats, gold: stats.gold - cost },
    message: `升星成功！泡泡灵宠达到 ${pet.stars + 1} 星。`,
    success: true,
  }
}

export function upgradePetSkill(pet: PetState, stats: HeroStats): PetProgressResult {
  if (pet.skillLevel >= 5) return { pet, stats, message: '灵泡追击已经达到最高等级。', success: false }
  const requiredLevel = pet.skillLevel * 2
  if (pet.level < requiredLevel) return { pet, stats, message: `泡泡灵宠达到 ${requiredLevel} 级后才能升级技能。`, success: false }
  const cost = petSkillCost(pet.skillLevel)
  if (stats.gold < cost) return { pet, stats, message: `银两不足，本次技能升级需要 ${cost} 两。`, success: false }
  return {
    pet: { ...pet, skillLevel: pet.skillLevel + 1 },
    stats: { ...stats, gold: stats.gold - cost },
    message: `灵泡追击提升到 ${pet.skillLevel + 1} 级。`,
    success: true,
  }
}
