import { applyMove, findKing, generateLegalMoves, inCheck, isSquareAttacked, rawMovesFrom } from "./board";
import { coordToUsi } from "./sfen";
import { MATERIAL, opposite, type Board, type Coord, type Hand, type Move, type Side } from "./types";

/**
 * 10-kyu habits on a shallow engine list.
 * Free material is taken, and a piece left en prise is not played.
 * King safety and mate are only a little soft: close choices drift,
 * a mating move is missed about half the time when another sane move exists.
 */
export type EngineGlance = { move: string; cp: number; depth: number };

type Feat = {
  move: Move;
  mate: boolean;
  capture: number;
  check: boolean;
  defend: boolean;
  hang: number;
  save: number;
  cp: number;
};

const DROP_LETTER: Record<string, string> = {
  rook: "R",
  bishop: "B",
  gold: "G",
  silver: "S",
  knight: "N",
  lance: "L",
  pawn: "P",
};

function moveToUsi(move: Move): string {
  if (move.kind === "drop") return `${DROP_LETTER[move.piece]}*${coordToUsi(move.to)}`;
  const body = `${coordToUsi(move.from)}${coordToUsi(move.to)}`;
  return move.promote ? `${body}+` : body;
}

function chebyshev(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
}

function isLoose(board: Board, square: Coord, owner: Side): boolean {
  return isSquareAttacked(board, square, opposite(owner)) && !defended(board, square, owner);
}

/** A friend can recapture on this square. Raw moves skip squares occupied by that side. */
function defended(board: Board, square: Coord, side: Side): boolean {
  const probe = board.map((row) => row.slice());
  const occupant = probe[square.r][square.c];
  if (occupant?.side === side) probe[square.r][square.c] = { type: occupant.type, side: opposite(side) };
  return isSquareAttacked(probe, square, side);
}

function listLoose(board: Board, side: Side): { at: Coord; value: number }[] {
  const found: { at: Coord; value: number }[] = [];
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const piece = board[r][c];
      if (!piece || piece.side !== side || piece.type === "king") continue;
      if (!isLoose(board, { r, c }, side)) continue;
      found.push({ at: { r, c }, value: MATERIAL[piece.type] });
    }
  }
  return found;
}

function cheapestAttacker(board: Board, square: Coord, bySide: Side): number | null {
  let best: number | null = null;
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const piece = board[r][c];
      if (!piece || piece.side !== bySide) continue;
      const hits = rawMovesFrom(board, { r, c }).some((to) => to.r === square.r && to.c === square.c);
      if (!hits) continue;
      const value = MATERIAL[piece.type];
      if (best === null || value < best) best = value;
    }
  }
  return best;
}

/** Net material lost if the landed piece can be taken, even when something recaptures. */
function landingHang(after: Board, to: Coord, side: Side, captured: number): number {
  const piece = after[to.r][to.c];
  if (!piece || piece.side !== side || piece.type === "king") return 0;
  const attacker = cheapestAttacker(after, to, opposite(side));
  if (attacker === null) return 0;
  const ours = MATERIAL[piece.type];
  if (!defended(after, to, side)) return Math.max(0, ours - captured);
  return Math.max(0, ours - attacker - captured);
}

function captureValue(board: Board, move: Move): number {
  if (move.kind !== "move") return 0;
  const victim = board[move.to.r][move.to.c];
  return victim ? MATERIAL[victim.type] : 0;
}

function savedValue(move: Move, loose: { at: Coord; value: number }[]): number {
  if (move.kind !== "move") return 0;
  let saved = 0;
  for (const item of loose) {
    if (item.at.r === move.from.r && item.at.c === move.from.c) saved = Math.max(saved, item.value);
  }
  return saved;
}

function defends(board: Board, side: Side, move: Move, ownKing: Coord | null): boolean {
  if (move.kind === "drop") return ownKing !== null && chebyshev(move.to, ownKing) <= 1;
  const piece = board[move.from.r][move.from.c];
  if (!piece || piece.side !== side) return false;
  if (piece.type === "king") {
    const back = side === "gote" ? 0 : 8;
    const towardEdge = Math.min(move.to.c, 8 - move.to.c) < Math.min(move.from.c, 8 - move.from.c);
    const towardHome = Math.abs(move.to.r - back) < Math.abs(move.from.r - back);
    return towardEdge || towardHome;
  }
  if (!ownKing) return false;
  if (piece.type !== "gold" && piece.type !== "silver" && piece.type !== "promotedSilver") return false;
  return chebyshev(move.to, ownKing) < chebyshev(move.from, ownKing);
}

function worthALook(
  board: Board,
  move: Move,
  loose: { at: Coord; value: number }[],
  fromEngine: boolean,
): boolean {
  if (fromEngine) return true;
  if (savedValue(move, loose) >= 300) return true;
  if (move.kind !== "move") return false;
  const victim = board[move.to.r][move.to.c];
  return victim !== null && isLoose(board, move.to, victim.side);
}

function glanceAt(lines: EngineGlance[]): Map<string, { mate: boolean; cp: number }> {
  const deepest = lines.reduce((max, line) => Math.max(max, line.depth), 0);
  const table = new Map<string, { mate: boolean; cp: number }>();
  for (const line of lines) {
    if (line.depth !== deepest) continue;
    table.set(line.move, { mate: line.cp >= 50000, cp: line.cp });
  }
  return table;
}

function habitScore(feat: Feat): number {
  let score = Math.max(-50, Math.min(36, feat.cp / 5));
  if (feat.capture >= 800) score += 28;
  else if (feat.capture >= 500) score += 18;
  else if (feat.capture > 0) score += 10;
  if (feat.check && !feat.mate) score += 12;
  if (feat.defend && feat.capture === 0 && !feat.check) score -= 28;
  if (feat.save >= 500) score += 36;
  else if (feat.save >= 300) score += 16;
  return score;
}

function weightedPick(feats: Feat[]): Feat {
  const weights = feats.map((feat) => Math.exp(habitScore(feat) / 32));
  let roll = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < feats.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return feats[i];
  }
  return feats[0];
}

/** A slightly human 10-kyu move. Null lets the engine answer a check. */
export function pickAmateurMove(
  board: Board,
  hands: Record<Side, Hand>,
  side: Side,
  lines: EngineGlance[],
): Move | null {
  if (inCheck(board, side)) return null;

  const ownKing = findKing(board, side);
  const enemy = opposite(side);
  const loose = listLoose(board, side);
  const glanced = glanceAt(lines);
  const seen = new Set<string>();
  const feats: Feat[] = [];

  for (const move of generateLegalMoves(board, hands, side)) {
    const usi = moveToUsi(move);
    if (seen.has(usi) || !worthALook(board, move, loose, glanced.has(usi))) continue;
    const applied = applyMove(board, hands, side, move);
    if (!applied) continue;
    seen.add(usi);
    const capture = captureValue(board, move);
    const hang = landingHang(applied.board, move.to, side, capture);
    if (hang >= 300) continue;
    const known = glanced.get(usi);
    feats.push({
      move,
      mate: known?.mate ?? false,
      capture,
      check: inCheck(applied.board, enemy),
      defend: defends(board, side, move, ownKing),
      hang,
      save: savedValue(move, loose),
      cp: known?.cp ?? 0,
    });
  }

  if (feats.length === 0) return null;
  const mates = feats.filter((feat) => feat.mate);
  const others = feats.filter((feat) => !feat.mate);
  if (mates.length > 0 && others.length > 0 && Math.random() < 0.45) {
    return weightedPick(others).move;
  }
  if (mates.length > 0) return weightedPick(mates).move;
  return weightedPick(feats).move;
}
