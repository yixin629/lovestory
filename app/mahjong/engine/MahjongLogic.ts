// app/mahjong/engine/MahjongLogic.ts

export type Suit = 'characters' | 'bamboo' | 'dots'; // 万, 条, 筒 (Wan, Tiao, Tong)
export type GameMode = 'standard' | 'sichuan';
export type PlayerStatus = 'thinking' | 'waiting' | 'hu' | 'offline';
export type ActionType = 'draw' | 'discard' | 'chow' | 'pong' | 'kong' | 'hu' | 'pass';

export interface Tile {
  id: string; // Unique identifier (e.g., 'characters-1-0')
  suit: Suit;
  value: number; // 1-9
}

export interface Player {
  id: string;
  isBot: boolean;
  name: string;
  avatar: string;
  hand: Tile[];
  melds: Meld[];
  discards: Tile[];
  status: PlayerStatus;
  voidSuit?: Suit; // Required for Sichuan mode (缺一门)
  huOrder?: number; // For Sichuan mode where multiple people can Hu
}

export interface Meld {
  type: 'chow' | 'pong' | 'kong' | 'concealed_kong';
  tiles: Tile[];
  fromPlayer?: string; // Who did we get the tile from?
}

export interface GameState {
  id: string;
  host_id: string;
  status: 'waiting' | 'playing' | 'finished';
  mode: GameMode;
  baseMultiplier: number;
  players: Player[];
  deck: Tile[];
  currentTurn: number; // Index of the player whose turn it is
  lastAction?: {
    playerId: string;
    type: ActionType;
    tile?: Tile;
  };
  pendingActions?: {
    // When someone discards, other players may have valid actions (Pong/Kong/Hu/Chow)
    [playerId: string]: {
      type: ActionType;
      tile: Tile;
    }[];
  };
  actionTimer?: number; // UNIX timestamp for action timeout
}

export type ValidAction = { type: ActionType, tile: Tile };

// ---------------------------------------------------------
// Deck & Initialization
// ---------------------------------------------------------

export function createDeck(_mode: GameMode): Tile[] {
  const deck: Tile[] = [];
  const suits: Suit[] = ['characters', 'bamboo', 'dots'];

  for (const suit of suits) {
    for (let value = 1; value <= 9; value++) {
      // 4 of each tile
      for (let i = 0; i < 4; i++) {
        deck.push({
          id: `${suit}-${value}-${i}`,
          suit,
          value,
        });
      }
    }
  }

  // Shuffle Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function initializeGameState(
  id: string,
  mode: GameMode,
  baseMultiplier: number,
  playerIds: { id: string; name: string; avatar: string; isBot: boolean }[],
  hostId: string
): GameState {
  const deck = createDeck(mode);
  const players: Player[] = playerIds.map((p) => ({
    id: p.id,
    isBot: p.isBot,
    name: p.name,
    avatar: p.avatar,
    hand: [],
    melds: [],
    discards: [],
    status: 'waiting',
  }));

  // Deal 13 tiles to everyone, 14 to host (dealer)
  // Simple dealing: 13 each, then 1 to dealer
  for (let i = 0; i < 13; i++) {
    for (let p = 0; p < 4; p++) {
      players[p].hand.push(deck.pop()!);
    }
  }
  
  // Dealer draws the 14th tile
  // Let's assume player 0 is dealer
  players[0].hand.push(deck.pop()!);
  players[0].status = 'thinking';

  // Sort hands
  players.forEach((p) => {
    p.hand.sort(sortTiles);
    if (mode === 'sichuan') p.voidSuit = chooseVoidSuit(p.hand);
  });

  return {
    id,
    host_id: hostId,
    status: 'playing',
    mode,
    baseMultiplier,
    players,
    deck,
    currentTurn: 0,
    lastAction: {
      playerId: players[0].id,
      type: 'draw',
      tile: players[0].hand[players[0].hand.length - 1],
    },
  };
}

// ---------------------------------------------------------
// Game Progression Logic (Mutates state, meant for host to run)
// ---------------------------------------------------------

export function applyDiscard(state: GameState, playerId: string, tileIndex: number): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players.find(p => p.id === playerId);
  if (!player) return newState;
  if (newState.players[newState.currentTurn]?.id !== playerId) return newState;
  if (tileIndex < 0 || tileIndex >= player.hand.length) return newState;

  const [discardedTile] = player.hand.splice(tileIndex, 1);
  player.discards.push(discardedTile);
  player.status = 'waiting';
  
  newState.lastAction = { playerId, type: 'discard', tile: discardedTile };
  newState.pendingActions = {};

  // Check all OTHER players to see if they can Hu, Kong, Pong, Chow here
  let hasPending = false;
  
  newState.players.forEach((p, index) => {
    if (p.id === playerId || p.status === 'hu') return;
    
    const actions: ValidAction[] = [];
    
    // 1. Can Hu?
    if (canHu(p.hand, newState.mode, p.voidSuit, discardedTile)) {
      actions.push({ type: 'hu', tile: discardedTile });
    }
    // 2. Can Kong?
    if (canKong(p.hand, discardedTile)) {
      actions.push({ type: 'kong', tile: discardedTile });
    }
    // 3. Can Pong?
    if (canPong(p.hand, discardedTile)) {
      actions.push({ type: 'pong', tile: discardedTile });
    }
    // 4. Can Chow? (Only the immediate Next player can Chow in standard mahjong)
    if (newState.mode === 'standard' && index === (newState.currentTurn + 1) % 4) {
       const chows = canChow(p.hand, discardedTile, newState.mode);
       if (chows.length > 0) {
          actions.push({ type: 'chow', tile: discardedTile }); // Simplified: doesn't specify which combo if multiple
       }
    }

    if (actions.length > 0) {
      newState.pendingActions![p.id] = actions;
      hasPending = true;
    }
  });

  if (hasPending) {
    // Pause the game until actions are resolved
    newState.status = 'playing'; // Still playing
    // We can add a sub-status or just rely on Object.keys(pendingActions).length > 0
    return newState;
  }
  
  return advanceTurn(newState);
}

// Resolve an action (Pong/Kong/Hu/Pass)
export function applyAction(state: GameState, playerId: string, actionType: ActionType): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  if (!newState.pendingActions || !newState.pendingActions[playerId]) return newState;

  const player = newState.players.find(p => p.id === playerId);
  const discarderId = newState.lastAction?.playerId;
  const discardedTile = newState.lastAction?.tile;
  
  if (!player || !discarderId || !discardedTile) return newState;

  // Find the discarder and remove that tile from their discards, since it's being claimed
  const discarder = newState.players.find(p => p.id === discarderId);

  if (actionType === 'pass') {
    delete newState.pendingActions[playerId];
    
    // If no one else has pending actions, continue game
    if (Object.keys(newState.pendingActions).length === 0) {
       return advanceTurn(newState);
    }
    return newState;
  }

  // Someone claimed a tile! Remove it from the table (discarder's pile)
  if (discarder && discarder.discards.length > 0) {
    discarder.discards.pop();
  }

  // Clear ALL pending actions because someone took the tile
  newState.pendingActions = {};

  if (actionType === 'hu') {
    player.status = 'hu';
    newState.status = 'finished';
    return newState;
  }

  if (actionType === 'pong') {
    // Remove 2 matching tiles from hand
    for (let i = 0; i < 2; i++) {
       const idx = player.hand.findIndex(t => t.suit === discardedTile.suit && t.value === discardedTile.value);
       if (idx !== -1) player.hand.splice(idx, 1);
    }
    player.hand.sort(sortTiles);
    // Add Meld
    player.melds.push({
       type: 'pong',
       tiles: [discardedTile, discardedTile, discardedTile],
       fromPlayer: discarderId
    });
    // Now it's this player's turn to discard
    newState.currentTurn = newState.players.findIndex(p => p.id === playerId);
    player.status = 'thinking';
    return newState;
  }

  if (actionType === 'chow') {
    const combination = canChow(player.hand, discardedTile, newState.mode)[0];
    if (!combination) return state;
    combination.forEach((tile) => {
      const index = player.hand.findIndex((candidate) => candidate.id === tile.id);
      if (index !== -1) player.hand.splice(index, 1);
    });
    player.melds.push({
      type: 'chow',
      tiles: [...combination, discardedTile].sort(sortTiles),
      fromPlayer: discarderId,
    });
    player.hand.sort(sortTiles);
    newState.currentTurn = newState.players.findIndex((candidate) => candidate.id === playerId);
    newState.players.forEach((candidate) => { candidate.status = candidate.id === playerId ? 'thinking' : candidate.status === 'hu' ? 'hu' : 'waiting'; });
    return newState;
  }

  if (actionType === 'kong') {
    // Remove 3 matching tiles from hand
    for (let i = 0; i < 3; i++) {
       const idx = player.hand.findIndex(t => t.suit === discardedTile.suit && t.value === discardedTile.value);
       if (idx !== -1) player.hand.splice(idx, 1);
    }
    // Add Meld
    player.melds.push({
       type: 'kong',
       tiles: [discardedTile, discardedTile, discardedTile, discardedTile],
       fromPlayer: discarderId
    });

    // Kong means you draw an extra tile immediately AND it's your turn
    newState.currentTurn = newState.players.findIndex(p => p.id === playerId);
    if (newState.deck.length > 0) {
       player.hand.push(newState.deck.pop()!);
    } else {
       newState.status = 'finished'; // Draw out
    }
    player.hand.sort(sortTiles);
    player.status = 'thinking';
    return newState;
  }

  return newState;
}

export function applyBotTurn(state: GameState, playerId: string): GameState {
   const newState = JSON.parse(JSON.stringify(state)) as GameState;
   const player = newState.players.find(p => p.id === playerId);
   if (!player) return newState;

   if (canHu(player.hand, newState.mode, player.voidSuit)) {
      player.status = 'hu';
      newState.lastAction = { playerId, type: 'hu', tile: player.hand[player.hand.length - 1] };
      newState.status = 'finished';
      return newState;
   }

   // Assume they already drew, so they just discard
   const tileToDiscard = getBotDiscard(player, newState.mode);
   const tileIndex = player.hand.findIndex(t => t.id === tileToDiscard.id);
   
   return applyDiscard(newState, playerId, tileIndex !== -1 ? tileIndex : 0);
}

export function advanceTurn(state: GameState): GameState {
   const newState = JSON.parse(JSON.stringify(state)) as GameState;

   // Safety: if all players have hu'd, end the game
   if (newState.players.every(p => p.status === 'hu')) {
      newState.status = 'finished';
      return newState;
   }

   // Next active player
   do {
      newState.currentTurn = (newState.currentTurn + 1) % 4;
   } while (newState.players[newState.currentTurn].status === 'hu');

   const nextPlayer = newState.players[newState.currentTurn];
   newState.players.forEach((player) => {
      if (player.status !== 'hu') player.status = player.id === nextPlayer.id ? 'thinking' : 'waiting';
   });
   
   // Draw a tile
   if (newState.deck.length > 0) {
      const drawnTile = newState.deck.pop()!;
      nextPlayer.hand.push(drawnTile);
      nextPlayer.hand.sort(sortTiles);
      newState.lastAction = { playerId: nextPlayer.id, type: 'draw', tile: drawnTile };
   } else {
      newState.status = 'finished';
   }

   nextPlayer.status = 'thinking';
   return newState;
}

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

export function sortTiles(a: Tile, b: Tile): number {
  if (a.suit !== b.suit) {
    return a.suit.localeCompare(b.suit);
  }
  return a.value - b.value;
}

export function chooseVoidSuit(hand: Tile[]): Suit {
  const counts: Record<Suit, number> = { characters: 0, bamboo: 0, dots: 0 };
  hand.forEach((tile) => { counts[tile.suit] += 1; });
  return (Object.entries(counts) as [Suit, number][]).sort((a, b) => a[1] - b[1])[0][0];
}

export function applySelfHu(state: GameState, playerId: string): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const playerIndex = newState.players.findIndex((player) => player.id === playerId);
  const player = newState.players[playerIndex];
  if (!player || playerIndex !== newState.currentTurn || !canHu(player.hand, newState.mode, player.voidSuit)) return state;
  player.status = 'hu';
  newState.lastAction = { playerId, type: 'hu', tile: player.hand[player.hand.length - 1] };
  newState.status = 'finished';
  return newState;
}

export function isSameTile(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value;
}

// Count occurrences of a specific tile
export function countTile(hand: Tile[], tile: Tile): number {
  return hand.filter(t => isSameTile(t, tile)).length;
}

// ---------------------------------------------------------
// Game Logic Validation Helpers
// ---------------------------------------------------------

// Check if a player can Pong a discarded tile
export function canPong(hand: Tile[], discardedTile: Tile): boolean {
  return countTile(hand, discardedTile) >= 2;
}

// Check if a player can Kong a discarded tile
export function canKong(hand: Tile[], discardedTile: Tile): boolean {
  return countTile(hand, discardedTile) >= 3;
}

// Check if a player can concealed Kong from their own hand (already have 4)
export function getConcealedKongs(hand: Tile[]): Tile[] {
  const counts = new Map<string, number>();
  hand.forEach(t => {
    const key = `${t.suit}-${t.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  
  const kongs: Tile[] = [];
  counts.forEach((count, key) => {
    if (count === 4) {
      const [suit, value] = key.split('-');
      // Just return a representative tile for the kong
      kongs.push({ id: '', suit: suit as Suit, value: parseInt(value) });
    }
  });
  return kongs;
}

// Check if a player can add a tile to an existing Pong to make a Kong
export function canPromotedKong(hand: Tile[], melds: Meld[]): Tile[] {
  const pongs = melds.filter(m => m.type === 'pong');
  const promotableKongs: Tile[] = [];
  
  for (const pong of pongs) {
    const pongTile = pong.tiles[0];
    if (countTile(hand, pongTile) >= 1) {
      promotableKongs.push(pongTile);
    }
  }
  
  return promotableKongs;
}

// Check if a player can Chow
export function canChow(hand: Tile[], discardedTile: Tile, mode: GameMode): Tile[][] {
  if (mode === 'sichuan') return []; // No chow in Sichuan

  const sameSuit = hand.filter(t => t.suit === discardedTile.suit);
  const val = discardedTile.value;
  const chows: Tile[][] = [];

  const hasVal = (v: number) => sameSuit.some(t => t.value === v);
  const getTile = (v: number) => sameSuit.find(t => t.value === v)!;

  // X - 2, X - 1, X
  if (hasVal(val - 2) && hasVal(val - 1)) chows.push([getTile(val - 2), getTile(val - 1)]);
  // X - 1, X, X + 1
  if (hasVal(val - 1) && hasVal(val + 1)) chows.push([getTile(val - 1), getTile(val + 1)]);
  // X, X + 1, X + 2
  if (hasVal(val + 1) && hasVal(val + 2)) chows.push([getTile(val + 1), getTile(val + 2)]);

  return chows;
}

// ---------------------------------------------------------
// Hu (Win) Validation logic
// ---------------------------------------------------------

/**
 * Validates if the given tiles form a standard Mahjong winning hand (4 melds + 1 pair).
 * Assuming the hand array length is 14 (or 13 + 1 drawn/discarded).
 */
export function canHu(
  hand: Tile[],
  mode: GameMode,
  voidSuit?: Suit, // Required for sichuan
  newTile?: Tile   // If checking a discard or newly drawn tile
): boolean {
  const allTiles = newTile ? [...hand, newTile] : [...hand];
  
  if (allTiles.length % 3 !== 2) return false; // Hand must be 2, 5, 8, 11, 14 tiles

  // Sichuan requirement: must not have any tiles of the void suit
  if (mode === 'sichuan' && voidSuit) {
    if (allTiles.some(t => t.suit === voidSuit)) return false;
  }

  // Optimize: group tiles by suit
  const suits = {
    characters: allTiles.filter(t => t.suit === 'characters').map(t => t.value).sort((a,b)=>a-b),
    bamboo: allTiles.filter(t => t.suit === 'bamboo').map(t => t.value).sort((a,b)=>a-b),
    dots: allTiles.filter(t => t.suit === 'dots').map(t => t.value).sort((a,b)=>a-b),
  };

  // Seven pairs special check (14 tiles only)
  if (allTiles.length === 14) {
    const countMap = new Map<string, number>();
    allTiles.forEach(t => {
      const key = `${t.suit}-${t.value}`;
      countMap.set(key, (countMap.get(key) || 0) + 1);
    });
    
    let isSevenPairs = true;
    for (const count of Array.from(countMap.values())) {
      if (count !== 2 && count !== 4) {
        isSevenPairs = false;
        break;
      }
    }
    if (isSevenPairs) return true;
  }

  // To win, exactly ONE suit must provide the pair (its remainders mod 3 == 2).
  // The other suits must have length % 3 == 0 (all melds).
  let pairsFound = 0;
  for (const suit of Object.keys(suits) as Suit[]) {
    const arr = suits[suit] as number[];
    const rem = arr.length % 3;
    if (rem === 1) return false; // Impossible suit count
    if (rem === 2) pairsFound++;
  }

  if (pairsFound !== 1) return false;

  // Check each suit for valid decomposition
  for (const suit of Object.keys(suits) as Suit[]) {
    const arr = suits[suit] as number[];
    if (arr.length === 0) continue;
    
    if (arr.length % 3 === 2) {
      if (!canFormMeldsAndPair(arr)) return false;
    } else {
      if (!canFormMelds(arr)) return false;
    }
  }

  return true;
}

// Check if an array of values (same suit) can be entirely decomposed into Pongs and Chows
function canFormMelds(arr: number[]): boolean {
  if (arr.length === 0) return true;
  
  const v = arr[0];
  let res = false;
  
  // Try Pong
  if (arr.length >= 3 && arr[0] === arr[1] && arr[1] === arr[2]) {
    res = res || canFormMelds(arr.slice(3));
  }
  
  // Try Chow (only for standard 1-9)
  const i2 = arr.indexOf(v + 1);
  const i3 = arr.indexOf(v + 2);
  if (i2 !== -1 && i3 !== -1) {
    const newArr = [...arr];
    newArr.splice(i3, 1);
    newArr.splice(i2, 1);
    newArr.splice(0, 1); // remove the V
    res = res || canFormMelds(newArr);
  }
  
  return res;
}

// Check if an array of values (same suit) can be decomposed into Pongs/Chows + exactly one pair
function canFormMeldsAndPair(arr: number[]): boolean {
  if (arr.length % 3 !== 2) return false;
  
  // Find all possible pairs
  const uniqueValues = Array.from(new Set(arr));
  
  for (const v of uniqueValues) {
    // If there are at least 2 of this value, try taking it as the pair
    const firstIdx = arr.indexOf(v);
    const secondIdx = arr.indexOf(v, firstIdx + 1);
    
    if (secondIdx !== -1) {
      const remArr = [...arr];
      remArr.splice(secondIdx, 1);
      remArr.splice(firstIdx, 1);
      
      if (canFormMelds(remArr)) {
        return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------
// Bot AI Logic
// ---------------------------------------------------------

export function getBotAction(
  player: Player,
  gameState: GameState,
  isDrawPhase: boolean,
  discardedTile?: Tile
): ActionType | null {
  
  // 1. If we can Hu on a discard, ALWAYS HU.
  if (!isDrawPhase && discardedTile) {
    if (canHu(player.hand, gameState.mode, player.voidSuit, discardedTile)) {
      return 'hu';
    }
    
    // 2. Kong over Pong
    if (canKong(player.hand, discardedTile)) {
       return 'kong';
    }

    // 3. Pong if we can and it doesn't break our void suit (for Sichuan)
    if (canPong(player.hand, discardedTile)) {
       if (gameState.mode === 'sichuan' && player.voidSuit === discardedTile.suit) {
           // Ignore, we want to get rid of this suit.
       } else {
          // Simplistic greed: just pong it.
          // Real bot would check if Pong ruins hand.
          return 'pong';
       }
    }
    
    return 'pass';
  }
  
  // Draw phase (it's our turn)
  if (isDrawPhase) {
    // Check if we can Hu with our drawn tile
    if (canHu(player.hand, gameState.mode, player.voidSuit)) {
      return 'hu';
    }
    // We must discard.
    return 'discard';
  }

  return 'pass';
}

export function getBotDiscard(player: Player, mode: GameMode): Tile {
  // Sichuan: ALWAYS discard void suit first
  if (mode === 'sichuan' && player.voidSuit) {
    const voidTiles = player.hand.filter(t => t.suit === player.voidSuit);
    if (voidTiles.length > 0) {
      return voidTiles[0]; // just discard the first one
    }
  }
  
  // Simple heuristic: count suits, discard the one with least tiles
  // or discard isolated terminals (1, 9)
  const counts = { characters: 0, bamboo: 0, dots: 0 };
  player.hand.forEach(t => counts[t.suit]++);
  
  // Of the suits we hold, which has the fewest tiles (but > 0)?
  let minSuit: Suit | null = null;
  let minCount = 999;
  for (const [s, c] of Object.entries(counts)) {
    if (c > 0 && c < minCount) {
      minCount = c;
      minSuit = s as Suit;
    }
  }

  if (minSuit) {
    const candidates = player.hand.filter(t => t.suit === minSuit);
    // Prefer isolated tiles or terminals
    // For now, randomly pick a tile in the weak suit
    return candidates[0];
  }
  
  return player.hand[0];
}

// ---------------------------------------------------------
// Scoring Logic
// ---------------------------------------------------------

export function calculateHuScore(
  winnerId: string,
  loserIds: string[], // If discard, length is 1. If self-draw, length is 3 (or remaining active players)
  mode: GameMode,
  baseMultiplier: number,
  isSelfDrawn: boolean
): { [playerId: string]: number } {
  const scoreChange: { [playerId: string]: number } = {};
  scoreChange[winnerId] = 0;
  loserIds.forEach(id => scoreChange[id] = 0);
  
  // Basic multiplier: e.g., 100 beans base
  const baseWin = 100 * baseMultiplier; 
  
  if (isSelfDrawn) {
     loserIds.forEach(id => {
        scoreChange[id] -= baseWin * 2;
        scoreChange[winnerId] += baseWin * 2;
     });
  } else {
     const discarderId = loserIds[0];
     scoreChange[discarderId] -= baseWin;
     scoreChange[winnerId] += baseWin;
  }
  
  return scoreChange;
}

export function calculateKongScore(
  kongerId: string,
  payerIds: string[],
  baseMultiplier: number,
  isConcealed: boolean
): { [playerId: string]: number } {
  const scoreChange: { [playerId: string]: number } = {};
  scoreChange[kongerId] = 0;
  payerIds.forEach(id => scoreChange[id] = 0);
  
  let kongValue = 50 * baseMultiplier;
  if (isConcealed) kongValue *= 2; 

  payerIds.forEach(id => {
    scoreChange[id] -= kongValue;
    scoreChange[kongerId] += kongValue; // Collect from each payer
  });
  
  return scoreChange;
}
