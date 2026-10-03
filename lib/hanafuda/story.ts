import { domainLabel, domainSeat, isHanId } from "./domains";
import type { HanafudaRules } from "./game";

export type Seat = {
  id: string;
  name: string;
  blurb: string;
  opponent: string;
  line: string;
  multiplier: number;
  bets: number[];
  ladder: boolean;
};

export type Street = {
  id: string;
  name: string;
  blurb: string;
  x: number;
  y: number;
  seats: Seat[];
  tea: Seat;
};

export const EDO_BOSS_ID = "kichizo";

export const STREETS: Street[] = [
  {
    id: "honjo",
    name: "本所",
    blurb: "川下の町人地。長屋と舟宿が、川に沿って続く。",
    x: 30,
    y: 76,
    seats: [
      {
        id: "rokube",
        name: "裏長屋",
        blurb: "縁側にござを敷いた、近所の席。",
        opponent: "六兵衛",
        line: "まあ一杯だけ付き合え。",
        multiplier: 1,
        bets: [5, 10],
        ladder: true,
      },
      {
        id: "oshima",
        name: "舟宿",
        blurb: "川風の入る座敷。船頭たちが札を囲む。",
        opponent: "お島",
        line: "潮が引くまでに、一局。",
        multiplier: 2,
        bets: [10, 20],
        ladder: true,
      },
      {
        id: "tatsugoro",
        name: "火消屯所",
        blurb: "纏の下で、気の荒い連中が札を叩く。",
        opponent: "辰五郎",
        line: "負けるなよ、半鐘が鳴る前に。",
        multiplier: 2,
        bets: [15, 30],
        ladder: true,
      },
    ],
    tea: {
      id: "tea-honjo",
      name: "本所の茶屋",
      blurb: "川沿いに建つ小さな茶屋。昼を過ぎると、札を囲む客が増える。",
      opponent: "お春",
      line: "お茶を置いて、一局どうです。",
      multiplier: 2,
      bets: [5, 15],
      ladder: false,
    },
  },
  {
    id: "nihonbashi",
    name: "日本橋",
    blurb: "問屋の並ぶ橋のたもと。昼でも、座敷の灯が落ちている。",
    x: 52,
    y: 48,
    seats: [
      {
        id: "denbe",
        name: "手代の席",
        blurb: "問屋の手代が、昼休みに打つ。",
        opponent: "伝兵衛",
        line: "掛け金は卓の上に。",
        multiplier: 2,
        bets: [15, 30],
        ladder: true,
      },
      {
        id: "sakichi",
        name: "帳場の奥",
        blurb: "帳面の横に、札が積んである。",
        opponent: "佐吉",
        line: "勘定のあとで、一局。",
        multiplier: 3,
        bets: [20, 40],
        ladder: true,
      },
      {
        id: "kyube",
        name: "問屋",
        blurb: "日本橋の問屋。負けた金は、その日のうちに消える。",
        opponent: "久兵衛",
        line: "町の札は、ここで締まる。",
        multiplier: 3,
        bets: [30, 50],
        ladder: true,
      },
    ],
    tea: {
      id: "tea-nihonbashi",
      name: "日本橋の茶屋",
      blurb: "橋の袂の茶屋。行き交う客のあいだで、座が埋まる。",
      opponent: "お藤",
      line: "高い札ほど、手は静かです。",
      multiplier: 3,
      bets: [10, 25],
      ladder: false,
    },
  },
  {
    id: "yashiki",
    name: "大名小路",
    blurb: "屋敷町の奥。町の札場の話は、最後にここへ着く。",
    x: 40,
    y: 18,
    seats: [
      {
        id: "gon",
        name: "長屋門",
        blurb: "門の内側。通された者だけが座る。",
        opponent: "権",
        line: "名を言ってから、札を出せ。",
        multiplier: 3,
        bets: [20, 40],
        ladder: true,
      },
      {
        id: "sakakibara",
        name: "留守居",
        blurb: "留守居役の私的な座敷。負けは外に出ない。",
        opponent: "榊原",
        line: "町人の腕、拝見しよう。",
        multiplier: 4,
        bets: [40, 80],
        ladder: true,
      },
      {
        id: "kichizo",
        name: "奥座敷",
        blurb: "江戸の札場を束ねる席。ここが、町の最後だ。",
        opponent: "吉蔵",
        line: "どの席も、最後はここへ来る。",
        multiplier: 5,
        bets: [50, 100],
        ladder: true,
      },
    ],
    tea: {
      id: "tea-yashiki",
      name: "小路の茶屋",
      blurb: "屋敷町の茶屋。奥へ行く前に、人が札を整える。",
      opponent: "お牧",
      line: "奥へ行く前に、ここで整えておきなさい。",
      multiplier: 3,
      bets: [15, 30],
      ladder: false,
    },
  },
];

export const STORY_RULES: HanafudaRules = {
  format: "three",
  targetScore: 12,
  koikoiDoubles: true,
};

export type BoutOutcome = "win" | "lose" | "draw";

export type StoryLog = {
  placeId: string;
  text: string;
};

export type HanafudaStory = {
  purse: number;
  debt: number;
  wins: number;
  losses: number;
  draws: number;
  conquered: number[];
  cleared: string[];
  log: StoryLog[];
};

export const LOAN = 20;
export const LOAN_OWED = 24;
export const MAX_DEBT = 120;

const KEY = "boardgame-hanafuda-story";

export function createStory(): HanafudaStory {
  return { purse: 30, debt: 0, wins: 0, losses: 0, draws: 0, conquered: [], cleared: [], log: [] };
}

export function allSeats() {
  return STREETS.flatMap((street) => [...street.seats, street.tea]);
}

export function placeById(id: string) {
  return allSeats().find((seat) => seat.id === id) ?? null;
}

export function streetById(id: string) {
  return STREETS.find((street) => street.id === id) ?? null;
}

export function streetOpen(story: HanafudaStory, streetId: string) {
  const cleared = story.cleared ?? [];
  const index = STREETS.findIndex((street) => street.id === streetId);
  if (index <= 0) return index === 0;
  const previous = STREETS[index - 1];
  const top = previous.seats[previous.seats.length - 1];
  return cleared.includes(top.id);
}

export function seatOpen(story: HanafudaStory, seatId: string) {
  const cleared = story.cleared ?? [];
  for (const street of STREETS) {
    if (street.tea.id === seatId) return streetOpen(story, street.id);
    const index = street.seats.findIndex((seat) => seat.id === seatId);
    if (index < 0) continue;
    if (!streetOpen(story, street.id)) return false;
    return street.seats.slice(0, index).every((seat) => cleared.includes(seat.id));
  }
  return false;
}

export function loadStory(): HanafudaStory | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HanafudaStory;
    if (typeof parsed.purse !== "number" || !Array.isArray(parsed.log)) return null;
    return {
      purse: parsed.purse,
      debt: typeof parsed.debt === "number" && parsed.debt > 0 ? parsed.debt : 0,
      wins: parsed.wins ?? 0,
      losses: parsed.losses ?? 0,
      draws: parsed.draws ?? 0,
      conquered: Array.isArray(parsed.conquered) ? parsed.conquered.filter((id) => typeof id === "number" && isHanId(id)) : [],
      cleared: Array.isArray(parsed.cleared) ? parsed.cleared.filter((id) => typeof id === "string" && placeById(id)) : [],
      log: parsed.log.slice(0, 8),
    };
  } catch {
    return null;
  }
}

export function saveStory(story: HanafudaStory) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(story));
}

export function clearStory() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function scoreDelta(outcome: BoutOutcome, playerScore: number, opponentScore: number) {
  if (outcome === "win") return playerScore;
  if (outcome === "lose") return -opponentScore;
  return 0;
}

function settle(story: HanafudaStory, delta: number) {
  const debt = story.debt ?? 0;
  if (delta > 0 && debt > 0) {
    const paid = Math.min(debt, delta);
    return { purse: story.purse + delta - paid, debt: debt - paid, paid };
  }
  return { purse: Math.max(0, story.purse + delta), debt, paid: 0 };
}

export function applyBout(
  story: HanafudaStory,
  placeId: string,
  outcome: BoutOutcome,
  playerScore: number,
  opponentScore: number,
): HanafudaStory {
  const place = placeById(placeId);
  const delta = place ? scoreDelta(outcome, playerScore, opponentScore) : 0;
  const money = settle(story, delta);
  const name = place?.name ?? "札場";
  const text =
    outcome === "draw"
      ? `${name}は流局`
      : outcome === "win"
        ? `${name}で${place?.opponent ?? "相手"}に勝ち、+${delta}文${money.paid > 0 ? `。借金を${money.paid}文返した` : ""}`
        : `${name}で${place?.opponent ?? "相手"}に負け、${delta}文`;
  const cleared =
    outcome === "win" && place?.ladder && !(story.cleared ?? []).includes(placeId)
      ? [...(story.cleared ?? []), placeId]
      : (story.cleared ?? []);
  return {
    purse: money.purse,
    debt: money.debt,
    wins: story.wins + (outcome === "win" ? 1 : 0),
    losses: story.losses + (outcome === "lose" ? 1 : 0),
    draws: story.draws + (outcome === "draw" ? 1 : 0),
    conquered: story.conquered,
    cleared,
    log: [{ placeId, text }, ...story.log].slice(0, 8),
  };
}

export function applyDomain(
  story: HanafudaStory,
  prefId: number,
  outcome: BoutOutcome,
  playerScore: number,
  opponentScore: number,
): HanafudaStory {
  const seat = domainSeat(prefId);
  const label = domainLabel(prefId);
  const delta = scoreDelta(outcome, playerScore, opponentScore);
  const money = settle(story, delta);
  const text =
    outcome === "draw"
      ? `${label}は流局`
      : outcome === "win"
        ? `${label}で${seat.opponent}に勝ち、+${delta}文${money.paid > 0 ? `。借金を${money.paid}文返した` : ""}`
        : `${label}で${seat.opponent}に負け、${delta}文`;
  return {
    purse: money.purse,
    debt: money.debt,
    wins: story.wins + (outcome === "win" ? 1 : 0),
    losses: story.losses + (outcome === "lose" ? 1 : 0),
    draws: story.draws + (outcome === "draw" ? 1 : 0),
    conquered: story.conquered,
    cleared: story.cleared,
    log: [{ placeId: `pref-${prefId}`, text }, ...story.log].slice(0, 8),
  };
}

export function oddJob(story: HanafudaStory): HanafudaStory {
  return {
    ...story,
    purse: story.purse + 8,
    debt: story.debt ?? 0,
    conquered: story.conquered,
    cleared: story.cleared,
    log: [{ placeId: "rokube", text: "縁側の手伝いで +8文" }, ...story.log].slice(0, 8),
  };
}

export function borrow(story: HanafudaStory): HanafudaStory {
  const debt = story.debt ?? 0;
  if (story.purse > 0 || debt >= MAX_DEBT) return story;
  return {
    ...story,
    purse: story.purse + LOAN,
    debt: debt + LOAN_OWED,
    log: [{ placeId: "loan", text: `金貸しから${LOAN}文借りた。返す額は${LOAN_OWED}文。` }, ...story.log].slice(0, 8),
  };
}

export function repay(story: HanafudaStory): HanafudaStory {
  const debt = story.debt ?? 0;
  const pay = Math.min(story.purse, debt);
  if (pay <= 0) return story;
  return {
    ...story,
    purse: story.purse - pay,
    debt: debt - pay,
    log: [{ placeId: "loan", text: `借金を${pay}文返した。` }, ...story.log].slice(0, 8),
  };
}
