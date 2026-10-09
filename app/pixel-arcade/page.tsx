'use client'

import { useState } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import PageHeader from '@/app/components/ui/PageHeader'
import ArcadeStage from './components/ArcadeStage'
import { ARCADE_GAMES, type ArcadeGameId } from './types'

export default function PixelArcadePage() {
  const [selected, setSelected] = useState<ArcadeGameId>('sky-hop')
  const game = ARCADE_GAMES.find((item) => item.id === selected) ?? ARCADE_GAMES[0]

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#312e81_0,#111827_42%,#030712_100%)] px-4 pb-12 pt-20 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <BackButton href="/" text="返回首页" />
        <PageHeader title="像素游戏厅" emoji="🕹️" subtitle="七台原创致敬街机、三十五个关卡，键盘和手机都能直接玩" />

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7" aria-label="选择小游戏">
          {ARCADE_GAMES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              aria-pressed={selected === item.id}
              className={`group rounded-2xl border p-3 text-left transition sm:p-4 ${selected === item.id ? 'border-white bg-white/20 shadow-[0_0_28px_rgba(167,139,250,.35)]' : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'}`}
            >
              <span className="text-3xl" aria-hidden="true">{item.icon}</span>
              <span className="mt-2 block font-black">{item.name}</span>
              <span className="mt-1 block text-[11px] text-white/60">{item.inspiration}</span>
            </button>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <ArcadeStage key={game.id} game={game} />
          <aside className="space-y-4">
            <section className={`rounded-3xl bg-gradient-to-br ${game.accent} p-5 shadow-xl`}>
              <div className="text-5xl">{game.icon}</div>
              <h2 className="mt-3 text-2xl font-black">{game.name}</h2>
              <p className="mt-2 text-sm leading-6 text-white/85">{game.description}</p>
              <div className="mt-4 rounded-2xl bg-black/20 px-4 py-3 text-sm"><span className="font-bold">核心操作：</span>{game.controls}</div>
            </section>
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70 backdrop-blur">
              <h3 className="font-black text-white">原创致敬说明</h3>
              <p className="mt-2 leading-6">玩法灵感来自经典游戏类型，角色、美术、名称和关卡均为本站原创，不使用原作素材。</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
