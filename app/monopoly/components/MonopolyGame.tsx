'use client'

import { useEffect, useState } from 'react'
import ThreeDDice from '@/app/components/ui/ThreeDDice'
import {
  BOARD,
  buyCurrentProperty,
  createGame,
  finishTurn,
  MAX_ROUNDS,
  playerNetWorth,
  rollAndMove,
  upgradeCurrentProperty,
} from '../engine/game'
import { clearSavedGame, loadGame, saveGame } from '../lib/storage'

const cellPosition = (index: number) => {
  if (index <= 6) return { gridRow: 7, gridColumn: 7 - index }
  if (index <= 12) return { gridRow: 13 - index, gridColumn: 1 }
  if (index <= 18) return { gridRow: 1, gridColumn: index - 11 }
  return { gridRow: index - 18, gridColumn: 7 }
}

export default function MonopolyGame() {
  const [game, setGame] = useState(createGame)
  const [rolling, setRolling] = useState(false)
  const [saveReady, setSaveReady] = useState(false)
  const current = game.players[game.currentPlayer]
  const currentCell = BOARD[current.position]
  const currentProperty = game.properties[current.position]
  const upgradeCost = Math.round((currentCell.price ?? 0) * 0.6)

  useEffect(() => {
    const savedGame = loadGame()
    if (savedGame) setGame(savedGame)
    setSaveReady(true)
  }, [])

  useEffect(() => {
    if (saveReady) saveGame(game)
  }, [game, saveReady])

  const roll = () => {
    if (rolling || game.phase !== 'roll') return
    setRolling(true)
    const value = Math.floor(Math.random() * 6) + 1
    const chanceIndex = Math.floor(Math.random() * 6)
    window.setTimeout(() => {
      setGame((state) => rollAndMove(state, value, chanceIndex))
      setRolling(false)
    }, 1450)
  }

  const skipDecision = () => setGame((state) => ({ ...state, phase: 'turn-end', message: `${current.name} 决定暂不操作` }))

  const resetGame = () => {
    if (!window.confirm('确定要清除当前进度并重新开局吗？')) return
    clearSavedGame()
    setGame(createGame())
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="card overflow-hidden p-3 sm:p-5" aria-label="大富翁棋盘">
        <div className="mx-auto grid aspect-square w-full max-w-[760px] grid-cols-7 grid-rows-7 gap-1 rounded-[2rem] bg-gradient-to-br from-rose-100 via-amber-50 to-cyan-100 p-2 shadow-inner sm:gap-2 sm:p-3">
          {BOARD.map((cell, index) => {
            const property = game.properties[cell.id]
            const tokens = game.players.filter((player) => player.position === index)
            return (
              <div
                key={cell.id}
                style={cellPosition(index)}
                className={`relative flex min-w-0 flex-col items-center justify-center rounded-lg border border-white/80 p-0.5 text-center shadow-sm sm:rounded-xl sm:p-1 ${cell.color}`}
                title={`${cell.name}${cell.price ? ` · 售价 ¥${cell.price}` : ''}`}
              >
                {property && <span className={`absolute inset-x-1 top-0 h-1 rounded-full ${property.ownerId === 0 ? 'bg-rose-500' : 'bg-blue-500'}`} />}
                <span className="text-base leading-none sm:text-2xl" aria-hidden="true">{cell.icon}</span>
                <span className="mt-0.5 hidden max-w-full truncate text-[10px] font-bold text-slate-700 sm:block md:text-xs">{cell.name}</span>
                {cell.kind === 'property' && <span className="hidden text-[9px] text-slate-500 md:block">{property ? `${property.level}级` : `¥${cell.price}`}</span>}
                {tokens.length > 0 && (
                  <span className="absolute -bottom-1 left-1/2 z-10 flex -translate-x-1/2 rounded-full bg-white/90 px-0.5 text-sm shadow sm:text-xl">
                    {tokens.map((player) => <span key={player.id}>{player.token}</span>)}
                  </span>
                )}
              </div>
            )
          })}

          <div className="col-start-2 col-end-7 row-start-2 row-end-7 flex flex-col items-center justify-center rounded-[1.5rem] border border-white/70 bg-white/70 p-3 text-center shadow-inner backdrop-blur-sm">
            <span className="badge-amber mb-2">第 {game.round} / {MAX_ROUNDS} 回合</span>
            <h2 className="text-lg font-black text-slate-800 sm:text-3xl">甜蜜大富翁</h2>
            <p className="mt-1 line-clamp-2 max-w-sm text-xs font-medium text-slate-600 sm:text-sm" aria-live="polite">{game.message}</p>
            {game.phase === 'roll' && <ThreeDDice value={game.lastRoll} rolling={rolling} onRoll={roll} />}
            {game.phase === 'decision' && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {!currentProperty && (
                  <button className="btn-primary px-4 py-2 text-sm" disabled={current.cash < (currentCell.price ?? 0)} onClick={() => setGame(buyCurrentProperty(game))}>
                    买下 ¥{currentCell.price}
                  </button>
                )}
                {currentProperty?.ownerId === current.id && currentProperty.level < 3 && (
                  <button className="btn-primary px-4 py-2 text-sm" disabled={current.cash < upgradeCost} onClick={() => setGame(upgradeCurrentProperty(game))}>
                    升级 ¥{upgradeCost}
                  </button>
                )}
                <button className="btn-secondary px-4 py-2 text-sm" onClick={skipDecision}>暂不操作</button>
              </div>
            )}
            {game.phase === 'turn-end' && <button className="btn-primary mt-4 px-5 py-2 text-sm" onClick={() => setGame(finishTurn(game))}>结束回合</button>}
            {game.phase === 'finished' && (
              <div className="mt-4">
                <div className="text-4xl">🏆</div>
                <p className="font-bold text-slate-800">{game.players[game.winnerId ?? 0].name} 获胜</p>
                <button className="btn-primary mt-3 px-5 py-2 text-sm" onClick={() => setGame(createGame())}>再来一局</button>
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <span className="font-medium text-emerald-800">{saveReady ? '✓ 进度已自动保存' : '正在读取进度…'}</span>
          <button type="button" onClick={resetGame} className="font-semibold text-rose-700 hover:underline">重新开局</button>
        </div>
        <div className="card p-4">
          <h2 className="mb-3 font-bold text-gray-900">玩家资产</h2>
          <div className="space-y-3">
            {game.players.map((player) => {
              const owned = Object.values(game.properties).filter((property) => property.ownerId === player.id).length
              return (
                <div key={player.id} className={`rounded-xl border p-3 ${game.currentPlayer === player.id && game.phase !== 'finished' ? player.id === 0 ? 'border-rose-400 bg-rose-50' : 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white/80'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{player.token} {player.name}</span>
                    <span className="font-black text-emerald-700">¥{player.cash}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>地产 {owned} 块</span><span>总资产 ¥{playerNetWorth(game, player.id)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-bold text-gray-900">最近动态</h2>
          <ol className="space-y-2 text-sm text-gray-600">
            {game.log.map((entry, index) => <li key={`${entry}-${index}`} className="border-l-2 border-primary/30 pl-3">{entry}</li>)}
          </ol>
        </div>

        <details className="card p-4 text-sm">
          <summary className="cursor-pointer font-bold text-gray-900">玩法说明</summary>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-600">
            <li>经过起点获得 ¥200，可购买无主地产。</li>
            <li>落到对方地产需付租金，地产最高升至 3 级。</li>
            <li>资金低于 0 时破产；20 回合后总资产最高者获胜。</li>
          </ul>
        </details>
      </aside>
    </div>
  )
}
