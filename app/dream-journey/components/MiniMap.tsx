'use client'

import { useState } from 'react'
import { BOSS, MAP_LANDMARKS, NPCS, PATROL_TARGET, PORTALS, WORLD_SIZE, getQuestTarget } from '../engine/world'
import type { NpcDefinition, Point, QuestStage } from '../types'

interface MiniMapProps {
  position: Point
  questStage: QuestStage
  sceneName: string
  onNavigate: (target: Point, name: string, npc?: NpcDefinition) => void
}

function markerPosition(point: Point) {
  return { left: `${point.x / WORLD_SIZE * 100}%`, top: `${point.y / WORLD_SIZE * 100}%` }
}

function directionTo(from: Point, to: Point) {
  const directions = ['东', '东南', '南', '西南', '西', '西北', '北', '东北']
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  return directions[Math.round((angle / (Math.PI / 4) + 8)) % 8]
}

function MapSurface({ position, questStage, expanded = false, onNavigate }: Omit<MiniMapProps, 'sceneName'> & { expanded?: boolean }) {
  const target = getQuestTarget(questStage)
  const entities = target?.id === PATROL_TARGET.id ? [...NPCS, PATROL_TARGET] : questStage === 'boss-ready' ? [...NPCS, BOSS] : NPCS
  const line = target ? {
    x1: position.x / WORLD_SIZE * 100,
    y1: position.y / WORLD_SIZE * 100,
    x2: target.x / WORLD_SIZE * 100,
    y2: target.y / WORLD_SIZE * 100,
  } : null

  return (
    <div
      className={`relative overflow-hidden border border-white/25 bg-cover bg-center shadow-inner ${expanded ? 'aspect-square rounded-2xl' : 'aspect-[5/4] rounded-xl'}`}
      style={{ backgroundImage: "url('/games/dream-journey/background/bg.jpg')" }}
      role="group"
      aria-label={target ? `长安地图，任务目标${target.name}` : '梦境长安地图'}
    >
      <div className="absolute inset-0 bg-slate-950/20" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] bg-[size:25%_25%]" />
      {line && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <line {...line} stroke="rgba(253,224,71,.4)" strokeWidth="2.6" strokeDasharray="2.5 2" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {MAP_LANDMARKS.map((landmark) => (
        <span key={landmark.id} className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-slate-950/60 px-1 font-bold text-white/75 ${expanded ? 'text-xs' : 'text-[8px]'}`} style={markerPosition(landmark)}>
          {landmark.name}
        </span>
      ))}
      {PORTALS.map((portal) => (
        <span key={portal.id} className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-cyan-300 shadow-[0_0_8px_#67e8f9]" style={markerPosition(portal)} title={portal.name} />
      ))}
      {entities.map((entity) => {
        const objective = entity.id === target?.id
        return (
          <button
            type="button"
            key={entity.id}
            className={`absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border shadow ${objective ? 'h-5 w-5 animate-pulse border-white bg-amber-300 text-[10px] text-slate-950 ring-4 ring-amber-300/45' : 'h-3 w-3 border-white/80 bg-fuchsia-400'}`}
            style={markerPosition(entity)}
            title={`自动前往${entity.name}`}
            aria-label={`自动前往${entity.name}`}
            onClick={() => onNavigate(entity, entity.name, entity)}
          >
            {objective ? '!' : ''}
          </button>
        )
      })}
      <span className="absolute z-20 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-sky-500 text-[9px] shadow-[0_0_12px_#38bdf8] ring-4 ring-sky-400/30" style={markerPosition(position)} title="你在这里">▲</span>
    </div>
  )
}

export default function MiniMap({ position, questStage, sceneName, onNavigate }: MiniMapProps) {
  const [expanded, setExpanded] = useState(false)
  const target = getQuestTarget(questStage)
  const distance = target ? Math.round(Math.hypot(target.x - position.x, target.y - position.y) / 10) : 0

  return (
    <>
      <section className="rounded-2xl border border-sky-300/30 bg-[linear-gradient(145deg,rgba(8,47,73,.86),rgba(15,23,42,.92))] p-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div><p className="text-[10px] font-black tracking-[0.22em] text-sky-300">区域地图</p><p className="text-sm font-bold text-white">{sceneName}</p></div>
          <button type="button" onClick={() => setExpanded(true)} className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-bold text-sky-100 hover:bg-white/20">全图</button>
        </div>
        <MapSurface position={position} questStage={questStage} onNavigate={onNavigate} />
        {target ? (
          <button type="button" onClick={() => onNavigate(target, target.name, target)} className="mt-2 flex w-full items-center justify-between rounded-xl border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-left text-xs hover:bg-amber-300/20">
            <span><b className="text-amber-200">任务目标</b><br /><span className="text-white">{target.name}</span></span>
            <b className="text-amber-200">{directionTo(position, target)} · {distance} 步 ➤</b>
          </button>
        ) : <p className="mt-2 rounded-lg bg-slate-950/35 px-3 py-2 text-xs text-slate-300">当前为自由探索状态</p>}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-300">
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400" />你</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-300" />任务</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-fuchsia-400" />人物</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-cyan-300" />传送阵</span>
        </div>
      </section>

      {expanded && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="长安全图">
          <div className="w-full max-w-2xl rounded-3xl border-2 border-amber-200/50 bg-slate-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div><p className="text-xs font-black tracking-[0.25em] text-amber-300">梦境长安 · 世界地图</p><h2 className="text-xl font-black">{sceneName}</h2></div>
              <button type="button" onClick={() => setExpanded(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl" aria-label="关闭世界地图">×</button>
            </div>
            <MapSurface position={position} questStage={questStage} expanded onNavigate={(nextTarget, name, npc) => { onNavigate(nextTarget, name, npc); setExpanded(false) }} />
            <p className="mt-3 text-center text-sm text-slate-300">点击金色任务标记即可关闭地图并开始自动寻路</p>
          </div>
        </div>
      )}
    </>
  )
}
