import { createRequire } from "node:module";
import { createGameHands, createInitialBoard } from "./board.ts";
import { toSfen, parseBestmove } from "./sfen.ts";

const require = createRequire(import.meta.url);
const YaneuraOu = require("@mizarjp/yaneuraou.k-p");

const board = createInitialBoard();
const hands = createGameHands();
const sfen = toSfen(board, hands, "sente");
const expected = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";
if (sfen !== expected) {
  console.error("sfen mismatch", sfen);
  process.exit(1);
}
console.log("sfen ok");

const drop = parseBestmove("bestmove G*5b");
const push = parseBestmove("bestmove 8c8d");
const promo = parseBestmove("bestmove 2b7g+");
if (drop?.kind !== "drop" || drop.piece !== "gold" || drop.to.r !== 1 || drop.to.c !== 4) {
  console.error("drop parse", drop);
  process.exit(1);
}
if (push?.kind !== "move" || push.from.c !== 1 || push.from.r !== 2 || push.to.r !== 3) {
  console.error("push parse", push);
  process.exit(1);
}
if (promo?.kind !== "move" || !promo.promote) {
  console.error("promo parse", promo);
  process.exit(1);
}
console.log("parse ok");

function wait(engine, prefix) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout " + prefix)), 30000);
    const onLine = (line) => {
      if (!line.startsWith(prefix)) return;
      clearTimeout(timer);
      engine.removeMessageListener(onLine);
      resolve(line);
    };
    engine.addMessageListener(onLine);
  });
}

const engine = await YaneuraOu();
const usiok = wait(engine, "usiok");
engine.postMessage("usi");
console.log(await usiok);
engine.postMessage("setoption name USI_Hash value 16");
engine.postMessage("setoption name Threads value 1");
engine.postMessage("setoption name MinimumThinkingTime value 1000");
engine.postMessage("setoption name SkillLevel value 20");
engine.postMessage("setoption name USI_OwnBook value false");
const ready = wait(engine, "readyok");
engine.postMessage("isready");
console.log(await ready);
engine.postMessage("position sfen " + toSfen(board, hands, "gote"));
const best = wait(engine, "bestmove");
engine.postMessage("go depth 2");
const line = await best;
console.log(line);
const move = parseBestmove(line);
if (!move || move === "resign" || move === "win") {
  console.error("unexpected", line);
  process.exit(1);
}
engine.terminate();
console.log("engine ok");
