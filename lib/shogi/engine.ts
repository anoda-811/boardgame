import type { AiRank } from "./game";
import { parseBestmove, toSfen } from "./sfen";
import type { Board, Hand, Move, Side } from "./types";

/**
 * YaneuraOu NNUE K-P (Suisho Petite), GPL-3.0.
 * The wasm, worker, and loader are served from /shogi-engine so the
 * engine can find them next to each other. SharedArrayBuffer needs
 * COOP/COEP, which next.config sets.
 */
const ENGINE_SRC = "/shogi-engine/yaneuraou.k-p.js";

type Engine = {
  postMessage: (command: string) => void;
  addMessageListener: (listener: (line: string) => void) => void;
  removeMessageListener: (listener: (line: string) => void) => void;
};

type EngineFactory = () => Promise<Engine>;

const RANK_SEARCH: Record<
  AiRank,
  { skill: number; go: string; limitMs: number; multipv: number; margin: number; softness?: number }
> = {
  // Full eval, short search. margin is how far (centipawn) from the best
  // move we may wander. A free bishop is several hundred, so it stays out.
  // softness flattens the pick. 10kyu often plays a merely decent move.
  "10kyu": { skill: 20, go: "go depth 2", limitMs: 4000, multipv: 8, margin: 90, softness: 70 },
  "8kyu": { skill: 20, go: "go depth 3", limitMs: 5000, multipv: 4, margin: 35 },
  "5kyu": { skill: 20, go: "go depth 4", limitMs: 6000, multipv: 3, margin: 20 },
  "2kyu": { skill: 20, go: "go depth 5", limitMs: 7000, multipv: 3, margin: 8 },
  "1kyu": { skill: 20, go: "go depth 6", limitMs: 8000, multipv: 1, margin: 0 },
  "1dan": { skill: 1, go: "go depth 2", limitMs: 5000, multipv: 1, margin: 0 },
  "3dan": { skill: 5, go: "go depth 5", limitMs: 8000, multipv: 1, margin: 0 },
  "5dan": { skill: 10, go: "go movetime 1600", limitMs: 8000, multipv: 1, margin: 0 },
  "7dan": { skill: 15, go: "go movetime 2200", limitMs: 9000, multipv: 1, margin: 0 },
  "9dan": { skill: 20, go: "go movetime 3000", limitMs: 10000, multipv: 1, margin: 0 },
};

type PvLine = { depth: number; multipv: number; cp: number; move: string };

/** Latest multipv lines. A mate score is pushed far past any material blunder. */
export function parseInfoLine(line: string): PvLine | null {
  if (!line.startsWith("info ") || !line.includes(" pv ")) return null;
  const score = line.match(/score (cp|mate) (-?\d+)/);
  if (!score) return null;
  const raw = Number(score[2]);
  const cp = score[1] === "cp" ? raw : raw > 0 ? 100000 - raw : -100000 - raw;
  const depth = Number(line.match(/\bdepth (\d+)/)?.[1] ?? 0);
  const multipv = Number(line.match(/multipv (\d+)/)?.[1] ?? 1);
  const move = line.split(" pv ")[1]?.split(/\s+/)[0];
  if (!move || move === "resign" || move === "win") return null;
  return { depth, multipv, cp, move };
}

/**
 * Pick a root move close to the best. Worse moves inside the margin are
 * less likely. Moves that drop a piece sit far outside it.
 */
export function selectSoftMove(
  bestLine: string,
  infos: PvLine[],
  margin: number,
  softness = Math.max(20, margin / 2),
): string {
  if (margin <= 0) return bestLine;
  const deepest = Math.max(...infos.map((info) => info.depth));
  const latest = new Map<number, PvLine>();
  for (const info of infos) {
    if (info.depth === deepest) latest.set(info.multipv, info);
  }
  const list = [...latest.values()];
  if (list.length === 0) return bestLine;
  const bestCp = Math.max(...list.map((info) => info.cp));
  const band = list.filter((info) => bestCp - info.cp <= margin);
  if (band.length === 0) return bestLine;
  const weights = band.map((info) => Math.exp(-(bestCp - info.cp) / softness));
  let roll = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < band.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return `bestmove ${band[i].move}`;
  }
  return bestLine;
}

let factoryPromise: Promise<EngineFactory | null> | null = null;
let enginePromise: Promise<Engine | null> | null = null;
let engine: Engine | null = null;
let generation = 0;
let queue: Promise<unknown> = Promise.resolve();

function loadFactory(): Promise<EngineFactory | null> {
  if (factoryPromise) return factoryPromise;
  factoryPromise = new Promise((resolve) => {
    const existing = window as Window & { YaneuraOu_K_P?: EngineFactory };
    if (existing.YaneuraOu_K_P) {
      resolve(existing.YaneuraOu_K_P);
      return;
    }
    const script = document.createElement("script");
    script.src = ENGINE_SRC;
    script.async = true;
    script.onload = () => {
      const created = (window as Window & { YaneuraOu_K_P?: EngineFactory }).YaneuraOu_K_P;
      resolve(created ?? null);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return factoryPromise;
}

function collectUntilBest(target: Engine, timeoutMs: number): Promise<{ best: string; infos: PvLine[] }> {
  return new Promise((resolve, reject) => {
    const infos: PvLine[] = [];
    const timer = window.setTimeout(() => {
      target.removeMessageListener(onLine);
      reject(new Error("engine timeout: bestmove"));
    }, timeoutMs);
    const onLine = (line: string) => {
      const info = parseInfoLine(line);
      if (info) infos.push(info);
      if (!line.startsWith("bestmove")) return;
      window.clearTimeout(timer);
      target.removeMessageListener(onLine);
      resolve({ best: line, infos });
    };
    target.addMessageListener(onLine);
  });
}

function waitFor(target: Engine, prefix: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      target.removeMessageListener(onLine);
      reject(new Error(`engine timeout: ${prefix}`));
    }, timeoutMs);
    const onLine = (line: string) => {
      if (!line.startsWith(prefix)) return;
      window.clearTimeout(timer);
      target.removeMessageListener(onLine);
      resolve(line);
    };
    target.addMessageListener(onLine);
  });
}

async function boot(): Promise<Engine | null> {
  if (typeof window === "undefined") return null;
  if (typeof SharedArrayBuffer === "undefined") return null;
  const create = await loadFactory();
  if (!create) return null;
  const created = await create();
  const usiok = waitFor(created, "usiok", 20000);
  created.postMessage("usi");
  await usiok;
  created.postMessage("setoption name USI_Hash value 16");
  created.postMessage("setoption name Threads value 1");
  created.postMessage("setoption name MinimumThinkingTime value 1000");
  created.postMessage("setoption name USI_OwnBook value false");
  const ready = waitFor(created, "readyok", 20000);
  created.postMessage("isready");
  await ready;
  engine = created;
  return created;
}

function getEngine(): Promise<Engine | null> {
  if (!enginePromise) {
    enginePromise = boot().catch(() => null);
  }
  return enginePromise;
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Drop a search that is no longer the current turn. */
export function cancelEngineSearch() {
  generation += 1;
  engine?.postMessage("stop");
}

/** Ask YaneuraOu for a move. Null means the engine is unavailable. */
export function requestEngineMove(
  board: Board,
  hands: Record<Side, Hand>,
  turn: Side,
  rank: AiRank,
): Promise<Move | "resign" | "win" | null> {
  const ticket = generation;
  const profile = RANK_SEARCH[rank];
  return enqueue(async () => {
    if (ticket !== generation) return null;
    const current = await getEngine();
    if (!current || ticket !== generation) return null;
    try {
      current.postMessage(`setoption name SkillLevel value ${profile.skill}`);
      current.postMessage(`setoption name MultiPV value ${profile.multipv}`);
      const ready = waitFor(current, "readyok", 10000);
      current.postMessage("isready");
      await ready;
      if (ticket !== generation) return null;
      current.postMessage(`position sfen ${toSfen(board, hands, turn)}`);
      const searched = collectUntilBest(current, profile.limitMs);
      current.postMessage(profile.go);
      const { best, infos } = await searched;
      if (ticket !== generation) return null;
      return parseBestmove(selectSoftMove(best, infos, profile.margin, profile.softness));
    } catch {
      return null;
    }
  });
}
