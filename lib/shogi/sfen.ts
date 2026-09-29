import type { Board, Coord, Hand, Move, Piece, PieceType, Side, UnpromotedType } from "./types";

const PIECE_SFEN: Record<PieceType, string> = {
  king: "k",
  rook: "r",
  bishop: "b",
  gold: "g",
  silver: "s",
  knight: "n",
  lance: "l",
  pawn: "p",
  dragon: "+r",
  horse: "+b",
  promotedSilver: "+s",
  promotedKnight: "+n",
  promotedLance: "+l",
  tokin: "+p",
};

const HAND_SFEN: [UnpromotedType, string][] = [
  ["rook", "R"],
  ["bishop", "B"],
  ["gold", "G"],
  ["silver", "S"],
  ["knight", "N"],
  ["lance", "L"],
  ["pawn", "P"],
];

const DROP_PIECE: Record<string, UnpromotedType> = {
  P: "pawn",
  L: "lance",
  N: "knight",
  S: "silver",
  G: "gold",
  B: "bishop",
  R: "rook",
};

/** USI square. File 1 is the rightmost file from sente, rank a is gote's back rank. */
export function coordToUsi(coord: Coord): string {
  const file = 9 - coord.c;
  const rank = String.fromCharCode("a".charCodeAt(0) + coord.r);
  return `${file}${rank}`;
}

export function usiToCoord(square: string): Coord | null {
  if (square.length < 2) return null;
  const file = Number(square[0]);
  const r = square.charCodeAt(1) - "a".charCodeAt(0);
  if (file < 1 || file > 9 || r < 0 || r > 8) return null;
  return { r, c: 9 - file };
}

function pieceSfen(piece: Piece): string {
  const token = PIECE_SFEN[piece.type];
  return piece.side === "sente" ? token.toUpperCase() : token;
}

function rowSfen(row: Board[number]): string {
  let out = "";
  let empty = 0;
  for (const square of row) {
    if (!square) {
      empty += 1;
      continue;
    }
    if (empty) {
      out += empty;
      empty = 0;
    }
    out += pieceSfen(square);
  }
  if (empty) out += empty;
  return out;
}

function handSfen(hands: Record<Side, Hand>): string {
  let out = "";
  for (const [type, token] of HAND_SFEN) {
    const count = hands.sente[type];
    if (count === 1) out += token;
    else if (count > 1) out += `${count}${token}`;
  }
  for (const [type, token] of HAND_SFEN) {
    const count = hands.gote[type];
    const lower = token.toLowerCase();
    if (count === 1) out += lower;
    else if (count > 1) out += `${count}${lower}`;
  }
  return out || "-";
}

export function toSfen(board: Board, hands: Record<Side, Hand>, turn: Side): string {
  const rows = board.map((row) => rowSfen(row)).join("/");
  const side = turn === "sente" ? "b" : "w";
  return `${rows} ${side} ${handSfen(hands)} 1`;
}

/** `bestmove 7g7f`, `bestmove P*5e`, `bestmove resign`, or `bestmove win`. */
export function parseBestmove(line: string): Move | "resign" | "win" | null {
  const token = line.trim().split(/\s+/)[1];
  if (!token) return null;
  if (token === "resign") return "resign";
  if (token === "win") return "win";

  if (token.includes("*")) {
    const [piece, square] = token.split("*");
    const type = DROP_PIECE[piece];
    const to = square ? usiToCoord(square) : null;
    if (!type || !to) return null;
    return { kind: "drop", piece: type, to };
  }

  const promote = token.endsWith("+");
  const body = promote ? token.slice(0, -1) : token;
  if (body.length < 4) return null;
  const from = usiToCoord(body.slice(0, 2));
  const to = usiToCoord(body.slice(2, 4));
  if (!from || !to) return null;
  return { kind: "move", from, to, promote };
}
