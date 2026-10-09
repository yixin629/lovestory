'use client'

import Image from 'next/image'
import type { BattleState } from '../types'
import { enemyTrait } from '../engine/combat'
import AtlasSprite, { monsterAtlas, monsterQuadrant } from './AtlasSprite'

interface ChapterPortalPanelProps {
  battle: BattleState
  onStart: () => void
  onRetreat: () => void
}

export default function ChapterPortalPanel({ battle, onStart, onRetreat }: ChapterPortalPanelProps) {
  const enemies = [battle.enemy, ...battle.reinforcements]
  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="第二章月影秘境入口">
      <div className="my-3 w-full max-w-3xl overflow-hidden rounded-3xl border-2 border-cyan-200 bg-slate-950 text-white shadow-2xl">
        <div className="relative h-52 overflow-hidden md:h-64">
          <Image src="/games/dream-journey/battle/arena-moon-sanctuary-v1.png" alt="月影秘境的月轮祭坛" fill sizes="768px" className="object-cover" priority unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-indigo-950/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="text-xs font-black tracking-[0.3em] text-cyan-200">主线任务 · 第二章</p>
            <h2 className="mt-1 text-3xl font-black text-white">月影秘境</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-200">两次精英悬赏引动了失落月轮。穿过秘境之门，阻止月蚀妖狐吞噬长安上空的月华。</p>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="grid grid-cols-3 gap-2">
              {enemies.map((enemy, index) => (
                <div key={`${enemy.name}-${index}`} className={`rounded-2xl border p-2 text-center ${index === 0 ? 'border-violet-300 bg-violet-400/15' : 'border-white/10 bg-white/5'}`}>
                  <AtlasSprite atlas={monsterAtlas(enemy.name)} quadrant={monsterQuadrant(enemy.name)} alt={enemy.name} className="mx-auto h-24 w-24" />
                  <b className="block text-sm">{enemy.name}</b>
                  <span className="text-[11px] text-rose-200">气血 {enemy.maxHp} · 攻击 {enemy.attack}</span>
                  <span className="mt-1 block text-[10px] font-bold text-cyan-200">{enemyTrait(enemy.name).name}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-3 text-xs leading-5 text-slate-200">
              <b className="text-cyan-100">战术提示</b>
              <p className="mt-1">先击破攻击较高的镜魇，再处理星灯侍灵。妖狐显示“焚天重击”时使用防御，半血后会进入月蚀狂暴。</p>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4">
            <p className="text-xs font-black tracking-widest text-amber-200">首次通关奖励</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>✦ 额外技能点 ×2</li>
              <li>🌙 月纹战袍 ×1（重复获得可精炼）</li>
              <li>🪙 章节银两 ×200</li>
              <li>🧪 金创药 ×3</li>
            </ul>
            <div className="mt-auto grid gap-2 pt-5">
              <button type="button" onClick={onStart} className="rounded-xl bg-gradient-to-b from-cyan-200 to-blue-500 px-4 py-3 font-black text-slate-950 shadow-[0_4px_0_#1e3a8a] transition active:translate-y-1 active:shadow-none">进入秘境迎战</button>
              <button type="button" onClick={onRetreat} className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/5">暂缓挑战</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
