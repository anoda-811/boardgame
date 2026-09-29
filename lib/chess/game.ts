import {
  chooseAiMove,
  createInitialPosition,
  getStatus,
  legalMoves,
  makeMove,
  type Color,
  type Coord,
  type Move,
  type PieceType,
  type Position,
} from "./engine";

export type ChessPhase = "title" | "playing" | "promote" | "ended";

export type ChessLevel = "easy" | "normal" | "hard";

export const LEVELS: Record<
  ChessLevel,
  { label: string; description: string; depth: number; noise: number }
> = {
  easy: { label: "やさしい", description: "1手先だけ読む。ときどき悪手も", depth: 1, noise: 150 },
  normal: { label: "ふつう", description: "2手先まで読む", depth: 2, noise: 25 },
  hard: { label: "つよい", description: "4手先まで読む本気モード", depth: 4, noise: 0 },
};

export type ChessState = {
  phase: ChessPhase;
  level: ChessLevel;
  position: Position;
  selected: Coord | null;
  targets: Coord[];
  pendingPromotion: { from: Coord; to: Coord } | null;
  lastMove: { from: Coord; to: Coord; by: Color } | null;
  captured: Record<Color, PieceType[]>;
  message: string;
  result: { winner: Color | null; reason: string } | null;
};

const PLAYER: Color = "w";

export function createTitleState(level: ChessLevel = "normal"): ChessState {
  return {
    phase: "title",
    level,
    position: createInitialPosition(),
    selected: null,
    targets: [],
    pendingPromotion: null,
    lastMove: null,
    captured: { w: [], b: [] },
    message: "",
    result: null,
  };
}

export function startGame(level: ChessLevel): ChessState {
  return {
    ...createTitleState(level),
    phase: "playing",
    message: "あなたの番です（白）",
  };
}

function sameSquare(a: Coord, b: Coord) {
  return a.r === b.r && a.c === b.c;
}

function uniqueTargets(moves: Move[]): Coord[] {
  const out: Coord[] = [];
  for (const m of moves) {
    if (!out.some((t) => sameSquare(t, m.to))) out.push(m.to);
  }
  return out;
}

function playMove(state: ChessState, move: Move): ChessState {
  const pos = state.position;
  const mover = pos.turn;
  const capturedPiece = move.enPassant
    ? pos.board[move.from.r][move.to.c]
    : pos.board[move.to.r][move.to.c];

  const position = makeMove(pos, move);
  const captured = capturedPiece
    ? {
        ...state.captured,
        [mover]: [...state.captured[mover], capturedPiece.type],
      }
    : state.captured;

  const base: ChessState = {
    ...state,
    position,
    captured,
    selected: null,
    targets: [],
    pendingPromotion: null,
    lastMove: { from: move.from, to: move.to, by: mover },
  };

  const status = getStatus(position);
  switch (status.kind) {
    case "checkmate":
      return {
        ...base,
        phase: "ended",
        result: {
          winner: status.winner,
          reason: "チェックメイト",
        },
        message:
          status.winner === PLAYER
            ? "チェックメイト！あなたの勝ち"
            : "チェックメイト…相手の勝ち",
      };
    case "stalemate":
      return {
        ...base,
        phase: "ended",
        result: { winner: null, reason: "ステイルメイト" },
        message: "ステイルメイトで引き分け",
      };
    case "draw":
      return {
        ...base,
        phase: "ended",
        result: { winner: null, reason: status.reason },
        message: status.reason,
      };
    case "playing": {
      const yourTurn = position.turn === PLAYER;
      return {
        ...base,
        phase: "playing",
        message: yourTurn
          ? status.check
            ? "チェックされています！"
            : "あなたの番です（白）"
          : status.check
            ? "チェック！相手の番です…"
            : "相手の番です…",
      };
    }
  }
}

export function selectSquare(state: ChessState, coord: Coord): ChessState {
  if (state.phase !== "playing" || state.position.turn !== PLAYER) return state;

  const piece = state.position.board[coord.r][coord.c];

  if (piece && piece.color === PLAYER) {
    if (state.selected && sameSquare(state.selected, coord)) {
      return {
        ...state,
        selected: null,
        targets: [],
        message: "あなたの番です（白）",
      };
    }
    const moves = legalMoves(state.position).filter((m) =>
      sameSquare(m.from, coord),
    );
    return {
      ...state,
      selected: coord,
      targets: uniqueTargets(moves),
      message: moves.length > 0 ? "移動先を選んでください" : "その駒は動かせません",
    };
  }

  if (!state.selected) return state;

  const from = state.selected;
  const candidates = legalMoves(state.position).filter(
    (m) => sameSquare(m.from, from) && sameSquare(m.to, coord),
  );

  if (candidates.length === 0) {
    return {
      ...state,
      selected: null,
      targets: [],
      message: "あなたの番です（白）",
    };
  }

  if (candidates.some((m) => m.promotion)) {
    return {
      ...state,
      phase: "promote",
      pendingPromotion: { from, to: coord },
      targets: [],
      message: "昇格する駒を選んでください",
    };
  }

  return playMove(state, candidates[0]);
}

export function choosePromotion(
  state: ChessState,
  promotion: PieceType,
): ChessState {
  if (state.phase !== "promote" || !state.pendingPromotion) return state;
  const { from, to } = state.pendingPromotion;
  const move = legalMoves(state.position).find(
    (m) =>
      sameSquare(m.from, from) &&
      sameSquare(m.to, to) &&
      m.promotion === promotion,
  );
  if (!move) return state;
  return playMove({ ...state, phase: "playing" }, move);
}

export function cancelPromotion(state: ChessState): ChessState {
  if (state.phase !== "promote") return state;
  return {
    ...state,
    phase: "playing",
    pendingPromotion: null,
    selected: null,
    targets: [],
    message: "あなたの番です（白）",
  };
}

export function applyAiMove(state: ChessState): ChessState {
  if (state.phase !== "playing" || state.position.turn === PLAYER) return state;
  const { depth, noise } = LEVELS[state.level];
  const move = chooseAiMove(state.position, depth, noise);
  if (!move) return state;
  return playMove(state, move);
}
