import type { Point, QuestStage } from '../types'

interface CaveMiniMapProps {
  position: Point
  questStage: QuestStage
  chestOpened: boolean
  onNavigate: (target: Point, name: string) => void
}

function markerPosition(point: Point) {
  return { left: `${point.x / 900 * 100}%`, top: `${point.y / 560 * 100}%` }
}

export default function CaveMiniMap({ position, questStage, chestOpened, onNavigate }: CaveMiniMapProps) {
  const bossActive = questStage === 'boss-ready'
  const target = bossActive ? { x: 450, y: 145 } : { x: 450, y: 520 }
  return (
    <section className="rounded-2xl border border-rose-300/30 bg-slate-950/55 p-3 shadow-xl">
      <div className="mb-2"><p className="text-[10px] font-black tracking-[0.22em] text-rose-300">洞窟地图</p><p className="text-sm font-bold">火焰祭坛 · 内部</p></div>
      <div className="relative aspect-[9/5.6] overflow-hidden rounded-xl border border-white/20 bg-cover bg-center" style={{ backgroundImage: "url('/games/dream-journey/scenes/crimson-cave.png')" }} aria-label="赤焰洞窟地图">
        <div className="absolute inset-0 bg-slate-950/20" />
        <button type="button" onClick={() => bossActive && onNavigate({ x: 450, y: 145 }, '火焰祭坛')} className={`absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white text-[10px] ${bossActive ? 'animate-pulse bg-amber-300 text-slate-950 ring-4 ring-amber-300/40' : 'bg-slate-500'}`} style={markerPosition({ x: 450, y: 145 })} title="火焰祭坛">{bossActive ? '!' : '✓'}</button>
        <span className={`absolute grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white text-[8px] ${chestOpened ? 'bg-slate-500' : 'bg-fuchsia-400'}`} style={markerPosition({ x: 710, y: 335 })} title={chestOpened ? '宝箱已开启' : '熔岩宝箱'}>◆</span>
        <button type="button" onClick={() => !bossActive && onNavigate({ x: 450, y: 520 }, '洞窟出口')} className={`absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white text-[9px] ${bossActive ? 'bg-cyan-400' : 'animate-pulse bg-amber-300 text-slate-950 ring-4 ring-amber-300/40'}`} style={markerPosition({ x: 450, y: 520 })} title="返回长安">↩</button>
        <span className="absolute z-10 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-sky-500 text-[9px] shadow-[0_0_10px_#38bdf8]" style={markerPosition(position)} title="你在这里">▲</span>
      </div>
      <button type="button" onClick={() => onNavigate(target, bossActive ? '火焰祭坛' : '洞窟出口')} className="mt-2 flex w-full items-center justify-between rounded-xl bg-rose-300/10 px-3 py-2 text-xs"><span className="text-rose-100">当前目标</span><b className="text-amber-200">{bossActive ? '上方 · 火焰祭坛' : '下方 · 返回长安'} ➤</b></button>
    </section>
  )
}
