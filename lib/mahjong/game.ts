import { callImproves, chooseDiscard } from "./ai";
import { shanten, waitingKinds } from "./hand";
import {
  counts34,
  createWall,
  doraFromIndicator,
  isDragon,
  isHonor,
  isYaochu,
  numOf,
  suitOf,
  WIND_NAMES,
  type Kind,
  type Tile,
} from "./tiles";
import { payments, scoreHand, type Meld, type ScoreResult } from "./yaku";

export type { Meld } from "./yaku";

export const HUMAN = 0;
export const PLAYER_NAMES = ["あなた", "下家 CPU", "対面 CPU", "上家 CPU"];
const START_SCORE = 25000;
const LAST_ROUND = 3; // 東風戦: 東1〜東4

export type Discard = { tile: Tile; riichi: boolean; called: boolean };

export type Player = {
  hand: Tile[];
  melds: Meld[];
  discards: Discard[];
  score: number;
  riichi: boolean;
  ippatsu: boolean;
  /** Passed on a ron since the last own draw. */
  tempFuriten: boolean;
  /** Passed on a ron after declaring riichi. */
  riichiFuriten: boolean;
};

export type CallOption =
  | { type: "ron" }
  | { type: "pon"; tiles: Tile[] }
  | { type: "chi"; tiles: Tile[] };

export type RoundResult =
  | {
      kind: "tsumo" | "ron";
      winner: number;
      loser: number | null;
      score: ScoreResult;
      hand: Tile[];
      melds: Meld[];
      winTile: Tile;
      uraIndicators: Kind[];
      deltas: number[];
    }
  | { kind: "ryuukyoku"; tenpai: boolean[]; deltas: number[] };

export type Phase = "title" | "draw" | "discard" | "call" | "roundEnd" | "gameEnd";

export type MahjongState = {
  phase: Phase;
  players: Player[];
  wall: Tile[];
  deadWall: Tile[];
  doraCount: number;
  round: number;
  honba: number;
  riichiSticks: number;
  turn: number;
  drawnId: number | null;
  /** The turn player just called and must discard without drawing. */
  afterCall: boolean;
  lastDiscard: { tile: Tile; from: number } | null;
  callOptions: CallOption[];
  result: RoundResult | null;
  message: string;
  /** Increments on every visible action, for animation and sound. */
  tick: number;
  lastAction: { type: "draw" | "discard" | "pon" | "chi" | "riichi" | "win"; seat: number } | null;
};

export const dealerOf = (s: MahjongState) => s.round % 4;
export const seatWind = (s: MahjongState, seat: number): Kind => 27 + ((seat - dealerOf(s) + 4) % 4);
export const roundLabel = (s: MahjongState) => `東${s.round + 1}局`;
export const doraIndicators = (s: MahjongState) => s.deadWall.slice(4, 4 + s.doraCount);
const uraIndicators = (s: MahjongState) => s.deadWall.slice(9, 9 + s.doraCount).map((t) => t.kind);

export function createTitleState(): MahjongState {
  return {
    phase: "title",
    players: Array.from({ length: 4 }, () => emptyPlayer(START_SCORE)),
    wall: [],
    deadWall: [],
    doraCount: 1,
    round: 0,
    honba: 0,
    riichiSticks: 0,
    turn: 0,
    drawnId: null,
    afterCall: false,
    lastDiscard: null,
    callOptions: [],
    result: null,
    message: "",
    tick: 0,
    lastAction: null,
  };
}

function emptyPlayer(score: number): Player {
  return {
    hand: [],
    melds: [],
    discards: [],
    score,
    riichi: false,
    ippatsu: false,
    tempFuriten: false,
    riichiFuriten: false,
  };
}

export function startGame(random = Math.random): MahjongState {
  return startRound({ ...createTitleState(), phase: "draw" }, random);
}

function startRound(base: MahjongState, random = Math.random): MahjongState {
  const wall = createWall(random);
  const deadWall = wall.splice(wall.length - 14, 14);
  const players = base.players.map((p) => emptyPlayer(p.score));
  const dealer = base.round % 4;
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 4; j++) players[(dealer + j) % 4].hand.push(wall.shift()!);
  }
  const s: MahjongState = {
    ...base,
    phase: "draw",
    players,
    wall,
    deadWall,
    doraCount: 1,
    turn: dealer,
    drawnId: null,
    afterCall: false,
    lastDiscard: null,
    callOptions: [],
    result: null,
    tick: base.tick + 1,
    lastAction: null,
  };
  return { ...s, message: `${roundLabel(s)} ${s.honba}本場 — 親は${PLAYER_NAMES[dealer]}` };
}

// ---------------------------------------------------------------------------
// Queries

function winContext(s: MahjongState, seat: number, winTile: Tile, tsumo: boolean) {
  const p = s.players[seat];
  return {
    concealed: tsumo ? p.hand : [...p.hand, winTile],
    melds: p.melds,
    winTile,
    tsumo,
    riichi: p.riichi,
    ippatsu: p.ippatsu,
    seatWind: seatWind(s, seat),
    roundWind: 27,
    doraIndicators: doraIndicators(s).map((t) => t.kind),
    uraIndicators: uraIndicators(s),
    lastTile: s.wall.length === 0,
  };
}

export function canTsumo(s: MahjongState, seat = s.turn) {
  if (s.phase !== "discard" || s.turn !== seat || s.afterCall || s.drawnId === null) return null;
  const p = s.players[seat];
  const tile = p.hand.find((t) => t.id === s.drawnId)!;
  return scoreHand(winContext(s, seat, tile, true));
}

export function isFuriten(s: MahjongState, seat: number) {
  const p = s.players[seat];
  if (p.tempFuriten || p.riichiFuriten) return true;
  const waits = waitingKinds(counts34(p.hand), p.melds.length);
  return p.discards.some((d) => waits.includes(d.tile.kind));
}

function canRon(s: MahjongState, seat: number, tile: Tile) {
  const p = s.players[seat];
  const c = counts34(p.hand);
  if (!waitingKinds(c, p.melds.length).includes(tile.kind)) return null;
  const score = scoreHand(winContext(s, seat, tile, false));
  if (!score) return null;
  return isFuriten(s, seat) ? "furiten" : score;
}

/** Tile ids whose discard leaves the hand tenpai (for riichi). */
export function riichiDiscards(s: MahjongState, seat = s.turn): Set<number> {
  const out = new Set<number>();
  const p = s.players[seat];
  if (s.phase !== "discard" || s.turn !== seat || p.riichi || p.melds.length > 0) return out;
  if (p.score < 1000 || s.wall.length < 4 || s.afterCall) return out;
  const c = counts34(p.hand);
  for (const t of p.hand) {
    c[t.kind]--;
    if (shanten(c, 0) === 0) out.add(t.id);
    c[t.kind]++;
  }
  return out;
}

export function isTenpai(p: Player) {
  return shanten(counts34(p.hand), p.melds.length) <= 0;
}

function callOptionsFor(s: MahjongState, seat: number, tile: Tile, from: number): CallOption[] {
  const p = s.players[seat];
  const out: CallOption[] = [];
  const ron = canRon(s, seat, tile);
  if (ron && ron !== "furiten") out.push({ type: "ron" });
  if (p.riichi || s.wall.length === 0) return out;

  const same = p.hand.filter((t) => t.kind === tile.kind);
  if (same.length >= 2) {
    // Keep a red five in hand only if there is a plain one to use instead.
    const plain = same.filter((t) => !t.red);
    const use = plain.length >= 2 ? plain.slice(0, 2) : same.slice(0, 2);
    out.push({ type: "pon", tiles: use });
  }

  if (seat === (from + 1) % 4 && !isHonor(tile.kind)) {
    const n = numOf(tile.kind);
    const pick = (k: Kind) => {
      const ts = p.hand.filter((t) => t.kind === k);
      return ts.find((t) => !t.red) ?? ts[0];
    };
    const k = tile.kind;
    const shapes: [number, number][] = [];
    if (n >= 3) shapes.push([k - 2, k - 1]);
    if (n >= 2 && n <= 8) shapes.push([k - 1, k + 1]);
    if (n <= 7) shapes.push([k + 1, k + 2]);
    for (const [a, b] of shapes) {
      if (suitOf(a) !== suitOf(k) || suitOf(b) !== suitOf(k)) continue;
      const ta = pick(a);
      const tb = pick(b);
      if (ta && tb) out.push({ type: "chi", tiles: [ta, tb] });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Actions

function update(s: MahjongState, seat: number, fn: (p: Player) => Player) {
  return s.players.map((p, i) => (i === seat ? fn(p) : p));
}

export function drawTile(s: MahjongState): MahjongState {
  if (s.phase !== "draw") return s;
  if (s.wall.length === 0) return exhaustiveDraw(s);
  const [tile, ...wall] = s.wall;
  const players = update(s, s.turn, (p) => ({
    ...p,
    hand: [...p.hand, tile],
    tempFuriten: false,
  }));
  return {
    ...s,
    phase: "discard",
    players,
    wall,
    drawnId: tile.id,
    afterCall: false,
    lastDiscard: null,
    tick: s.tick + 1,
    lastAction: { type: "draw", seat: s.turn },
    message: s.turn === HUMAN ? "捨てる牌を選んでください" : `${PLAYER_NAMES[s.turn]}の番`,
  };
}

export function discardTile(s: MahjongState, tileId: number, riichi = false): MahjongState {
  if (s.phase !== "discard") return s;
  const seat = s.turn;
  const p = s.players[seat];
  const tile = p.hand.find((t) => t.id === tileId);
  if (!tile) return s;
  if (p.riichi && tileId !== s.drawnId) return s;
  if (riichi && !riichiDiscards(s, seat).has(tileId)) return s;

  const players = update(s, seat, (pl) => ({
    ...pl,
    hand: pl.hand.filter((t) => t.id !== tileId),
    discards: [...pl.discards, { tile, riichi, called: false }],
    riichi: pl.riichi || riichi,
    ippatsu: riichi,
    score: riichi ? pl.score - 1000 : pl.score,
  }));
  const next: MahjongState = {
    ...s,
    players,
    riichiSticks: s.riichiSticks + (riichi ? 1 : 0),
    drawnId: null,
    afterCall: false,
    lastDiscard: { tile, from: seat },
    tick: s.tick + 1,
    lastAction: { type: riichi ? "riichi" : "discard", seat },
    message: riichi ? `${PLAYER_NAMES[seat]}がリーチ！` : s.message,
  };
  return resolveCalls(next);
}

/**
 * After a discard: asks the human if they have a call, otherwise lets the
 * CPUs decide. `humanChoice` is the human's answer to a pending prompt.
 */
function resolveCalls(s: MahjongState, humanChoice?: CallOption | "pass"): MahjongState {
  const { tile, from } = s.lastDiscard!;
  const order = [1, 2, 3].map((d) => (from + d) % 4);
  const humanOptions = from === HUMAN ? [] : callOptionsFor(s, HUMAN, tile, from);

  const cpuRon = order.find((seat) => {
    if (seat === HUMAN) return false;
    const r = canRon(s, seat, tile);
    return r !== null && r !== "furiten";
  });
  const cpuPon = order.find(
    (seat) =>
      seat !== HUMAN &&
      callOptionsFor(s, seat, tile, from).some((o) => o.type === "pon") &&
      cpuWantsPon(s, seat, tile),
  );

  if (humanChoice === undefined && humanOptions.length > 0) {
    const humanRon = humanOptions.some((o) => o.type === "ron");
    const humanPon = humanOptions.some((o) => o.type === "pon");
    const worthAsking =
      humanRon || (cpuRon === undefined && (humanPon || cpuPon === undefined));
    if (worthAsking) {
      const opts = humanOptions.filter((o) =>
        o.type === "ron" ? true : cpuRon === undefined && (o.type === "pon" || cpuPon === undefined),
      );
      return { ...s, phase: "call", callOptions: opts, message: "鳴きますか？" };
    }
  }

  let state: MahjongState = { ...s, phase: "discard", callOptions: [] };
  const humanRons = humanChoice !== "pass" && humanChoice?.type === "ron";
  if (!humanRons && humanOptions.some((o) => o.type === "ron")) {
    state = markPassedRon(state, HUMAN);
  }
  // Mark furiten for anyone who could have ron'd but didn't.
  for (const seat of order) {
    if (seat === HUMAN) continue;
    if (canRon(state, seat, tile) === "furiten") state = markPassedRon(state, seat);
  }

  if (humanRons) return settleWin(state, HUMAN, from, tile);
  if (cpuRon !== undefined) return settleWin(state, cpuRon, from, tile);

  if (humanChoice && humanChoice !== "pass" && humanChoice.type === "pon") {
    return applyCall(state, HUMAN, humanChoice);
  }
  if (cpuPon !== undefined) {
    const opt = callOptionsFor(state, cpuPon, tile, from).find((o) => o.type === "pon")!;
    return applyCall(state, cpuPon, opt);
  }
  if (humanChoice && humanChoice !== "pass" && humanChoice.type === "chi") {
    return applyCall(state, HUMAN, humanChoice);
  }
  const nextSeat = (from + 1) % 4;
  if (nextSeat !== HUMAN) {
    const chi = callOptionsFor(state, nextSeat, tile, from).find(
      (o): o is Extract<CallOption, { type: "chi" }> =>
        o.type === "chi" && cpuWantsChi(state, nextSeat, o.tiles),
    );
    if (chi) return applyCall(state, nextSeat, chi);
  }

  // Ippatsu ends once the riichi player's turn comes round without a win.
  return {
    ...state,
    phase: "draw",
    turn: nextSeat,
    message: nextSeat === HUMAN ? "あなたの番" : state.message,
  };
}

function markPassedRon(s: MahjongState, seat: number): MahjongState {
  return {
    ...s,
    players: update(s, seat, (p) => ({
      ...p,
      tempFuriten: true,
      riichiFuriten: p.riichiFuriten || p.riichi,
    })),
  };
}

export function answerCall(s: MahjongState, choice: CallOption | "pass"): MahjongState {
  if (s.phase !== "call") return s;
  return resolveCalls({ ...s, phase: "discard", callOptions: [] }, choice);
}

function applyCall(s: MahjongState, seat: number, opt: CallOption): MahjongState {
  if (opt.type === "ron") return s;
  const { tile, from } = s.lastDiscard!;
  const used = new Set(opt.tiles.map((t) => t.id));
  const meld: Meld = { type: opt.type, tiles: [...opt.tiles, tile], from, calledId: tile.id };
  const players = s.players.map((p, i) => {
    const base = { ...p, ippatsu: false };
    if (i === from) {
      const discards = p.discards.slice();
      discards[discards.length - 1] = { ...discards[discards.length - 1], called: true };
      return { ...base, discards };
    }
    if (i === seat) {
      return { ...base, hand: p.hand.filter((t) => !used.has(t.id)), melds: [...p.melds, meld] };
    }
    return base;
  });
  return {
    ...s,
    phase: "discard",
    players,
    turn: seat,
    drawnId: null,
    afterCall: true,
    lastDiscard: null,
    tick: s.tick + 1,
    lastAction: { type: opt.type, seat },
    message: `${PLAYER_NAMES[seat]}が${opt.type === "pon" ? "ポン" : "チー"}`,
  };
}

export function declareTsumo(s: MahjongState): MahjongState {
  const score = canTsumo(s);
  if (!score) return s;
  const tile = s.players[s.turn].hand.find((t) => t.id === s.drawnId)!;
  return settleWin(s, s.turn, null, tile);
}

function settleWin(s: MahjongState, winner: number, loser: number | null, winTile: Tile): MahjongState {
  const tsumo = loser === null;
  const score = scoreHand(winContext(s, winner, winTile, tsumo))!;
  const dealer = winner === dealerOf(s);
  const pay = payments(score.base, dealer, tsumo, s.honba);
  const deltas = [0, 0, 0, 0];
  if (tsumo) {
    for (let i = 0; i < 4; i++) {
      if (i === winner) continue;
      deltas[i] = -(dealer || i !== dealerOf(s) ? pay.fromOthers : pay.fromDealer);
    }
  } else {
    deltas[loser] = -pay.ron;
  }
  deltas[winner] = pay.total + s.riichiSticks * 1000;
  const p = s.players[winner];
  const hand = tsumo ? p.hand : [...p.hand, winTile];
  return {
    ...s,
    phase: "roundEnd",
    players: s.players.map((pl, i) => ({ ...pl, score: pl.score + deltas[i] })),
    riichiSticks: 0,
    result: {
      kind: tsumo ? "tsumo" : "ron",
      winner,
      loser,
      score,
      hand,
      melds: p.melds,
      winTile,
      uraIndicators: p.riichi ? uraIndicators(s) : [],
      deltas,
    },
    tick: s.tick + 1,
    lastAction: { type: "win", seat: winner },
    message: `${PLAYER_NAMES[winner]}の${tsumo ? "ツモ" : "ロン"}！`,
  };
}

function exhaustiveDraw(s: MahjongState): MahjongState {
  const tenpai = s.players.map(isTenpai);
  const n = tenpai.filter(Boolean).length;
  const deltas = tenpai.map((t) => (n === 0 || n === 4 ? 0 : t ? 3000 / n : -3000 / (4 - n)));
  return {
    ...s,
    phase: "roundEnd",
    players: s.players.map((p, i) => ({ ...p, score: p.score + deltas[i] })),
    result: { kind: "ryuukyoku", tenpai, deltas },
    tick: s.tick + 1,
    message: "流局",
  };
}

export function nextRound(s: MahjongState, random = Math.random): MahjongState {
  if (s.phase !== "roundEnd" || !s.result) return s;
  const dealer = dealerOf(s);
  const r = s.result;
  const dealerKeeps = r.kind === "ryuukyoku" ? r.tenpai[dealer] : r.winner === dealer;
  const honba = dealerKeeps || r.kind === "ryuukyoku" ? s.honba + 1 : 0;
  const round = dealerKeeps ? s.round : s.round + 1;
  const bust = s.players.some((p) => p.score < 0);
  if (bust || round > LAST_ROUND) {
    // Leftover riichi sticks go to the leader.
    const top = ranking(s)[0];
    return {
      ...s,
      phase: "gameEnd",
      players: s.players.map((p, i) => (i === top ? { ...p, score: p.score + s.riichiSticks * 1000 } : p)),
      riichiSticks: 0,
      message: "対局終了",
    };
  }
  return startRound({ ...s, round, honba }, random);
}

/** Seats ordered by score; ties go to the seat closer to the first dealer. */
export function ranking(s: MahjongState) {
  return [0, 1, 2, 3].sort((a, b) => s.players[b].score - s.players[a].score || a - b);
}

// ---------------------------------------------------------------------------
// CPU

function visibleCounts(s: MahjongState, seat: number) {
  const v = new Array<number>(34).fill(0);
  for (const p of s.players) {
    for (const d of p.discards) if (!d.called) v[d.tile.kind]++;
    for (const m of p.melds) for (const t of m.tiles) v[t.kind]++;
  }
  for (const t of doraIndicators(s)) v[t.kind]++;
  // Own hand is counted separately by the AI.
  void seat;
  return v;
}

function isYakuhai(s: MahjongState, seat: number, k: Kind) {
  return isDragon(k) || k === 27 || k === seatWind(s, seat);
}

function cpuWantsPon(s: MahjongState, seat: number, tile: Tile) {
  const p = s.players[seat];
  if (isYakuhai(s, seat, tile.kind)) return true;
  if (p.melds.length === 0) return false;
  if (!hasYakuPlan(s, seat)) return false;
  return callImproves(p.hand, p.melds.length, [tile.kind, tile.kind]);
}

function cpuWantsChi(s: MahjongState, seat: number, tiles: Tile[]) {
  const p = s.players[seat];
  if (p.melds.length === 0 || !hasYakuPlan(s, seat)) return false;
  return callImproves(p.hand, p.melds.length, tiles.map((t) => t.kind));
}

/** An open hand needs a guaranteed yaku: a yakuhai triplet or all-simples. */
function hasYakuPlan(s: MahjongState, seat: number) {
  const p = s.players[seat];
  if (p.melds.some((m) => m.type === "pon" && isYakuhai(s, seat, m.tiles[0].kind))) return true;
  const allSimple = p.melds.every((m) => m.tiles.every((t) => !isYaochu(t.kind)));
  const yaochuInHand = p.hand.filter((t) => isYaochu(t.kind)).length;
  return allSimple && yaochuInHand <= 2;
}

/** One CPU step in the discard phase: tsumo, or pick a discard. */
export function cpuAct(s: MahjongState, random = Math.random): MahjongState {
  if (s.phase !== "discard") return s;
  const seat = s.turn;
  const p = s.players[seat];
  if (canTsumo(s)) return declareTsumo(s);
  if (p.riichi) return discardTile(s, s.drawnId!);

  const threats = s.players
    .map((pl, i) => ({ pl, i }))
    .filter(({ pl, i }) => i !== seat && pl.riichi);
  let safeKinds: Set<Kind> | null = null;
  if (threats.length > 0) {
    safeKinds = new Set(threats[0].pl.discards.map((d) => d.tile.kind));
    for (const { pl } of threats.slice(1)) {
      const theirs = new Set(pl.discards.map((d) => d.tile.kind));
      safeKinds = new Set([...safeKinds].filter((k) => theirs.has(k)));
    }
  }
  const visible = visibleCounts(s, seat);
  const doraKinds = doraIndicators(s).map((t) => doraFromIndicator(t.kind));
  const advice = chooseDiscard(p.hand, p.melds.length, visible, { safeKinds, doraKinds, random });
  const riichi = riichiDiscards(s, seat).has(advice.tile.id) && advice.shantenAfter === 0;
  return discardTile(s, advice.tile.id, riichi);
}

/** Humans in riichi discard their draw automatically unless they can win. */
export function autoRiichiDiscard(s: MahjongState) {
  if (s.phase !== "discard" || s.turn !== HUMAN) return s;
  const p = s.players[HUMAN];
  if (!p.riichi || s.drawnId === null || canTsumo(s)) return s;
  return discardTile(s, s.drawnId);
}

export function windName(k: Kind) {
  return WIND_NAMES[k - 27];
}
