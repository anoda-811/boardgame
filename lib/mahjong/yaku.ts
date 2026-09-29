import { decompositions, isChiitoi, isKokushi, type Group } from "./hand";
import {
  counts34,
  doraFromIndicator,
  isDragon,
  isHonor,
  isTerminal,
  isYaochu,
  numOf,
  suitOf,
  type Kind,
  type Tile,
} from "./tiles";

export type Meld = {
  type: "chi" | "pon";
  tiles: Tile[];
  /** Seat index the called tile came from. */
  from: number;
  calledId: number;
};

export type WinContext = {
  concealed: Tile[];
  melds: Meld[];
  winTile: Tile;
  tsumo: boolean;
  riichi: boolean;
  ippatsu: boolean;
  seatWind: Kind;
  roundWind: Kind;
  doraIndicators: Kind[];
  uraIndicators: Kind[];
  lastTile: boolean;
};

export type Yaku = { name: string; han: number };

export type ScoreResult = {
  yaku: Yaku[];
  han: number;
  fu: number;
  dora: number;
  yakuman: number;
  base: number;
  label: string;
};

type Wait = "ryanmen" | "kanchan" | "penchan" | "tanki" | "shanpon";
type FullGroup = Group & { open: boolean };

const RYUUIISOU = new Set([19, 20, 21, 23, 25, 32]);
const DRAGON_NAMES: Record<number, string> = { 31: "役牌 白", 32: "役牌 發", 33: "役牌 中" };
const WIND_LABEL = ["東", "南", "西", "北"];

function meldGroup(m: Meld): FullGroup {
  const kinds = m.tiles.map((t) => t.kind).sort((a, b) => a - b);
  return { type: m.type === "pon" ? "koutsu" : "shuntsu", kind: kinds[0], open: true };
}

function groupKinds(g: Group): Kind[] {
  return g.type === "koutsu" ? [g.kind, g.kind, g.kind] : [g.kind, g.kind + 1, g.kind + 2];
}

function limitLabel(han: number, base: number, yakuman: number) {
  if (yakuman > 0) return yakuman > 1 ? `${yakuman}倍役満` : "役満";
  if (han >= 13) return "数え役満";
  if (han >= 11) return "三倍満";
  if (han >= 8) return "倍満";
  if (han >= 6) return "跳満";
  if (han >= 5 || base >= 2000) return "満貫";
  return "";
}

function basePoints(han: number, fu: number) {
  if (han >= 13) return 8000;
  if (han >= 11) return 6000;
  if (han >= 8) return 4000;
  if (han >= 6) return 3000;
  if (han >= 5) return 2000;
  return Math.min(2000, fu * 2 ** (2 + han));
}

function countDora(ctx: WinContext) {
  const all = [...ctx.concealed, ...ctx.melds.flatMap((m) => m.tiles)];
  const doraKinds = ctx.doraIndicators.map(doraFromIndicator);
  let dora = 0;
  for (const t of all) {
    for (const d of doraKinds) if (t.kind === d) dora++;
    if (t.red) dora++;
  }
  if (ctx.riichi) {
    const ura = ctx.uraIndicators.map(doraFromIndicator);
    for (const t of all) for (const d of ura) if (t.kind === d) dora++;
  }
  return dora;
}

function yakumanList(ctx: WinContext, allKinds: Kind[], groups: FullGroup[] | null, pair: Kind | null, concealedKoutsu: number): Yaku[] {
  const list: Yaku[] = [];
  const menzen = ctx.melds.length === 0;
  const c = counts34(ctx.concealed);

  if (menzen && isKokushi(c)) list.push({ name: "国士無双", han: 13 });
  if (allKinds.every(isHonor)) list.push({ name: "字一色", han: 13 });
  if (allKinds.every((k) => RYUUIISOU.has(k))) list.push({ name: "緑一色", han: 13 });
  if (allKinds.every(isTerminal)) list.push({ name: "清老頭", han: 13 });

  if (groups && pair !== null) {
    const koutsuKinds = groups.filter((g) => g.type === "koutsu").map((g) => g.kind);
    if ([31, 32, 33].every((k) => koutsuKinds.includes(k))) list.push({ name: "大三元", han: 13 });
    const windKoutsu = [27, 28, 29, 30].filter((k) => koutsuKinds.includes(k)).length;
    if (windKoutsu === 4) list.push({ name: "大四喜", han: 13 });
    else if (windKoutsu === 3 && pair >= 27 && pair <= 30) list.push({ name: "小四喜", han: 13 });
    if (menzen && concealedKoutsu === 4) list.push({ name: "四暗刻", han: 13 });
  }

  if (menzen) {
    const suit = suitOf(allKinds[0]);
    if (suit !== "z" && allKinds.every((k) => suitOf(k) === suit)) {
      const offset = allKinds[0] - (allKinds[0] % 9);
      const pattern = [3, 1, 1, 1, 1, 1, 1, 1, 3];
      if (pattern.every((need, i) => c[offset + i] >= need)) list.push({ name: "九蓮宝燈", han: 13 });
    }
  }
  return list;
}

type Candidate = { yaku: Yaku[]; han: number; fu: number; yakuman: number };

function evaluateStandard(ctx: WinContext, pair: Kind, concealedGroups: Group[], waitIndex: number | "pair"): Candidate {
  const menzen = ctx.melds.length === 0;
  const w = ctx.winTile.kind;

  let wait: Wait = "tanki";
  const groups: FullGroup[] = concealedGroups.map((g) => ({ ...g, open: false }));
  if (waitIndex !== "pair") {
    const g = concealedGroups[waitIndex];
    if (g.type === "koutsu") {
      wait = "shanpon";
      // A triplet completed by someone else's discard counts as open.
      if (!ctx.tsumo) groups[waitIndex] = { ...g, open: true };
    } else if (w === g.kind + 1) wait = "kanchan";
    else if ((w === g.kind + 2 && numOf(g.kind) === 1) || (w === g.kind && numOf(g.kind) === 7)) wait = "penchan";
    else wait = "ryanmen";
  }
  const all: FullGroup[] = [...groups, ...ctx.melds.map(meldGroup)];
  const allKinds = [...all.flatMap(groupKinds), pair, pair];
  const concealedKoutsu = all.filter((g) => g.type === "koutsu" && !g.open).length;

  const yakuman = yakumanList(ctx, allKinds, all, pair, concealedKoutsu);
  if (yakuman.length > 0) return { yaku: yakuman, han: 0, fu: 0, yakuman: yakuman.length };

  const yaku: Yaku[] = [];
  const add = (name: string, closed: number, open: number = closed) => {
    const han = menzen ? closed : open;
    if (han > 0) yaku.push({ name, han });
  };

  const isValuePair = isDragon(pair) || pair === ctx.seatWind || pair === ctx.roundWind;
  const shuntsu = all.filter((g) => g.type === "shuntsu");
  const koutsu = all.filter((g) => g.type === "koutsu");

  if (ctx.riichi) add("立直", 1, 0);
  if (ctx.riichi && ctx.ippatsu) add("一発", 1, 0);
  if (ctx.tsumo && menzen) add("門前清自摸和", 1, 0);
  if (allKinds.every((k) => !isYaochu(k))) add("断么九", 1);

  const pinfu = menzen && shuntsu.length === 4 && !isValuePair && wait === "ryanmen";
  if (pinfu) add("平和", 1, 0);

  if (menzen) {
    const seen = new Map<number, number>();
    for (const g of shuntsu) seen.set(g.kind, (seen.get(g.kind) ?? 0) + 1);
    let peiko = 0;
    for (const n of seen.values()) peiko += Math.floor(n / 2);
    if (peiko >= 2) add("二盃口", 3, 0);
    else if (peiko === 1) add("一盃口", 1, 0);
  }

  for (const g of koutsu) {
    if (isDragon(g.kind)) add(DRAGON_NAMES[g.kind], 1);
    if (g.kind === ctx.seatWind) add(`自風 ${WIND_LABEL[g.kind - 27]}`, 1);
    if (g.kind === ctx.roundWind) add(`場風 ${WIND_LABEL[g.kind - 27]}`, 1);
  }

  if (ctx.lastTile) add(ctx.tsumo ? "海底摸月" : "河底撈魚", 1);

  for (let n = 0; n < 7; n++) {
    if ([0, 9, 18].every((o) => shuntsu.some((g) => g.kind === o + n))) {
      add("三色同順", 2, 1);
      break;
    }
  }
  for (const o of [0, 9, 18]) {
    if ([0, 3, 6].every((n) => shuntsu.some((g) => g.kind === o + n))) {
      add("一気通貫", 2, 1);
      break;
    }
  }

  const everyHasYaochu =
    all.every((g) => groupKinds(g).some(isYaochu)) && isYaochu(pair);
  const hasHonor = allKinds.some(isHonor);
  if (everyHasYaochu && shuntsu.length > 0) {
    if (hasHonor) add("混全帯么九", 2, 1);
    else add("純全帯么九", 3, 2);
  }

  if (koutsu.length === 4) add("対々和", 2);
  if (concealedKoutsu === 3) add("三暗刻", 2);
  for (let n = 0; n < 9; n++) {
    if ([0, 9, 18].every((o) => koutsu.some((g) => g.kind === o + n))) add("三色同刻", 2);
  }
  if (allKinds.every(isYaochu)) add("混老頭", 2);

  const dragonKoutsu = koutsu.filter((g) => isDragon(g.kind)).length;
  if (dragonKoutsu === 2 && isDragon(pair)) add("小三元", 2);

  const suits = new Set(allKinds.filter((k) => !isHonor(k)).map(suitOf));
  if (suits.size === 1) {
    if (hasHonor) add("混一色", 3, 2);
    else add("清一色", 6, 5);
  }

  // Fu.
  let fu: number;
  if (pinfu) {
    fu = ctx.tsumo ? 20 : 30;
  } else {
    fu = 20;
    if (menzen && !ctx.tsumo) fu += 10;
    if (ctx.tsumo) fu += 2;
    for (const g of koutsu) {
      let f = 2;
      if (isYaochu(g.kind)) f *= 2;
      if (!g.open) f *= 2;
      fu += f;
    }
    if (isDragon(pair)) fu += 2;
    if (pair === ctx.seatWind) fu += 2;
    if (pair === ctx.roundWind) fu += 2;
    if (wait === "tanki" || wait === "kanchan" || wait === "penchan") fu += 2;
    fu = Math.ceil(fu / 10) * 10;
    if (!menzen && fu === 20) fu = 30;
  }

  const han = yaku.reduce((s, y) => s + y.han, 0);
  return { yaku, han, fu, yakuman: 0 };
}

function evaluateChiitoi(ctx: WinContext): Candidate {
  const allKinds = ctx.concealed.map((t) => t.kind);
  const yakuman = yakumanList(ctx, allKinds, null, null, 0);
  if (yakuman.length > 0) return { yaku: yakuman, han: 0, fu: 0, yakuman: yakuman.length };

  const yaku: Yaku[] = [{ name: "七対子", han: 2 }];
  if (ctx.riichi) yaku.push({ name: "立直", han: 1 });
  if (ctx.riichi && ctx.ippatsu) yaku.push({ name: "一発", han: 1 });
  if (ctx.tsumo) yaku.push({ name: "門前清自摸和", han: 1 });
  if (allKinds.every((k) => !isYaochu(k))) yaku.push({ name: "断么九", han: 1 });
  if (allKinds.every(isYaochu)) yaku.push({ name: "混老頭", han: 2 });
  if (ctx.lastTile) yaku.push({ name: ctx.tsumo ? "海底摸月" : "河底撈魚", han: 1 });
  const suits = new Set(allKinds.filter((k) => !isHonor(k)).map(suitOf));
  if (suits.size === 1) {
    if (allKinds.some(isHonor)) yaku.push({ name: "混一色", han: 3 });
    else yaku.push({ name: "清一色", han: 6 });
  }
  return { yaku, han: yaku.reduce((s, y) => s + y.han, 0), fu: 25, yakuman: 0 };
}

/** Scores a complete hand. Returns null when the shape is incomplete or it has no yaku. */
export function scoreHand(ctx: WinContext): ScoreResult | null {
  const c = counts34(ctx.concealed);
  const candidates: Candidate[] = [];
  const menzen = ctx.melds.length === 0;

  if (menzen && isKokushi(c)) {
    candidates.push({ yaku: [{ name: "国士無双", han: 13 }], han: 0, fu: 0, yakuman: 1 });
  }
  if (menzen && isChiitoi(c)) candidates.push(evaluateChiitoi(ctx));

  const w = ctx.winTile.kind;
  for (const d of decompositions(c)) {
    if (d.pair === w) candidates.push(evaluateStandard(ctx, d.pair, d.groups, "pair"));
    d.groups.forEach((g, i) => {
      if (groupKinds(g).includes(w)) candidates.push(evaluateStandard(ctx, d.pair, d.groups, i));
    });
  }
  if (candidates.length === 0) return null;

  const dora = countDora(ctx);
  let best: ScoreResult | null = null;
  for (const cand of candidates) {
    if (cand.yakuman === 0 && cand.han === 0) continue;
    const han = cand.yakuman > 0 ? 0 : cand.han + dora;
    const base = cand.yakuman > 0 ? 8000 * cand.yakuman : basePoints(han, cand.fu);
    const result: ScoreResult = {
      yaku: cand.yaku,
      han,
      fu: cand.fu,
      dora: cand.yakuman > 0 ? 0 : dora,
      yakuman: cand.yakuman,
      base,
      label: limitLabel(han, base, cand.yakuman),
    };
    if (!best || result.base > best.base || (result.base === best.base && result.han > best.han)) best = result;
  }
  return best;
}

const up100 = (x: number) => Math.ceil(x / 100) * 100;

/** Points paid for a win. `honba` adds 300 in total. */
export function payments(base: number, dealer: boolean, tsumo: boolean, honba: number) {
  if (!tsumo) {
    const ron = up100(base * (dealer ? 6 : 4)) + honba * 300;
    return { ron, fromDealer: 0, fromOthers: 0, total: ron };
  }
  if (dealer) {
    const each = up100(base * 2) + honba * 100;
    return { ron: 0, fromDealer: 0, fromOthers: each, total: each * 3 };
  }
  const fromDealer = up100(base * 2) + honba * 100;
  const fromOthers = up100(base) + honba * 100;
  return { ron: 0, fromDealer, fromOthers, total: fromDealer + fromOthers * 2 };
}
