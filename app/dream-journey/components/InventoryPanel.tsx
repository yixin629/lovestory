'use client'

import { ITEMS, equipmentBonuses, itemStats } from '../engine/equipment'
import type { EquipmentState, InventoryState, ItemId } from '../types'
import AtlasSprite, { itemAtlas, itemQuadrant } from './AtlasSprite'

interface InventoryPanelProps {
  inventory: InventoryState
  equipment: EquipmentState
  onEquip: (itemId: ItemId) => void
  onClose: () => void
}

const SLOT_NAMES = { weapon: '兵器', armor: '护甲', accessory: '饰品' } as const

export default function InventoryPanel({ inventory, equipment, onEquip, onClose }: InventoryPanelProps) {
  const bonuses = equipmentBonuses(equipment, inventory)
  const ownedItems = Object.values(ITEMS).filter((item) => inventory[item.id] > 0)

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-slate-950/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="装备背包">
      <div className="w-full max-w-xl rounded-3xl border-2 border-amber-300 bg-slate-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold tracking-[0.3em] text-amber-300">角色成长</p><h2 className="mt-1 text-2xl font-black">装备背包</h2></div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/20 px-4 py-2 text-sm">关闭</button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-rose-500/15 p-2">攻击加成<br /><b className="text-rose-300">+{bonuses.attack}</b></div>
          <div className="rounded-xl bg-sky-500/15 p-2">防御加成<br /><b className="text-sky-300">+{bonuses.defense}</b></div>
          <div className="rounded-xl bg-amber-500/15 p-2">暴击加成<br /><b className="text-amber-300">+{bonuses.crit}%</b></div>
        </div>
        <div className="mt-4 space-y-2">
          {ownedItems.map((item) => {
            const equipped = equipment[item.slot] === item.id
            const rank = inventory[item.id]
            const stats = itemStats(item.id, rank)
            return (
              <button key={item.id} type="button" onClick={() => onEquip(item.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${equipped ? 'border-amber-300 bg-amber-300/15' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <AtlasSprite atlas={itemAtlas(item.id)} quadrant={itemQuadrant(item.id)} alt={item.name} className="h-16 w-16 shrink-0 rounded-xl bg-slate-900/50" />
                <span className="min-w-0 flex-1"><b>{item.name}</b>{rank > 1 && <span className="ml-2 rounded-full bg-violet-400/20 px-2 py-0.5 text-xs font-bold text-violet-200">精炼 +{rank - 1}</span>}<span className="ml-2 text-xs text-slate-400">{SLOT_NAMES[item.slot]}</span><span className="block text-xs text-slate-300">{item.description}</span></span>
                <span className="text-right text-xs text-slate-300">攻 +{stats.attack} · 防 +{stats.defense}<br />暴击 +{stats.crit}%</span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${equipped ? 'bg-amber-300 text-slate-950' : 'bg-white/10'}`}>{equipped ? '已装备' : '装备'}</span>
              </button>
            )
          })}
        </div>
        {inventory['crimson-charm'] === 0 && <p className="mt-4 rounded-xl border border-dashed border-rose-300/30 p-3 text-center text-sm text-rose-200">击败赤焰妖王可获得专属饰品“赤焰护符”。</p>}
      </div>
    </div>
  )
}
