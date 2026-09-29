/**
 * Tile kinds are 0–33:
 *   0–8 萬子 1–9, 9–17 筒子 1–9, 18–26 索子 1–9,
 *   27–30 東南西北, 31–33 白發中.
 */
export type Kind = number;

export type Tile = {
  id: number;
  kind: Kind;
  red: boolean;
};

export type Suit = "m" | "p" | "s" | "z";

export const WIND_NAMES = ["東", "南", "西", "北"] as const;
const HONOR_NAMES = ["東", "南", "西", "北", "白", "發", "中"];
const NUM_KANJI = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

export function suitOf(k: Kind): Suit {
  if (k < 9) return "m";
  if (k < 18) return "p";
  if (k < 27) return "s";
  return "z";
}

export function numOf(k: Kind) {
  return k < 27 ? (k % 9) + 1 : 0;
}

export function isHonor(k: Kind) {
  return k >= 27;
}

export function isTerminal(k: Kind) {
  return k < 27 && (k % 9 === 0 || k % 9 === 8);
}

export function isYaochu(k: Kind) {
  return isHonor(k) || isTerminal(k);
}

export function isDragon(k: Kind) {
  return k >= 31;
}

export function isWind(k: Kind) {
  return k >= 27 && k <= 30;
}

export function tileName(k: Kind) {
  if (k >= 27) return HONOR_NAMES[k - 27];
  const suit = suitOf(k);
  return NUM_KANJI[numOf(k) - 1] + (suit === "m" ? "萬" : suit === "p" ? "筒" : "索");
}

/** The tile that a dora indicator points at. */
export function doraFromIndicator(k: Kind): Kind {
  if (k < 27) return k - (k % 9) + ((k % 9) + 1) % 9;
  if (k <= 30) return 27 + ((k - 27 + 1) % 4);
  return 31 + ((k - 31 + 1) % 3);
}

export function createWall(random = Math.random): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;
  for (let k = 0; k < 34; k++) {
    for (let copy = 0; copy < 4; copy++) {
      // One red five in each suit.
      const red = k < 27 && numOf(k) === 5 && copy === 0;
      tiles.push({ id: id++, kind: k, red });
    }
  }
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

export function counts34(tiles: { kind: Kind }[]) {
  const c = new Array<number>(34).fill(0);
  for (const t of tiles) c[t.kind]++;
  return c;
}

export function sortTiles(tiles: Tile[]) {
  return [...tiles].sort((a, b) => a.kind - b.kind || Number(a.red) - Number(b.red) || a.id - b.id);
}
