import type { GameState } from './types'

export interface MonopolyRoom {
  id: string
  room_code: string
  host_id: string
  host_name: string
  guest_id: string | null
  guest_name: string | null
  status: 'waiting' | 'playing' | 'finished'
  game_state: GameState
  version: number
  created_at: string
  updated_at: string
}
