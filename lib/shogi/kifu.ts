import { applyMove } from "./board";
import type { ShogiState } from "./game";
import { opposite, type Coord, type Move, type Piece, type PieceType } from "./types";

const FILE = ["１", "２", "３", "４", "５", "６", "７", "８", "９"];
const RANK = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

const NAME: Record<PieceType, string> = {
  king: "玉",
  rook: "飛",
  bishop: "角",
  gold: "金",
  silver: "銀",
  knight: "桂",
  lance: "香",
  pawn: "歩",
  dragon: "龍",
  horse: "馬",
  promotedSilver: "成銀",
  promotedKnight: "成桂",
  promotedLance: "成香",
  tokin: "と",
};

const PROMOTED_FROM: Partial<Record<PieceType, PieceType>> = {
  tokin: "pawn",
  promotedLance: "lance",
  promotedKnight: "knight",
  promotedSilver: "silver",
  horse: "bishop",
  dragon: "rook",
};

export type SenteEval = {
  /** Centipawns from sente's side. Positive means sente is better. */
  cp: number;
  /** Mate distance from sente's side. Positive means sente is mating. */
  mate: number | null;
};

export function squareName(coord: Coord): string {
  return `${FILE[9 - coord.c - 1]}${RANK[coord.r]}`;
}

export function quietPosition(state: ShogiState): ShogiState {
  return {
    ...state,
    selected: null,
    selectedDrop: null,
    legalTargets: [],
    pendingPromote: null,
  };
}

/** Identity of the position, ignoring selection and messages. */
export function positionKey(state: ShogiState): string {
  if (state.phase === "promote" || state.phase === "title") return "";
  const board = state.board
    .map((row) => row.map((piece) => (piece ? `${piece.side[0]}${piece.type}` : ".")).join(""))
    .join("/");
  const hands = (["sente", "gote"] as const)
    .map((side) =>
      Object.entries(state.hands[side])
        .map(([type, count]) => `${type}${count}`)
        .join(""),
    )
    .join("|");
  const move = state.lastMove;
  const mark = move
    ? `${move.by}:${move.from?.r ?? "-"},${move.from?.c ?? "-"}>${move.to.r},${move.to.c}`
    : "-";
  return `${state.phase}|${state.winner}|${state.turn}|${mark}|${board}|${hands}`;
}

function sameSquare(a: Coord | undefined, b: Coord | undefined): boolean {
  return Boolean(a && b && a.r === b.r && a.c === b.c);
}

function pieceName(piece: Piece, origin: Piece | null, promotedNow: boolean): string {
  if (promotedNow && origin) return `${NAME[origin.type]}成`;
  if (piece.type === "king" && piece.side === "gote") return "王";
  return NAME[piece.type];
}

/** Japanese notation for the move that turned `before` into `after`. */
export function describeMove(before: ShogiState, after: ShogiState): string {
  if (after.phase === "ended" && after.lastMove === before.lastMove) {
    if (after.message.includes("投了")) return "投了";
    if (after.message.includes("入玉")) return "入玉";
  }
  const move = after.lastMove;
  if (!move || move === before.lastMove) return "—";
  const arrived = after.board[move.to.r][move.to.c];
  if (!arrived) return "—";
  const origin = move.from ? before.board[move.from.r][move.from.c] : null;
  const promotedNow = Boolean(
    origin && PROMOTED_FROM[arrived.type] === origin.type,
  );
  const name = pieceName(arrived, origin, promotedNow);
  const same = sameSquare(before.lastMove?.to, move.to);
  const place = same ? "同" : squareName(move.to);
  return move.from ? `${place}${name}` : `${place}${name}打`;
}

/** Position left by a move, without selection. Null when the move is illegal. */
export function positionAfterMove(state: ShogiState, move: Move): ShogiState | null {
  const applied = applyMove(state.board, state.hands, state.turn, move);
  if (!applied) return null;
  return {
    ...state,
    board: applied.board,
    hands: applied.hands,
    turn: opposite(state.turn),
    lastMove:
      move.kind === "drop"
        ? { to: move.to, by: state.turn }
        : { from: move.from, to: move.to, by: state.turn },
  };
}

/** Japanese notation for a move that has not been played yet. */
export function describeCandidate(state: ShogiState, move: Move): string {
  const after = positionAfterMove(state, move);
  if (!after) return "—";
  return describeMove(state, after);
}

/** Higher is better for sente. A shorter mate outranks any point score. */
export function compareSenteEval(a: SenteEval, b: SenteEval): number {
  const score = (evaluation: SenteEval) => {
    if (evaluation.mate == null) return evaluation.cp;
    return evaluation.mate > 0 ? 1_000_000 - evaluation.mate : -1_000_000 - evaluation.mate;
  };
  return score(a) - score(b);
}

export function formatEval(evaluation: SenteEval | null): string {
  if (!evaluation) return "–";
  if (evaluation.mate != null) {
    const distance = Math.abs(evaluation.mate);
    if (distance === 0) return "詰";
    return evaluation.mate > 0 ? `+詰${distance}` : `−詰${distance}`;
  }
  const pawns = Math.round(evaluation.cp / 10) / 10;
  if (Math.abs(pawns) < 0.05) return "0.0";
  return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

export function evalAdvantage(evaluation: SenteEval | null): string {
  if (!evaluation) return "先手から見た評価";
  if (evaluation.mate != null) return evaluation.mate >= 0 ? "先手勝ち" : "後手勝ち";
  if (evaluation.cp >= 80) return "先手有利";
  if (evaluation.cp <= -80) return "後手有利";
  return "互角";
}

/** -1 is a full gote advantage, +1 is a full sente advantage. */
export function evalShare(evaluation: SenteEval | null): number {
  if (!evaluation) return 0;
  if (evaluation.mate != null) return evaluation.mate >= 0 ? 1 : -1;
  const x = evaluation.cp / 450;
  return Math.max(-1, Math.min(1, x / (1 + Math.abs(x))));
}
