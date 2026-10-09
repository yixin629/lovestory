import type { BoardCell, ChanceCard, GameState, Player } from '../types'

export const STARTING_CASH = 1500
export const PASS_START_REWARD = 200
export const MAX_ROUNDS = 20

export const BOARD: BoardCell[] = [
  { id: 0, name: '甜蜜起点', icon: '🏠', kind: 'start', color: 'bg-rose-100' },
  { id: 1, name: '早餐街', icon: '🥐', kind: 'property', price: 120, rent: 28, color: 'bg-amber-100' },
  { id: 2, name: '机会', icon: '🎁', kind: 'chance', color: 'bg-violet-100' },
  { id: 3, name: '咖啡角', icon: '☕', kind: 'property', price: 140, rent: 34, color: 'bg-amber-100' },
  { id: 4, name: '生活账单', icon: '🧾', kind: 'tax', amount: 90, color: 'bg-slate-100' },
  { id: 5, name: '花店', icon: '🌷', kind: 'property', price: 180, rent: 44, color: 'bg-pink-100' },
  { id: 6, name: '小憩公园', icon: '🌳', kind: 'rest', color: 'bg-emerald-100' },
  { id: 7, name: '电影院', icon: '🎬', kind: 'property', price: 220, rent: 54, color: 'bg-sky-100' },
  { id: 8, name: '机会', icon: '💌', kind: 'chance', color: 'bg-violet-100' },
  { id: 9, name: '电玩城', icon: '🕹️', kind: 'property', price: 240, rent: 60, color: 'bg-sky-100' },
  { id: 10, name: '纪念日晚餐', icon: '🍽️', kind: 'tax', amount: 120, color: 'bg-slate-100' },
  { id: 11, name: '艺术馆', icon: '🖼️', kind: 'property', price: 280, rent: 70, color: 'bg-indigo-100' },
  { id: 12, name: '临时加班', icon: '🔒', kind: 'jail', color: 'bg-orange-100' },
  { id: 13, name: '露营地', icon: '⛺', kind: 'property', price: 300, rent: 76, color: 'bg-teal-100' },
  { id: 14, name: '机会', icon: '✨', kind: 'chance', color: 'bg-violet-100' },
  { id: 15, name: '温泉旅馆', icon: '♨️', kind: 'property', price: 340, rent: 86, color: 'bg-teal-100' },
  { id: 16, name: '免费停车', icon: '🅿️', kind: 'rest', color: 'bg-emerald-100' },
  { id: 17, name: '海景公寓', icon: '🌊', kind: 'property', price: 380, rent: 96, color: 'bg-cyan-100' },
  { id: 18, name: '旅行基金', icon: '✈️', kind: 'tax', amount: 150, color: 'bg-slate-100' },
  { id: 19, name: '星空酒店', icon: '🌌', kind: 'property', price: 420, rent: 108, color: 'bg-fuchsia-100' },
  { id: 20, name: '机会', icon: '🎲', kind: 'chance', color: 'bg-violet-100' },
  { id: 21, name: '海岛别墅', icon: '🏝️', kind: 'property', price: 460, rent: 120, color: 'bg-fuchsia-100' },
  { id: 22, name: '甜品工坊', icon: '🍰', kind: 'property', price: 200, rent: 50, color: 'bg-pink-100' },
  { id: 23, name: '幸运喷泉', icon: '⛲', kind: 'rest', color: 'bg-emerald-100' },
]

export const CHANCE_CARDS: ChanceCard[] = [
  { title: '意外奖金', description: '共同计划完成得很棒，获得奖励', amount: 180 },
  { title: '约会报销', description: '抽中本月约会基金', amount: 120 },
  { title: '奶茶自由', description: '请全场喝奶茶', amount: -80 },
  { title: '旅行特价', description: '抢到特价票，省下一笔钱', amount: 150 },
  { title: '手机碎屏', description: '临时维修支出', amount: -140 },
  { title: '心动红包', description: '收到一个神秘红包', amount: 100 },
]

const appendLog = (state: GameState, entry: string) => ({
  ...state,
  message: entry,
  log: [entry, ...state.log].slice(0, 8),
})

export function createGame(playerNames: [string, string] = ['桃桃', '蓝蓝']): GameState {
  const players: Player[] = [
    { id: 0, name: playerNames[0], token: '🐰', cash: STARTING_CASH, position: 0, inJail: false, bankrupt: false },
    { id: 1, name: playerNames[1], token: '🐻', cash: STARTING_CASH, position: 0, inJail: false, bankrupt: false },
  ]

  return {
    players,
    properties: {},
    currentPlayer: 0,
    round: 1,
    phase: 'roll',
    lastRoll: 1,
    message: `${playerNames[0]}先手，点击骰子出发！`,
    log: ['游戏开始：每人拥有 ¥1,500'],
    winnerId: null,
  }
}

function updateCash(state: GameState, playerId: number, amount: number) {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? { ...player, cash: player.cash + amount } : player,
    ),
  }
}

function checkBankruptcy(state: GameState): GameState {
  const insolvent = state.players.find((player) => player.cash < 0)
  if (!insolvent) return state

  const winner = state.players.find((player) => player.id !== insolvent.id) ?? state.players[0]
  return appendLog(
    {
      ...state,
      players: state.players.map((player) =>
        player.id === insolvent.id ? { ...player, bankrupt: true } : player,
      ),
      phase: 'finished',
      winnerId: winner.id,
    },
    `${insolvent.name} 资金不足，${winner.name} 获胜！`,
  )
}

export function rollAndMove(state: GameState, roll: number, chanceIndex: number): GameState {
  if (state.phase !== 'roll') return state
  const player = state.players[state.currentPlayer]

  if (player.inJail) {
    return appendLog(
      {
        ...state,
        lastRoll: roll,
        phase: 'turn-end',
        players: state.players.map((item) =>
          item.id === player.id ? { ...item, inJail: false } : item,
        ),
      },
      `${player.name} 结束加班，本回合休息`,
    )
  }

  const rawPosition = player.position + roll
  const passedStart = rawPosition >= BOARD.length
  const position = rawPosition % BOARD.length
  let next: GameState = {
    ...state,
    lastRoll: roll,
    players: state.players.map((item) =>
      item.id === player.id
        ? { ...item, position, cash: item.cash + (passedStart ? PASS_START_REWARD : 0) }
        : item,
    ),
  }
  const cell = BOARD[position]
  const prefix = passedStart ? `经过起点获得 ¥${PASS_START_REWARD}。` : ''

  if (cell.kind === 'property') {
    const property = next.properties[cell.id]
    if (!property) {
      return appendLog({ ...next, phase: 'decision' }, `${prefix}${player.name} 来到${cell.name}，可以购买这块地产`)
    }
    if (property.ownerId === player.id) {
      return appendLog({ ...next, phase: 'decision' }, `${prefix}${player.name} 回到自己的${cell.name}，可以升级地产`)
    }
    const rent = (cell.rent ?? 0) * property.level
    next = updateCash(next, player.id, -rent)
    next = updateCash(next, property.ownerId, rent)
    const owner = next.players[property.ownerId]
    return checkBankruptcy(appendLog({ ...next, phase: 'turn-end' }, `${prefix}${player.name} 向${owner.name}支付 ${cell.name} 租金 ¥${rent}`))
  }

  if (cell.kind === 'chance') {
    const card = CHANCE_CARDS[chanceIndex % CHANCE_CARDS.length]
    next = updateCash(next, player.id, card.amount)
    return checkBankruptcy(appendLog({ ...next, phase: 'turn-end' }, `${prefix}${card.title}：${card.description} ${card.amount >= 0 ? '+' : '-'}¥${Math.abs(card.amount)}`))
  }

  if (cell.kind === 'tax') {
    next = updateCash(next, player.id, -(cell.amount ?? 0))
    return checkBankruptcy(appendLog({ ...next, phase: 'turn-end' }, `${prefix}${player.name} 支付${cell.name} ¥${cell.amount}`))
  }

  if (cell.kind === 'jail') {
    next = {
      ...next,
      phase: 'turn-end',
      players: next.players.map((item) => item.id === player.id ? { ...item, inJail: true } : item),
    }
    return appendLog(next, `${prefix}${player.name} 遇到临时加班，下回合暂停一次`)
  }

  return appendLog({ ...next, phase: 'turn-end' }, `${prefix}${player.name} 在${cell.name}放松了一会儿`)
}

export function buyCurrentProperty(state: GameState): GameState {
  if (state.phase !== 'decision') return state
  const player = state.players[state.currentPlayer]
  const cell = BOARD[player.position]
  if (cell.kind !== 'property' || state.properties[cell.id] || player.cash < (cell.price ?? 0)) return state

  const price = cell.price ?? 0
  return appendLog(
    {
      ...updateCash(state, player.id, -price),
      properties: { ...state.properties, [cell.id]: { ownerId: player.id, level: 1 } },
      phase: 'turn-end',
    },
    `${player.name} 花费 ¥${price} 买下了${cell.name}`,
  )
}

export function upgradeCurrentProperty(state: GameState): GameState {
  if (state.phase !== 'decision') return state
  const player = state.players[state.currentPlayer]
  const cell = BOARD[player.position]
  const property = state.properties[cell.id]
  const cost = Math.round((cell.price ?? 0) * 0.6)
  if (!property || property.ownerId !== player.id || property.level >= 3 || player.cash < cost) return state

  return appendLog(
    {
      ...updateCash(state, player.id, -cost),
      properties: { ...state.properties, [cell.id]: { ...property, level: property.level + 1 } },
      phase: 'turn-end',
    },
    `${player.name} 花费 ¥${cost} 将${cell.name}升到 ${property.level + 1} 级`,
  )
}

export function finishTurn(state: GameState): GameState {
  if (state.phase === 'finished') return state
  const nextPlayer = state.currentPlayer === state.players.length - 1 ? 0 : state.currentPlayer + 1
  const nextRound = nextPlayer === 0 ? state.round + 1 : state.round

  if (nextRound > MAX_ROUNDS) {
    const totals = state.players.map((player) => ({
      id: player.id,
      total: player.cash + Object.entries(state.properties).reduce((sum, [cellId, property]) => {
        if (property.ownerId !== player.id) return sum
        const cell = BOARD[Number(cellId)]
        return sum + (cell.price ?? 0) + Math.round((cell.price ?? 0) * 0.6) * (property.level - 1)
      }, 0),
    }))
    const winner = totals.sort((a, b) => b.total - a.total)[0]
    return appendLog({ ...state, phase: 'finished', winnerId: winner.id }, `20 回合结束，资产最高的${state.players[winner.id].name}获胜！`)
  }

  return appendLog({ ...state, currentPlayer: nextPlayer, round: nextRound, phase: 'roll' }, `轮到${state.players[nextPlayer].name}掷骰子`)
}

export function playerNetWorth(state: GameState, playerId: number) {
  const player = state.players[playerId]
  return player.cash + Object.entries(state.properties).reduce((sum, [cellId, property]) => {
    if (property.ownerId !== playerId) return sum
    const cell = BOARD[Number(cellId)]
    return sum + (cell.price ?? 0) + Math.round((cell.price ?? 0) * 0.6) * (property.level - 1)
  }, 0)
}
