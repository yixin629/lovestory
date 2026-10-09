import type { EquipmentSlot, EquipmentState, InventoryState, ItemId } from '../types'

export interface ItemDefinition {
  id: ItemId
  name: string
  icon: string
  slot: EquipmentSlot
  description: string
  attack: number
  defense: number
  crit: number
  refinement: { attack: number; defense: number; crit: number }
}

export const ITEMS: Record<ItemId, ItemDefinition> = {
  'traveler-sword': { id: 'traveler-sword', name: '行者木剑', icon: '🗡️', slot: 'weapon', description: '师门弟子常用的轻便木剑。', attack: 5, defense: 0, crit: 2, refinement: { attack: 1, defense: 0, crit: 0 } },
  'cloud-robe': { id: 'cloud-robe', name: '流云布衣', icon: '🥋', slot: 'armor', description: '以云纹布料缝制的护身衣。', attack: 0, defense: 4, crit: 0, refinement: { attack: 0, defense: 1, crit: 0 } },
  'crimson-charm': { id: 'crimson-charm', name: '赤焰护符', icon: '🔥', slot: 'accessory', description: '妖王火核凝成的护符，蕴藏锐气。', attack: 4, defense: 2, crit: 8, refinement: { attack: 1, defense: 1, crit: 1 } },
  'bamboo-shadow-blade': { id: 'bamboo-shadow-blade', name: '竹影灵刃', icon: '🎋', slot: 'weapon', description: '悬赏司以翠竹灵玉锻成，出手轻灵。', attack: 12, defense: 0, crit: 6, refinement: { attack: 2, defense: 0, crit: 1 } },
  'moonweave-robe': { id: 'moonweave-robe', name: '月纹战袍', icon: '🌙', slot: 'armor', description: '月华织线护住周身经脉，攻守兼备。', attack: 2, defense: 10, crit: 0, refinement: { attack: 0, defense: 2, crit: 1 } },
  'jade-guardian-charm': { id: 'jade-guardian-charm', name: '玄玉守心佩', icon: '🟢', slot: 'accessory', description: '玄玉雕成的守心佩，可稳定气息与锋芒。', attack: 5, defense: 6, crit: 5, refinement: { attack: 1, defense: 1, crit: 1 } },
}

export const ELITE_REWARD_IDS: ItemId[] = [
  'bamboo-shadow-blade',
  'moonweave-robe',
  'jade-guardian-charm',
]

export const INITIAL_INVENTORY: InventoryState = {
  'traveler-sword': 1,
  'cloud-robe': 1,
  'crimson-charm': 0,
  'bamboo-shadow-blade': 0,
  'moonweave-robe': 0,
  'jade-guardian-charm': 0,
}

export const INITIAL_EQUIPMENT: EquipmentState = {
  weapon: 'traveler-sword',
  armor: 'cloud-robe',
  accessory: null,
}

export function itemStats(itemId: ItemId, rank: number) {
  const item = ITEMS[itemId]
  const refinements = Math.max(0, rank - 1)
  return {
    attack: item.attack + item.refinement.attack * refinements,
    defense: item.defense + item.refinement.defense * refinements,
    crit: item.crit + item.refinement.crit * refinements,
  }
}

export function equipmentBonuses(equipment: EquipmentState, inventory: InventoryState) {
  return Object.values(equipment).reduce((total, itemId) => {
    if (!itemId) return total
    const item = itemStats(itemId, inventory[itemId])
    return {
      attack: total.attack + item.attack,
      defense: total.defense + item.defense,
      crit: total.crit + item.crit,
    }
  }, { attack: 0, defense: 0, crit: 0 })
}
