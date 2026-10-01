import { pickAmateurMove } from "./amateur";
import { applyMove, inCheck } from "./board";
import type { SenteEval } from "./kifu";
import type { AiRank } from "./game";
import { parseBestmove, toSfen } from "./sfen";
import { opposite, type Board, type Hand, type Move, type Side } from "./types";

export type CandidateMove = { move: Move; evaluation: SenteEval };

export type { SenteEval };

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
  // 10kyu keeps the shallow read, then amateur.ts bends the choice.
  // margin applies when the king is in check and the engine has to answer.
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

type PvLine = { depth: number; multipv: number; cp: number; mate: number | null; move: string; bound: boolean };

/** Latest multipv lines. A mate score is pushed far past any material blunder. */
export function parseInfoLine(line: string): PvLine | null {
  if (!line.startsWith("info ") || !line.includes(" pv ")) return null;
  const score = line.match(/score (cp|mate) (-?\d+)/);
  if (!score) return null;
  const raw = Number(score[2]);
  const mate = score[1] === "mate" ? raw : null;
  const cp = mate == null ? raw : raw > 0 ? 100000 - raw : -100000 - raw;
  const depth = Number(line.match(/\bdepth (\d+)/)?.[1] ?? 0);
  const multipv = Number(line.match(/multipv (\d+)/)?.[1] ?? 1);
  const move = line.split(" pv ")[1]?.split(/\s+/)[0];
  if (!move || move === "resign" || move === "win") return null;
  const bound = /\b(?:lowerbound|upperbound)\b/.test(line);
  return { depth, multipv, cp, mate, move, bound };
}

function toSente(turn: Side, cp: number, mate: number | null): SenteEval {
  return {
    cp: turn === "sente" ? cp : -cp,
    mate: mate == null ? null : turn === "sente" ? mate : -mate,
  };
}

/** Deepest depth that finished with a real score, not an aspiration bound. */
function settledDepth(infos: PvLine[]): number {
  let depth = 0;
  for (const info of infos) {
    if (!info.bound && info.depth > depth) depth = info.depth;
  }
  return depth;
}

/** Root score from sente's side. A last-depth jump of more than five pawns is discarded. */
function rootEvaluation(infos: PvLine[], turn: Side): SenteEval | null {
  const byDepth = linesByDepth(infos);
  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  if (depths.length === 0) return null;
  let chosen = byDepth.get(depths[0])!;
  for (let i = 1; i < depths.length; i += 1) {
    const line = byDepth.get(depths[i])!;
    if (line.mate != null) {
      chosen = line;
      continue;
    }
    if (chosen.mate == null && Math.abs(line.cp - chosen.cp) > 500) break;
    chosen = line;
  }
  return toSente(turn, chosen.cp, chosen.mate);
}

function linesByDepth(infos: PvLine[]): Map<number, PvLine> {
  const byDepth = new Map<number, PvLine>();
  for (const info of infos) {
    if (info.bound || info.multipv !== 1 || info.depth < 1) continue;
    byDepth.set(info.depth, info);
  }
  return byDepth;
}

/**
 * Score of the position after a candidate move, from sente.
 * The engine reports centipawns for whoever is about to move, so a plus
 * for the opponent is stored as a minus. A search that changes its mind
 * about who is ahead keeps the later sign; a same-sign jump of more than
 * five pawns is still discarded.
 */
function candidateEvaluation(infos: PvLine[], turn: Side): SenteEval | null {
  if (settledDepth(infos) < 1) return null;
  const filtered = rootEvaluation(infos, turn);
  const byDepth = linesByDepth(infos);
  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  const deepest = depths.length > 0 ? byDepth.get(depths[depths.length - 1]) : null;
  if (!deepest) return filtered;
  const settled = toSente(turn, deepest.cp, deepest.mate);
  if (!filtered) return settled;
  const signFlipped =
    filtered.mate == null &&
    settled.mate == null &&
    filtered.cp !== 0 &&
    settled.cp !== 0 &&
    filtered.cp * settled.cp < 0;
  return signFlipped ? settled : filtered;
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
let interruptors: Array<() => void> = [];

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

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

function collectUntilBest(
  target: Engine,
  timeoutMs: number,
  timeoutMode: "reject" | "settle" = "reject",
): Promise<{ best: string; infos: PvLine[] }> {
  return new Promise((resolve, reject) => {
    const infos: PvLine[] = [];
    let finished = false;
    let grace = 0;
    const cancel = () => finish("");
    const cleanup = () => {
      window.clearTimeout(timer);
      window.clearTimeout(grace);
      target.removeMessageListener(onLine);
      interruptors = interruptors.filter((wake) => wake !== cancel);
    };
    const finish = (best: string) => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve({ best, infos });
    };
    const timer = window.setTimeout(() => {
      if (timeoutMode === "reject") {
        if (finished) return;
        finished = true;
        cleanup();
        reject(new Error("engine timeout: bestmove"));
        return;
      }
      target.postMessage("stop");
      grace = window.setTimeout(() => finish(""), 1200);
    }, timeoutMs);
    const onLine = (line: string) => {
      const info = parseInfoLine(line);
      if (info) infos.push(info);
      if (!line.startsWith("bestmove")) return;
      finish(line);
    };
    interruptors.push(cancel);
    target.addMessageListener(onLine);
  });
}

function waitFor(target: Engine, prefix: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const done = (value: string | null, failed: boolean) => {
      window.clearTimeout(timer);
      target.removeMessageListener(onLine);
      interruptors = interruptors.filter((wake) => wake !== cancel);
      if (failed) reject(new Error(`engine timeout: ${prefix}`));
      else resolve(value ?? "");
    };
    const cancel = () => done("", false);
    const timer = window.setTimeout(() => done(null, true), timeoutMs);
    const onLine = (line: string) => {
      if (!line.startsWith(prefix)) return;
      done(line, false);
    };
    interruptors.push(cancel);
    target.addMessageListener(onLine);
  });
}

async function boot(): Promise<Engine | null> {
  if (typeof window === "undefined") return null;
  if (typeof SharedArrayBuffer === "undefined") return null;
  const create = await loadFactory();
  if (!create) return null;
  const created = await withTimeout(create(), 12000);
  if (!created) return null;
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
  const pending = interruptors;
  interruptors = [];
  for (const wake of pending) wake();
}

/** Ask YaneuraOu for a move. Null means the search was dropped or the engine is unavailable. */
export function requestEngineMove(
  board: Board,
  hands: Record<Side, Hand>,
  turn: Side,
  rank: AiRank,
): Promise<{ move: Move | "resign" | "win" | null; evaluation: SenteEval | null } | null> {
  const ticket = generation;
  const profile = RANK_SEARCH[rank];
  return enqueue(async () => {
    if (ticket !== generation) return null;
    const current = await getEngine();
    if (!current || ticket !== generation) return null;
    try {
      current.postMessage(`setoption name SkillLevel value ${profile.skill}`);
      current.postMessage(`setoption name MultiPV value ${profile.multipv}`);
      current.postMessage("setoption name MinimumThinkingTime value 1000");
      const ready = waitFor(current, "readyok", 10000);
      current.postMessage("isready");
      await ready;
      if (ticket !== generation) return null;
      current.postMessage(`position sfen ${toSfen(board, hands, turn)}`);
      const searched = collectUntilBest(current, profile.limitMs);
      current.postMessage(profile.go);
      const { best, infos } = await searched;
      if (ticket !== generation) return null;
      const evaluation = rootEvaluation(infos, turn);
      if (rank === "10kyu" && !inCheck(board, turn)) {
        const amateur = pickAmateurMove(board, hands, turn, infos);
        if (amateur) return { move: amateur, evaluation };
      }
      return { move: parseBestmove(selectSoftMove(best, infos, profile.margin, profile.softness)), evaluation };
    } catch {
      return null;
    }
  });
}

function topCandidates(infos: PvLine[], turn: Side, count: number): CandidateMove[] {
  const depth = settledDepth(infos);
  if (depth < 4) return [];
  const latest = new Map<number, PvLine>();
  for (const info of infos) {
    if (!info.bound && info.depth === depth) latest.set(info.multipv, info);
  }
  const found: CandidateMove[] = [];
  for (let pv = 1; pv <= count; pv += 1) {
    const line = latest.get(pv);
    if (!line) continue;
    const parsed = parseBestmove(`bestmove ${line.move}`);
    if (!parsed || parsed === "resign" || parsed === "win") continue;
    found.push({ move: parsed, evaluation: toSente(turn, line.cp, line.mate) });
  }
  return found;
}

export type CandidateMoves = {
  moves: CandidateMove[];
  /** Sente-POV of the position under study. Not the score after a listed move. */
  positionEval: SenteEval | null;
};

/** The engine's own best moves for study. Not the weakened opponent. */
export function requestCandidateMoves(
  board: Board,
  hands: Record<Side, Hand>,
  turn: Side,
): Promise<CandidateMoves | null> {
  const ticket = generation;
  return enqueue(async () => {
    if (ticket !== generation) return null;
    const current = await getEngine();
    if (!current || ticket !== generation) return null;
    try {
      current.postMessage("setoption name SkillLevel value 20");
      current.postMessage("setoption name MultiPV value 3");
      current.postMessage("setoption name MinimumThinkingTime value 0");
      const ready = waitFor(current, "readyok", 10000);
      current.postMessage("isready");
      await ready;
      if (ticket !== generation) return null;
      current.postMessage(`position sfen ${toSfen(board, hands, turn)}`);
      const searched = collectUntilBest(current, 5000);
      current.postMessage("go depth 6");
      const { infos } = await searched;
      if (ticket !== generation) return null;
      const found = topCandidates(infos, turn, 3);
      if (found.length === 0) return null;
      const positionEval = rootEvaluation(infos, turn);
      // Show the sente-POV score of the position the move leaves, which is
      // what the big eval shows after the move. The root score is from the
      // side about to move, so a plus for the opponent would stay positive.
      current.postMessage("setoption name MultiPV value 1");
      const narrowed = waitFor(current, "readyok", 10000);
      current.postMessage("isready");
      await narrowed;
      const scored: CandidateMove[] = [];
      for (const candidate of found) {
        if (ticket !== generation) return null;
        const applied = applyMove(board, hands, turn, candidate.move);
        if (!applied) continue;
        const childTurn = opposite(turn);
        try {
          current.postMessage(`position sfen ${toSfen(applied.board, applied.hands, childTurn)}`);
          const childSearch = collectUntilBest(current, 5000, "settle");
          current.postMessage("go depth 6");
          const childInfos = (await childSearch).infos;
          if (ticket !== generation) return null;
          const childEval = candidateEvaluation(childInfos, childTurn);
          if (!childEval) continue;
          scored.push({ move: candidate.move, evaluation: childEval });
        } catch {
          // Leave the move out rather than show the pre-move score.
        }
      }
      if (scored.length === 0) return null;
      return { moves: scored, positionEval };
    } catch {
      return null;
    }
  });
}

/** Honest, short evaluation of a position. Does not choose the opponent's move. */
export function requestPositionEval(
  board: Board,
  hands: Record<Side, Hand>,
  turn: Side,
): Promise<SenteEval | null> {
  const ticket = generation;
  return enqueue(async () => {
    if (ticket !== generation) return null;
    const current = await getEngine();
    if (!current || ticket !== generation) return null;
    try {
      current.postMessage("setoption name SkillLevel value 20");
      current.postMessage("setoption name MultiPV value 1");
      current.postMessage("setoption name MinimumThinkingTime value 0");
      const ready = waitFor(current, "readyok", 10000);
      current.postMessage("isready");
      await ready;
      if (ticket !== generation) return null;
      current.postMessage(`position sfen ${toSfen(board, hands, turn)}`);
      const searched = collectUntilBest(current, 5000);
      current.postMessage("go depth 6");
      const { infos } = await searched;
      if (ticket !== generation) return null;
      if (settledDepth(infos) < 1) return null;
      return rootEvaluation(infos, turn);
    } catch {
      return null;
    }
  });
}
