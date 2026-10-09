'use client'

import { useState } from 'react'
import { petAttack, petExpNeeded, petPower, petSkillCost, petStarCost, petTrainCost } from '../engine/pet'
import type { PetState } from '../types'
import AtlasSprite, { monsterQuadrant } from './AtlasSprite'

interface PetPanelProps {
  pet: PetState
  gold: number
  onTrain: () => void
  onStarUp: () => void
  onUpgradeSkill: () => void
  onClose: () => void
}

type PetTab = 'level' | 'stars' | 'skills'

const LOCKED_PETS = [
  { name: '花灵', model: '花妖' },
  { name: '山君', model: '巡山小妖' },
] as const

export default function PetPanel({ pet, gold, onTrain, onStarUp, onUpgradeSkill, onClose }: PetPanelProps) {
  const [tab, setTab] = useState<PetTab>('level')
  const expNeeded = petExpNeeded(pet.level)
  const expPercent = pet.level >= 30 ? 100 : Math.min(100, pet.exp / expNeeded * 100)
  const nextStarLevel = (pet.stars + 1) * 3

  return (
    <div className="fixed inset-0 z-40 flex h-dvh max-h-dvh min-h-0 items-start justify-center overflow-hidden bg-slate-950/85 p-3 backdrop-blur-sm md:items-center" role="dialog" aria-modal="true" aria-label="宠物养成">
      <div className="my-auto max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl border-2 border-cyan-200/70 bg-gradient-to-b from-indigo-950 via-blue-950 to-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div><p className="text-xs font-bold tracking-[0.3em] text-cyan-300">协战养成</p><h2 className="text-2xl font-black">宠物</h2></div>
          <div className="flex items-center gap-2"><span className="rounded-full bg-slate-900/70 px-3 py-1 text-sm text-amber-200">🪙 {gold}</span><button type="button" onClick={onClose} className="rounded-full border border-white/20 px-4 py-2 text-sm">返回</button></div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-white/10 bg-slate-950/40 p-3">
          <div className="min-w-24 rounded-xl border-2 border-amber-300 bg-amber-300/15 p-2 text-center">
            <AtlasSprite atlas="monsters" quadrant={monsterQuadrant('泡泡精')} alt="泡泡灵宠头像" className="mx-auto h-14 w-14" />
            <b className="text-xs text-amber-100">泡泡灵宠</b><span className="block text-[10px] text-cyan-300">出战 · {pet.level}级</span>
          </div>
          {LOCKED_PETS.map((lockedPet) => (
            <div key={lockedPet.name} className="min-w-24 rounded-xl border border-white/10 bg-white/5 p-2 text-center opacity-55">
              <AtlasSprite atlas="monsters" quadrant={monsterQuadrant(lockedPet.model)} alt={`${lockedPet.name}未解锁`} className="mx-auto h-14 w-14 grayscale" />
              <b className="text-xs">{lockedPet.name}</b><span className="block text-[10px] text-slate-400">后续章节解锁</span>
            </div>
          ))}
        </div>

        <div className="relative grid min-h-72 place-items-center overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.28),_transparent_58%)] px-4 py-6 text-center">
          <div className="absolute inset-x-12 bottom-9 h-20 rounded-[50%] border border-cyan-200/20 bg-cyan-300/10 blur-sm" />
          <div className="relative">
            <div className="absolute -inset-8 rounded-full border border-cyan-200/20 motion-safe:animate-spin" style={{ animationDuration: '14s' }} />
            <AtlasSprite atlas="monsters" quadrant={monsterQuadrant('泡泡精')} alt="泡泡灵宠模型" className="mx-auto h-44 w-44 drop-shadow-[0_18px_16px_rgba(0,0,0,0.65)] md:h-52 md:w-52" />
            <div className="-mt-5 rounded-full border border-cyan-200/50 bg-slate-950/85 px-5 py-2 shadow-xl"><b className="text-cyan-100">泡泡灵宠 · {pet.level}级</b><span className="ml-2 text-amber-300">{'★'.repeat(pet.stars)}{'☆'.repeat(5 - pet.stars)}</span></div>
          </div>
          <div className="absolute left-4 top-4 rounded-xl bg-gradient-to-r from-orange-600/90 to-amber-500/70 px-4 py-2 text-left"><span className="text-xs">战力</span><b className="ml-2 text-xl">{petPower(pet)}</b></div>
          <div className="absolute right-4 top-4 rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-right text-xs"><span className="block text-slate-300">协战攻击</span><b className="text-cyan-200">{petAttack(pet)}</b></div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-y border-white/10 bg-slate-950/60 p-3">
          {([['level', '升级'], ['stars', '升星'], ['skills', '技能']] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-xl border px-3 py-2 font-bold ${tab === id ? 'border-cyan-200 bg-cyan-400/20 text-cyan-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>{label}</button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'level' && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex justify-between text-sm"><b>修炼经验</b><span>{pet.level >= 30 ? '等级已满' : `${pet.exp}/${expNeeded}`}</span></div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-900"><div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-all" style={{ width: `${expPercent}%` }} /></div>
              <p className="mt-3 text-sm text-slate-300">每次修炼获得 24 点经验。升级会提高灵泡追击的基础伤害。</p>
              <button type="button" onClick={onTrain} disabled={pet.level >= 30 || gold < petTrainCost(pet.level)} className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 font-black disabled:cursor-not-allowed disabled:opacity-40">修炼 · 🪙 {petTrainCost(pet.level)}</button>
            </div>
          )}
          {tab === 'stars' && (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-center">
              <div className="text-4xl tracking-widest text-amber-300">{'★'.repeat(pet.stars)}{'☆'.repeat(5 - pet.stars)}</div>
              <p className="mt-3 text-sm text-slate-200">每次升星增加 6 点协战攻击，并逐步解锁被动技能格。</p>
              <p className="mt-2 text-xs text-amber-200">{pet.stars >= 5 ? '已经达到五星' : `下一星要求：宠物 ${nextStarLevel} 级`}</p>
              <button type="button" onClick={onStarUp} disabled={pet.stars >= 5 || pet.level < nextStarLevel || gold < petStarCost(pet.stars)} className="mt-4 w-full rounded-xl bg-gradient-to-r from-rose-700 to-orange-500 px-4 py-3 font-black disabled:cursor-not-allowed disabled:opacity-40">升星 · 🪙 {petStarCost(pet.stars)}</button>
            </div>
          )}
          {tab === 'skills' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-cyan-200/30 bg-cyan-500/10 p-4">
                <AtlasSprite atlas="effects" quadrant="bottom-left" alt="灵泡追击技能" className="h-16 w-16 shrink-0 rounded-xl bg-slate-950/60" />
                <div className="min-w-0 flex-1"><b>灵泡追击 · {pet.skillLevel}级</b><p className="text-sm text-slate-300">少侠行动后自动追击选中目标。每级增加 2 点伤害。</p></div>
                <span className="rounded-full bg-cyan-300 px-2 py-1 text-xs font-black text-slate-950">主动</span>
              </div>
              <div className={`rounded-2xl border p-4 ${pet.stars >= 2 ? 'border-violet-300/30 bg-violet-500/10' : 'border-white/10 bg-white/5 opacity-55'}`}><b>慧根</b><p className="text-sm text-slate-300">二星解锁：灵泡追击额外增加 4 点伤害。</p></div>
              <button type="button" onClick={onUpgradeSkill} disabled={pet.skillLevel >= 5 || pet.level < pet.skillLevel * 2 || gold < petSkillCost(pet.skillLevel)} className="w-full rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-4 py-3 font-black disabled:cursor-not-allowed disabled:opacity-40">升级灵泡追击 · 🪙 {petSkillCost(pet.skillLevel)}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
