import { shanten } from "./hand";
import { counts34, isHonor, isYaochu, type Kind, type Tile } from "./tiles";

export type DiscardAdvice = { tile: Tile; shantenAfter: number };

/** Number of tile kinds (weighted by unseen copies) that lower shanten. */
function ukeire(c: number[], melds: number, current: number, visible: number[]) {
  let total = 0;
  for (let k = 0; k < 34; k++) {
    const left = 4 - visible[k] - c[k];
    if (left <= 0) continue;
    c[k]++;
    if (shanten(c, melds) < current) total += left;
    c[k]--;
  }
  return total;
}

export function chooseDiscard(
  hand: Tile[],
  melds: number,
  visible: number[],
  opts: { safeKinds: Set<Kind> | null; doraKinds: Kind[]; random?: () => number },
): DiscardAdvice {
  const c = counts34(hand);
  const random = opts.random ?? Math.random;
  let best: { tile: Tile; score: number; s: number } | null = null;
  const tried = new Set<Kind>();

  for (const tile of hand) {
    if (tried.has(tile.kind) && !tile.red) continue;
    tried.add(tile.kind);

    c[tile.kind]--;
    const s = shanten(c, melds);
    const u = ukeire(c, melds, s, visible);
    c[tile.kind]++;

    let score = -s * 1000 + u * 4;
    if (opts.doraKinds.includes(tile.kind)) score -= 30;
    if (tile.red) score -= 40;
    // Isolated honours and terminals are the usual first discards.
    if (isHonor(tile.kind) && c[tile.kind] === 1) score += 6;
    else if (isYaochu(tile.kind)) score += 2;

    if (opts.safeKinds && s >= 1) {
      if (opts.safeKinds.has(tile.kind)) score += 2500;
      else if (isHonor(tile.kind) && visible[tile.kind] >= 2) score += 1200;
      else if (isYaochu(tile.kind)) score += 300;
    }
    score += random() * 0.5;

    if (!best || score > best.score) best = { tile, score, s };
  }
  return { tile: best!.tile, shantenAfter: best!.s };
}

/** Whether calling on `kind` (removing `used` from the hand) makes real progress. */
export function callImproves(hand: Tile[], melds: number, used: Kind[]) {
  const c = counts34(hand);
  const before = shanten(c, melds);
  for (const k of used) c[k]--;
  // After calling we still discard one tile; take the best case.
  let after = 99;
  for (let k = 0; k < 34; k++) {
    if (c[k] === 0) continue;
    c[k]--;
    after = Math.min(after, shanten(c, melds + 1));
    c[k]++;
  }
  return after < before;
}
