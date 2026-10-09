import type { EquipmentState, GameSave, HeroStats, InventoryState, PartnerId, PartnerRosterState, PetState, Point, QuestStage, SceneId, SkillState, WorldFlags } from '../types'
import { INITIAL_STATS } from './combat'
import { INITIAL_EQUIPMENT, INITIAL_INVENTORY } from './equipment'
import { INITIAL_PET } from './pet'
import { INITIAL_SKILLS, MAX_SKILL_LEVEL } from './skills'

export const QUEST_TARGET = 3
export const POTION_PRICE = 18
export const REST_PRICE = 12
export const CHAPTER_REWARD = { gold: 120, potions: 3 } as const
export const INITIAL_POSITION: Point = { x: 1205, y: 1240 }
export const DEFAULT_LINEUP: PartnerId[] = ['jade-sword', 'moon-lotus', 'thunder-seal']
export const INITIAL_PARTNERS: PartnerRosterState = {
  'jade-sword': { level: 1, exp: 0, stars: 0, shards: 0 },
  'moon-lotus': { level: 1, exp: 0, stars: 0, shards: 0 },
  'thunder-seal': { level: 1, exp: 0, stars: 0, shards: 0 },
  'azure-dragon': { level: 1, exp: 0, stars: 0, shards: 0 },
}

export const INITIAL_SAVE: GameSave = {
  version: 7,
  stats: INITIAL_STATS,
  position: INITIAL_POSITION,
  questStage: 'not-started',
  scene: 'overworld',
  inventory: INITIAL_INVENTORY,
  equipment: INITIAL_EQUIPMENT,
  worldFlags: { caveChestOpened: false, moonChapterCompleted: false },
  pet: INITIAL_PET,
  skills: INITIAL_SKILLS,
  lineup: DEFAULT_LINEUP,
  partners: INITIAL_PARTNERS,
}

const QUEST_STAGES: readonly QuestStage[] = [
  'not-started',
  'hunting',
  'boss-ready',
  'returning',
  'completed',
]

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseStats(value: unknown): HeroStats {
  const saved = value && typeof value === 'object' ? value as Partial<HeroStats> : {}
  return {
    level: Math.max(1, Math.floor(finiteNumber(saved.level, INITIAL_STATS.level))),
    hp: Math.max(0, finiteNumber(saved.hp, INITIAL_STATS.hp)),
    maxHp: Math.max(1, finiteNumber(saved.maxHp, INITIAL_STATS.maxHp)),
    mp: Math.max(0, finiteNumber(saved.mp, INITIAL_STATS.mp)),
    maxMp: Math.max(1, finiteNumber(saved.maxMp, INITIAL_STATS.maxMp)),
    exp: Math.max(0, finiteNumber(saved.exp, INITIAL_STATS.exp)),
    gold: Math.max(0, finiteNumber(saved.gold, INITIAL_STATS.gold)),
    potions: Math.max(0, Math.floor(finiteNumber(saved.potions, INITIAL_STATS.potions))),
    questProgress: Math.min(
      QUEST_TARGET,
      Math.max(0, Math.floor(finiteNumber(saved.questProgress, INITIAL_STATS.questProgress))),
    ),
    patrolWins: Math.max(0, Math.floor(finiteNumber(saved.patrolWins, INITIAL_STATS.patrolWins))),
    eliteWins: Math.max(0, Math.floor(finiteNumber(saved.eliteWins, INITIAL_STATS.eliteWins))),
    attack: Math.max(0, finiteNumber(saved.attack, INITIAL_STATS.attack)),
    defense: Math.max(0, finiteNumber(saved.defense, INITIAL_STATS.defense)),
    crit: Math.min(100, Math.max(0, finiteNumber(saved.crit, INITIAL_STATS.crit))),
  }
}

function parseInventory(value: unknown): InventoryState {
  const saved = value && typeof value === 'object' ? value as Partial<InventoryState> : {}
  return Object.fromEntries(Object.entries(INITIAL_INVENTORY).map(([id, fallback]) => [
    id,
    Math.max(0, Math.floor(finiteNumber(saved[id as keyof InventoryState], fallback))),
  ])) as InventoryState
}

function parseEquipment(value: unknown, inventory: InventoryState): EquipmentState {
  const saved = value && typeof value === 'object' ? value as Partial<EquipmentState> : {}
  const valid = <T extends keyof EquipmentState>(slot: T, fallback: EquipmentState[T]) => {
    const itemId = saved[slot]
    return itemId && inventory[itemId] > 0 ? itemId : fallback
  }
  return {
    weapon: valid('weapon', INITIAL_EQUIPMENT.weapon),
    armor: valid('armor', INITIAL_EQUIPMENT.armor),
    accessory: valid('accessory', INITIAL_EQUIPMENT.accessory),
  }
}

function parseWorldFlags(value: unknown): WorldFlags {
  const saved = value && typeof value === 'object' ? value as Partial<WorldFlags> : {}
  return {
    caveChestOpened: saved.caveChestOpened === true,
    moonChapterCompleted: saved.moonChapterCompleted === true,
  }
}

function parsePet(value: unknown): PetState {
  const saved = value && typeof value === 'object' ? value as Partial<PetState> : {}
  return {
    level: Math.min(30, Math.max(1, Math.floor(finiteNumber(saved.level, INITIAL_PET.level)))),
    exp: Math.max(0, Math.floor(finiteNumber(saved.exp, INITIAL_PET.exp))),
    stars: Math.min(5, Math.max(0, Math.floor(finiteNumber(saved.stars, INITIAL_PET.stars)))),
    skillLevel: Math.min(5, Math.max(1, Math.floor(finiteNumber(saved.skillLevel, INITIAL_PET.skillLevel)))),
  }
}

function parseSkills(value: unknown, stats: HeroStats): SkillState {
  const saved = value && typeof value === 'object' ? value as Partial<SkillState> : null
  if (!saved) {
    return {
      ...INITIAL_SKILLS,
      points: INITIAL_SKILLS.points + Math.floor((stats.level - 1) / 2) + stats.eliteWins,
    }
  }
  return {
    attackLevel: Math.min(MAX_SKILL_LEVEL, Math.max(1, Math.floor(finiteNumber(saved.attackLevel, 1)))),
    sweepLevel: Math.min(MAX_SKILL_LEVEL, Math.max(1, Math.floor(finiteNumber(saved.sweepLevel, 1)))),
    healLevel: Math.min(MAX_SKILL_LEVEL, Math.max(1, Math.floor(finiteNumber(saved.healLevel, 1)))),
    points: Math.max(0, Math.floor(finiteNumber(saved.points, 0))),
  }
}

function parseLineup(value: unknown): PartnerId[] {
  if (!Array.isArray(value)) return DEFAULT_LINEUP
  const validIds = Object.keys(INITIAL_PARTNERS) as PartnerId[]
  const lineup = value.filter((id): id is PartnerId => validIds.includes(id as PartnerId))
  return [...new Set(lineup)].slice(0, 3).length === 3 ? [...new Set(lineup)].slice(0, 3) : DEFAULT_LINEUP
}

function parsePartners(value: unknown): PartnerRosterState {
  const saved = value && typeof value === 'object' ? value as Partial<PartnerRosterState> : {}
  return Object.fromEntries((Object.keys(INITIAL_PARTNERS) as PartnerId[]).map((id) => {
    const partner = saved[id]
    return [id, {
      level: Math.min(30, Math.max(1, Math.floor(finiteNumber(partner?.level, 1)))),
      exp: Math.max(0, Math.floor(finiteNumber(partner?.exp, 0))),
      stars: Math.min(5, Math.max(0, Math.floor(finiteNumber(partner?.stars, 0)))),
      shards: Math.max(0, Math.floor(finiteNumber(partner?.shards, 0))),
    }]
  })) as PartnerRosterState
}

export function grantPartnerExperience(roster: PartnerRosterState, lineup: PartnerId[], exp: number, shards: number) {
  const next = { ...roster }
  for (const id of lineup) {
    let partner = { ...next[id], exp: next[id].exp + exp, shards: next[id].shards + shards }
    while (partner.level < 30 && partner.exp >= partner.level * 24) {
      partner = { ...partner, exp: partner.exp - partner.level * 24, level: partner.level + 1 }
    }
    next[id] = partner
  }
  return next
}

export function starUpPartner(roster: PartnerRosterState, id: PartnerId) {
  const partner = roster[id]
  const cost = (partner.stars + 1) * 4
  if (partner.stars >= 5) return { roster, success: false, message: '该伙伴已经达到五星。' }
  if (partner.shards < cost) return { roster, success: false, message: `升星需要 ${cost} 枚伙伴灵契，当前只有 ${partner.shards} 枚。` }
  return {
    roster: { ...roster, [id]: { ...partner, stars: partner.stars + 1, shards: partner.shards - cost } },
    success: true,
    message: '伙伴升星成功，基础属性与专属技能效果均已提升。',
  }
}

export function parseGameSave(raw: string | null, legacyRaw: string | null): GameSave {
  try {
    if (raw) {
      const saved = JSON.parse(raw) as Partial<GameSave>
      const position = saved.position && typeof saved.position === 'object'
        ? {
            x: Math.min(2390, Math.max(20, finiteNumber(saved.position.x, INITIAL_POSITION.x))),
            y: Math.min(2390, Math.max(45, finiteNumber(saved.position.y, INITIAL_POSITION.y))),
          }
        : INITIAL_POSITION
      const inventory = parseInventory(saved.inventory)
      const stats = parseStats(saved.stats)
      return {
        version: 7,
        stats,
        position,
        questStage: QUEST_STAGES.includes(saved.questStage as QuestStage)
          ? saved.questStage as QuestStage
          : 'not-started',
        scene: saved.scene === 'crimson-cave' ? 'crimson-cave' : 'overworld' as SceneId,
        inventory,
        equipment: parseEquipment(saved.equipment, inventory),
        worldFlags: parseWorldFlags(saved.worldFlags),
        pet: parsePet(saved.pet),
        skills: parseSkills(saved.skills, stats),
        lineup: parseLineup(saved.lineup),
        partners: parsePartners(saved.partners),
      }
    }
    if (legacyRaw) {
      const stats = parseStats(JSON.parse(legacyRaw))
      return {
        ...INITIAL_SAVE,
        stats,
        questStage: stats.questProgress >= QUEST_TARGET
          ? 'boss-ready'
          : stats.questProgress > 0
            ? 'hunting'
            : 'not-started',
      }
    }
  } catch {
    return INITIAL_SAVE
  }
  return INITIAL_SAVE
}

export function questNotice(stage: QuestStage, progress: number, patrolWins = 0) {
  if (stage === 'not-started') return '去找云游师父领取城外试炼'
  if (stage === 'hunting') return `在野外击退小妖：${progress}/${QUEST_TARGET}`
  if (stage === 'boss-ready') return '东北方的赤焰洞窟已经开启，进入洞窟挑战妖王'
  if (stage === 'returning') return '妖王已败，回去找云游师父复命'
  const bountyProgress = patrolWins % 3
  if (bountyProgress === 2) return '精英悬赏已出现：下一场将遭遇精英妖物与两名护卫'
  return `长安悬赏历练：${bountyProgress}/3，完成三场巡逻可触发精英遭遇`
}

export function buyPotion(stats: HeroStats) {
  if (stats.gold < POTION_PRICE) return { stats, message: `银两不足，一枚金创药需要 ${POTION_PRICE} 两。`, success: false }
  return {
    stats: { ...stats, gold: stats.gold - POTION_PRICE, potions: stats.potions + 1 },
    message: '购买成功：获得 1 枚金创药。',
    success: true,
  }
}

export function rest(stats: HeroStats) {
  if (stats.hp === stats.maxHp && stats.mp === stats.maxMp) return { stats, message: '你现在精神饱满，无需休息。', success: false }
  if (stats.gold < REST_PRICE) return { stats, message: `银两不足，调息需要 ${REST_PRICE} 两。`, success: false }
  return {
    stats: { ...stats, gold: stats.gold - REST_PRICE, hp: stats.maxHp, mp: stats.maxMp },
    message: '调息完成，气血与法力已恢复。',
    success: true,
  }
}
