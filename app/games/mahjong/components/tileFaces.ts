import { numOf, suitOf, type Kind } from "@/lib/mahjong/tiles";

export const FACE_W = 128;
export const FACE_H = 176;

const INK = "#1b1b1f";
const RED = "#c0241c";
const GREEN = "#1f7a45";
const BLUE = "#1f4f9c";
const FONT = '"Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Noto Serif JP", serif';
const NUM_KANJI = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
const HONOR = ["東", "南", "西", "北"];

type Ctx = CanvasRenderingContext2D;

function background(ctx: Ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, FACE_H);
  g.addColorStop(0, "#fbf8ef");
  g.addColorStop(1, "#efe8d6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FACE_W, FACE_H);
}

function glyph(ctx: Ctx, text: string, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

/* ---------- 筒子 ---------- */

function coin(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fbf8ef";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fbf8ef";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function bigCoin(ctx: Ctx, red: boolean) {
  const x = FACE_W / 2;
  const y = FACE_H / 2;
  const main = red ? RED : GREEN;
  ctx.fillStyle = main;
  ctx.beginPath();
  ctx.arc(x, y, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fbf8ef";
  ctx.beginPath();
  ctx.arc(x, y, 43, 0, Math.PI * 2);
  ctx.fill();
  // Petal ring.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.fillStyle = i % 2 ? BLUE : main;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 34, y + Math.sin(a) * 34, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fbf8ef";
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BLUE;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
}

type Dot = [number, number, string];

function pinLayout(n: number, red: boolean): { dots: Dot[]; r: number } {
  const B = BLUE, G = GREEN, R = RED;
  switch (n) {
    case 2:
      return { r: 25, dots: [[0.5, 0.27, G], [0.5, 0.73, B]] };
    case 3:
      return { r: 21, dots: [[0.24, 0.2, B], [0.5, 0.5, R], [0.76, 0.8, G]] };
    case 4:
      return { r: 21, dots: [[0.28, 0.26, B], [0.72, 0.26, G], [0.28, 0.74, G], [0.72, 0.74, B]] };
    case 5: {
      const c = red ? R : B;
      return {
        r: 19,
        dots: [[0.26, 0.22, red ? R : B], [0.74, 0.22, red ? R : G], [0.5, 0.5, R], [0.26, 0.78, red ? R : G], [0.74, 0.78, c]],
      };
    }
    case 6:
      return {
        r: 17,
        dots: [[0.3, 0.18, G], [0.7, 0.18, G], [0.3, 0.52, R], [0.7, 0.52, R], [0.3, 0.82, R], [0.7, 0.82, R]],
      };
    case 7:
      return {
        r: 15,
        dots: [
          [0.22, 0.13, G], [0.5, 0.24, G], [0.78, 0.35, G],
          [0.3, 0.6, R], [0.7, 0.6, R], [0.3, 0.86, R], [0.7, 0.86, R],
        ],
      };
    case 8:
      return {
        r: 15,
        dots: [0.13, 0.38, 0.62, 0.87].flatMap((y): Dot[] => [[0.3, y, B], [0.7, y, B]]),
      };
    case 9:
      return {
        r: 14,
        dots: [
          [0.2, 0.17, B], [0.5, 0.17, B], [0.8, 0.17, B],
          [0.2, 0.5, R], [0.5, 0.5, R], [0.8, 0.5, R],
          [0.2, 0.83, G], [0.5, 0.83, G], [0.8, 0.83, G],
        ],
      };
  }
  return { r: 0, dots: [] };
}

function drawPin(ctx: Ctx, n: number, red: boolean) {
  if (n === 1) return bigCoin(ctx, false);
  const { dots, r } = pinLayout(n, red);
  const pad = 14;
  for (const [x, y, color] of dots) {
    coin(ctx, pad + x * (FACE_W - pad * 2), pad + y * (FACE_H - pad * 2), r, color);
  }
}

/* ---------- 索子 ---------- */

function stick(ctx: Ctx, cx: number, cy: number, h: number, color: string, angle = 0) {
  const w = 12;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 5);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(-w / 2 + 3, -h / 2 + 4, 2.5, h - 8);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (const t of [-0.5, 0, 0.5]) {
    ctx.fillRect(-w / 2 - 1.5, t * (h - 6) - 1.5, w + 3, 3);
  }
  ctx.restore();
}

function bird(ctx: Ctx) {
  const x = FACE_W / 2;
  const y = FACE_H / 2 + 8;
  // Tail feathers.
  for (let i = -3; i <= 3; i++) {
    ctx.save();
    ctx.translate(x - 6, y + 20);
    ctx.rotate(Math.PI / 2 + i * 0.22 + 0.5);
    ctx.fillStyle = i % 2 ? GREEN : BLUE;
    ctx.beginPath();
    ctx.ellipse(28, 0, 30, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(50, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Body.
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.ellipse(x + 4, y - 4, 22, 30, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e3b43a";
  ctx.beginPath();
  ctx.ellipse(x + 10, y - 2, 9, 18, -0.35, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = BLUE;
  ctx.beginPath();
  ctx.arc(x + 18, y - 40, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(x + 14, y - 51);
  ctx.lineTo(x + 20, y - 66);
  ctx.lineTo(x + 25, y - 50);
  ctx.fill();
  ctx.fillStyle = "#e3b43a";
  ctx.beginPath();
  ctx.moveTo(x + 29, y - 42);
  ctx.lineTo(x + 42, y - 38);
  ctx.lineTo(x + 29, y - 35);
  ctx.fill();
  ctx.fillStyle = "#fbf8ef";
  ctx.beginPath();
  ctx.arc(x + 21, y - 42, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x + 21.5, y - 42, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawSou(ctx: Ctx, n: number, red: boolean) {
  if (n === 1) return bird(ctx);
  const G = red ? RED : GREEN;
  const R = RED;
  const cols = (count: number) =>
    count === 1 ? [0.5] : count === 2 ? [0.3, 0.7] : count === 3 ? [0.2, 0.5, 0.8] : [0.14, 0.38, 0.62, 0.86];
  const rows: { y: number; xs: number[]; colors?: string[] }[] = [];
  switch (n) {
    case 2:
      rows.push({ y: 0.28, xs: cols(1) }, { y: 0.72, xs: cols(1) });
      break;
    case 3:
      rows.push({ y: 0.28, xs: cols(1) }, { y: 0.72, xs: cols(2) });
      break;
    case 4:
      rows.push({ y: 0.28, xs: cols(2) }, { y: 0.72, xs: cols(2) });
      break;
    case 5:
      rows.push(
        { y: 0.24, xs: cols(2) },
        { y: 0.5, xs: [0.5], colors: [R] },
        { y: 0.76, xs: cols(2) },
      );
      break;
    case 6:
      rows.push({ y: 0.28, xs: cols(3) }, { y: 0.72, xs: cols(3) });
      break;
    case 7:
      rows.push({ y: 0.17, xs: [0.5], colors: [R] }, { y: 0.5, xs: cols(3) }, { y: 0.83, xs: cols(3) });
      break;
    case 8:
      rows.push({ y: 0.28, xs: cols(4) }, { y: 0.72, xs: cols(4) });
      break;
    case 9:
      for (const y of [0.17, 0.5, 0.83]) rows.push({ y, xs: cols(3), colors: [G, R, G] });
      break;
  }
  const pad = 12;
  const h = n >= 7 ? 44 : n === 5 ? 42 : 58;
  for (const row of rows) {
    row.xs.forEach((x, i) => {
      const color = row.colors?.[i] ?? G;
      const angle = n === 8 ? (i < 2 ? (i === 0 ? 0.28 : -0.28) : i === 2 ? 0.28 : -0.28) * (row.y < 0.5 ? 1 : -1) : 0;
      stick(ctx, pad + x * (FACE_W - pad * 2), pad + row.y * (FACE_H - pad * 2), h, color, angle);
    });
  }
}

/* ---------- 萬子・字牌 ---------- */

function drawMan(ctx: Ctx, n: number, red: boolean) {
  glyph(ctx, NUM_KANJI[n - 1], FACE_W / 2, 50, 62, red ? RED : INK);
  glyph(ctx, "萬", FACE_W / 2, 122, 78, RED);
}

function drawHonor(ctx: Ctx, kind: Kind) {
  if (kind <= 30) return glyph(ctx, HONOR[kind - 27], FACE_W / 2, FACE_H / 2 + 4, 104, INK);
  if (kind === 31) {
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(22, 28, FACE_W - 44, FACE_H - 56, 6);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(31, 37, FACE_W - 62, FACE_H - 74, 3);
    ctx.stroke();
    return;
  }
  if (kind === 32) return glyph(ctx, "發", FACE_W / 2, FACE_H / 2 + 4, 100, GREEN);
  glyph(ctx, "中", FACE_W / 2, FACE_H / 2 + 4, 110, RED);
}

export function drawTileFace(ctx: Ctx, kind: Kind | null, red: boolean) {
  background(ctx);
  if (kind === null) return;
  const suit = suitOf(kind);
  const n = numOf(kind);
  if (suit === "m") drawMan(ctx, n, red);
  else if (suit === "p") drawPin(ctx, n, red);
  else if (suit === "s") drawSou(ctx, n, red);
  else drawHonor(ctx, kind);
}

const urlCache = new Map<string, string>();

/** A PNG data URL of a tile face, for use in plain HTML. */
export function tileFaceUrl(kind: Kind, red: boolean) {
  const key = `${kind}-${red}`;
  let url = urlCache.get(key);
  if (!url) {
    const canvas = document.createElement("canvas");
    canvas.width = FACE_W;
    canvas.height = FACE_H;
    drawTileFace(canvas.getContext("2d")!, kind, red);
    url = canvas.toDataURL("image/png");
    urlCache.set(key, url);
  }
  return url;
}
