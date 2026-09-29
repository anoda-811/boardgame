import {
  applyMove,
  createGameHands,
  createInitialBoard,
  findKing,
  generateLegalMoves,
  inCheck,
} from "./board";
import { MATERIAL, opposite, type Board, type Coord, type Hand, type Move, type PieceType, type Side, type UnpromotedType } from "./types";

export type AiRank =
  | "10kyu"
  | "8kyu"
  | "5kyu"
  | "2kyu"
  | "1kyu"
  | "1dan"
  | "3dan"
  | "5dan"
  | "7dan"
  | "9dan";

/** Search width and time. Higher ranks read further and do not slip. */
export const AI_RANKS: Record<
  AiRank,
  {
    label: string;
    description: string;
    depth: number;
    width: number;
    qDepth: number;
    ms: number;
    noise: number;
    blunder: number;
    judgment: number;
    /** Chance to ignore the engine and play the lighter search instead. */
    slip: number;
  }
> = {
  "10kyu": { label: "十級", description: "やねうら王の浅い読み。筋は通るが、良い手のなかから散らして選ぶ", depth: 1, width: 4, qDepth: 0, ms: 20, noise: 0, blunder: 0, judgment: 1, slip: 0 },
  "8kyu": { label: "八級", description: "やねうら王。少し先まで読み、大きな損はしない", depth: 1, width: 5, qDepth: 0, ms: 30, noise: 0, blunder: 0, judgment: 1, slip: 0 },
  "5kyu": { label: "五級", description: "やねうら王。近い手のなかから選ぶ", depth: 2, width: 6, qDepth: 1, ms: 45, noise: 0, blunder: 0, judgment: 1, slip: 0 },
  "2kyu": { label: "二級", description: "やねうら王。ほぼ本筋で、たまに一歩遅い", depth: 2, width: 8, qDepth: 1, ms: 70, noise: 0, blunder: 0, judgment: 1, slip: 0 },
  "1kyu": { label: "一級", description: "やねうら王。最善に近い手だけ", depth: 2, width: 8, qDepth: 1, ms: 80, noise: 0, blunder: 0, judgment: 1, slip: 0 },
  "1dan": { label: "初段", description: "やねうら王。短い読み", depth: 3, width: 8, qDepth: 2, ms: 90, noise: 8, blunder: 0.03, judgment: 1, slip: 0.12 },
  "3dan": { label: "三段", description: "やねうら王。中盤の読みが安定してくる", depth: 3, width: 10, qDepth: 2, ms: 140, noise: 0, blunder: 0, judgment: 1, slip: 0 },
  "5dan": { label: "五段", description: "やねうら王が長考し、本筋を指す", depth: 4, width: 8, qDepth: 3, ms: 200, noise: 0, blunder: 0, judgment: 1, slip: 0 },
  "7dan": { label: "七段", description: "やねうら王。ほぼ最善だけを選ぶ", depth: 4, width: 10, qDepth: 3, ms: 280, noise: 0, blunder: 0, judgment: 1, slip: 0 },
  "9dan": { label: "九段", description: "やねうら王を長く読ませる", depth: 4, width: 12, qDepth: 3, ms: 360, noise: 0, blunder: 0, judgment: 1, slip: 0 },
};

export const AI_RANK_ORDER: AiRank[] = ["10kyu", "8kyu", "5kyu", "2kyu", "1kyu", "1dan", "3dan", "5dan", "7dan", "9dan"];

export type ShogiPhase = "title" | "playing" | "promote" | "ended";

export type ShogiState = {
  phase: ShogiPhase;
  board: Board;
  hands: Record<Side, Hand>;
  turn: Side;
  selected: Coord | null;
  selectedDrop: UnpromotedType | null;
  legalTargets: Coord[];
  pendingPromote: { from: Coord; to: Coord } | null;
  message: string;
  winner: Side | null;
  lastMove: { from?: Coord; to: Coord; by: Side } | null;
};

export function createTitleState(): ShogiState {
  return {
    phase: "title",
    board: createInitialBoard(),
    hands: createGameHands(),
    turn: "sente",
    selected: null,
    selectedDrop: null,
    legalTargets: [],
    pendingPromote: null,
    message: "",
    winner: null,
    lastMove: null,
  };
}

export function startGame(): ShogiState {
  return {
    ...createTitleState(),
    phase: "playing",
    message: "あなたの番です（先手）",
  };
}

function targetsForSelection(
  board: Board,
  hands: Record<Side, Hand>,
  turn: Side,
  selected: Coord | null,
  selectedDrop: UnpromotedType | null,
): Coord[] {
  const moves = generateLegalMoves(board, hands, turn);
  if (selectedDrop) {
    return moves
      .filter((m) => m.kind === "drop" && m.piece === selectedDrop)
      .map((m) => m.to);
  }
  if (selected) {
    return moves
      .filter(
        (m) =>
          m.kind === "move" &&
          m.from.r === selected.r &&
          m.from.c === selected.c,
      )
      .map((m) => m.to)
      .filter(
        (to, i, arr) => arr.findIndex((t) => t.r === to.r && t.c === to.c) === i,
      );
  }
  return [];
}

export function selectSquare(state: ShogiState, coord: Coord): ShogiState {
  if (state.phase !== "playing" || state.turn !== "sente") return state;

  // drop onto square
  if (state.selectedDrop) {
    const dropMove: Move = {
      kind: "drop",
      piece: state.selectedDrop,
      to: coord,
    };
    const applied = applyMove(state.board, state.hands, "sente", dropMove);
    if (!applied) {
      return { ...state, message: "そこには打てません" };
    }
    return afterSenteMove(state, applied.board, applied.hands, {
      to: coord,
    });
  }

  const piece = state.board[coord.r][coord.c];

  // click own piece to select / deselect
  if (piece && piece.side === "sente") {
    if (
      state.selected &&
      state.selected.r === coord.r &&
      state.selected.c === coord.c
    ) {
      return {
        ...state,
        selected: null,
        selectedDrop: null,
        legalTargets: [],
        message: "あなたの番です（先手）",
      };
    }

    const selected = { ...coord };
    return {
      ...state,
      selected,
      selectedDrop: null,
      legalTargets: targetsForSelection(
        state.board,
        state.hands,
        "sente",
        selected,
        null,
      ),
      message: "移動先を選んでください",
    };
  }

  // move to target
  if (state.selected) {
    const from = state.selected;
    const legal = generateLegalMoves(state.board, state.hands, "sente").filter(
      (m) =>
        m.kind === "move" &&
        m.from.r === from.r &&
        m.from.c === from.c &&
        m.to.r === coord.r &&
        m.to.c === coord.c,
    );

    if (legal.length === 0) {
      return {
        ...state,
        selected: null,
        legalTargets: [],
        message: "あなたの番です（先手）",
      };
    }

    const promoteOptions = legal.filter((m) => m.kind === "move" && m.promote);
    const nonPromote = legal.find((m) => m.kind === "move" && !m.promote);

    if (promoteOptions.length > 0 && nonPromote) {
      return {
        ...state,
        phase: "promote",
        pendingPromote: { from, to: coord },
        selected: null,
        legalTargets: [],
        message: "成りますか？",
      };
    }

    const move = legal[0];
    const applied = applyMove(state.board, state.hands, "sente", move);
    if (!applied) return state;
    return afterSenteMove(state, applied.board, applied.hands, {
      from,
      to: coord,
    });
  }

  return state;
}

export function selectDrop(
  state: ShogiState,
  piece: UnpromotedType,
): ShogiState {
  if (state.phase !== "playing" || state.turn !== "sente") return state;
  if (state.hands.sente[piece] <= 0) return state;

  const selectedDrop =
    state.selectedDrop === piece ? null : piece;

  return {
    ...state,
    selected: null,
    selectedDrop,
    legalTargets: selectedDrop
      ? targetsForSelection(
          state.board,
          state.hands,
          "sente",
          null,
          selectedDrop,
        )
      : [],
    message: selectedDrop
      ? `${pieceLabel(selectedDrop)}の打ち場所を選んでください`
      : "あなたの番です（先手）",
  };
}

function pieceLabel(p: UnpromotedType): string {
  const map: Record<UnpromotedType, string> = {
    rook: "飛車",
    bishop: "角行",
    gold: "金将",
    silver: "銀将",
    knight: "桂馬",
    lance: "香車",
    pawn: "歩",
  };
  return map[p];
}

export function choosePromote(state: ShogiState, promote: boolean): ShogiState {
  if (state.phase !== "promote" || !state.pendingPromote) return state;
  const { from, to } = state.pendingPromote;
  const move: Move = { kind: "move", from, to, promote };
  const applied = applyMove(state.board, state.hands, "sente", move);
  if (!applied) {
    return {
      ...state,
      phase: "playing",
      pendingPromote: null,
      message: "不正な手です",
    };
  }
  return afterSenteMove(state, applied.board, applied.hands, { from, to });
}

function afterSenteMove(
  state: ShogiState,
  board: Board,
  hands: Record<Side, Hand>,
  lastMove: { from?: Coord; to: Coord },
): ShogiState {
  const stamped = { ...lastMove, by: "sente" as const };
  const goteMoves = generateLegalMoves(board, hands, "gote");
  if (goteMoves.length === 0) {
    return {
      ...state,
      phase: "ended",
      board,
      hands,
      turn: "gote",
      selected: null,
      selectedDrop: null,
      legalTargets: [],
      pendingPromote: null,
      lastMove: stamped,
      winner: "sente",
      message: inCheck(board, "gote") ? "詰みです！あなたの勝ち" : "相手が手数切れ？あなたの勝ち",
    };
  }

  return {
    ...state,
    phase: "playing",
    board,
    hands,
    turn: "gote",
    selected: null,
    selectedDrop: null,
    legalTargets: [],
    pendingPromote: null,
    lastMove: stamped,
    message: inCheck(board, "gote") ? "王手！相手が考えています…" : "相手が考えています…",
  };
}

/** Play one already-chosen gote move. Returns the same state if the move is illegal. */
export function applyGoteMove(state: ShogiState, move: Move | "resign" | "win"): ShogiState {
  if (state.phase !== "playing" || state.turn !== "gote") return state;

  if (move === "resign") {
    return {
      ...state,
      phase: "ended",
      winner: "sente",
      selected: null,
      selectedDrop: null,
      legalTargets: [],
      message: "投了。あなたの勝ち",
    };
  }

  if (move === "win") {
    return {
      ...state,
      phase: "ended",
      winner: "gote",
      turn: "sente",
      selected: null,
      selectedDrop: null,
      legalTargets: [],
      message: "入玉宣言。相手の勝ち",
    };
  }

  const applied = applyMove(state.board, state.hands, "gote", move);
  if (!applied) return state;

  const lastMove =
    move.kind === "move"
      ? { from: move.from, to: move.to, by: "gote" as const }
      : { to: move.to, by: "gote" as const };

  const senteMoves = generateLegalMoves(
    applied.board,
    applied.hands,
    "sente",
  );
  if (senteMoves.length === 0) {
    return {
      ...state,
      phase: "ended",
      board: applied.board,
      hands: applied.hands,
      turn: "sente",
      lastMove,
      selected: null,
      selectedDrop: null,
      legalTargets: [],
      winner: "gote",
      message: inCheck(applied.board, "sente")
        ? "詰み…相手の勝ち"
        : "手数切れ…相手の勝ち",
    };
  }

  return {
    ...state,
    board: applied.board,
    hands: applied.hands,
    turn: "sente",
    lastMove,
    selected: null,
    selectedDrop: null,
    legalTargets: [],
    message: inCheck(applied.board, "sente")
      ? "王手されています！応じてください"
      : "あなたの番です（先手）",
  };
}

export function applyAiMove(state: ShogiState, rank: AiRank = "5dan"): ShogiState {
  if (state.phase !== "playing" || state.turn !== "gote") return state;

  const move = chooseAiMove(state.board, state.hands, "gote", rank);
  if (!move) {
    return {
      ...state,
      phase: "ended",
      winner: "sente",
      message: "詰みです！あなたの勝ち",
    };
  }

  return applyGoteMove(state, move);
}

function chebyshev(a: Coord, b: Coord) {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
}

const GENERALS = new Set<PieceType>(["gold", "silver", "promotedSilver"]);

/** Tanigawa-style material, plus castle, the rook pawn, and pieces that are actually working. */
function evaluate(board: Board, hands: Record<Side, Hand>, side: Side, judgment: number): number {
  let score = 0;
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const p = board[r][c];
      if (!p) continue;
      const v = MATERIAL[p.type];
      score += p.side === side ? v : -v;
    }
  }
  for (const key of Object.keys(hands.sente) as UnpromotedType[]) {
    const v = Math.round(MATERIAL[key] * 1.12);
    score += hands[side][key] * v;
    score -= hands[opposite(side)][key] * v;
  }
  if (inCheck(board, opposite(side))) score += 280;
  if (inCheck(board, side)) score -= 320;
  score += Math.round((positional(board, side) - positional(board, opposite(side))) * judgment);
  return score;
}

function positional(board: Board, side: Side): number {
  const king = findKing(board, side);
  if (!king) return -8000;
  const forward = side === "sente" ? -1 : 1;
  let score = 0;

  const campDepth = side === "gote" ? king.r : 8 - king.r;
  if (campDepth >= 3) score -= 260;
  else if (campDepth >= 1) score -= 70;
  score += Math.abs(king.c - 4) * 45;
  if (king.c === 4 && campDepth === 0) score -= 40;

  let defenders = 0;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const r = king.r + dr;
      const c = king.c + dc;
      if (r < 0 || r > 8 || c < 0 || c > 8) continue;
      const p = board[r][c];
      if (p && p.side === side && GENERALS.has(p.type)) defenders += 1;
      if (dr === forward && p && p.side === side && (p.type === "pawn" || p.type === "lance")) score += 28;
    }
  }
  score += defenders * 150;
  if (defenders === 0) score -= 180;

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const p = board[r][c];
      if (!p || p.side !== side) continue;
      const advanced = side === "sente" ? 8 - r : r;
      if (p.type === "pawn") score += Math.max(0, advanced - 2) * 18;
      if (p.type === "silver" || p.type === "knight") score += Math.max(0, advanced - 1) * 12;
      const inEnemyCamp = side === "sente" ? r <= 2 : r >= 6;
      if (inEnemyCamp && p.type !== "king") score += 30;
      if ((p.type === "rook" || p.type === "dragon") && fileIsWorking(board, side, c, r)) score += 180;
    }
  }
  score += castleShape(board, side);
  return score;
}

/**
 * 金矢倉の完成図（先手は8八玉・7八金・6七金・7七銀、後手はその鏡）。
 * Wikipedia「矢倉囲い」の金矢倉の配置。途中のマスにも点を置き、手順で寄っていく。
 */
const YAGURA: { type: PieceType; r: number; c: number; bonus: number }[] = [
  { type: "king", r: 7, c: 1, bonus: 320 },
  { type: "king", r: 7, c: 2, bonus: 160 },
  { type: "king", r: 8, c: 2, bonus: 80 },
  { type: "gold", r: 7, c: 2, bonus: 180 },
  { type: "gold", r: 6, c: 3, bonus: 160 },
  { type: "silver", r: 6, c: 2, bonus: 190 },
  { type: "silver", r: 7, c: 2, bonus: 70 },
  { type: "pawn", r: 5, c: 2, bonus: 50 },
  { type: "pawn", r: 5, c: 3, bonus: 45 },
  { type: "pawn", r: 4, c: 7, bonus: 140 },
  { type: "pawn", r: 5, c: 7, bonus: 50 },
  { type: "pawn", r: 5, c: 6, bonus: 40 },
];

function mirror(side: Side, r: number, c: number): Coord {
  return side === "sente" ? { r, c } : { r: 8 - r, c: 8 - c };
}

function castleShape(board: Board, side: Side): number {
  let score = 0;
  for (const target of YAGURA) {
    const sq = mirror(side, target.r, target.c);
    const there = board[sq.r][sq.c];
    if (there && there.side === side && there.type === target.type) {
      score += target.bonus;
      continue;
    }
    let nearest = 99;
    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        const p = board[r][c];
        if (!p || p.side !== side || p.type !== target.type) continue;
        const dist = chebyshev({ r, c }, sq);
        if (dist < nearest) nearest = dist;
      }
    }
    if (nearest <= 2) score += Math.round(target.bonus * (3 - nearest) * 0.18);
  }
  return score;
}

/** A rook with its pawn pushed, or an open file in front, is doing its job. */
function fileIsWorking(board: Board, side: Side, file: number, rookRow: number): boolean {
  const forward = side === "sente" ? -1 : 1;
  const start = side === "sente" ? 6 : 2;
  for (let r = rookRow + forward; r >= 0 && r <= 8; r += forward) {
    const p = board[r][file];
    if (!p) continue;
    if (p.side === side && p.type === "pawn") return Math.abs(r - start) >= 1;
    return p.side !== side;
  }
  return true;
}

/**
 * Cheap ordering so the search spends its time on captures, promotions,
 * the rook pawn, and castle moves instead of a random legal drop.
 */
function quietScore(board: Board, side: Side, move: Move, ownKing: Coord | null, enemyKing: Coord | null): number {
  const forward = side === "sente" ? -1 : 1;
  const castleDir = side === "sente" ? -1 : 1;
  let score = 0;

  if (move.kind === "drop") {
    score -= move.piece === "pawn" || move.piece === "lance" ? 110 : 25;
    if (enemyKing && chebyshev(move.to, enemyKing) <= 2 && move.piece !== "lance") score += 170;
    if (ownKing && GENERALS.has(move.piece) && chebyshev(move.to, ownKing) <= 1) score += 240;
    return score;
  }

  const piece = board[move.from.r][move.from.c];
  const victim = board[move.to.r][move.to.c];
  if (victim && victim.side !== side) score += MATERIAL[victim.type] + 40;
  if (move.promote) {
    score += piece?.type === "pawn" ? 420 : piece?.type === "rook" || piece?.type === "bishop" ? 380 : 80;
  }

  if (piece?.type === "pawn" && move.to.c === move.from.c && move.to.r === move.from.r + forward) {
    const rookRow = side === "sente" ? 7 : 1;
    const rook = board[rookRow][move.from.c];
    if (rook && rook.side === side && (rook.type === "rook" || rook.type === "dragon")) score += 240;
  }
  if (piece?.type === "king" && ownKing) {
    const dc = move.to.c - move.from.c;
    const alongRank = move.to.r === move.from.r;
    if (Math.sign(dc) === castleDir && alongRank) score += 200;
    else if (Math.sign(dc) === castleDir) score += 30;
  }
  if (piece && GENERALS.has(piece.type) && ownKing) {
    const before = chebyshev(move.from, ownKing);
    const after = chebyshev(move.to, ownKing);
    if (after < before) score += 110;
  }
  if (piece?.type === "silver" && move.to.r === move.from.r + forward) score += 75;
  if (piece?.type === "bishop" && (side === "gote" ? move.from.r <= 1 : move.from.r >= 7)) score += 120;
  if (piece && enemyKing && (piece.type === "rook" || piece.type === "dragon")) {
    if (move.to.r === enemyKing.r || move.to.c === enemyKing.c) score += 80;
  }
  if (piece && enemyKing && (piece.type === "bishop" || piece.type === "horse")) {
    if (Math.abs(move.to.r - enemyKing.r) === Math.abs(move.to.c - enemyKing.c)) score += 70;
  }
  return score;
}

const MATE = 120000;

function isTactical(board: Board, move: Move): boolean {
  if (move.kind === "drop") return false;
  if (board[move.to.r][move.to.c]) return true;
  if (!move.promote) return false;
  const piece = board[move.from.r][move.from.c];
  return piece?.type === "pawn" || piece?.type === "rook" || piece?.type === "bishop";
}

function rankMoves(board: Board, hands: Record<Side, Hand>, side: Side, width: number, tacticalOnly: boolean) {
  const ownKing = findKing(board, side);
  const enemyKing = findKing(board, opposite(side));
  const moves = generateLegalMoves(board, hands, side);
  const ranked = moves
    .filter((move) => !tacticalOnly || isTactical(board, move))
    .map((move) => ({ move, score: quietScore(board, side, move, ownKing, enemyKing) }))
    .sort((a, b) => b.score - a.score);
  return ranked.slice(0, width);
}

function branchWidth(width: number, ply: number) {
  if (ply === 0) return width;
  if (ply === 1) return Math.max(4, width - 2);
  return Math.max(3, width - 4);
}

function chooseAiMove(
  board: Board,
  hands: Record<Side, Hand>,
  side: Side,
  rank: AiRank,
): Move | null {
  const rootMoves = rankMoves(board, hands, side, 80, false);
  if (rootMoves.length === 0) return null;

  const profile = AI_RANKS[rank];
  if (Math.random() < profile.blunder) {
    const pool = rootMoves.slice(0, profile.blunder >= 0.15 ? 10 : 4);
    return pool[Math.floor(Math.random() * pool.length)]?.move ?? rootMoves[0].move;
  }

  const deadline = Date.now() + profile.ms;
  let aborted = false;
  let bestMove = rootMoves[0].move;

  const timedOut = () => {
    if (Date.now() >= deadline) aborted = true;
    return aborted;
  };

  function quiesce(
    nodeBoard: Board,
    nodeHands: Record<Side, Hand>,
    nodeSide: Side,
    qLeft: number,
    alpha: number,
    beta: number,
  ): number {
    const stand = evaluate(nodeBoard, nodeHands, nodeSide, profile.judgment);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (qLeft <= 0 || timedOut()) return stand;
    const tactical = rankMoves(nodeBoard, nodeHands, nodeSide, 8, true);
    for (const { move } of tactical) {
      const applied = applyMove(nodeBoard, nodeHands, nodeSide, move);
      if (!applied) continue;
      const score = -quiesce(applied.board, applied.hands, opposite(nodeSide), qLeft - 1, -beta, -alpha);
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  function negamax(
    nodeBoard: Board,
    nodeHands: Record<Side, Hand>,
    nodeSide: Side,
    depth: number,
    ply: number,
    alpha: number,
    beta: number,
    extend: number,
  ): number {
    if (timedOut()) return evaluate(nodeBoard, nodeHands, nodeSide, profile.judgment);
    if (depth <= 0) return quiesce(nodeBoard, nodeHands, nodeSide, profile.qDepth, alpha, beta);
    const width = branchWidth(profile.width, ply);
    const moves = rankMoves(nodeBoard, nodeHands, nodeSide, width, false);
    if (moves.length === 0) {
      return inCheck(nodeBoard, nodeSide) ? -MATE + ply : -3000;
    }
    let best = -Infinity;
    for (const { move } of moves) {
      const applied = applyMove(nodeBoard, nodeHands, nodeSide, move);
      if (!applied) continue;
      const givesCheck = inCheck(applied.board, opposite(nodeSide));
      const nextDepth = givesCheck && extend < 1 ? depth : depth - 1;
      const score = -negamax(
        applied.board,
        applied.hands,
        opposite(nodeSide),
        nextDepth,
        ply + 1,
        -beta,
        -alpha,
        givesCheck ? extend + 1 : extend,
      );
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta || aborted) break;
    }
    return best;
  }

  for (let depth = 1; depth <= profile.depth; depth += 1) {
    let depthBest = bestMove;
    let depthScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;
    let finished = true;
    for (const { move } of rootMoves.slice(0, profile.width)) {
      if (timedOut()) {
        finished = false;
        break;
      }
      const applied = applyMove(board, hands, side, move);
      if (!applied) continue;
      const givesCheck = inCheck(applied.board, opposite(side));
      const score =
        -negamax(
          applied.board,
          applied.hands,
          opposite(side),
          givesCheck ? depth : depth - 1,
          1,
          -beta,
          -alpha,
          givesCheck ? 1 : 0,
        ) +
        (Math.random() - 0.5) * profile.noise;
      if (aborted) {
        finished = false;
        break;
      }
      if (score > depthScore) {
        depthScore = score;
        depthBest = move;
      }
      if (score > alpha) alpha = score;
    }
    if (!finished && depth > 1) break;
    bestMove = depthBest;
  }

  return bestMove;
}
