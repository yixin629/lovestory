'use client'

import { MAX_SKILL_LEVEL, SKILLS } from '../engine/skills'
import type { SkillId, SkillState } from '../types'
import AtlasSprite, { type AtlasQuadrant } from './AtlasSprite'

interface SkillPanelProps {
  skills: SkillState
  onUpgrade: (skillId: SkillId) => void
  onClose: () => void
}

const SKILL_PRESENTATION: Record<SkillId, { quadrant: AtlasQuadrant; tone: string }> = {
  attack: { quadrant: 'top-left', tone: 'from-amber-500/25 to-orange-950/40 border-amber-300/40' },
  sweep: { quadrant: 'top-right', tone: 'from-fuchsia-500/25 to-indigo-950/40 border-fuchsia-300/40' },
  heal: { quadrant: 'bottom-left', tone: 'from-emerald-500/25 to-cyan-950/40 border-emerald-300/40' },
}

export default function SkillPanel({ skills, onUpgrade, onClose }: SkillPanelProps) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="技能修炼">
      <div className="my-3 w-full max-w-2xl rounded-3xl border-2 border-fuchsia-300 bg-gradient-to-b from-indigo-950 to-slate-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.3em] text-fuchsia-200">角色成长 · 战斗流派</p>
            <h2 className="mt-1 text-2xl font-black">技能修炼</h2>
            <p className="mt-1 text-sm text-slate-300">升级与精英悬赏可获得技能点，技能最高修炼至五重。</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/20 px-4 py-2 text-sm">关闭</button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-4 py-3">
          <span className="text-sm text-fuchsia-100">可用技能点</span>
          <b className="text-2xl text-amber-300">✦ {skills.points}</b>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(Object.keys(SKILLS) as SkillId[]).map((skillId) => {
            const skill = SKILLS[skillId]
            const level = skills[skill.levelKey]
            const maxed = level >= MAX_SKILL_LEVEL
            const presentation = SKILL_PRESENTATION[skillId]
            return (
              <section key={skillId} className={`rounded-2xl border bg-gradient-to-b p-3 ${presentation.tone}`}>
                <AtlasSprite atlas="effects" quadrant={presentation.quadrant} alt={`${skill.name}技能图标`} className="mx-auto h-24 w-24" />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <b>{skill.name}</b>
                  <span className="rounded-full bg-black/30 px-2 py-1 text-xs font-bold">{level}/{MAX_SKILL_LEVEL} 重</span>
                </div>
                <div className="mt-2 flex gap-1" aria-label={`${skill.name}当前${level}重`}>
                  {Array.from({ length: MAX_SKILL_LEVEL }, (_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index < level ? 'bg-amber-300' : 'bg-white/15'}`} />)}
                </div>
                <p className="mt-3 min-h-10 text-xs leading-5 text-slate-300">{skill.description}</p>
                <p className="mt-2 rounded-xl bg-black/25 p-2 text-xs font-bold text-cyan-100">当前：{skill.effect(level)}</p>
                {!maxed && <p className="mt-1 text-[11px] text-slate-400">下重：{skill.effect(level + 1)}</p>}
                <button type="button" onClick={() => onUpgrade(skillId)} disabled={maxed || skills.points <= 0} className="mt-3 w-full rounded-xl bg-amber-300 px-3 py-2 text-sm font-black text-slate-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500">
                  {maxed ? '已达最高境界' : skills.points <= 0 ? '需要技能点' : `消耗 1 点 · 修炼至 ${level + 1} 重`}
                </button>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
