import {
  canPromote,
  cloneBoard,
  cloneHand,
  demote,
  emptyHand,
  inBounds,
  isPromoted,
  opposite,
  promote,
  type Board,
  type Coord,
  type Hand,
  type Move,
  type Piece,
  type PieceType,
  type Side,
  type UnpromotedType,
} from "./types";

export function createInitialBoard(): Board {
  const b: Board = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => null),
  );

  const back: PieceType[] = [
    "lance",
    "knight",
    "silver",
    "gold",
    "king",
    "gold",
    "silver",
    "knight",
    "lance",
  ];

  for (let c = 0; c < 9; c += 1) {
    b[0][c] = { type: back[c], side: "gote" };
    b[8][c] = { type: back[c], side: "sente" };
    b[2][c] = { type: "pawn", side: "gote" };
    b[6][c] = { type: "pawn", side: "sente" };
  }
  b[1][1] = { type: "rook", side: "gote" };
  b[1][7] = { type: "bishop", side: "gote" };
  b[7][1] = { type: "bishop", side: "sente" };
  b[7][7] = { type: "rook", side: "sente" };

  return b;
}

function dir(side: Side): number {
  return side === "sente" ? -1 : 1;
}

function goldDeltas(side: Side): [number, number][] {
  const d = dir(side);
  return [
    [d, 0],
    [d, -1],
    [d, 1],
    [0, -1],
    [0, 1],
    [-d, 0],
  ];
}

function silverDeltas(side: Side): [number, number][] {
  const d = dir(side);
  return [
    [d, 0],
    [d, -1],
    [d, 1],
    [-d, -1],
    [-d, 1],
  ];
}

function kingDeltas(): [number, number][] {
  return [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];
}

function addStepMoves(
  board: Board,
  from: Coord,
  side: Side,
  deltas: [number, number][],
  out: Coord[],
) {
  for (const [dr, dc] of deltas) {
    const r = from.r + dr;
    const c = from.c + dc;
    if (!inBounds(r, c)) continue;
    const target = board[r][c];
    if (!target || target.side !== side) out.push({ r, c });
  }
}

function addRayMoves(
  board: Board,
  from: Coord,
  side: Side,
  rays: [number, number][],
  out: Coord[],
) {
  for (const [dr, dc] of rays) {
    let r = from.r + dr;
    let c = from.c + dc;
    while (inBounds(r, c)) {
      const target = board[r][c];
      if (!target) {
        out.push({ r, c });
      } else {
        if (target.side !== side) out.push({ r, c });
        break;
      }
      r += dr;
      c += dc;
    }
  }
}

export function rawMovesFrom(board: Board, from: Coord): Coord[] {
  const piece = board[from.r][from.c];
  if (!piece) return [];
  const { type, side } = piece;
  const out: Coord[] = [];
  const d = dir(side);

  switch (type) {
    case "king":
      addStepMoves(board, from, side, kingDeltas(), out);
      break;
    case "gold":
    case "tokin":
    case "promotedSilver":
    case "promotedKnight":
    case "promotedLance":
      addStepMoves(board, from, side, goldDeltas(side), out);
      break;
    case "silver":
      addStepMoves(board, from, side, silverDeltas(side), out);
      break;
    case "pawn":
      addStepMoves(board, from, side, [[d, 0]], out);
      break;
    case "knight": {
      const jumps: [number, number][] = [
        [d * 2, -1],
        [d * 2, 1],
      ];
      addStepMoves(board, from, side, jumps, out);
      break;
    }
    case "lance":
      addRayMoves(board, from, side, [[d, 0]], out);
      break;
    case "rook":
      addRayMoves(
        board,
        from,
        side,
        [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ],
        out,
      );
      break;
    case "bishop":
      addRayMoves(
        board,
        from,
        side,
        [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ],
        out,
      );
      break;
    case "dragon":
      addRayMoves(
        board,
        from,
        side,
        [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ],
        out,
      );
      addStepMoves(
        board,
        from,
        side,
        [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ],
        out,
      );
      break;
    case "horse":
      addRayMoves(
        board,
        from,
        side,
        [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ],
        out,
      );
      addStepMoves(
        board,
        from,
        side,
        [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ],
        out,
      );
      break;
  }

  return out;
}

export function findKing(board: Board, side: Side): Coord | null {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const p = board[r][c];
      if (p && p.type === "king" && p.side === side) return { r, c };
    }
  }
  return null;
}

export function isSquareAttacked(
  board: Board,
  target: Coord,
  bySide: Side,
): boolean {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const p = board[r][c];
      if (!p || p.side !== bySide) continue;
      const moves = rawMovesFrom(board, { r, c });
      if (moves.some((m) => m.r === target.r && m.c === target.c)) return true;
    }
  }
  return false;
}

export function inCheck(board: Board, side: Side): boolean {
  const king = findKing(board, side);
  if (!king) return true;
  return isSquareAttacked(board, king, opposite(side));
}

function promotionZone(side: Side, r: number) {
  return side === "sente" ? r <= 2 : r >= 6;
}

function mustPromote(type: PieceType, side: Side, toR: number): boolean {
  if (type === "pawn" || type === "lance") {
    return side === "sente" ? toR === 0 : toR === 8;
  }
  if (type === "knight") {
    return side === "sente" ? toR <= 1 : toR >= 7;
  }
  return false;
}

function canDropPiece(
  board: Board,
  side: Side,
  piece: UnpromotedType,
  to: Coord,
): boolean {
  if (board[to.r][to.c]) return false;

  if (piece === "pawn") {
    // nifu
    for (let r = 0; r < 9; r += 1) {
      const p = board[r][to.c];
      if (p && p.side === side && p.type === "pawn") return false;
    }
    // can't drop on last rank
    if (side === "sente" ? to.r === 0 : to.r === 8) return false;
  }
  if (piece === "lance") {
    if (side === "sente" ? to.r === 0 : to.r === 8) return false;
  }
  if (piece === "knight") {
    if (side === "sente" ? to.r <= 1 : to.r >= 7) return false;
  }
  return true;
}

export function applyMove(
  board: Board,
  hands: Record<Side, Hand>,
  side: Side,
  move: Move,
  options: { checkDropMate?: boolean } = { checkDropMate: true },
): { board: Board; hands: Record<Side, Hand> } | null {
  const nextBoard = cloneBoard(board);
  const nextHands: Record<Side, Hand> = {
    sente: cloneHand(hands.sente),
    gote: cloneHand(hands.gote),
  };

  if (move.kind === "drop") {
    if (nextHands[side][move.piece] <= 0) return null;
    if (!canDropPiece(nextBoard, side, move.piece, move.to)) return null;
    nextHands[side][move.piece] -= 1;
    nextBoard[move.to.r][move.to.c] = { type: move.piece, side };

    if (
      options.checkDropMate !== false &&
      move.piece === "pawn" &&
      inCheck(nextBoard, opposite(side))
    ) {
      const replies = generateLegalMoves(
        nextBoard,
        nextHands,
        opposite(side),
        false,
      );
      if (replies.length === 0) return null;
    }

    if (inCheck(nextBoard, side)) return null;
    return { board: nextBoard, hands: nextHands };
  }

  const piece = nextBoard[move.from.r][move.from.c];
  if (!piece || piece.side !== side) return null;

  const targets = rawMovesFrom(board, move.from);
  if (!targets.some((t) => t.r === move.to.r && t.c === move.to.c)) return null;

  const captured = nextBoard[move.to.r][move.to.c];
  if (captured) {
    if (captured.type === "king") return null;
    const base = demote(captured.type);
    if (base !== "king") nextHands[side][base] += 1;
  }

  let nextType = piece.type;
  const enteredZone =
    promotionZone(side, move.from.r) || promotionZone(side, move.to.r);
  if (canPromote(piece.type) && enteredZone) {
    if (mustPromote(piece.type, side, move.to.r) || move.promote) {
      nextType = promote(piece.type);
    }
  } else if (move.promote) {
    return null;
  }

  nextBoard[move.from.r][move.from.c] = null;
  nextBoard[move.to.r][move.to.c] = { type: nextType, side };

  if (inCheck(nextBoard, side)) return null;
  return { board: nextBoard, hands: nextHands };
}

export function generateLegalMoves(
  board: Board,
  hands: Record<Side, Hand>,
  side: Side,
  checkDropMate = true,
): Move[] {
  const moves: Move[] = [];

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const p = board[r][c];
      if (!p || p.side !== side) continue;
      const from = { r, c };
      for (const to of rawMovesFrom(board, from)) {
        const entered =
          promotionZone(side, from.r) || promotionZone(side, to.r);
        const promotable = canPromote(p.type) && entered;
        const forced = mustPromote(p.type, side, to.r);

        if (promotable) {
          if (forced) {
            const m: Move = { kind: "move", from, to, promote: true };
            if (applyMove(board, hands, side, m, { checkDropMate })) moves.push(m);
          } else {
            const yes: Move = { kind: "move", from, to, promote: true };
            const no: Move = { kind: "move", from, to, promote: false };
            if (applyMove(board, hands, side, yes, { checkDropMate })) moves.push(yes);
            if (applyMove(board, hands, side, no, { checkDropMate })) moves.push(no);
          }
        } else {
          const m: Move = { kind: "move", from, to, promote: false };
          if (applyMove(board, hands, side, m, { checkDropMate })) moves.push(m);
        }
      }
    }
  }

  for (const piece of Object.keys(hands[side]) as UnpromotedType[]) {
    if (hands[side][piece] <= 0) continue;
    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        const m: Move = { kind: "drop", piece, to: { r, c } };
        if (applyMove(board, hands, side, m, { checkDropMate })) moves.push(m);
      }
    }
  }

  return moves;
}

export function createGameHands(): Record<Side, Hand> {
  return { sente: emptyHand(), gote: emptyHand() };
}

export function pieceAt(board: Board, coord: Coord): Piece | null {
  return board[coord.r][coord.c];
}

export { isPromoted };
