import type { Kind } from "./tiles";
import { isYaochu } from "./tiles";

export type Group = { type: "shuntsu" | "koutsu"; kind: Kind };
export type Decomposition = { pair: Kind; groups: Group[] };

/* ---------------- shanten ---------------- */

function standardShanten(c: number[], melds: number) {
  const needed = 4 - melds;
  let best = 8;

  const dfs = (i: number, m: number, t: number, p: number) => {
    while (i < 34 && c[i] === 0) i++;
    if (i >= 34) {
      const tt = Math.min(t, needed - m);
      const s = 8 - 2 * (m + melds) - tt - p;
      if (s < best) best = s;
      return;
    }
    const suited = i < 27;
    const pos = i % 9;

    if (c[i] >= 3) {
      c[i] -= 3;
      dfs(i, m + 1, t, p);
      c[i] += 3;
    }
    if (suited && pos <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
      c[i]--;
      c[i + 1]--;
      c[i + 2]--;
      dfs(i, m + 1, t, p);
      c[i]++;
      c[i + 1]++;
      c[i + 2]++;
    }
    if (c[i] >= 2) {
      c[i] -= 2;
      if (p === 0) dfs(i, m, t, 1);
      if (m + t < needed) dfs(i, m, t + 1, p);
      c[i] += 2;
    }
    if (m + t < needed) {
      if (suited && pos <= 7 && c[i + 1] > 0) {
        c[i]--;
        c[i + 1]--;
        dfs(i, m, t + 1, p);
        c[i]++;
        c[i + 1]++;
      }
      if (suited && pos <= 6 && c[i + 2] > 0) {
        c[i]--;
        c[i + 2]--;
        dfs(i, m, t + 1, p);
        c[i]++;
        c[i + 2]++;
      }
    }
    // Leave this tile isolated.
    const saved = c[i];
    c[i] = 0;
    dfs(i + 1, m, t, p);
    c[i] = saved;
  };

  dfs(0, 0, 0, 0);
  return best;
}

function chiitoiShanten(c: number[]) {
  let pairs = 0;
  let kinds = 0;
  for (let i = 0; i < 34; i++) {
    if (c[i] > 0) kinds++;
    if (c[i] >= 2) pairs++;
  }
  return 6 - pairs + Math.max(0, 7 - kinds);
}

function kokushiShanten(c: number[]) {
  let kinds = 0;
  let pair = 0;
  for (let i = 0; i < 34; i++) {
    if (!isYaochu(i)) continue;
    if (c[i] > 0) kinds++;
    if (c[i] >= 2) pair = 1;
  }
  return 13 - kinds - pair;
}

/** -1 means a complete hand, 0 means tenpai. */
export function shanten(c: number[], melds: number) {
  const s = standardShanten(c.slice(), melds);
  if (melds > 0) return s;
  return Math.min(s, chiitoiShanten(c), kokushiShanten(c));
}

/* ---------------- complete hands ---------------- */

function extractGroups(c: number[], i: number, acc: Group[], out: Group[][]) {
  while (i < 34 && c[i] === 0) i++;
  if (i >= 34) {
    out.push(acc.slice());
    return;
  }
  if (c[i] >= 3) {
    c[i] -= 3;
    acc.push({ type: "koutsu", kind: i });
    extractGroups(c, i, acc, out);
    acc.pop();
    c[i] += 3;
  }
  if (i < 27 && i % 9 <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
    c[i]--;
    c[i + 1]--;
    c[i + 2]--;
    acc.push({ type: "shuntsu", kind: i });
    extractGroups(c, i, acc, out);
    acc.pop();
    c[i]++;
    c[i + 1]++;
    c[i + 2]++;
  }
}

/** All ways to split concealed tiles into one pair plus sets. */
export function decompositions(counts: number[]): Decomposition[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total % 3 !== 2) return [];
  const c = counts.slice();
  const result: Decomposition[] = [];
  for (let k = 0; k < 34; k++) {
    if (c[k] < 2) continue;
    c[k] -= 2;
    const out: Group[][] = [];
    extractGroups(c, 0, [], out);
    for (const groups of out) result.push({ pair: k, groups });
    c[k] += 2;
  }
  return result;
}

export function isChiitoi(c: number[]) {
  let pairs = 0;
  for (let i = 0; i < 34; i++) {
    if (c[i] === 2) pairs++;
    else if (c[i] !== 0) return false;
  }
  return pairs === 7;
}

export function isKokushi(c: number[]) {
  let pair = false;
  for (let i = 0; i < 34; i++) {
    if (isYaochu(i)) {
      if (c[i] === 0) return false;
      if (c[i] === 2) pair = true;
      if (c[i] > 2) return false;
    } else if (c[i] > 0) return false;
  }
  return pair;
}

export function isAgariShape(c: number[], melds: number) {
  if (melds === 0 && (isChiitoi(c) || isKokushi(c))) return true;
  return decompositions(c).length > 0;
}

/** Tile kinds that would complete a 13-tile (minus melds) hand. */
export function waitingKinds(c: number[], melds: number): Kind[] {
  const waits: Kind[] = [];
  for (let k = 0; k < 34; k++) {
    if (c[k] >= 4) continue;
    c[k]++;
    if (isAgariShape(c, melds)) waits.push(k);
    c[k]--;
  }
  return waits;
}
