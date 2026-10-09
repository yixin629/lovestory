'use client'

import type { BattleState } from '../types'
import { enemyTrait } from '../engine/combat'
import AtlasSprite, { monsterAtlas, monsterQuadrant } from './AtlasSprite'

interface EncounterPreviewPanelProps {
  battle: BattleState
  onStart: () => void
  onRetreat: () => void
}

export default function EncounterPreviewPanel({ battle, onStart, onRetreat }: EncounterPreviewPanelProps) {
  const enemies = [battle.enemy, ...battle.reinforcements]
  const boss = battle.enemy.kind === 'boss'
  const elite = battle.elite
  const primaryTrait = enemyTrait(battle.enemy.name)
  const strategy = boss
    ? '观察妖王下回合意图；焚天重击前优先防御，护卫较多时使用群攻。'
    : elite
      ? `精英${battle.enemy.name}拥有更高气血和攻击。${primaryTrait.description}优先处理护卫可以降低敌方反击总伤害。`
      : enemies.length > 1
      ? '敌方结队出现，横扫千星可以同时压低全体气血，再集中击破主目标。'
      : '单体敌人适合普通攻击节省法力，气血过低时先治疗或使用丹药。'

  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center overflow-hidden bg-slate-950/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="遭遇敌情确认">
      <div className={`max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl border-2 bg-gradient-to-b text-white shadow-2xl ${boss || elite ? 'border-rose-400 from-rose-950 to-slate-950' : 'border-amber-300 from-indigo-950 to-slate-950'}`}>
        <div className="border-b border-white/10 px-5 py-4 text-center">
          <p className={`text-xs font-black tracking-[0.32em] ${boss || elite ? 'text-rose-300' : 'text-amber-300'}`}>{boss ? '首领来袭' : elite ? '精英悬赏' : '妖气遭遇'}</p>
          <h2 className="mt-1 text-2xl font-black">{battle.enemy.name}{enemies.length > 1 ? `率领 ${enemies.length - 1} 名护卫` : '拦住了去路'}</h2>
          <p className="mt-1 text-xs text-slate-300">确认阵容与战术后进入战斗，撤离不会消耗任何资源。</p>
        </div>

        <div className="grid grid-cols-3 items-end gap-2 bg-[radial-gradient(circle_at_center,rgba(59,130,246,.2),transparent_65%)] px-5 py-4">
          {enemies.map((enemy, index) => (
            <div key={`${enemy.name}-${index}`} className="flex min-w-0 flex-col items-center">
              <AtlasSprite atlas={monsterAtlas(enemy.name)} quadrant={monsterQuadrant(enemy.name)} alt={`${enemy.name}敌情立绘`} className={`${index === 0 ? 'h-36 w-36 md:h-44 md:w-44' : 'h-24 w-24 md:h-32 md:w-32'} drop-shadow-[0_12px_10px_rgba(0,0,0,.65)]`} />
              <b className="-mt-3 max-w-full truncate rounded-full border border-white/20 bg-slate-950/85 px-3 py-1 text-xs">{enemy.name}</b>
              <span className="mt-1 text-[10px] text-rose-200">气血 {enemy.maxHp} · 攻击 {enemy.attack}</span>
              <span className="mt-0.5 text-[10px] text-cyan-200">{enemyTrait(enemy.name).name}</span>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 3 - enemies.length) }).map((_, index) => <div key={`empty-${index}`} aria-hidden />)}
        </div>

        <div className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-sm leading-6 text-cyan-50">
            <b className="text-cyan-200">战术建议</b>
            <p>{strategy}</p>
          </div>
          <div className="grid min-w-40 grid-cols-2 gap-2 rounded-2xl bg-white/5 p-3 text-center text-xs">
            <span>预计修为<b className="block text-lg text-fuchsia-200">+{battle.enemy.exp}</b></span>
            <span>预计银两<b className="block text-lg text-amber-200">+{battle.enemy.gold}</b></span>
          </div>
        </div>

        <div className="flex gap-3 border-t border-white/10 p-4">
          <button type="button" onClick={onRetreat} className="flex-1 rounded-xl border border-white/20 px-4 py-3 font-bold text-slate-200 hover:bg-white/10">暂时撤离</button>
          <button type="button" onClick={onStart} className={`flex-[1.5] rounded-xl px-4 py-3 font-black text-slate-950 shadow-lg ${boss || elite ? 'bg-rose-300 hover:bg-rose-200' : 'bg-amber-300 hover:bg-amber-200'}`}>⚔️ 确认迎战</button>
        </div>
      </div>
    </div>
  )
}
