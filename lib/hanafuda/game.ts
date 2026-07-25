import { createDeck, shuffle, type HanafudaCard } from "./cards";
import { evaluateYaku, yakuSignature, type YakuResult } from "./yaku";

export type PlayerId = "player" | "opponent";

export type GamePhase =
  | "title"
  | "selectHand"
  | "selectField"
  | "awaitDraw"
  | "revealDraw"
  | "selectDrawField"
  | "koikoi"
  | "opponentShowHand"
  | "opponentAwaitDraw"
  | "opponentRevealDraw"
  | "roundOver"
  | "matchOver";

export type RoundResult = {
  winner: PlayerId | "draw";
  points: number;
  yaku: YakuResult;
  reason: string;
};

export type GameState = {
  phase: GamePhase;
  deck: HanafudaCard[];
  field: HanafudaCard[];
  hands: Record<PlayerId, HanafudaCard[]>;
  captured: Record<PlayerId, HanafudaCard[]>;
  scores: Record<PlayerId, number>;
  current: PlayerId;
  pendingCard: HanafudaCard | null;
  pendingMatches: HanafudaCard[];
  lastYakuSig: Record<PlayerId, string>;
  koikoiCount: number;
  message: string;
  roundResult: RoundResult | null;
  dealMonth: number;
};

function other(id: PlayerId): PlayerId {
  return id === "player" ? "opponent" : "player";
}

function removeById(cards: HanafudaCard[], id: string): HanafudaCard[] {
  return cards.filter((card) => card.id !== id);
}

function takeById(cards: HanafudaCard[], id: string): {
  card: HanafudaCard | null;
  rest: HanafudaCard[];
} {
  const card = cards.find((c) => c.id === id) ?? null;
  return { card, rest: card ? removeById(cards, id) : cards };
}

export function getMatches(card: HanafudaCard, field: HanafudaCard[]) {
  return field.filter((f) => f.month === card.month);
}

function capture(
  state: GameState,
  who: PlayerId,
  played: HanafudaCard,
  target: HanafudaCard,
): GameState {
  return {
    ...state,
    field: removeById(state.field, target.id),
    captured: {
      ...state.captured,
      [who]: [...state.captured[who], played, target],
    },
  };
}

function dropToField(state: GameState, card: HanafudaCard): GameState {
  return {
    ...state,
    field: [...state.field, card],
  };
}

export function createInitialState(): GameState {
  return {
    phase: "title",
    deck: [],
    field: [],
    hands: { player: [], opponent: [] },
    captured: { player: [], opponent: [] },
    scores: { player: 0, opponent: 0 },
    current: "player",
    pendingCard: null,
    pendingMatches: [],
    lastYakuSig: { player: "", opponent: "" },
    koikoiCount: 0,
    message: "",
    roundResult: null,
    dealMonth: 1,
  };
}

function fixFourOfKindOnField(field: HanafudaCard[], deck: HanafudaCard[]) {
  let nextField = [...field];
  let nextDeck = [...deck];
  for (let month = 1; month <= 12; month += 1) {
    const same = nextField.filter((c) => c.month === month);
    if (same.length === 4) {
      nextField = nextField.filter((c) => c.month !== month);
      nextDeck = [...same, ...nextDeck];
      while (nextField.length < 8 && nextDeck.length > 0) {
        const [top, ...rest] = nextDeck;
        nextDeck = rest;
        if (nextField.filter((c) => c.month === top.month).length < 3) {
          nextField.push(top);
        } else {
          nextDeck = [...nextDeck, top];
          break;
        }
      }
    }
  }
  return { field: nextField, deck: nextDeck };
}

function goToAwaitDraw(state: GameState, who: PlayerId): GameState {
  if (state.deck.length === 0) {
    return afterCaptureCheck(state, who);
  }

  if (who === "player") {
    return {
      ...state,
      phase: "awaitDraw",
      current: "player",
      pendingCard: null,
      pendingMatches: [],
      message: "山札をタップしてめくってください",
    };
  }

  return {
    ...state,
    phase: "opponentAwaitDraw",
    current: "opponent",
    pendingCard: null,
    pendingMatches: [],
    message: "相手が山札をめくります…",
  };
}

export function startRound(state: GameState, random = Math.random): GameState {
  let deck = shuffle(createDeck(), random);
  const playerHand = deck.slice(0, 8);
  const opponentHand = deck.slice(8, 16);
  let field = deck.slice(16, 24);
  deck = deck.slice(24);

  const fixed = fixFourOfKindOnField(field, deck);
  field = fixed.field;
  deck = fixed.deck;

  const starter: PlayerId = state.dealMonth % 2 === 1 ? "player" : "opponent";

  return {
    ...state,
    phase: starter === "player" ? "selectHand" : "opponentShowHand",
    deck,
    field,
    hands: { player: playerHand, opponent: opponentHand },
    captured: { player: [], opponent: [] },
    current: starter,
    pendingCard: null,
    pendingMatches: [],
    lastYakuSig: { player: "", opponent: "" },
    koikoiCount: 0,
    message:
      starter === "player"
        ? "手札からカードを選んでください"
        : "相手の番です…",
    roundResult: null,
    dealMonth: state.dealMonth,
  };
}

export function startMatch(random = Math.random): GameState {
  return startRound(
    {
      ...createInitialState(),
      phase: "selectHand",
      scores: { player: 0, opponent: 0 },
      dealMonth: 1,
    },
    random,
  );
}

function afterCaptureCheck(state: GameState, who: PlayerId): GameState {
  const yaku = evaluateYaku(state.captured[who]);
  const sig = yakuSignature(yaku);
  const prev = state.lastYakuSig[who];

  if (yaku.total > 0 && sig !== prev) {
    const handsEmpty =
      state.hands.player.length === 0 && state.hands.opponent.length === 0;
    const deckEmpty = state.deck.length === 0;

    if (handsEmpty || (deckEmpty && state.hands[who].length === 0)) {
      return finishRound(state, who, yaku, "役が揃いました");
    }

    if (who === "player") {
      return {
        ...state,
        phase: "koikoi",
        lastYakuSig: { ...state.lastYakuSig, [who]: sig },
        message: `役成立！ ${yaku.list.map((y) => y.name).join("・")}（${yaku.total}文） こいこいしますか？`,
      };
    }

    const continueKoi =
      yaku.total < 7 && state.deck.length > 4 && state.koikoiCount < 2;
    if (continueKoi) {
      return {
        ...state,
        phase: "selectHand",
        current: "player",
        koikoiCount: state.koikoiCount + 1,
        lastYakuSig: { ...state.lastYakuSig, [who]: sig },
        pendingCard: null,
        pendingMatches: [],
        message: `相手がこいこい！（${yaku.list.map((y) => y.name).join("・")}）`,
      };
    }
    return finishRound(state, who, yaku, "相手があがりました");
  }

  return continueOrPass(state, who);
}

function continueOrPass(state: GameState, who: PlayerId): GameState {
  const next = other(who);
  const bothHandsEmpty =
    state.hands.player.length === 0 && state.hands.opponent.length === 0;

  if (
    bothHandsEmpty ||
    (state.deck.length === 0 &&
      state.hands.player.length === 0 &&
      state.hands.opponent.length === 0)
  ) {
    return settleEmptyRound(state);
  }

  if (state.hands[next].length === 0 && state.deck.length === 0) {
    return settleEmptyRound(state);
  }

  return {
    ...state,
    current: next,
    phase: next === "player" ? "selectHand" : "opponentShowHand",
    pendingCard: null,
    pendingMatches: [],
    message:
      next === "player"
        ? "手札からカードを選んでください"
        : "相手の番です…",
  };
}

function settleEmptyRound(state: GameState): GameState {
  const playerYaku = evaluateYaku(state.captured.player);
  const opponentYaku = evaluateYaku(state.captured.opponent);

  if (playerYaku.total === opponentYaku.total) {
    return {
      ...state,
      phase: "roundOver",
      roundResult: {
        winner: "draw",
        points: 0,
        yaku: playerYaku,
        reason: "流局（引き分け）",
      },
      message: "流局です",
    };
  }

  const winner: PlayerId =
    playerYaku.total > opponentYaku.total ? "player" : "opponent";
  const yaku = winner === "player" ? playerYaku : opponentYaku;
  return finishRound(state, winner, yaku, "手札がなくなりました");
}

function finishRound(
  state: GameState,
  winner: PlayerId,
  yaku: YakuResult,
  reason: string,
): GameState {
  let points = yaku.total;
  if (state.koikoiCount > 0) {
    points *= 2;
  }
  if (yaku.total >= 7) {
    points *= 2;
  }

  const scores = {
    ...state.scores,
    [winner]: state.scores[winner] + points,
  };

  const matchOver = scores.player >= 12 || scores.opponent >= 12;

  return {
    ...state,
    phase: matchOver ? "matchOver" : "roundOver",
    scores,
    roundResult: { winner, points, yaku, reason },
    message: `${winner === "player" ? "あなたの勝ち" : "相手の勝ち"} +${points}文`,
    pendingCard: null,
    pendingMatches: [],
  };
}

function resolvePlay(
  state: GameState,
  who: PlayerId,
  played: HanafudaCard,
  fieldTargetId: string | null,
): GameState {
  const matches = getMatches(played, state.field);

  if (matches.length === 0) {
    return dropToField(state, played);
  }

  const target =
    matches.find((m) => m.id === fieldTargetId) ??
    [...matches].sort((a, b) => scoreCardValue(b) - scoreCardValue(a))[0];

  return capture(state, who, played, target);
}

export function selectHandCard(state: GameState, cardId: string): GameState {
  if (state.phase !== "selectHand" || state.current !== "player") return state;

  const { card, rest } = takeById(state.hands.player, cardId);
  if (!card) return state;

  const matches = getMatches(card, state.field);
  const withoutHand: GameState = {
    ...state,
    hands: { ...state.hands, player: rest },
  };

  if (matches.length >= 2) {
    return {
      ...withoutHand,
      phase: "selectField",
      pendingCard: card,
      pendingMatches: matches,
      message: "場のどの札を取りますか？",
    };
  }

  const afterHand = resolvePlay(
    withoutHand,
    "player",
    card,
    matches[0]?.id ?? null,
  );
  return goToAwaitDraw(
    {
      ...afterHand,
      pendingCard: null,
      pendingMatches: [],
    },
    "player",
  );
}

export function selectFieldCard(
  state: GameState,
  fieldCardId: string,
): GameState {
  if (
    (state.phase !== "selectField" && state.phase !== "selectDrawField") ||
    !state.pendingCard
  ) {
    return state;
  }

  if (!state.pendingMatches.some((c) => c.id === fieldCardId)) return state;

  const target = state.pendingMatches.find((c) => c.id === fieldCardId)!;

  if (state.phase === "selectField") {
    const after = capture(state, "player", state.pendingCard, target);
    return goToAwaitDraw(
      {
        ...after,
        pendingCard: null,
        pendingMatches: [],
      },
      "player",
    );
  }

  const after = capture(
    {
      ...state,
      pendingCard: null,
      pendingMatches: [],
    },
    "player",
    state.pendingCard,
    target,
  );
  return afterCaptureCheck(after, "player");
}

/** プレイヤーが山札をタップしてめくる */
export function drawFromDeck(state: GameState): GameState {
  if (state.phase !== "awaitDraw" || state.current !== "player") return state;
  if (state.deck.length === 0) return afterCaptureCheck(state, "player");

  const [drawn, ...rest] = state.deck;
  const matches = getMatches(drawn, state.field);

  if (matches.length >= 2) {
    return {
      ...state,
      deck: rest,
      phase: "selectDrawField",
      pendingCard: drawn,
      pendingMatches: matches,
      message: `山札は「${drawn.flower}の${drawn.name}」。どれを取りますか？`,
    };
  }

  return {
    ...state,
    deck: rest,
    phase: "revealDraw",
    pendingCard: drawn,
    pendingMatches: matches,
    message:
      matches.length === 1
        ? `山札「${drawn.flower}の${drawn.name}」で取りました`
        : `山札「${drawn.flower}の${drawn.name}」を場に置きました`,
  };
}

/** めくった山札を場／取り札へ確定 */
export function confirmRevealedDraw(state: GameState): GameState {
  if (state.phase !== "revealDraw" || !state.pendingCard) return state;

  const drawn = state.pendingCard;
  const matchId = state.pendingMatches[0]?.id ?? null;
  const after = resolvePlay(
    {
      ...state,
      pendingCard: null,
      pendingMatches: [],
    },
    "player",
    drawn,
    matchId,
  );
  return afterCaptureCheck(after, "player");
}

export function chooseKoikoi(
  state: GameState,
  continueGame: boolean,
): GameState {
  if (state.phase !== "koikoi") return state;

  const yaku = evaluateYaku(state.captured.player);

  if (!continueGame) {
    return finishRound(state, "player", yaku, "あなたがあがりました");
  }

  return {
    ...state,
    phase: "opponentShowHand",
    current: "opponent",
    koikoiCount: state.koikoiCount + 1,
    message: "こいこい！ 相手の番です…",
    pendingCard: null,
    pendingMatches: [],
  };
}

export function scoreCardValue(card: HanafudaCard): number {
  if (card.kind === "bright") return card.isRain ? 8 : 12;
  if (card.kind === "animal") return card.isSake ? 7 : 6;
  if (card.kind === "ribbon") {
    if (card.ribbon === "red-poetry" || card.ribbon === "blue") return 5;
    return 3;
  }
  return 1;
}

export function pickAiHandCard(state: GameState): string {
  const hand = state.hands.opponent;
  let best = hand[0];
  let bestScore = -Infinity;

  for (const card of hand) {
    const matches = getMatches(card, state.field);
    let score = 0;
    if (matches.length > 0) {
      const bestMatch = [...matches].sort(
        (a, b) => scoreCardValue(b) - scoreCardValue(a),
      )[0];
      score = 20 + scoreCardValue(card) + scoreCardValue(bestMatch);
    } else {
      score = -scoreCardValue(card);
    }
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best.id;
}

/** 相手が手札を出す（表示用に pending に載せる） */
export function revealOpponentHand(state: GameState): GameState {
  if (state.phase !== "opponentShowHand" || state.current !== "opponent") {
    return state;
  }
  if (state.pendingCard) return state;

  if (state.hands.opponent.length === 0) {
    return goToAwaitDraw(state, "opponent");
  }

  const cardId = pickAiHandCard(state);
  const { card, rest } = takeById(state.hands.opponent, cardId);
  if (!card) return goToAwaitDraw(state, "opponent");

  const matches = getMatches(card, state.field);

  return {
    ...state,
    hands: { ...state.hands, opponent: rest },
    pendingCard: card,
    pendingMatches: matches,
    message:
      matches.length > 0
        ? `相手が「${card.flower}の${card.name}」を出して取ります`
        : `相手が「${card.flower}の${card.name}」を場に出しました`,
  };
}

/** 相手の手札出しを確定して山札待ちへ */
export function confirmOpponentHand(state: GameState): GameState {
  if (state.phase !== "opponentShowHand" || !state.pendingCard) {
    // still preparing — call reveal first
    return state;
  }

  const card = state.pendingCard;
  const matchId =
    state.pendingMatches.length === 0
      ? null
      : [...state.pendingMatches].sort(
          (a, b) => scoreCardValue(b) - scoreCardValue(a),
        )[0].id;

  const after = resolvePlay(
    {
      ...state,
      pendingCard: null,
      pendingMatches: [],
    },
    "opponent",
    card,
    matchId,
  );
  return goToAwaitDraw(after, "opponent");
}

/** 相手が山札をめくる */
export function revealOpponentDraw(state: GameState): GameState {
  if (state.phase !== "opponentAwaitDraw") return state;
  if (state.deck.length === 0) return afterCaptureCheck(state, "opponent");

  const [drawn, ...rest] = state.deck;
  const matches = getMatches(drawn, state.field);

  return {
    ...state,
    deck: rest,
    phase: "opponentRevealDraw",
    pendingCard: drawn,
    pendingMatches: matches,
    message:
      matches.length > 0
        ? `相手の山札は「${drawn.flower}の${drawn.name}」— 取ります`
        : `相手の山札は「${drawn.flower}の${drawn.name}」— 場へ`,
  };
}

/** 相手の山札を確定 */
export function confirmOpponentDraw(state: GameState): GameState {
  if (state.phase !== "opponentRevealDraw" || !state.pendingCard) return state;

  const drawn = state.pendingCard;
  const matchId =
    state.pendingMatches.length === 0
      ? null
      : [...state.pendingMatches].sort(
          (a, b) => scoreCardValue(b) - scoreCardValue(a),
        )[0].id;

  const after = resolvePlay(
    {
      ...state,
      pendingCard: null,
      pendingMatches: [],
    },
    "opponent",
    drawn,
    matchId,
  );
  return afterCaptureCheck(after, "opponent");
}

export function nextRound(state: GameState, random = Math.random): GameState {
  return startRound(
    {
      ...state,
      dealMonth: state.dealMonth + 1,
      roundResult: null,
    },
    random,
  );
}
