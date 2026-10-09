export type Direction = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface Point {
  x: number
  y: number
}

export interface HeroStats {
  level: number
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  exp: number
  gold: number
  potions: number
  questProgress: number
  patrolWins: number
  eliteWins: number
  attack: number
  defense: number
  crit: number
}

export type SceneId = 'overworld' | 'crimson-cave'
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory'
export type ItemId =
  | 'traveler-sword'
  | 'cloud-robe'
  | 'crimson-charm'
  | 'bamboo-shadow-blade'
  | 'moonweave-robe'
  | 'jade-guardian-charm'
export type InventoryState = Record<ItemId, number>
export type EquipmentState = Record<EquipmentSlot, ItemId | null>
export type SkillId = 'attack' | 'sweep' | 'heal'

export interface SkillState {
  attackLevel: number
  sweepLevel: number
  healLevel: number
  points: number
}

export type PartnerId = 'jade-sword' | 'moon-lotus' | 'thunder-seal' | 'azure-dragon'

export interface PartnerProgress {
  level: number
  exp: number
  stars: number
  shards: number
}

export type PartnerRosterState = Record<PartnerId, PartnerProgress>

export interface WorldFlags {
  caveChestOpened: boolean
  moonChapterCompleted: boolean
}

export type QuestStage = 'not-started' | 'hunting' | 'boss-ready' | 'returning' | 'completed'

export interface GameSave {
  version: 7
  stats: HeroStats
  position: Point
  questStage: QuestStage
  scene: SceneId
  inventory: InventoryState
  equipment: EquipmentState
  worldFlags: WorldFlags
  pet: PetState
  skills: SkillState
  lineup: PartnerId[]
  partners: PartnerRosterState
}

export interface PetState {
  level: number
  exp: number
  stars: number
  skillLevel: number
}

export interface Enemy {
  kind: 'mob' | 'boss'
  name: string
  icon: string
  hp: number
  maxHp: number
  attack: number
  exp: number
  gold: number
}

export interface BattleCompanion {
  name: string
  model: '泡泡精'
  attack: number
}

export interface CompanionAttack {
  targetIndex: number
  damage: number
}

export interface BattleCooldowns {
  sweep: number
  heal: number
}

export interface EnemyBattleEffect {
  armorBreak: number
}

export interface BattleState {
  enemy: Enemy
  reinforcements: Enemy[]
  arena: 'bamboo' | 'city' | 'moon'
  elite: boolean
  companion: BattleCompanion
  lastCompanionAttack: CompanionAttack | null
  log: string[]
  guarding: boolean
  turn: number
  intent: EnemyIntent
  enraged: boolean
  cooldowns: BattleCooldowns
  heroShield: number
  enemyEffects: EnemyBattleEffect[]
}

export type EnemyIntent = 'strike' | 'inferno' | 'roar'

export interface BattleResult {
  outcome: 'victory' | 'defeat'
  enemyName: string
  enemyIcon: string
  enemyKind: Enemy['kind']
  elite: boolean
  expGained: number
  goldChange: number
  leveledUp: boolean
  message: string
  lootChoices?: ItemId[]
  lootClaimed?: ItemId
  skillPointsGained?: number
}

export type BattleAction = 'attack' | 'skill' | 'heal' | 'guard' | 'potion'

export interface NpcDefinition extends Point {
  id: string
  name: string
  icon: string
  title: string
  dialogue: string
  actionLabel?: string
}

export interface PortalDefinition extends Point {
  id: string
  name: string
  destination: Point
  destinationName: string
}
