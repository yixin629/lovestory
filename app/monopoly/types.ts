export type CellKind = 'start' | 'property' | 'chance' | 'tax' | 'rest' | 'jail'

export interface BoardCell {
  id: number
  name: string
  icon: string
  kind: CellKind
  price?: number
  rent?: number
  color: string
  amount?: number
}

export interface Player {
  id: number
  name: string
  token: string
  cash: number
  position: number
  inJail: boolean
  bankrupt: boolean
}

export interface PropertyState {
  ownerId: number
  level: number
}

export type GamePhase = 'roll' | 'decision' | 'turn-end' | 'finished'

export interface GameState {
  players: Player[]
  properties: Record<number, PropertyState>
  currentPlayer: number
  round: number
  phase: GamePhase
  lastRoll: number
  message: string
  log: string[]
  winnerId: number | null
}

export interface ChanceCard {
  title: string
  description: string
  amount: number
}
