'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  PARTNERS,
  advanceFormationBattle,
  createFormationBattle,
  finishFormationBattle,
  formationResult,
  type FormationBattleResult,
  type FormationBattleState,
  type FormationEvent,
  type FormationUnit,
  type PartnerId,
} from '../engine/formation-battle'
import type { BattleState, HeroStats, PartnerRosterState, SkillState } from '../types'
import AtlasSprite, { heroQuadrant, monsterAtlas, monsterQuadrant } from './AtlasSprite'

interface CombatPanelProps {
  battle: BattleState
  stats: HeroStats
  skills: SkillState
  lineup: PartnerId[]
  partners: PartnerRosterState
  onLineupChange: (lineup: PartnerId[]) => void
  onStarUpPartner: (id: PartnerId) => void
  onComplete: (result: FormationBattleResult) => void
}

type PlaybackSpeed = 1 | 2 | 5
type EventStage = 'windup' | 'impact'

interface PendingEvent {
  nextState: FormationBattleState
  event: FormationEvent
  stage: EventStage
}

const ALLY_POSITIONS = [
  { left: '25%', top: '58%' },
  { left: '10%', top: '43%' },
  { left: '31%', top: '34%' },
  { left: '7%', top: '66%' },
  { left: '43%', top: '64%' },
]

const ENEMY_POSITIONS = [
  { left: '67%', top: '40%' },
  { left: '82%', top: '22%' },
  { left: '61%', top: '17%' },
  { left: '85%', top: '49%' },
  { left: '69%', top: '61%' },
  { left: '89%', top: '68%' },
]

function UnitSprite({ unit, attacking, hit, ultimate }: { unit: FormationUnit; attacking: boolean; hit: boolean; ultimate: boolean }) {
  if (unit.id === 'hero') {
    return <AtlasSprite atlas="heroes" quadrant={heroQuadrant(hit ? 'hurt' : attacking ? 'attack' : 'idle')} alt={`${unit.name}战斗模型`} className="h-full w-full" />
  }
  if (unit.partnerId) {
    if (unit.partnerId === 'moon-lotus') {
      return <AtlasSprite atlas="moon-lotus-actions" quadrant={hit ? 'bottom-left' : ultimate ? 'bottom-right' : attacking ? 'top-right' : 'top-left'} alt={`${unit.name}原创伙伴动作模型`} className="h-full w-full" />
    }
    return <AtlasSprite atlas="partners" quadrant={PARTNERS[unit.partnerId].quadrant} alt={`${unit.name}原创伙伴模型`} className="h-full w-full" />
  }
  if (unit.role === 'pet') {
    return <AtlasSprite atlas="monsters" quadrant={monsterQuadrant('泡泡精')} alt={`${unit.name}灵宠模型`} className="h-full w-full" />
  }
  if (unit.model === '月蚀妖狐') {
    return <AtlasSprite atlas="moon-fox-actions" quadrant={hit ? 'bottom-left' : ultimate ? 'bottom-right' : attacking ? 'top-right' : 'top-left'} alt={`${unit.name}原创首领动作模型`} className="h-full w-full" />
  }
  return <AtlasSprite atlas={monsterAtlas(unit.model)} quadrant={monsterQuadrant(unit.model)} alt={`${unit.name}敌方模型`} className="h-full w-full" />
}

function FormationSetup({ lineup, partners, onToggle, onStarUp, onStart }: { lineup: PartnerId[]; partners: PartnerRosterState; onToggle: (id: PartnerId) => void; onStarUp: (id: PartnerId) => void; onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/90 p-3 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="战前伙伴编队">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border-2 border-cyan-300/70 bg-[linear-gradient(160deg,#172554,#0f172a_55%,#111827)] text-white shadow-2xl">
        <div className="border-b border-white/10 px-5 py-4 text-center">
          <p className="text-xs font-black tracking-[0.32em] text-cyan-300">战前编队 · 斜月阵</p>
          <h2 className="mt-1 text-2xl font-black text-amber-100">选择 3 名伙伴出战</h2>
          <p className="mt-1 text-sm text-slate-300">主角和灵宠固定参战。点击伙伴更换阵容，角色会按照速度自动出手。</p>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(PARTNERS).map((partner) => {
            const progress = partners[partner.id]
            const selectedIndex = lineup.indexOf(partner.id)
            const selected = selectedIndex >= 0
            return (
              <div
                key={partner.id}
                className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition hover:-translate-y-1 ${selected ? 'border-amber-300 bg-amber-300/15 ring-2 ring-amber-300/30' : 'border-white/15 bg-white/5 hover:border-cyan-300/60'}`}
              >
                <button type="button" aria-pressed={selected} onClick={() => onToggle(partner.id)} className="block w-full text-left">
                {selected && <span className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-amber-300 font-black text-slate-950">{selectedIndex + 1}</span>}
                <div className={`mx-auto h-36 w-36 rounded-full bg-gradient-to-b ${partner.color} bg-opacity-30`}>
                  <AtlasSprite atlas="partners" quadrant={partner.quadrant} alt={`${partner.name}伙伴立绘`} className="h-full w-full drop-shadow-[0_12px_10px_rgba(0,0,0,.7)]" />
                </div>
                <b className="mt-1 block text-lg text-amber-100">{partner.name}</b>
                <span className="text-xs font-bold text-cyan-300">{partner.title} · {partner.skill}</span>
                <p className="mt-1 text-xs leading-5 text-slate-300">{partner.description}</p>
                </button>
                <div className="mt-2 border-t border-white/10 pt-2 text-xs text-slate-300">
                  <div className="flex justify-between"><b>{progress.level}级 · {'★'.repeat(progress.stars)}{'☆'.repeat(5 - progress.stars)}</b><span>灵契 {progress.shards}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, progress.exp / (progress.level * 24) * 100)}%` }} /></div>
                  <button type="button" onClick={() => onStarUp(partner.id)} className="mt-2 w-full rounded-lg border border-amber-300/30 bg-amber-300/10 py-1 font-black text-amber-200">升星 · {(progress.stars + 1) * 4} 灵契</button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid gap-3 border-t border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-amber-300 px-3 py-1 font-black text-slate-950">主角</span>
            {lineup.map((id, index) => <span key={id} className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-cyan-100">{index + 1} · {PARTNERS[id].name}</span>)}
            <span className="rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-sky-100">灵宠 · 泡泡灵宠</span>
          </div>
          <button type="button" disabled={lineup.length !== 3} onClick={onStart} className="rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-8 py-3 text-lg font-black text-slate-950 shadow-lg disabled:cursor-not-allowed disabled:opacity-40">⚔️ 以此阵容开战</button>
        </div>
      </div>
    </div>
  )
}

export default function CombatPanel({ battle, stats, skills, lineup, partners, onLineupChange, onStarUpPartner, onComplete }: CombatPanelProps) {
  const [state, setState] = useState<FormationBattleState | null>(null)
  const [pending, setPending] = useState<PendingEvent | null>(null)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState<PlaybackSpeed>(1)
  const completedRef = useRef(false)

  const togglePartner = (id: PartnerId) => {
    onLineupChange(lineup.includes(id)
      ? lineup.filter((partnerId) => partnerId !== id)
      : lineup.length < 3 ? [...lineup, id] : [...lineup.slice(1), id])
  }

  const startBattle = () => {
    completedRef.current = false
    setState(createFormationBattle(battle, stats, skills, lineup, partners))
    setRunning(true)
  }

  useEffect(() => {
    if (!running || !state || state.outcome || pending) return
    const next = advanceFormationBattle(state)
    setPending({ nextState: next.state, event: next.event, stage: 'windup' })
  }, [pending, running, state])

  useEffect(() => {
    if (!pending) return
    const delay = pending.stage === 'windup' ? 270 / speed : 560 / speed
    const timer = window.setTimeout(() => {
      if (pending.stage === 'windup') {
        setState(pending.nextState)
        setPending((current) => current ? { ...current, stage: 'impact' } : null)
      } else {
        setPending(null)
      }
    }, delay)
    return () => window.clearTimeout(timer)
  }, [pending, speed])

  useEffect(() => {
    if (!state?.outcome || completedRef.current || pending) return
    completedRef.current = true
    setRunning(false)
    const result = formationResult(state)
    if (!result) return
    const timer = window.setTimeout(() => onComplete(result), 650 / speed)
    return () => window.clearTimeout(timer)
  }, [onComplete, pending, speed, state])

  const skipBattle = useCallback(() => {
    if (!state) return
    setRunning(false)
    setPending(null)
    setState(finishFormationBattle(state))
  }, [state])

  const order = useMemo(() => state
    ? [...state.units].filter((unit) => unit.hp > 0).sort((a, b) => b.speed - a.speed)
    : [], [state])

  if (!state) return <FormationSetup lineup={lineup} partners={partners} onToggle={togglePartner} onStarUp={onStarUpPartner} onStart={startBattle} />

  const activeEvent = pending?.event ?? null
  const impact = pending?.stage === 'impact'
  const allies = state.units.filter((unit) => unit.side === 'ally')
  const enemies = state.units.filter((unit) => unit.side === 'enemy')

  const renderUnit = (unit: FormationUnit) => {
    const position = unit.side === 'ally' ? ALLY_POSITIONS[unit.slot] : ENEMY_POSITIONS[unit.slot]
    const attacking = activeEvent?.actorId === unit.id && pending?.stage === 'windup'
    const hit = Boolean(impact && activeEvent?.targetIds.includes(unit.id) && activeEvent.kind === 'damage')
    const healed = Boolean(impact && activeEvent?.targetIds.includes(unit.id) && activeEvent.kind === 'heal')
    const down = unit.hp <= 0
    const amount = impact ? activeEvent?.amounts[unit.id] : undefined
    const large = unit.role === 'boss'
    const ultimate = Boolean(activeEvent?.actorId === unit.id && (activeEvent.effect === 'moon' || activeEvent.skillName === '月华净世'))
    return (
      <div
        key={unit.id}
        className={`absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[filter,opacity,transform] ${attacking ? unit.side === 'ally' ? 'formation-lunge-right z-30' : 'formation-lunge-left z-30' : ''} ${hit ? 'formation-hit brightness-150' : ''} ${down ? 'opacity-30 grayscale' : ''}`}
        style={{ ...position, animationDuration: `${620 / speed}ms` }}
      >
        <div className={`absolute -top-3 z-20 rounded-full border border-white/25 bg-slate-950/90 p-1 ${large ? 'w-32' : 'w-24'}`}>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className={`h-full transition-all duration-300 ${unit.side === 'ally' ? 'bg-emerald-400' : 'bg-rose-500'}`} style={{ width: `${Math.max(0, unit.hp / unit.maxHp) * 100}%` }} /></div>
        </div>
        <div className={`absolute bottom-3 rounded-[50%] bg-black/55 blur-sm ${large ? 'h-9 w-32' : 'h-6 w-20'}`} />
        <div className={large ? 'h-40 w-40 md:h-52 md:w-52' : unit.role === 'pet' ? 'h-20 w-20 md:h-24 md:w-24' : 'h-28 w-28 md:h-36 md:w-36'}>
          <UnitSprite unit={unit} attacking={attacking} hit={hit} ultimate={ultimate} />
        </div>
        <b className={`relative -mt-4 max-w-32 truncate rounded-full border bg-slate-950/85 px-2 py-0.5 shadow ${unit.side === 'ally' ? 'border-cyan-200/50 text-cyan-50' : 'border-rose-300/50 text-rose-50'} ${large ? 'text-sm' : 'text-[11px]'}`}>{unit.name}</b>
        {down && <span className="absolute top-1/2 z-30 rounded-full bg-slate-950/90 px-2 py-1 text-xs font-black text-slate-300">倒地</span>}
        {unit.shield > 0 && <span className="absolute right-0 top-5 z-30 rounded-full border border-cyan-200 bg-cyan-500/80 px-2 py-0.5 text-[10px] font-black">护盾 {unit.shield}</span>}
        {amount !== undefined && <span className={`formation-number absolute -top-8 z-40 text-3xl font-black drop-shadow-[0_3px_2px_#000] ${healed ? 'text-emerald-300' : activeEvent?.critical ? 'text-orange-300' : 'text-amber-100'}`}>{healed ? '+' : '-'}{amount}{activeEvent?.critical && !healed ? ' 暴击' : ''}</span>}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/90 p-2 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="斜向阵容自动战斗">
      <div className="max-h-full w-full max-w-5xl overflow-y-auto rounded-3xl border-2 border-amber-300/80 bg-slate-950 text-white shadow-2xl">
        <div className={`relative aspect-[16/9] min-h-[360px] overflow-hidden bg-slate-900 ${impact && activeEvent?.effect === 'moon' ? 'formation-camera-shake' : ''}`}>
          <Image src="/games/dream-journey/battle/arena-formation-v1.png" alt="原创长安月夜斜向阵容战场" fill sizes="1024px" className="object-cover" priority unoptimized />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(2,6,23,.45)_100%)]" />
          <div className="absolute left-3 top-3 z-40 rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2 text-xs shadow-lg">
            <b className="text-amber-200">第 {state.round} 回合</b>
            <span className="ml-2 text-slate-300">斜月阵 · {state.bossPhase === 2 ? 'Boss第二阶段' : '自动战斗'}</span>
          </div>
          <div className="absolute right-3 top-3 z-40 flex gap-1 rounded-xl border border-white/15 bg-slate-950/80 p-1.5">
            <button type="button" onClick={() => setRunning((current) => !current)} className="rounded-lg border border-white/15 px-3 py-1 text-xs font-black">{running ? '暂停' : '继续'}</button>
            {([1, 2, 5] as const).map((value) => <button key={value} type="button" aria-label={`${value}倍战斗速度`} aria-pressed={speed === value} onClick={() => setSpeed(value)} className={`rounded-lg px-2 py-1 text-xs font-black ${speed === value ? 'bg-amber-300 text-slate-950' : 'text-slate-300'}`}>×{value}</button>)}
            <button type="button" onClick={skipBattle} className="rounded-lg bg-white/10 px-3 py-1 text-xs font-black text-slate-200">跳过</button>
          </div>

          {activeEvent && <div className={`absolute left-1/2 top-10 z-40 -translate-x-1/2 rounded-full border px-5 py-2 text-center shadow-xl transition ${pending?.stage === 'windup' ? 'scale-105 border-amber-200 bg-slate-950/90 text-amber-100' : 'border-white/20 bg-indigo-950/90 text-white'}`}><b>{activeEvent.skillName}</b><span className="ml-2 text-xs opacity-75">{pending?.stage === 'windup' ? '蓄力' : '命中'}</span></div>}
          {activeEvent?.kind === 'phase' && <div className="absolute inset-0 z-20 grid place-items-center bg-fuchsia-950/35 formation-phase-flash"><div className="rounded-2xl border-2 border-fuchsia-200 bg-slate-950/90 px-6 py-4 text-center"><b className="text-2xl text-fuchsia-200">{activeEvent.skillName}</b><p className="mt-1 text-sm text-slate-200">{activeEvent.message}</p></div></div>}
          {impact && activeEvent?.kind === 'damage' && <div aria-hidden className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,rgba(251,191,36,.18),transparent_45%)] formation-impact-flash" />}
          {activeEvent?.effect === 'lotus' && <div aria-hidden className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_35%_58%,rgba(244,114,182,.45),transparent_32%)] formation-lotus-bloom" />}
          {activeEvent?.effect === 'thunder' && <div aria-hidden className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(112deg,transparent_44%,rgba(125,211,252,.9)_46%,white_48%,transparent_51%)] formation-thunder-strike" />}
          {activeEvent?.effect === 'dragon' || activeEvent?.effect === 'combo' ? <div aria-hidden className="pointer-events-none absolute inset-0 z-20 bg-[conic-gradient(from_80deg_at_52%_52%,transparent,rgba(34,211,238,.65),transparent_30%)] formation-dragon-arc" /> : null}
          {activeEvent?.effect === 'moon' && <div aria-hidden className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_70%_35%,rgba(168,85,247,.8),rgba(30,27,75,.78)_35%,transparent_68%)] formation-moonfall" />}

          {allies.map(renderUnit)}
          {enemies.map(renderUnit)}
        </div>

        <div className="border-y border-white/10 bg-indigo-950/50 px-3 py-2">
          <div className="flex items-center gap-2 overflow-x-auto text-[11px]" aria-label="自动出手顺序">
            <b className="shrink-0 text-amber-200">出手序列</b>
            {order.map((unit, index) => <span key={unit.id} className={`shrink-0 rounded-full border px-2 py-1 ${activeEvent?.actorId === unit.id ? 'border-amber-300 bg-amber-300/20 text-amber-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>{index + 1} · {unit.name}</span>)}
          </div>
        </div>

        <div className="grid gap-3 p-3 md:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/5 p-3 text-xs leading-5 text-slate-300">
            <b className="text-cyan-200">当前阵容协同</b>
            <p className="mt-1">破阵伙伴克制护卫，治疗伙伴自动救援低气血队友，群法伙伴负责清场，爆发伙伴参与主角合击。Boss半血必定召唤会治疗与施加护盾的新护卫。</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{lineup.map((id) => <span key={id} className="rounded-full bg-white/10 px-2 py-1">{PARTNERS[id].skill}</span>)}</div>
          </div>
          <div className="min-h-28 rounded-2xl border border-white/10 bg-black/30 p-3 text-xs leading-5" aria-live="polite">
            {state.log.map((line, index) => <p key={`${line}-${index}`} className={index === 0 ? 'text-amber-200' : 'text-slate-400'}>{line}</p>)}
          </div>
        </div>

        <style jsx global>{`
          @keyframes formation-lunge-right { 0% { transform: translate(-50%,-50%); } 55% { transform: translate(55%,-85%) scale(1.08); } 100% { transform: translate(-50%,-50%); } }
          @keyframes formation-lunge-left { 0% { transform: translate(-50%,-50%); } 55% { transform: translate(-145%,-10%) scale(1.08); } 100% { transform: translate(-50%,-50%); } }
          @keyframes formation-hit { 0%,100% { transform: translate(-50%,-50%); } 35% { transform: translate(-57%,-48%) rotate(-4deg); } 60% { transform: translate(-44%,-53%) rotate(3deg); } }
          @keyframes formation-number { 0% { opacity: 0; transform: translateY(10px) scale(.8); } 25% { opacity: 1; transform: translateY(0) scale(1.18); } 100% { opacity: 0; transform: translateY(-44px) scale(.95); } }
          @keyframes formation-impact-flash { 0%,100% { opacity: 0; } 30% { opacity: 1; } }
          @keyframes formation-phase-flash { 0% { opacity: 0; } 18%,82% { opacity: 1; } 100% { opacity: 0; } }
          @keyframes formation-lotus-bloom { 0% { opacity: 0; transform: scale(.6); } 50% { opacity: 1; } 100% { opacity: 0; transform: scale(1.35); } }
          @keyframes formation-thunder-strike { 0%,100% { opacity: 0; } 35% { opacity: 1; } 55% { opacity: .25; } 70% { opacity: .8; } }
          @keyframes formation-dragon-arc { 0% { opacity: 0; transform: rotate(-18deg) scale(.7); } 45% { opacity: 1; } 100% { opacity: 0; transform: rotate(16deg) scale(1.2); } }
          @keyframes formation-moonfall { 0% { opacity: 0; transform: scale(1.4); } 45% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.92); } }
          @keyframes formation-camera-shake { 0%,100% { transform: translate(0); } 25% { transform: translate(-4px,2px); } 50% { transform: translate(4px,-2px); } 75% { transform: translate(-2px,-1px); } }
          .formation-lunge-right { animation: formation-lunge-right 620ms cubic-bezier(.2,.75,.25,1) both; }
          .formation-lunge-left { animation: formation-lunge-left 620ms cubic-bezier(.2,.75,.25,1) both; }
          .formation-hit { animation: formation-hit 420ms ease-out both; }
          .formation-number { animation: formation-number 700ms ease-out both; }
          .formation-impact-flash { animation: formation-impact-flash 420ms ease-out both; }
          .formation-phase-flash { animation: formation-phase-flash 900ms ease-in-out both; }
          .formation-lotus-bloom { animation: formation-lotus-bloom 760ms ease-out both; }
          .formation-thunder-strike { animation: formation-thunder-strike 520ms ease-out both; }
          .formation-dragon-arc { animation: formation-dragon-arc 720ms ease-out both; }
          .formation-moonfall { animation: formation-moonfall 900ms ease-in both; }
          .formation-camera-shake { animation: formation-camera-shake 360ms linear both; }
          @media (prefers-reduced-motion: reduce) { .formation-lunge-right,.formation-lunge-left,.formation-hit,.formation-number,.formation-impact-flash,.formation-phase-flash,.formation-lotus-bloom,.formation-thunder-strike,.formation-dragon-arc,.formation-moonfall,.formation-camera-shake { animation: none; } }
        `}</style>
      </div>
    </div>
  )
}
