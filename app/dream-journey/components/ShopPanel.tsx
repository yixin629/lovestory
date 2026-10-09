'use client'

import { POTION_PRICE, REST_PRICE } from '../engine/progression'
import type { HeroStats } from '../types'
import AtlasSprite from './AtlasSprite'

interface ShopPanelProps {
  stats: HeroStats
  onBuyPotion: () => void
  onRest: () => void
  onClose: () => void
}

export default function ShopPanel({ stats, onBuyPotion, onRest, onClose }: ShopPanelProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="长安药铺">
      <div className="w-full max-w-md rounded-3xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-950 to-slate-950 p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-emerald-300">长安药铺</p>
            <h2 className="mt-1 text-2xl font-black">👨‍⚕️ 行走江湖，先备好伤药</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-xl hover:bg-white/20" aria-label="关闭药铺">×</button>
        </div>

        <p className="mt-3 rounded-xl bg-black/25 px-3 py-2 text-sm text-amber-200">当前银两：{stats.gold} 两</p>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <AtlasSprite atlas="items" quadrant="bottom-right" alt="金创药" className="h-16 w-16 shrink-0 rounded-xl bg-emerald-950/60" />
            <div className="min-w-0 flex-1"><b>金创药</b><p className="mt-1 text-xs text-slate-300">战斗中恢复最多 42 点气血</p></div>
            <button type="button" onClick={onBuyPotion} disabled={stats.gold < POTION_PRICE} className="shrink-0 rounded-full bg-emerald-400 px-4 py-2 font-bold text-slate-950 disabled:opacity-40">{POTION_PRICE} 两</button>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div><b>🍵 调息休整</b><p className="mt-1 text-xs text-slate-300">立即恢复全部气血和法力</p></div>
            <button type="button" onClick={onRest} disabled={stats.gold < REST_PRICE || (stats.hp === stats.maxHp && stats.mp === stats.maxMp)} className="shrink-0 rounded-full bg-sky-400 px-4 py-2 font-bold text-slate-950 disabled:opacity-40">{REST_PRICE} 两</button>
          </div>
        </div>
      </div>
    </div>
  )
}
