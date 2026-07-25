import {
  applyMove,
  createGameHands,
  createInitialBoard,
  generateLegalMoves,
  inCheck,
} from "./board";
import { MATERIAL, opposite, type Board, type Coord, type Hand, type Move, type Side, type UnpromotedType } from "./types";

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
    message: inCheck(board, "gote") ? "王手！相手の番です…" : "相手の番です…",
  };
}

export function applyAiMove(state: ShogiState): ShogiState {
  if (state.phase !== "playing" || state.turn !== "gote") return state;

  const move = chooseAiMove(state.board, state.hands, "gote");
  if (!move) {
    return {
      ...state,
      phase: "ended",
      winner: "sente",
      message: "詰みです！あなたの勝ち",
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

function evaluate(board: Board, hands: Record<Side, Hand>, side: Side): number {
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
    const v =
      key === "rook"
        ? 1000
        : key === "bishop"
          ? 800
          : key === "gold"
            ? 600
            : key === "silver"
              ? 500
              : key === "knight"
                ? 400
                : key === "lance"
                  ? 300
                  : 100;
    score += hands[side][key] * v;
    score -= hands[opposite(side)][key] * v;
  }
  if (inCheck(board, opposite(side))) score += 150;
  if (inCheck(board, side)) score -= 180;
  return score;
}

function chooseAiMove(
  board: Board,
  hands: Record<Side, Hand>,
  side: Side,
): Move | null {
  const moves = generateLegalMoves(board, hands, side);
  if (moves.length === 0) return null;

  // Prefer captures / checks with 1-ply eval
  let best = moves[0];
  let bestScore = -Infinity;
  const shuffled = [...moves].sort(() => Math.random() - 0.5);

  for (const move of shuffled.slice(0, Math.min(shuffled.length, 80))) {
    const applied = applyMove(board, hands, side, move);
    if (!applied) continue;
    let score = evaluate(applied.board, applied.hands, side);

    // light opponent reply penalty
    const replies = generateLegalMoves(
      applied.board,
      applied.hands,
      opposite(side),
    );
    if (replies.length === 0) return move; // mate
    let worst = Infinity;
    for (const reply of replies.slice(0, 25)) {
      const next = applyMove(
        applied.board,
        applied.hands,
        opposite(side),
        reply,
      );
      if (!next) continue;
      const s = evaluate(next.board, next.hands, side);
      if (s < worst) worst = s;
    }
    if (worst !== Infinity) score = score * 0.4 + worst * 0.6;

    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}
