export type CardKind = "bright" | "animal" | "ribbon" | "chaff";
export type RibbonType = "red-poetry" | "blue" | "plain";

export type HanafudaCard = {
  id: string;
  month: number;
  kind: CardKind;
  name: string;
  flower: string;
  mark: string;
  ribbon?: RibbonType;
  isRain?: boolean;
  isSake?: boolean;
};

const MONTH_FLOWERS = [
  "松",
  "梅",
  "桜",
  "藤",
  "菖蒲",
  "牡丹",
  "萩",
  "芒",
  "菊",
  "紅葉",
  "柳",
  "桐",
] as const;

type CardDef = Omit<HanafudaCard, "id" | "month" | "flower">;

const DEFS: CardDef[][] = [
  [
    { kind: "bright", name: "鶴", mark: "鶴" },
    { kind: "ribbon", name: "赤短", mark: "短", ribbon: "red-poetry" },
    { kind: "chaff", name: "カス", mark: "・" },
    { kind: "chaff", name: "カス", mark: "・" },
  ],
  [
    { kind: "animal", name: "鶯", mark: "鶯" },
    { kind: "ribbon", name: "赤短", mark: "短", ribbon: "red-poetry" },
    { kind: "chaff", name: "カス", mark: "・" },
    { kind: "chaff", name: "カス", mark: "・" },
  ],
  [
    { kind: "bright", name: "幕", mark: "幕" },
    { kind: "ribbon", name: "赤短", mark: "短", ribbon: "red-poetry" },
    { kind: "chaff", name: "カス", mark: "・" },
    { kind: "chaff", name: "カス", mark: "・" },
  ],
  [
    { kind: "animal", name: "不如帰", mark: "鳥" },
    { kind: "ribbon", name: "短冊", mark: "短", ribbon: "plain" },
    { kind: "chaff", name: "カス", mark: "・" },
    { kind: "chaff", name: "カス", mark: "・" },
  ],
  [
    { kind: "animal", name: "八橋", mark: "橋" },
    { kind: "ribbon", name: "短冊", mark: "短", ribbon: "plain" },
    { kind: "chaff", name: "カス", mark: "・" },
    { kind: "chaff", name: "カス", mark: "・" },
  ],
  [
    { kind: "animal", name: "蝶", mark: "蝶" },
    { kind: "ribbon", name: "青短", mark: "短", ribbon: "blue" },
    { kind: "chaff", name: "カス", mark: "・" },
    { kind: "chaff", name: "カス", mark: "・" },
  ],
  [
    { kind: "animal", name: "猪", mark: "猪" },
    { kind: "ribbon", name: "短冊", mark: "短", ribbon: "plain" },
    { kind: "chaff", name: "カス", mark: "・" },
    { kind: "chaff", name: "カス", mark: "・" },
  ],
  [
    { kind: "bright", name: "月", mark: "月" },
    { kind: "animal", name: "雁", mark: "雁" },
    { kind: "chaff", name: "カス", mark: "・" },
    { kind: "chaff", name: "カス", mark: "・" },
  ],
  [
    { kind: "animal", name: "盃", mark: "盃", isSake: true },
    { kind: "ribbon", name: "青短", mark: "短", ribbon: "blue" },
    { kind: "chaff", name: "カス", mark: "・" },
    { kind: "chaff", name: "カス", mark: "・" },
  ],
  [
    { kind: "animal", name: "鹿", mark: "鹿" },
    { kind: "ribbon", name: "青短", mark: "短", ribbon: "blue" },
    { kind: "chaff", name: "カス", mark: "・" },
    { kind: "chaff", name: "カス", mark: "・" },
  ],
  [
    { kind: "bright", name: "小野道風", mark: "雨", isRain: true },
    { kind: "animal", name: "燕", mark: "燕" },
    { kind: "ribbon", name: "短冊", mark: "短", ribbon: "plain" },
    { kind: "chaff", name: "カス", mark: "・" },
  ],
  [
    { kind: "bright", name: "鳳凰", mark: "鳳" },
    { kind: "chaff", name: "カス", mark: "・" },
    { kind: "chaff", name: "カス", mark: "・" },
    { kind: "chaff", name: "カス", mark: "・" },
  ],
];

export function createDeck(): HanafudaCard[] {
  const deck: HanafudaCard[] = [];
  DEFS.forEach((monthCards, monthIndex) => {
    const month = monthIndex + 1;
    monthCards.forEach((def, cardIndex) => {
      deck.push({
        ...def,
        id: `${month}-${cardIndex}`,
        month,
        flower: MONTH_FLOWERS[monthIndex],
      });
    });
  });
  return deck;
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function kindLabel(kind: CardKind): string {
  switch (kind) {
    case "bright":
      return "光";
    case "animal":
      return "種";
    case "ribbon":
      return "短";
    case "chaff":
      return "カス";
  }
}
