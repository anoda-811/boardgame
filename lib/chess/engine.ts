export type Color = "w" | "b";
export type PieceType = "k" | "q" | "r" | "b" | "n" | "p";
export type Piece = { type: PieceType; color: Color };
export type Square = Piece | null;
/** row 0 = rank 8 (black back rank), row 7 = rank 1 (white back rank) */
export type Board = Square[][];
export type Coord = { r: number; c: number };

export type Castling = { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };

export type Position = {
  board: Board;
  turn: Color;
  castling: Castling;
  enPassant: Coord | null;
  halfmove: number;
};

export type Move = {
  from: Coord;
  to: Coord;
  promotion?: PieceType;
  castle?: "K" | "Q";
  enPassant?: boolean;
};

export type GameStatus =
  | { kind: "playing"; check: boolean }
  | { kind: "checkmate"; winner: Color }
  | { kind: "stalemate" }
  | { kind: "draw"; reason: string };

export const VALUE: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

export function opposite(color: Color): Color {
  return color === "w" ? "b" : "w";
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

export function createInitialPosition(): Position {
  const back: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  const board: Board = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => null),
  );
  for (let c = 0; c < 8; c += 1) {
    board[0][c] = { type: back[c], color: "b" };
    board[1][c] = { type: "p", color: "b" };
    board[6][c] = { type: "p", color: "w" };
    board[7][c] = { type: back[c], color: "w" };
  }
  return {
    board,
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfmove: 0,
  };
}

const KNIGHT: [number, number][] = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];
const KING: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];
const ROOK_DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const BISHOP_DIRS: [number, number][] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

export function isSquareAttacked(board: Board, sq: Coord, by: Color): boolean {
  const pawnRow = by === "w" ? sq.r + 1 : sq.r - 1;
  for (const dc of [-1, 1]) {
    const c = sq.c + dc;
    if (!inBounds(pawnRow, c)) continue;
    const p = board[pawnRow][c];
    if (p && p.color === by && p.type === "p") return true;
  }

  for (const [dr, dc] of KNIGHT) {
    const r = sq.r + dr;
    const c = sq.c + dc;
    if (!inBounds(r, c)) continue;
    const p = board[r][c];
    if (p && p.color === by && p.type === "n") return true;
  }

  for (const [dr, dc] of KING) {
    const r = sq.r + dr;
    const c = sq.c + dc;
    if (!inBounds(r, c)) continue;
    const p = board[r][c];
    if (p && p.color === by && p.type === "k") return true;
  }

  const rays: [PieceType[], [number, number][]][] = [
    [["r", "q"], ROOK_DIRS],
    [["b", "q"], BISHOP_DIRS],
  ];
  for (const [types, dirs] of rays) {
    for (const [dr, dc] of dirs) {
      let r = sq.r + dr;
      let c = sq.c + dc;
      while (inBounds(r, c)) {
        const p = board[r][c];
        if (p) {
          if (p.color === by && types.includes(p.type)) return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }
  }

  return false;
}

export function findKing(board: Board, color: Color): Coord | null {
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const p = board[r][c];
      if (p && p.type === "k" && p.color === color) return { r, c };
    }
  }
  return null;
}

export function inCheck(board: Board, color: Color): boolean {
  const king = findKing(board, color);
  return king ? isSquareAttacked(board, king, opposite(color)) : false;
}

function pseudoMoves(pos: Position): Move[] {
  const { board, turn } = pos;
  const moves: Move[] = [];
  const dir = turn === "w" ? -1 : 1;
  const startRow = turn === "w" ? 6 : 1;
  const promoRow = turn === "w" ? 0 : 7;

  const pushPawn = (from: Coord, to: Coord, extra: Partial<Move> = {}) => {
    if (to.r === promoRow) {
      for (const promotion of ["q", "r", "b", "n"] as PieceType[]) {
        moves.push({ from, to, promotion, ...extra });
      }
    } else {
      moves.push({ from, to, ...extra });
    }
  };

  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const p = board[r][c];
      if (!p || p.color !== turn) continue;
      const from = { r, c };

      switch (p.type) {
        case "p": {
          const one = r + dir;
          if (inBounds(one, c) && !board[one][c]) {
            pushPawn(from, { r: one, c });
            const two = r + dir * 2;
            if (r === startRow && !board[two][c]) {
              moves.push({ from, to: { r: two, c } });
            }
          }
          for (const dc of [-1, 1]) {
            const tc = c + dc;
            if (!inBounds(one, tc)) continue;
            const target = board[one][tc];
            if (target && target.color !== turn) {
              pushPawn(from, { r: one, c: tc });
            } else if (
              pos.enPassant &&
              pos.enPassant.r === one &&
              pos.enPassant.c === tc
            ) {
              moves.push({ from, to: { r: one, c: tc }, enPassant: true });
            }
          }
          break;
        }
        case "n":
        case "k": {
          const deltas = p.type === "n" ? KNIGHT : KING;
          for (const [dr, dc] of deltas) {
            const tr = r + dr;
            const tc = c + dc;
            if (!inBounds(tr, tc)) continue;
            const target = board[tr][tc];
            if (!target || target.color !== turn) {
              moves.push({ from, to: { r: tr, c: tc } });
            }
          }
          break;
        }
        default: {
          const dirs =
            p.type === "r"
              ? ROOK_DIRS
              : p.type === "b"
                ? BISHOP_DIRS
                : [...ROOK_DIRS, ...BISHOP_DIRS];
          for (const [dr, dc] of dirs) {
            let tr = r + dr;
            let tc = c + dc;
            while (inBounds(tr, tc)) {
              const target = board[tr][tc];
              if (!target) {
                moves.push({ from, to: { r: tr, c: tc } });
              } else {
                if (target.color !== turn) {
                  moves.push({ from, to: { r: tr, c: tc } });
                }
                break;
              }
              tr += dr;
              tc += dc;
            }
          }
        }
      }
    }
  }

  // castling
  const home = turn === "w" ? 7 : 0;
  const enemy = opposite(turn);
  const king = board[home][4];
  if (king && king.type === "k" && king.color === turn && !inCheck(board, turn)) {
    const canK = turn === "w" ? pos.castling.wK : pos.castling.bK;
    const canQ = turn === "w" ? pos.castling.wQ : pos.castling.bQ;
    const rookK = board[home][7];
    const rookQ = board[home][0];
    if (
      canK &&
      rookK?.type === "r" &&
      rookK.color === turn &&
      !board[home][5] &&
      !board[home][6] &&
      !isSquareAttacked(board, { r: home, c: 5 }, enemy) &&
      !isSquareAttacked(board, { r: home, c: 6 }, enemy)
    ) {
      moves.push({ from: { r: home, c: 4 }, to: { r: home, c: 6 }, castle: "K" });
    }
    if (
      canQ &&
      rookQ?.type === "r" &&
      rookQ.color === turn &&
      !board[home][1] &&
      !board[home][2] &&
      !board[home][3] &&
      !isSquareAttacked(board, { r: home, c: 3 }, enemy) &&
      !isSquareAttacked(board, { r: home, c: 2 }, enemy)
    ) {
      moves.push({ from: { r: home, c: 4 }, to: { r: home, c: 2 }, castle: "Q" });
    }
  }

  return moves;
}

export function makeMove(pos: Position, move: Move): Position {
  const board = cloneBoard(pos.board);
  const piece = board[move.from.r][move.from.c]!;
  const captured = board[move.to.r][move.to.c];

  board[move.from.r][move.from.c] = null;
  board[move.to.r][move.to.c] = move.promotion
    ? { type: move.promotion, color: piece.color }
    : piece;

  if (move.enPassant) {
    board[move.from.r][move.to.c] = null;
  }

  if (move.castle) {
    const row = move.from.r;
    if (move.castle === "K") {
      board[row][5] = board[row][7];
      board[row][7] = null;
    } else {
      board[row][3] = board[row][0];
      board[row][0] = null;
    }
  }

  const castling = { ...pos.castling };
  if (piece.type === "k") {
    if (piece.color === "w") {
      castling.wK = false;
      castling.wQ = false;
    } else {
      castling.bK = false;
      castling.bQ = false;
    }
  }
  const touch = (r: number, c: number) => {
    if (r === 7 && c === 0) castling.wQ = false;
    if (r === 7 && c === 7) castling.wK = false;
    if (r === 0 && c === 0) castling.bQ = false;
    if (r === 0 && c === 7) castling.bK = false;
  };
  touch(move.from.r, move.from.c);
  touch(move.to.r, move.to.c);

  const doubleStep =
    piece.type === "p" && Math.abs(move.to.r - move.from.r) === 2;

  return {
    board,
    turn: opposite(pos.turn),
    castling,
    enPassant: doubleStep
      ? { r: (move.from.r + move.to.r) / 2, c: move.from.c }
      : null,
    halfmove:
      piece.type === "p" || captured || move.enPassant ? 0 : pos.halfmove + 1,
  };
}

export function legalMoves(pos: Position): Move[] {
  return pseudoMoves(pos).filter((move) => {
    const next = makeMove(pos, move);
    return !inCheck(next.board, pos.turn);
  });
}

function insufficientMaterial(board: Board): boolean {
  const minors: PieceType[] = [];
  for (const row of board) {
    for (const p of row) {
      if (!p || p.type === "k") continue;
      if (p.type === "b" || p.type === "n") {
        minors.push(p.type);
      } else {
        return false;
      }
    }
  }
  return minors.length <= 1;
}

export function getStatus(pos: Position): GameStatus {
  const moves = legalMoves(pos);
  const check = inCheck(pos.board, pos.turn);
  if (moves.length === 0) {
    return check
      ? { kind: "checkmate", winner: opposite(pos.turn) }
      : { kind: "stalemate" };
  }
  if (insufficientMaterial(pos.board)) {
    return { kind: "draw", reason: "駒不足で引き分け" };
  }
  if (pos.halfmove >= 100) {
    return { kind: "draw", reason: "50手ルールで引き分け" };
  }
  return { kind: "playing", check };
}

/* ---------- AI ---------- */

// Piece-square tables from white's view (row 0 = rank 8).
const PST: Partial<Record<PieceType, number[][]>> = {
  p: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  n: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  b: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  k: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
  ],
};

function evaluate(board: Board, perspective: Color): number {
  let score = 0;
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const p = board[r][c];
      if (!p) continue;
      const table = PST[p.type];
      const bonus = table ? table[p.color === "w" ? r : 7 - r][c] : 0;
      const v = VALUE[p.type] + bonus;
      score += p.color === perspective ? v : -v;
    }
  }
  return score;
}

function orderMoves(pos: Position, moves: Move[]): Move[] {
  const score = (m: Move) => {
    const target = pos.board[m.to.r][m.to.c];
    const mover = pos.board[m.from.r][m.from.c];
    let s = 0;
    if (target) s += 10 * VALUE[target.type] - (mover ? VALUE[mover.type] : 0);
    if (m.promotion) s += VALUE[m.promotion];
    return s;
  };
  return [...moves].sort((a, b) => score(b) - score(a));
}

const MATE = 100000;

function negamax(
  pos: Position,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const moves = legalMoves(pos);
  if (moves.length === 0) {
    return inCheck(pos.board, pos.turn) ? -MATE - depth : 0;
  }
  if (depth === 0) return evaluate(pos.board, pos.turn);

  let best = -Infinity;
  for (const move of orderMoves(pos, moves)) {
    const score = -negamax(makeMove(pos, move), depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

/** `noise` adds a random ±noise (centipawns) to each root score to weaken play. */
export function chooseAiMove(
  pos: Position,
  depth = 3,
  noise = 0,
): Move | null {
  const moves = legalMoves(pos);
  if (moves.length === 0) return null;

  let bestScore = -Infinity;
  let bestMoves: Move[] = [];
  let alpha = -Infinity;
  for (const move of orderMoves(pos, moves)) {
    // Noisy scores need exact values for every move, so skip root pruning then.
    // Otherwise widen by 1 so moves that tie the best are scored exactly.
    const searched = -negamax(
      makeMove(pos, move),
      depth - 1,
      -Infinity,
      noise > 0 ? Infinity : -(alpha - 1),
    );
    const score =
      noise > 0 ? searched + (Math.random() * 2 - 1) * noise : searched;
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
    if (score > alpha) alpha = score;
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}
