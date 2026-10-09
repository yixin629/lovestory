import type { Point, QuestStage } from '../types'

interface CaveGuideProps {
  position: Point
  questStage: QuestStage
  chestOpened: boolean
  onNavigate: (target: Point, name: string) => void
}

const BOSS_TARGET = { x: 450, y: 145 }
const EXIT_TARGET = { x: 450, y: 520 }

export default function CaveGuide({ position, questStage, chestOpened, onNavigate }: CaveGuideProps) {
  const huntingBoss = questStage === 'boss-ready'
  const target = huntingBoss ? BOSS_TARGET : EXIT_TARGET
  const targetName = huntingBoss ? '火焰祭坛' : '洞窟出口'
  const distance = Math.round(Math.hypot(target.x - position.x, target.y - position.y) / 10)

  return (
    <section className="overflow-hidden rounded-2xl border border-rose-300/40 bg-[linear-gradient(145deg,rgba(127,29,29,.74),rgba(15,23,42,.96))] shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/35 px-4 py-3">
        <div><p className="text-[10px] font-black tracking-[0.24em] text-rose-300">副本目标 · 赤焰洞窟</p><p className="mt-0.5 text-xs text-rose-100">独立场景指引</p></div>
        <span className="grid h-9 w-9 place-items-center rounded-full border border-rose-200/50 bg-rose-400 font-black text-slate-950">3</span>
      </div>
      <div className="p-4">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-rose-200/40 bg-rose-300/15 text-2xl">{huntingBoss ? '👺' : '🌀'}</span>
          <div><h2 className="font-black text-rose-100">{huntingBoss ? '登上祭坛挑战妖王' : '从传送阵返回长安'}</h2><p className="mt-1 text-xs leading-5 text-slate-200">{huntingBoss ? `向洞窟上方前进。右侧${chestOpened ? '宝箱已开启' : '还有熔岩宝箱可以探索'}。` : '妖王已败，从下方传送阵离开洞窟并向师父复命。'}</p></div>
        </div>
        <button type="button" onClick={() => onNavigate(target, targetName)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-rose-300 to-red-600 px-4 py-3 font-black text-white shadow-[0_4px_0_#7f1d1d] active:translate-y-1 active:shadow-none">➤ {huntingBoss ? '前往火焰祭坛' : '前往洞窟出口'} <span className="rounded-full bg-slate-950/20 px-2 py-0.5 text-[10px]">{distance} 步</span></button>
      </div>
    </section>
  )
}
