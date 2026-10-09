// app/gomoku/engine/GomokuLogic.ts

export type Player = 'black' | 'white';
export type Cell = Player | null;

export const BOARD_SIZE = 15;

export interface GomokuPlayerInfo {
  id: string;
  name: string;
  avatar: string;
  color: Player;
  isBot: boolean;
}

export interface UndoRequest {
  requesterId: string;
  requestedAt: number;
}

export interface GomokuGameState {
  board: Cell[][];
  currentPlayer: Player;
  status: 'waiting' | 'playing' | 'finished';
  winner: Player | null;
  lastMove: [number, number] | null;
  history: { board: Cell[][]; player: Player; move: [number, number] }[];
  players: GomokuPlayerInfo[];
  gameMode: 'pvp' | 'pve';
  hostId: string;
  undoRequest?: UndoRequest | null;
}

export function createEmptyBoard(): Cell[][] {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
}

export function checkWinner(boardState: Cell[][], row: number, col: number, player: Player): boolean {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;

  const directions = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal \
    [1, -1], // diagonal /
  ];

  for (const [dx, dy] of directions) {
    let count = 1;
    
    // Check positive direction
    for (let i = 1; i < 5; i++) {
      const newRow = row + dx * i;
      const newCol = col + dy * i;
      if (
        newRow >= 0 && newRow < BOARD_SIZE &&
        newCol >= 0 && newCol < BOARD_SIZE &&
        boardState[newRow][newCol] === player
      ) {
        count++;
      } else {
        break;
      }
    }
    
    // Check negative direction
    for (let i = 1; i < 5; i++) {
      const newRow = row - dx * i;
      const newCol = col - dy * i;
      if (
        newRow >= 0 && newRow < BOARD_SIZE &&
        newCol >= 0 && newCol < BOARD_SIZE &&
        boardState[newRow][newCol] === player
      ) {
        count++;
      } else {
        break;
      }
    }
    
    if (count >= 5) return true;
  }
  return false;
}

// ---------------------------------------------------------
// Bot Engine (Heuristic-based)
// ---------------------------------------------------------

export function getBotMove(board: Cell[][], botPlayer: Player): [number, number] | null {
  const humanPlayer = botPlayer === 'black' ? 'white' : 'black';
  
  // If board is empty, play in the center
  let isEmpty = true;
  for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
          if (board[r][c] !== null) { isEmpty = false; break; }
      }
      if (!isEmpty) break;
  }
  if (isEmpty) return [Math.floor(BOARD_SIZE/2), Math.floor(BOARD_SIZE/2)];

  let bestScore = -Infinity;
  let bestMoves: [number, number][] = [];

  // Very simple evaluation:
  // We evaluate every empty cell and assign a score based on continuous lines it creates for both players.
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) continue;

      // Score for offensive (bot making a line) and defensive (bot blocking human)
      const attackScore = evaluateCell(board, r, c, botPlayer);
      const defenseScore = evaluateCell(board, r, c, humanPlayer);

      // We prioritize blocking a human win over making our own (unless we win)
      // If attackScore >= 100000, we instantly win
      // If defenseScore >= 100000, human wins next turn, we MUST block
      
      const score = attackScore + (defenseScore * 1.1); // Slightly prefer defense to avoid traps

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [[r, c]];
      } else if (score === bestScore) {
        bestMoves.push([r, c]);
      }
    }
  }

  if (bestMoves.length === 0) return null;
  // Pick random among equally good moves
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function evaluateCell(board: Cell[][], row: number, col: number, player: Player): number {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  let totalScore = 0;

  for (const [dx, dy] of directions) {
      let count = 1;
      let blockP = false;
      let blockN = false;

      // Positive
      for (let i = 1; i <= 4; i++) {
         const nr = row + dx * i;
         const nc = col + dy * i;
         if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) { blockP = true; break; }
         if (board[nr][nc] === player) count++;
         else if (board[nr][nc] === null) break;
         else { blockP = true; break; }
      }

      // Negative
      for (let i = 1; i <= 4; i++) {
         const nr = row - dx * i;
         const nc = col - dy * i;
         if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) { blockN = true; break; }
         if (board[nr][nc] === player) count++;
         else if (board[nr][nc] === null) break;
         else { blockN = true; break; }
      }

      const blocks = (blockP ? 1 : 0) + (blockN ? 1 : 0);

      // Scoring heuristic
      if (count >= 5) totalScore += 100000;
      else if (count === 4) {
          if (blocks === 0) totalScore += 10000;
          else if (blocks === 1) totalScore += 1000; // Blocked on one side (Chong 4)
      } else if (count === 3) {
          if (blocks === 0) totalScore += 1000; // Live 3
          else if (blocks === 1) totalScore += 100; // Sleep 3
      } else if (count === 2) {
          if (blocks === 0) totalScore += 100;
          else if (blocks === 1) totalScore += 10;
      } else if (count === 1) {
          totalScore += 1;
      }
  }

  return totalScore;
}
