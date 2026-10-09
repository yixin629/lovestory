import { GameState, calculateHuScore } from '../engine/MahjongLogic'
import PlayerAvatar from './PlayerAvatar'

interface GameEndModalProps {
  gameState: GameState
  currentUser: string
  onReturnToLobby: () => void
}

export default function GameEndModal({ gameState, currentUser, onReturnToLobby }: GameEndModalProps) {
  if (gameState.status !== 'finished') return null

  const winner = gameState.players.find(p => p.status === 'hu')
  const discarderId = gameState.lastAction?.type === 'discard' ? gameState.lastAction.playerId : null
  const isSelfDrawn = !discarderId || discarderId === winner?.id

  const losers = gameState.players.filter(p => p.id !== winner?.id).map(p => p.id)

  const scoreChanges = winner
    ? calculateHuScore(
        winner.id,
        isSelfDrawn ? losers : [discarderId || losers[0]],
        gameState.mode,
        gameState.baseMultiplier,
        isSelfDrawn,
      )
    : {}

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 overflow-hidden rounded-2xl shadow-2xl">
        {/* Gold header bar */}
        <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 px-6 py-4 text-center">
          <h2 className="text-2xl font-black text-white drop-shadow-md">
            {winner ? '对局结束' : '流局'}
          </h2>
        </div>

        {/* Body */}
        <div className="bg-gradient-to-b from-[#1a3a2a] to-[#0f2a1c] px-6 py-6 text-center">
          {winner ? (
            <>
              <div className="text-5xl mb-2"><PlayerAvatar avatar={winner.avatar} fallback="😊" /></div>
              <div className="text-xl font-bold text-amber-300 mb-1">{winner.name} 胡啦!</div>
              <div className="inline-block bg-black/30 text-amber-200/80 text-xs px-3 py-1 rounded-full mb-6">
                {isSelfDrawn ? '自摸' : '点炮'} &middot; {gameState.mode === 'sichuan' ? '四川定缺' : '经典模式'}
              </div>

              {/* Score table */}
              <div className="space-y-2">
                {gameState.players.map(p => {
                  const change = scoreChanges[p.id] || 0
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-4 py-2.5 rounded-lg ${
                        change > 0
                          ? 'bg-green-900/40 border border-green-700/30'
                          : change < 0
                            ? 'bg-red-900/30 border border-red-700/20'
                            : 'bg-white/5 border border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg"><PlayerAvatar avatar={p.avatar} fallback="😊" /></span>
                        <span className="text-white/90 text-sm font-medium">
                          {p.name}
                          {p.id === currentUser && (
                            <span className="text-amber-400 ml-1">(你)</span>
                          )}
                        </span>
                      </div>
                      <div className={`text-lg font-black ${
                        change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-white/40'
                      }`}>
                        {change > 0 ? '+' : ''}{change}
                        <span className="text-xs ml-0.5 font-normal opacity-70">豆</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="py-8">
              <div className="text-5xl mb-4">🤝</div>
              <div className="text-xl text-amber-200 font-bold">牌已摸完，流局！</div>
            </div>
          )}

          {/* Action button */}
          <button
            onClick={onReturnToLobby}
            className="mt-6 w-full py-3.5 rounded-xl font-bold text-lg
              bg-gradient-to-r from-amber-500 to-yellow-500
              text-black shadow-lg shadow-amber-500/25
              hover:from-amber-400 hover:to-yellow-400
              active:scale-[0.98] transition-all"
          >
            返回大厅
          </button>
        </div>
      </div>
    </div>
  )
}
