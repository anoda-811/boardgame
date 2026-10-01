import type { HanafudaCard } from "./cards";

export type Yaku = {
  id: string;
  name: string;
  points: number;
};

export type YakuResult = {
  list: Yaku[];
  total: number;
};

export const YAKU_CATALOG: { name: string; points: string; detail: string }[] = [
  { name: "五光", points: "10文", detail: "光札が5枚" },
  { name: "四光", points: "8文", detail: "雨を含まない光札が4枚" },
  { name: "雨四光", points: "7文", detail: "雨と、ほかの光札から3枚" },
  { name: "三光", points: "5文", detail: "雨以外の光札のうち3枚" },
  { name: "猪鹿蝶", points: "5文", detail: "猪・鹿・蝶" },
  { name: "赤短", points: "5文", detail: "赤短が3枚" },
  { name: "青短", points: "5文", detail: "青短が3枚" },
  { name: "花見酒", points: "5文", detail: "桜の幕と盃" },
  { name: "月見酒", points: "5文", detail: "芒の月と盃" },
  { name: "たん", points: "1文〜", detail: "短冊5枚。1枚増すごとに1文" },
  { name: "たね", points: "1文〜", detail: "種5枚。1枚増すごとに1文" },
  { name: "かす", points: "1文〜", detail: "カス10枚。1枚増すごとに1文" },
];

/** Cards drawn on the yaku catalog. Count-based hands show every card that can count. */
export function catalogCards(deck: HanafudaCard[], name: string): HanafudaCard[] {
  const brights = deck.filter((card) => card.kind === "bright");
  const dryBrights = brights.filter((card) => !card.isRain);
  const animals = deck.filter((card) => card.kind === "animal");
  const ribbons = deck.filter((card) => card.kind === "ribbon");
  const named = (...names: string[]) =>
    names
      .map((cardName) => deck.find((card) => card.name === cardName))
      .filter((card): card is HanafudaCard => Boolean(card));

  switch (name) {
    case "五光":
      return brights;
    case "四光":
    case "三光":
      return dryBrights;
    case "雨四光":
      return [...brights.filter((card) => card.isRain), ...dryBrights];
    case "猪鹿蝶":
      return named("猪", "鹿", "蝶");
    case "赤短":
      return ribbons.filter((card) => card.ribbon === "red-poetry");
    case "青短":
      return ribbons.filter((card) => card.ribbon === "blue");
    case "花見酒":
      return named("幕", "盃");
    case "月見酒":
      return named("月", "盃");
    case "たん":
      return ribbons;
    case "たね":
      return animals;
    case "かす":
      return deck.filter((card) => card.kind === "chaff");
    default:
      return [];
  }
}

function hasName(cards: HanafudaCard[], name: string) {
  return cards.some((card) => card.name === name);
}

export function evaluateYaku(captured: HanafudaCard[]): YakuResult {
  const list: Yaku[] = [];
  const brights = captured.filter((c) => c.kind === "bright");
  const animals = captured.filter((c) => c.kind === "animal");
  const ribbons = captured.filter((c) => c.kind === "ribbon");
  const chaff = captured.filter((c) => c.kind === "chaff");
  const rain = brights.find((c) => c.isRain);
  const brightNoRain = brights.filter((c) => !c.isRain);

  if (brights.length === 5) {
    list.push({ id: "goko", name: "五光", points: 10 });
  } else if (brights.length === 4 && rain) {
    list.push({ id: "ameshiko", name: "雨四光", points: 7 });
  } else if (brights.length === 4) {
    list.push({ id: "shiko", name: "四光", points: 8 });
  } else if (brightNoRain.length >= 3) {
    list.push({ id: "sanko", name: "三光", points: 5 });
  }

  if (hasName(animals, "猪") && hasName(animals, "鹿") && hasName(animals, "蝶")) {
    list.push({ id: "inoshikacho", name: "猪鹿蝶", points: 5 });
  }

  const redPoetry = ribbons.filter((c) => c.ribbon === "red-poetry");
  const blue = ribbons.filter((c) => c.ribbon === "blue");

  if (redPoetry.length >= 3) {
    list.push({ id: "akatan", name: "赤短", points: 5 });
  }
  if (blue.length >= 3) {
    list.push({ id: "aotan", name: "青短", points: 5 });
  }

  if (ribbons.length >= 5) {
    list.push({
      id: "tan",
      name: "たん",
      points: 1 + (ribbons.length - 5),
    });
  }

  // 種役: 猪鹿蝶に使った3枚も種に含める（一般的）
  if (animals.length >= 5) {
    list.push({
      id: "tane",
      name: "たね",
      points: 1 + (animals.length - 5),
    });
  }

  if (chaff.length >= 10) {
    list.push({
      id: "kasu",
      name: "かす",
      points: 1 + (chaff.length - 10),
    });
  }

  const hasMoon = hasName(brights, "月");
  const hasCurtain = hasName(brights, "幕");
  const hasSake = animals.some((c) => c.isSake);

  if (hasMoon && hasSake) {
    list.push({ id: "tsukimi", name: "月見酒", points: 5 });
  }
  if (hasCurtain && hasSake) {
    list.push({ id: "hanami", name: "花見酒", points: 5 });
  }

  return {
    list,
    total: list.reduce((sum, yaku) => sum + yaku.points, 0),
  };
}

/** Cards that make up one completed yaku, in display order. */
export function cardsForYaku(captured: HanafudaCard[], yaku: Yaku): HanafudaCard[] {
  const brights = captured.filter((card) => card.kind === "bright");
  const animals = captured.filter((card) => card.kind === "animal");
  const ribbons = captured.filter((card) => card.kind === "ribbon");
  const chaff = captured.filter((card) => card.kind === "chaff");

  switch (yaku.id) {
    case "goko":
    case "ameshiko":
    case "shiko":
      return brights;
    case "sanko":
      return brights.filter((card) => !card.isRain);
    case "inoshikacho":
      return ["猪", "鹿", "蝶"]
        .map((name) => animals.find((card) => card.name === name))
        .filter((card): card is HanafudaCard => Boolean(card));
    case "akatan":
      return ribbons.filter((card) => card.ribbon === "red-poetry");
    case "aotan":
      return ribbons.filter((card) => card.ribbon === "blue");
    case "tan":
      return ribbons;
    case "tane":
      return animals;
    case "kasu":
      return chaff;
    case "tsukimi":
      return [brights.find((card) => card.name === "月"), animals.find((card) => card.isSake)].filter(
        (card): card is HanafudaCard => Boolean(card),
      );
    case "hanami":
      return [brights.find((card) => card.name === "幕"), animals.find((card) => card.isSake)].filter(
        (card): card is HanafudaCard => Boolean(card),
      );
    default:
      return [];
  }
}

export function yakuSignature(result: YakuResult): string {
  return result.list
    .map((yaku) => `${yaku.id}:${yaku.points}`)
    .sort()
    .join("|");
}
