import type { GameState } from '../types'

const STORAGE_KEY = 'couple-world:monopoly-save'
const SAVE_VERSION = 1

interface StoredGame {
  version: number
  savedAt: string
  game: GameState
}

export function loadGame(): GameState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as Partial<StoredGame>
    const game = stored.game

    if (
      stored.version !== SAVE_VERSION ||
      !game ||
      !Array.isArray(game.players) ||
      game.players.length !== 2 ||
      typeof game.currentPlayer !== 'number' ||
      typeof game.round !== 'number' ||
      typeof game.properties !== 'object'
    ) {
      return null
    }

    return game
  } catch {
    return null
  }
}

export function saveGame(game: GameState) {
  const stored: StoredGame = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    game,
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

export function clearSavedGame() {
  window.localStorage.removeItem(STORAGE_KEY)
}
