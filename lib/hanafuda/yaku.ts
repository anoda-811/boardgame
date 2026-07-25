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

export function yakuSignature(result: YakuResult): string {
  return result.list
    .map((yaku) => `${yaku.id}:${yaku.points}`)
    .sort()
    .join("|");
}
