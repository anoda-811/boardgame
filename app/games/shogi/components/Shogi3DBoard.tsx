"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, RoundedBox, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { CinematicGrade } from "./CinematicGrade";
import { Garden } from "./Garden";
import { Washitsu } from "./Washitsu";
import { MAT_D, MAT_W, tatamiX, tatamiZ } from "./houseLayout";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

RectAreaLightUniformsLib.init();
import type { Opponent } from "@/lib/shogi/career";
import { seatedSrc } from "@/lib/shogi/portraits";
import {
  HAND_ORDER,
  type Board,
  type Coord,
  type Hand,
  type PieceType,
  type Side,
  type UnpromotedType,
} from "@/lib/shogi/types";

export type Shogi3DBoardProps = {
  board: Board;
  hands: Record<Side, Hand>;
  selected: Coord | null;
  selectedDrop: UnpromotedType | null;
  targets: Coord[];
  lastMove: { from?: Coord; to: Coord; by: Side } | null;
  canDrop: boolean;
  /** Opponent's pieces in hand can be dropped. Only while reviewing a rewound position. */
  goteDrop?: boolean;
  /** The person sitting across the board. */
  across: Opponent;
  onSquareClick: (coord: Coord) => void;
  onHandClick: (piece: UnpromotedType) => void;
};

type V3 = [number, number, number];

const SW = 1.0;
const SH = 1.08;
const BOARD_W = 9 * SW + 1.2;
const BOARD_D = 9 * SH + 1.3;
const BOARD_THICK = 3.0;
const LEG_H = 1.5;
const FLOOR_Y = -BOARD_THICK - LEG_H;
const STAND_TOP = -0.55;
const STAND_SIZE = 3.3;
const STAND_POS: Record<Side, V3> = {
  sente: [BOARD_W / 2 + STAND_SIZE / 2 + 0.55, STAND_TOP, 3.2],
  gote: [-(BOARD_W / 2 + STAND_SIZE / 2 + 0.55), STAND_TOP, -3.2],
};
const CAMERA_POSITION: V3 = [0, 12.4, 7.6];

/** Wider view on a narrow screen. The camera stays put so it remains under the ceiling. */
function viewFov(base: number) {
  if (typeof window === "undefined" || !window.matchMedia("(max-width: 760px)").matches) return base;
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const halfV = (base * Math.PI) / 360;
  const halfH = Math.atan(Math.tan(halfV) * 1.35);
  const fitted = (Math.atan(Math.tan(halfH) / Math.max(0.42, aspect)) * 360) / Math.PI;
  return Math.min(100, Math.max(base, fitted));
}
const CAMERA_TARGET: V3 = [0, 0.2, 0.2];
const CAMERA_FOV = 48;

const PIECE_THICK = 0.46;
const BEVEL = 0.045;
const TIP_RATIO = 0.62;

const squareX = (c: number) => (c - 4) * SW;
const squareZ = (r: number) => (r - 4) * SH;

const SIZE: Record<UnpromotedType | "king", number> = {
  king: 1,
  rook: 0.97,
  bishop: 0.97,
  gold: 0.93,
  silver: 0.93,
  knight: 0.9,
  lance: 0.87,
  pawn: 0.84,
};

const BASE_TYPE: Record<PieceType, UnpromotedType | "king"> = {
  king: "king",
  rook: "rook",
  bishop: "bishop",
  gold: "gold",
  silver: "silver",
  knight: "knight",
  lance: "lance",
  pawn: "pawn",
  dragon: "rook",
  horse: "bishop",
  promotedSilver: "silver",
  promotedKnight: "knight",
  promotedLance: "lance",
  tokin: "pawn",
};

// Promoted pieces carry the traditional shorthand characters in red.
const FACE: Record<PieceType, { text: string; red: boolean }> = {
  king: { text: "玉", red: false },
  rook: { text: "飛", red: false },
  bishop: { text: "角", red: false },
  gold: { text: "金", red: false },
  silver: { text: "銀", red: false },
  knight: { text: "桂", red: false },
  lance: { text: "香", red: false },
  pawn: { text: "歩", red: false },
  dragon: { text: "龍", red: true },
  horse: { text: "馬", red: true },
  promotedSilver: { text: "全", red: true },
  promotedKnight: { text: "圭", red: true },
  promotedLance: { text: "杏", red: true },
  tokin: { text: "と", red: true },
};

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, lines: number, seed: number) {
  const rand = rng(seed);
  ctx.strokeStyle = color;
  for (let i = 0; i < lines; i++) {
    const x = rand() * w;
    const amp = 1 + rand() * 4;
    const freq = 0.004 + rand() * 0.01;
    ctx.globalAlpha = 0.04 + rand() * 0.12;
    ctx.lineWidth = 0.5 + rand() * 1.8;
    ctx.beginPath();
    for (let y = 0; y <= h; y += 6) {
      const px = x + Math.sin(y * freq + i) * amp;
      if (y === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function canvasTexture(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function paintBoardGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const px = w / BOARD_W;
  const left = (BOARD_W / 2 - 4.5 * SW) * px;
  const top = (BOARD_D / 2 - 4.5 * SH) * px;
  ctx.strokeStyle = "#1a1008";
  ctx.globalAlpha = 0.88;
  ctx.lineWidth = 2.4;
  for (let i = 0; i <= 9; i++) {
    const x = left + i * SW * px;
    const y = top + i * SH * px;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + 9 * SH * px);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + 9 * SW * px, y);
    ctx.stroke();
  }
  ctx.lineWidth = 3.6;
  ctx.strokeRect(left, top, 9 * SW * px, 9 * SH * px);
  ctx.fillStyle = "#1a1008";
  for (const [i, j] of [
    [3, 3],
    [6, 3],
    [3, 6],
    [6, 6],
  ]) {
    ctx.beginPath();
    ctx.arc(left + i * SW * px, top + j * SH * px, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Quiet honey: a few soft bands, so the pieces and the grid stay easy to read. */
function paintHoneyWood(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  kind: "piece" | "board" | "side",
) {
  const rand = rng(seed);
  const stops =
    kind === "piece"
      ? ["#e7c492", "#dfb784", "#d7ae78"]
      : kind === "board"
        ? ["#e9c896", "#e0bc88", "#d7b07a"]
        : ["#deb888", "#d4ac78", "#caa06c"];
  const ground = ctx.createLinearGradient(0, 0, kind === "side" ? 0 : w, kind === "side" ? h : 0);
  ground.addColorStop(0, stops[0]);
  ground.addColorStop(0.5, stops[1]);
  ground.addColorStop(1, stops[2]);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);

  const vertical = kind !== "side";
  const bands = kind === "board" ? 14 : 6;
  for (let i = 0; i < bands; i++) {
    const pos = rand() * (vertical ? w : h);
    const span = 6 + rand() * (kind === "board" ? 28 : 16);
    const dark = rand() > 0.45;
    ctx.fillStyle = dark
      ? `rgba(90, 48, 16, ${0.04 + rand() * 0.07})`
      : `rgba(255, 228, 180, ${0.04 + rand() * 0.06})`;
    if (vertical) ctx.fillRect(pos, 0, span, h);
    else ctx.fillRect(0, pos, w, span);
  }

  const lines = kind === "board" ? 52 : 28;
  if (vertical) {
    grain(ctx, w, h, "#8a5a28", lines, seed + 9);
  } else {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-h / 2, -w / 2);
    grain(ctx, h, w, "#8a5a28", lines, seed + 9);
    ctx.restore();
  }
}

function boardTopTexture() {
  const w = 1024;
  const h = Math.round((w * BOARD_D) / BOARD_W);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  paintHoneyWood(ctx, w, h, 7, "board");
  const sheen = ctx.createLinearGradient(0, 0, 0, h);
  sheen.addColorStop(0, "rgba(80, 46, 18, 0.035)");
  sheen.addColorStop(0.4, "rgba(255, 244, 224, 0)");
  sheen.addColorStop(1, "rgba(255, 248, 232, 0.07)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);
  paintBoardGrid(ctx, w, h);
  return canvasTexture(canvas);
}

function boardSideTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  paintHoneyWood(ctx, canvas.width, canvas.height, 19, "side");
  const tex = canvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Dark walnut for the stand sides and leg. A vertical falloff gives the column some form. */
function standWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const ground = ctx.createLinearGradient(0, 0, 0, 512);
  ground.addColorStop(0, "#6b4630");
  ground.addColorStop(0.35, "#543628");
  ground.addColorStop(1, "#2c1a12");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, 512, 512);
  const rand = rng(31);
  for (let i = 0; i < 9; i++) {
    const x = rand() * 512;
    const span = 18 + rand() * 70;
    const band = ctx.createLinearGradient(x, 0, x + span, 0);
    band.addColorStop(0, "rgba(90, 52, 30, 0)");
    band.addColorStop(0.5, rand() > 0.5 ? "rgba(28, 14, 8, 0.28)" : "rgba(150, 96, 54, 0.16)");
    band.addColorStop(1, "rgba(90, 52, 30, 0)");
    ctx.fillStyle = band;
    ctx.fillRect(x, 0, span, 512);
  }
  grain(ctx, 512, 512, "#2a160e", 36, 37);
  grain(ctx, 512, 512, "#a56b3e", 10, 53);
  const tex = canvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** The well of the stand: walnut that lightens toward the garden and darkens into the rim. */
function standTopTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#5a3824";
  ctx.fillRect(0, 0, 512, 512);
  const heart = ctx.createRadialGradient(230, 280, 20, 256, 270, 340);
  heart.addColorStop(0, "#a06a42");
  heart.addColorStop(0.5, "#7a4e32");
  heart.addColorStop(1, "#4a2e1c");
  ctx.fillStyle = heart;
  ctx.fillRect(0, 0, 512, 512);
  const rand = rng(44);
  for (let i = 0; i < 7; i++) {
    const x = rand() * 512;
    const span = 30 + rand() * 90;
    const band = ctx.createLinearGradient(x, 0, x + span, 80);
    band.addColorStop(0, "rgba(120, 72, 40, 0)");
    band.addColorStop(0.5, rand() > 0.5 ? "rgba(40, 22, 12, 0.22)" : "rgba(180, 120, 70, 0.14)");
    band.addColorStop(1, "rgba(120, 72, 40, 0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, 512, 512);
  }
  grain(ctx, 512, 512, "#3a2214", 28, 61);
  grain(ctx, 512, 512, "#c48958", 8, 71);
  const light = ctx.createLinearGradient(0, 512, 0, 0);
  light.addColorStop(0, "rgba(32, 16, 8, 0.28)");
  light.addColorStop(0.45, "rgba(255, 236, 210, 0)");
  light.addColorStop(1, "rgba(255, 236, 210, 0.16)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, 512, 512);
  const rim = ctx.createRadialGradient(256, 256, 150, 256, 256, 372);
  rim.addColorStop(0, "rgba(0, 0, 0, 0)");
  rim.addColorStop(0.72, "rgba(20, 10, 6, 0.05)");
  rim.addColorStop(1, "rgba(16, 8, 4, 0.28)");
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, 512, 512);
  return canvasTexture(canvas);
}

const STAND_LOOK = 7;
let standTopMat: THREE.MeshPhysicalMaterial | null = null;
function standTopMaterial() {
  if (standTopMat?.userData.look === STAND_LOOK) return standTopMat;
  const previous = standTopMat;
  const normal = normalTexture("fine");
  normal.repeat.set(2.2, 2.2);
  standTopMat = new THREE.MeshPhysicalMaterial({
    map: standTopTexture(),
    normalMap: normal,
    normalScale: new THREE.Vector2(0.05, 0.05),
    color: "#ffffff",
    roughness: 0.52,
    roughnessMap: softRoughness(19),
    metalness: 0,
    clearcoat: 0.04,
    clearcoatRoughness: 0.72,
    envMapIntensity: 0.2,
  });
  standTopMat.userData.look = STAND_LOOK;
  previous?.map?.dispose();
  previous?.normalMap?.dispose();
  previous?.roughnessMap?.dispose();
  previous?.dispose();
  return standTopMat;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(src));
    image.src = src;
  });
}

function photoTexture(image: HTMLImageElement, sourceHeight = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = Math.max(1, Math.round(image.height * sourceHeight));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, image.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return canvasTexture(canvas);
}

function woodTexture(base: string, line: string, seed: number, lines = 90) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  grain(ctx, 256, 256, line, lines, seed);
  return canvasTexture(canvas);
}

function normalTexture(kind: "weave" | "wood" | "fine") {
  const w = 256;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const heightAt = (x: number, y: number) => {
    if (kind === "weave") return Math.sin((y / h) * Math.PI * 96) * 0.5 + 0.5;
    if (kind === "fine") {
      const along = Math.sin((x / w) * Math.PI * 12 + Math.sin((y / h) * Math.PI * 3) * 0.7);
      const fine = Math.sin((x / w) * Math.PI * 36 + y * 0.04) * 0.22;
      return (along * 0.78 + fine) * 0.5 + 0.5;
    }
    const wave = Math.sin((x / w) * Math.PI * 22 + Math.sin(y * 0.05) * 1.4);
    return wave * 0.5 + 0.5;
  };
  const strength = kind === "weave" ? 2.4 : kind === "fine" ? 0.65 : 1.1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const left = heightAt((x - 1 + w) % w, y);
      const right = heightAt((x + 1) % w, y);
      const down = heightAt(x, (y + 1) % h);
      const up = heightAt(x, (y - 1 + h) % h);
      let nx = (left - right) * strength;
      let ny = (down - up) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * w + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function tatamiTexture() {
  const w = 512;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#b9ae6c";
  ctx.fillRect(0, 0, w, h);
  const rand = rng(3);
  // Woven rush: fine lines across the short side.
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = rand() > 0.5 ? "rgba(90,80,30,0.16)" : "rgba(240,230,170,0.12)";
    ctx.fillRect(0, y, w, 1.5);
  }
  for (let x = 0; x < w; x += 64) {
    ctx.fillStyle = "rgba(80,70,30,0.12)";
    ctx.fillRect(x, 0, 1.5, h);
  }
  // Cloth border along the long edges.
  ctx.fillStyle = "#2c2a20";
  ctx.fillRect(0, 0, 26, h);
  ctx.fillRect(w - 26, 0, 26, h);
  ctx.fillStyle = "rgba(200,180,120,0.25)";
  ctx.fillRect(10, 0, 2, h);
  ctx.fillRect(w - 12, 0, 2, h);
  const tex = canvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

const faceCache = new Map<string, THREE.MeshStandardMaterial>();
const WOOD_REV = 18;

const FACE_FONT =
  '"Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Hiragino Mincho Pro", "MS Mincho", "Noto Serif JP", serif';

function clipPieceFace(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.03);
  ctx.lineTo(w * 0.9, h * 0.36);
  ctx.lineTo(w * 0.97, h * 0.98);
  ctx.lineTo(w * 0.03, h * 0.98);
  ctx.lineTo(w * 0.1, h * 0.36);
  ctx.closePath();
}

/** Glossy lacquer in a rounded groove. The shoulder light follows the stroke, so the cut reads as round. */
function paintCharacter(text: string, red: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  clipPieceFace(ctx, canvas.width, canvas.height);
  ctx.clip();
  paintHoneyWood(ctx, canvas.width, canvas.height, text.charCodeAt(0) * 17 + 5, "piece");
  const sheen = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sheen.addColorStop(0, "rgba(255, 236, 200, 0.1)");
  sheen.addColorStop(0.5, "rgba(255, 236, 200, 0)");
  sheen.addColorStop(1, "rgba(90, 50, 16, 0.06)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const mw = canvas.width;
  const mh = canvas.height;
  const mask = document.createElement("canvas");
  mask.width = mw;
  mask.height = mh;
  const mctx = mask.getContext("2d", { willReadFrequently: true })!;
  mctx.fillStyle = "#fff";
  mctx.strokeStyle = "#fff";
  mctx.lineJoin = "round";
  mctx.lineCap = "round";
  mctx.lineWidth = 18;
  mctx.textAlign = "center";
  mctx.textBaseline = "middle";
  const size = text === "と" ? 348 : 388;
  mctx.font = `700 ${size}px ${FACE_FONT}`;
  const x = mw / 2;
  const y = mh * 0.56;
  mctx.strokeText(text, x, y);
  mctx.fillText(text, x, y);

  const sharp = mctx.getImageData(0, 0, mw, mh).data;
  let height = new Float32Array(mw * mh);
  for (let i = 0; i < height.length; i++) height[i] = sharp[i * 4] / 255;
  const boxBlur = (src: Float32Array, radius: number) => {
    const tmp = new Float32Array(mw * mh);
    const dst = new Float32Array(mw * mh);
    const inv = 1 / (radius * 2 + 1);
    for (let py = 0; py < mh; py++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += src[py * mw + Math.min(mw - 1, Math.max(0, k))];
      for (let px = 0; px < mw; px++) {
        tmp[py * mw + px] = sum * inv;
        sum += src[py * mw + Math.min(mw - 1, px + radius + 1)] - src[py * mw + Math.max(0, px - radius)];
      }
    }
    for (let px = 0; px < mw; px++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += tmp[Math.min(mh - 1, Math.max(0, k)) * mw + px];
      for (let py = 0; py < mh; py++) {
        dst[py * mw + px] = sum * inv;
        sum += tmp[Math.min(mh - 1, py + radius + 1) * mw + px] - tmp[Math.max(0, py - radius) * mw + px];
      }
    }
    return dst;
  };
  let soft = height;
  for (let pass = 0; pass < 2; pass++) soft = boxBlur(soft, 8);
  let wide = height;
  for (let pass = 0; pass < 2; pass++) wide = boxBlur(wide, 16);
  height = soft;

  const wood = ctx.getImageData(0, 0, mw, mh);
  const pix = wood.data;
  const hAt = (px: number, py: number) =>
    soft[Math.max(0, Math.min(mh - 1, py)) * mw + Math.max(0, Math.min(mw - 1, px))];
  const wAt = (px: number, py: number) =>
    wide[Math.max(0, Math.min(mh - 1, py)) * mw + Math.max(0, Math.min(mw - 1, px))];
  const ink = red ? [96, 18, 14] : [12, 8, 6];
  const lip = red ? [168, 90, 78] : [176, 132, 92];

  for (let py = 0; py < mh; py++) {
    for (let px = 0; px < mw; px++) {
      const i = (py * mw + px) * 4;
      if (pix[i + 3] < 8) continue;
      const cover = sharp[i] / 255;
      if (cover < 0.2) {
        const shade = wAt(px, py - 14);
        const glow = wAt(px, py + 10);
        if (shade > 0.06) {
          const k = 1 - Math.min(0.62, (shade - 0.06) * 1.35);
          pix[i] = Math.round(pix[i] * k);
          pix[i + 1] = Math.round(pix[i + 1] * k);
          pix[i + 2] = Math.round(pix[i + 2] * k);
        } else if (glow > 0.14) {
          pix[i] = Math.min(255, Math.round(pix[i] * 1.14 + 16));
          pix[i + 1] = Math.min(255, Math.round(pix[i + 1] * 1.1 + 12));
          pix[i + 2] = Math.min(255, Math.round(pix[i + 2] * 1.06 + 6));
        }
        continue;
      }
      const near = 1 - hAt(px, py + 20);
      const far = 1 - hAt(px, py - 20);
      const edge = near - far;
      let r: number;
      let g: number;
      let b: number;
      if (edge > 0) {
        const lit = Math.min(0.72, edge * 1.5);
        r = ink[0] * (1 - lit) + lip[0] * lit;
        g = ink[1] * (1 - lit) + lip[1] * lit;
        b = ink[2] * (1 - lit) + lip[2] * lit;
      } else {
        const dark = Math.min(0.6, -edge * 1.3);
        r = ink[0] * (1 - dark);
        g = ink[1] * (1 - dark);
        b = ink[2] * (1 - dark);
      }
      const t = cover * cover * (3 - 2 * cover);
      pix[i] = Math.round(pix[i] * (1 - t) + r * t);
      pix[i + 1] = Math.round(pix[i + 1] * (1 - t) + g * t);
      pix[i + 2] = Math.round(pix[i + 2] * (1 - t) + b * t);
    }
  }
  ctx.putImageData(wood, 0, 0);
  ctx.restore();
  const tex = canvasTexture(canvas);
  tex.anisotropy = 16;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = mw;
  normalCanvas.height = mh;
  const nctx = normalCanvas.getContext("2d")!;
  const normals = nctx.createImageData(mw, mh);
  const strength = 3.4;
  for (let py = 0; py < mh; py++) {
    for (let px = 0; px < mw; px++) {
      const dL = hAt(px - 2, py);
      const dR = hAt(px + 2, py);
      const dU = hAt(px, py - 2);
      const dD = hAt(px, py + 2);
      let nx = (dR - dL) * strength;
      let ny = (dU - dD) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (py * mw + px) * 4;
      normals.data[i] = (nx * 0.5 + 0.5) * 255;
      normals.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      normals.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      normals.data[i + 3] = 255;
    }
  }
  nctx.putImageData(normals, 0, 0);
  const normal = new THREE.CanvasTexture(normalCanvas);
  normal.colorSpace = THREE.NoColorSpace;
  normal.anisotropy = 8;
  return { map: tex, normal };
}

function rebuildFace(mat: THREE.MeshStandardMaterial) {
  const { text, red } = mat.userData as { text: string; red: boolean };
  const next = paintCharacter(text, red);
  mat.map?.dispose();
  mat.normalMap?.dispose();
  mat.map = next.map;
  mat.normalMap = next.normal;
  mat.normalScale.set(1.15, 1.15);
  mat.color.set("#f3dcc0");
  mat.roughness = 0.74;
  mat.metalness = 0;
  mat.envMapIntensity = 0.08;
  mat.needsUpdate = true;
  mat.userData.woodRev = WOOD_REV;
}

function faceMaterial(type: PieceType, side: Side) {
  const face = type === "king" && side === "gote" ? { text: "王", red: false } : FACE[type];
  const key = `${face.text}-${face.red}`;
  let mat = faceCache.get(key);
  if (!mat) {
    const painted = paintCharacter(face.text, face.red);
    mat = new THREE.MeshStandardMaterial({
      map: painted.map,
      normalMap: painted.normal,
      normalScale: new THREE.Vector2(1.15, 1.15),
      transparent: true,
      alphaTest: 0.35,
      roughness: 0.74,
      metalness: 0,
      envMapIntensity: 0.08,
      color: "#f3dcc0",
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    mat.userData = { text: face.text, red: face.red, woodRev: WOOD_REV };
    faceCache.set(key, mat);
  } else if (mat.userData.woodRev !== WOOD_REV) {
    rebuildFace(mat);
  }
  return mat;
}

function pieceBodyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  paintHoneyWood(ctx, 512, 512, 11, "piece");
  const tex = canvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function softRoughness(seed: number) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const img = ctx.createImageData(size, size);
  const rand = rng(seed);
  for (let i = 0; i < size * size; i++) {
    const v = 205 + Math.floor(rand() * 50);
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function applyLuxuryWood(mats: {
  top: THREE.MeshPhysicalMaterial;
  side: THREE.MeshPhysicalMaterial;
  piece: THREE.MeshPhysicalMaterial;
}) {
  if (mats.top.userData.woodRev === WOOD_REV) return;
  const swap = (material: THREE.MeshPhysicalMaterial, map: THREE.Texture) => {
    const previous = material.map;
    material.map = map;
    material.needsUpdate = true;
    if (previous && previous !== map) previous.dispose();
  };
  swap(mats.top, boardTopTexture());
  const boardNormal = normalTexture("fine");
  boardNormal.repeat.set(1.2, 2.4);
  const pieceNormal = normalTexture("fine");
  pieceNormal.repeat.set(2.4, 3);
  const assignNormal = (material: THREE.MeshPhysicalMaterial, tex: THREE.Texture, scale: number) => {
    const previous = material.normalMap;
    material.normalMap = tex;
    material.normalScale.set(scale, scale);
    if (previous && previous !== tex) previous.dispose();
  };
  assignNormal(mats.top, boardNormal, 0.11);
  mats.top.roughness = 0.4;
  mats.top.roughnessMap = softRoughness(3);
  mats.top.metalness = 0;
  mats.top.clearcoat = 0.08;
  mats.top.clearcoatRoughness = 0.72;
  mats.top.envMapIntensity = 0.4;
  mats.top.color.set("#fff6ea");
  swap(mats.side, boardSideTexture());
  mats.side.roughness = 0.58;
  mats.side.roughnessMap = softRoughness(5);
  mats.side.metalness = 0;
  mats.side.clearcoat = 0.03;
  mats.side.clearcoatRoughness = 0.75;
  mats.side.envMapIntensity = 0.22;
  mats.side.color.set("#efd0a4");
  swap(mats.piece, pieceBodyTexture());
  assignNormal(mats.piece, pieceNormal, 0.045);
  mats.piece.roughness = 0.9;
  mats.piece.roughnessMap = softRoughness(9);
  mats.piece.metalness = 0;
  mats.piece.clearcoat = 0;
  mats.piece.specularIntensity = 0.12;
  mats.piece.envMapIntensity = 0.05;
  mats.piece.color.set("#f3e2cc");
  mats.top.userData.woodRev = WOOD_REV;
  for (const mat of faceCache.values()) {
    if (mat.userData.woodRev !== WOOD_REV) rebuildFace(mat);
  }
}

/* ---------- geometry ---------- */

let pieceGeo: THREE.BufferGeometry | null = null;
let pieceGeoRev = 0;
const LENGTH = SH * 0.9;
const WIDTH = SW * 0.84;
const SLOPE = Math.atan(((1 - TIP_RATIO) * PIECE_THICK * (1 + 2 * BEVEL)) / LENGTH);

/** Pentagonal wedge: thicker at the base, pointing to -z. */
function pieceGeometry() {
  if (pieceGeo && pieceGeoRev === WOOD_REV) return pieceGeo;
  pieceGeo?.dispose();
  pieceGeo = null;
  const s = new THREE.Shape();
  s.moveTo(0, 0.5);
  s.lineTo(0.4, 0.22);
  s.lineTo(0.47, -0.5);
  s.lineTo(-0.47, -0.5);
  s.lineTo(-0.4, 0.22);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 1,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: 0.03,
    bevelSegments: 4,
  });
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const sy = pos.getY(i);
    const t = THREE.MathUtils.clamp(0.5 - sy, 0, 1);
    const z = (pos.getZ(i) + BEVEL) * (TIP_RATIO + (1 - TIP_RATIO) * t);
    pos.setXYZ(i, pos.getX(i) * WIDTH, z * PIECE_THICK, -sy * LENGTH);
  }
  geo.computeVertexNormals();
  pieceGeo = geo;
  pieceGeoRev = WOOD_REV;
  return geo;
}

const FACE_Y = PIECE_THICK * (1 + 2 * BEVEL) * (TIP_RATIO + (1 - TIP_RATIO) * 0.5) + 0.004;

function legGeometry() {
  const pts: [number, number][] = [
    [0, 0],
    [0.5, 0],
    [0.62, 0.18],
    [0.42, 0.55],
    [0.58, 0.95],
    [0.5, 1.2],
    [0.62, 1.4],
    [0.6, 1.5],
    [0, 1.5],
  ];
  return new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, (y / 1.5) * LEG_H)),
    32,
  );
}

/* ---------- pieces ---------- */

function pieceContactTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const shade = ctx.createRadialGradient(64, 68, 6, 64, 70, 58);
  shade.addColorStop(0, "rgba(42, 24, 12, 0.58)");
  shade.addColorStop(0.42, "rgba(42, 24, 12, 0.26)");
  shade.addColorStop(1, "rgba(42, 24, 12, 0)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let pieceContactMap: THREE.CanvasTexture | null = null;
let pieceContactRev = 0;

function Piece3D({
  type,
  side,
  target,
  from,
  selected,
  material,
  onClick,
}: {
  type: PieceType;
  side: Side;
  target: V3;
  from: V3 | null;
  selected: boolean;
  material: THREE.Material;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const anim = useRef<{ t: number; from: V3 } | null>(from ? { t: 0, from } : null);
  const [initial] = useState<V3>(() => from ?? target);
  const scale = SIZE[BASE_TYPE[type]];

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const a = anim.current;
    if (a && a.t < 1) {
      a.t = Math.min(1, a.t + delta / 0.5);
      const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
      const dist = Math.hypot(target[0] - a.from[0], target[2] - a.from[2]);
      g.position.set(
        a.from[0] + (target[0] - a.from[0]) * e,
        a.from[1] + (target[1] - a.from[1]) * e + Math.sin(Math.PI * e) * Math.min(1.2, 0.35 + dist * 0.12),
        a.from[2] + (target[2] - a.from[2]) * e,
      );
      return;
    }
    const lift = selected ? 0.22 : 0;
    g.position.x = target[0];
    g.position.z = target[2];
    g.position.y += (target[1] + lift - g.position.y) * Math.min(1, delta * 12);
  });

  if (!pieceContactMap || pieceContactRev !== 2) {
    pieceContactMap?.dispose();
    pieceContactMap = pieceContactTexture();
    pieceContactRev = 2;
  }

  return (
    <>
      <mesh
        position={[target[0], target[1] + 0.012, target[2]]}
        rotation={[-Math.PI / 2, side === "sente" ? 0 : Math.PI, 0]}
        scale={[scale * 1.15, scale * 1.05, 1]}
        renderOrder={2}
        raycast={() => null}
      >
        <planeGeometry args={[WIDTH, LENGTH]} />
        <meshBasicMaterial map={pieceContactMap} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      <group
      ref={ref}
      position={initial}
      rotation={[0, side === "sente" ? 0 : Math.PI, 0]}
      scale={scale}
      onClick={onClick}
      onPointerOver={
        onClick
          ? (e) => {
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }
          : undefined
      }
      onPointerOut={onClick ? () => (document.body.style.cursor = "") : undefined}
    >
      <mesh geometry={pieceGeometry()} material={material} castShadow receiveShadow />
      <mesh
        position={[0, FACE_Y, 0.02]}
        rotation={[-Math.PI / 2 - SLOPE, 0, 0]}
        material={faceMaterial(type, side)}
        raycast={() => null}
      >
        <planeGeometry args={[WIDTH * 0.94, LENGTH * 0.9]} />
      </mesh>
      {selected && (
        <pointLight position={[0, 0.8, 0]} intensity={1.6} distance={2.2} color="#ffd98a" />
      )}
    </group>
    </>
  );
}

/** Where the n-th piece of a kind sits on a stand, in world space. */
function standSlot(side: Side, type: UnpromotedType, index: number, count: number): V3 {
  const layout: Record<UnpromotedType, [number, number]> = {
    rook: [-0.95, -0.95],
    bishop: [0.05, -0.95],
    gold: [1.0, -0.95],
    silver: [-0.95, 0.1],
    knight: [0.05, 0.1],
    lance: [1.0, 0.1],
    pawn: [0, 1.05],
  };
  const [bx, bz] = layout[type];
  const spread = type === "pawn" ? Math.min(0.5, 2.4 / Math.max(1, count - 1)) : 0.2;
  const x = bx + (index - (count - 1) / 2) * spread;
  const z = bz + (type === "pawn" ? 0 : index * 0.06);
  const [cx, cy, cz] = STAND_POS[side];
  const flip = side === "sente" ? 1 : -1;
  return [cx + x * flip, cy + index * 0.004, cz + z * flip];
}

/* ---------- board & room ---------- */

function Overlay({ r, c, color, opacity, layer }: { r: number; c: number; color: string; opacity: number; layer: number }) {
  return (
    <mesh
      position={[squareX(c), 0.006 + layer * 0.003, squareZ(r)]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={layer + 1}
      raycast={() => null}
    >
      <planeGeometry args={[SW * 0.97, SH * 0.97]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}

function standShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const shade = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
  shade.addColorStop(0, "rgba(36, 20, 10, 0.62)");
  shade.addColorStop(0.5, "rgba(36, 20, 10, 0.32)");
  shade.addColorStop(1, "rgba(36, 20, 10, 0)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let standShadowMap: THREE.CanvasTexture | null = null;

function Stand({ side, material }: { side: Side; material: THREE.Material }) {
  const [x, y, z] = STAND_POS[side];
  const legH = y - FLOOR_Y - 0.3;
  if (!standShadowMap) standShadowMap = standShadowTexture();
  return (
    <group position={[x, y, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y - y + 0.05, 0]} raycast={() => null}>
        <planeGeometry args={[4.6, 4.2]} />
        <meshBasicMaterial map={standShadowMap} transparent depthWrite={false} />
      </mesh>
      <RoundedBox
        args={[STAND_SIZE, 0.3, STAND_SIZE]}
        radius={0.045}
        smoothness={3}
        position={[0, -0.15, 0]}
        material={material}
        castShadow
        receiveShadow
      />
      <mesh
        position={[0, 0.004, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={standTopMaterial()}
        receiveShadow
        raycast={() => null}
      >
        <planeGeometry args={[STAND_SIZE - 0.28, STAND_SIZE - 0.28]} />
      </mesh>
      {/* raised rim */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * (STAND_SIZE / 2 - 0.05), 0.03, Math.cos(a) * (STAND_SIZE / 2 - 0.05)]}
            rotation={[0, a, 0]}
            material={material}
            castShadow
          >
            <boxGeometry args={[STAND_SIZE, 0.08, 0.1]} />
          </mesh>
        );
      })}
      <mesh position={[0, -0.3 - legH / 2, 0]} material={material} castShadow receiveShadow>
        <boxGeometry args={[STAND_SIZE * 0.55, legH, STAND_SIZE * 0.55]} />
      </mesh>
      <mesh position={[0, -0.3 - legH + 0.06, 0]} material={material} castShadow receiveShadow>
        <boxGeometry args={[STAND_SIZE * 0.85, 0.12, STAND_SIZE * 0.85]} />
      </mesh>
    </group>
  );
}

function CameraRig({ locked, resetToken }: { locked: boolean; resetToken: number }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const fit = () => {
      if (!(camera instanceof THREE.PerspectiveCamera)) return;
      const next = viewFov(CAMERA_FOV);
      if (Math.abs(camera.fov - next) > 0.05) {
        camera.fov = next;
        camera.updateProjectionMatrix();
      }
    };
    camera.position.set(...CAMERA_POSITION);
    fit();
    camera.lookAt(...CAMERA_TARGET);
    if (controls.current) {
      controls.current.target.set(...CAMERA_TARGET);
      controls.current.update();
    }
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [resetToken, camera]);

  return (
    <OrbitControls
      ref={controls}
      enabled={!locked}
      enablePan={false}
      target={CAMERA_TARGET}
      minPolarAngle={0.2}
      maxPolarAngle={1.25}
      minDistance={8}
      maxDistance={56}
      rotateSpeed={0.6}
    />
  );
}

function stature(age: number) {
  if (age < 16) return 0.8;
  if (age < 20) return 0.92;
  if (age > 70) return 0.94;
  return 1;
}

function blurAlpha(alpha: Float32Array, w: number, h: number, radius: number) {
  const tmp = new Float32Array(w * h);
  const div = radius * 2 + 1;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += alpha[y * w + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / div;
      const remove = x - radius;
      const add = x + radius + 1;
      sum -= alpha[y * w + Math.max(0, remove)];
      sum += alpha[y * w + Math.min(w - 1, add)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      alpha[y * w + x] = sum / div;
      const remove = y - radius;
      const add = y + radius + 1;
      sum -= tmp[Math.max(0, remove) * w + x];
      sum += tmp[Math.min(h - 1, add) * w + x];
    }
  }
}

/** Drop the backdrop by flooding in from the edges, so lips and skin that happen to be a similar color stay. */
function cutoutFromImage(image: HTMLImageElement) {
  const src = document.createElement("canvas");
  src.width = image.width;
  src.height = image.height;
  const ctx = src.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  const frame = ctx.getImageData(0, 0, src.width, src.height);
  const data = frame.data;
  const w = src.width;
  const h = src.height;
  const at = (x: number, y: number) => (y * w + x) * 4;
  const isPink = (i: number) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return r > 110 && g < 130 && r > g + 40 && b > g + 18 && b > r * 0.32;
  };
  const backdrop = new Uint8Array(w * h);
  const stack: number[] = [];
  const consider = (x: number, y: number) => {
    const p = y * w + x;
    if (backdrop[p]) return;
    if (!isPink(at(x, y))) return;
    backdrop[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < w; x++) {
    consider(x, 0);
    consider(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    consider(0, y);
    consider(w - 1, y);
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) consider(x - 1, y);
    if (x + 1 < w) consider(x + 1, y);
    if (y > 0) consider(x, y - 1);
    if (y + 1 < h) consider(x, y + 1);
  }

  // Pink spill inside the silhouette (a cheek, a lip) is not backdrop. Paint it back from the nearest real pixel.
  const removed = backdrop.slice();
  for (let y = 0; y < h; y++) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < w; x++) {
      if (!removed[y * w + x]) {
        left = x;
        break;
      }
    }
    for (let x = w - 1; x >= 0; x--) {
      if (!removed[y * w + x]) {
        right = x;
        break;
      }
    }
    if (left < 0 || right <= left) continue;
    for (let x = left; x <= right; x++) {
      const p = y * w + x;
      if (!removed[p]) continue;
      let srcX = -1;
      for (let d = 1; d < 64; d++) {
        if (x - d >= 0 && !removed[y * w + (x - d)]) {
          srcX = x - d;
          break;
        }
        if (x + d < w && !removed[y * w + (x + d)]) {
          srcX = x + d;
          break;
        }
      }
      if (srcX < 0) continue;
      const i = p * 4;
      const s = (y * w + srcX) * 4;
      data[i] = data[s];
      data[i + 1] = data[s + 1];
      data[i + 2] = data[s + 2];
      backdrop[p] = 0;
    }
  }

  const alpha = new Float32Array(w * h);
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (backdrop[p]) continue;
      let fringe = false;
      for (let dy = -2; dy <= 2 && !fringe; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          if (backdrop[ny * w + nx]) {
            fringe = true;
            break;
          }
        }
      }
      const i = p * 4;
      if (fringe && data[i] > data[i + 1] + 8) {
        const toward = data[i + 1];
        data[i] = Math.round(toward + (data[i] - toward) * 0.25);
        data[i + 2] = Math.round(toward + (data[i + 2] - toward) * 0.25);
      }
      alpha[p] = 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  blurAlpha(alpha, w, h, 2);
  blurAlpha(alpha, w, h, 1);
  for (let p = 0; p < w * h; p++) data[p * 4 + 3] = Math.round(Math.min(1, Math.max(0, alpha[p])) * 255);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 8 || !isPink(i)) continue;
      let src = -1;
      for (let d = 1; d < 40; d++) {
        if (x - d >= 0) {
          const s = (y * w + (x - d)) * 4;
          if (data[s + 3] > 8 && !isPink(s)) {
            src = s;
            break;
          }
        }
        if (x + d < w) {
          const s = (y * w + (x + d)) * 4;
          if (data[s + 3] > 8 && !isPink(s)) {
            src = s;
            break;
          }
        }
      }
      if (src < 0) continue;
      data[i] = data[src];
      data[i + 1] = data[src + 1];
      data[i + 2] = data[src + 2];
    }
  }

  if (maxX <= minX || maxY <= minY) return null;
  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  const octx = out.getContext("2d");
  if (!octx) return null;
  ctx.putImageData(frame, 0, 0);
  octx.drawImage(src, minX, minY, cw, ch, 0, 0, cw, ch);
  const texture = new THREE.CanvasTexture(out);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return { texture, aspect: cw / ch, canvas: out };
}

type SeizaCut = { texture: THREE.CanvasTexture; aspect: number; canvas: HTMLCanvasElement };

function useSeizaCutout(src: string) {
  const [cut, setCut] = useState<SeizaCut | null>(null);
  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.onload = () => {
      const next = cutoutFromImage(image);
      if (!alive || !next) {
        next?.texture.dispose();
        return;
      }
      setCut(next);
    };
    image.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  useEffect(() => () => cut?.texture.dispose(), [cut]);
  return cut;
}

function srgbToLinear(channel: number) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * A solid seiza figure. Hair, skin and clothes are colors taken from the portrait.
 * Nothing is a pasted photograph, and the hands stay on the lap, behind the board.
 */
function personVolume(canvas: HTMLCanvasElement, worldW: number, worldH: number) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const geo = new THREE.BufferGeometry();
  if (!ctx || w < 2 || h < 2) return geo;
  const data = ctx.getImageData(0, 0, w, h).data;

  const pigment = (nx: number, ny: number) => {
    const cx = Math.round(nx * (w - 1));
    const cy = Math.round(ny * (h - 1));
    for (let rad = 0; rad < 28; rad++) {
      for (let dy = -rad; dy <= rad; dy++) {
        for (let dx = -rad; dx <= rad; dx++) {
          if (rad > 0 && Math.abs(dx) !== rad && Math.abs(dy) !== rad) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const i = (y * w + x) * 4;
          if (data[i + 3] < 170) continue;
          return [srgbToLinear(data[i]), srgbToLinear(data[i + 1]), srgbToLinear(data[i + 2])];
        }
      }
    }
    return [0.35, 0.28, 0.24];
  };

  const lift = (col: number[], gain: number) => col.map((c) => Math.min(1, c * gain));
  const hair = pigment(0.5, 0.08);
  const skin = lift(pigment(0.5, 0.24), 1.55);
  const cloth = lift(pigment(0.22, 0.46), 1.25);
  let pants = pigment(0.5, 0.92);
  let pantsLum = pants[0] + pants[1] + pants[2];
  for (let ny = 0.78; ny <= 0.96; ny += 0.04) {
    for (let nx = 0.35; nx <= 0.65; nx += 0.1) {
      const sample = pigment(nx, ny);
      const lum = sample[0] + sample[1] + sample[2];
      if (lum < pantsLum) {
        pants = sample;
        pantsLum = lum;
      }
    }
  }
  const lip = skin.map((c) => c * 0.62);
  const sclera = [0.84, 0.8, 0.76];
  const iris = [0.07, 0.045, 0.035];

  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const side: number[] = [];
  const push = (x: number, y: number, z: number, col: number[]) => {
    const idx = positions.length / 3;
    positions.push(x, y, z);
    uvs.push(x / worldW + 0.5, y / worldH + 0.5);
    colors.push(col[0], col[1], col[2]);
    return idx;
  };
  const lit = (col: number[], nx: number, ny: number, nz: number) => {
    const wrap = 0.82 + 0.18 * Math.max(0, nz * 0.65 + ny * 0.35);
    return [col[0] * wrap, col[1] * wrap, col[2] * wrap];
  };

  const addEllipsoid = (
    cx: number,
    cy: number,
    cz: number,
    rx: number,
    ry: number,
    rz: number,
    paint: (nx: number, ny: number, nz: number) => number[],
    stacks = 10,
    slices = 14,
    clip?: (nx: number, ny: number, nz: number) => boolean,
  ) => {
    const grid: number[][] = [];
    for (let iy = 0; iy <= stacks; iy++) {
      const theta = (iy / stacks) * Math.PI;
      const row: number[] = [];
      const st = Math.sin(theta);
      const ct = Math.cos(theta);
      for (let ix = 0; ix <= slices; ix++) {
        const phi = (ix / slices) * Math.PI * 2;
        const cp = Math.cos(phi);
        const sp = Math.sin(phi);
        let nx = (st * cp) / rx;
        let ny = ct / ry;
        let nz = (st * sp) / rz;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl;
        ny /= nl;
        nz /= nl;
        const x = cx + rx * st * cp;
        const y = cy + ry * ct;
        const z = cz + rz * st * sp;
        row.push(push(x, y, z, lit(paint(nx, ny, nz), nx, ny, nz)));
      }
      grid.push(row);
    }
    for (let iy = 0; iy < stacks; iy++) {
      const theta = ((iy + 0.5) / stacks) * Math.PI;
      for (let ix = 0; ix < slices; ix++) {
        const phi = ((ix + 0.5) / slices) * Math.PI * 2;
        const st = Math.sin(theta);
        const ct = Math.cos(theta);
        const sp = Math.sin(phi);
        const cp = Math.cos(phi);
        let nx = (st * cp) / rx;
        let ny = ct / ry;
        let nz = (st * sp) / rz;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl;
        ny /= nl;
        nz /= nl;
        if (clip && !clip(nx, ny, nz)) continue;
        const a = grid[iy][ix];
        const b = grid[iy + 1][ix];
        const c = grid[iy][ix + 1];
        const d = grid[iy + 1][ix + 1];
        side.push(a, c, b, c, d, b);
      }
    }
  };

  const addLimb = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    radius: number,
    col: number[],
  ) => {
    let ax = x1 - x0;
    let ay = y1 - y0;
    let az = z1 - z0;
    const len = Math.hypot(ax, ay, az) || 0.001;
    ax /= len;
    ay /= len;
    az /= len;
    let hx = 0;
    let hy = 1;
    let hz = 0;
    if (Math.abs(ay) > 0.85) {
      hx = 1;
      hy = 0;
    }
    let ux = ay * hz - az * hy;
    let uy = az * hx - ax * hz;
    let uz = ax * hy - ay * hx;
    const ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const vx = ay * uz - az * uy;
    const vy = az * ux - ax * uz;
    const vz = ax * uy - ay * ux;
    const segs = 9;
    const alongN = 5;
    const capN = 3;
    const rows = alongN + capN * 2;
    const grid: number[][] = [];
    for (let i = 0; i <= rows; i++) {
      let along = 0;
      let ring = radius;
      let nAx = 0;
      if (i < capN) {
        const t = (i / capN) * (Math.PI / 2);
        along = -Math.cos(t) * radius;
        ring = Math.sin(t) * radius;
        nAx = -Math.cos(t);
      } else if (i > rows - capN) {
        const t = ((i - (rows - capN)) / capN) * (Math.PI / 2);
        along = len + Math.sin(t) * radius;
        ring = Math.cos(t) * radius;
        nAx = Math.sin(t);
      } else {
        along = ((i - capN) / alongN) * len;
        nAx = 0;
      }
      const nRad = Math.sqrt(Math.max(0, 1 - nAx * nAx));
      const row: number[] = [];
      for (let s = 0; s <= segs; s++) {
        const ang = (s / segs) * Math.PI * 2;
        const c = Math.cos(ang);
        const sn = Math.sin(ang);
        const ox = ux * c + vx * sn;
        const oy = uy * c + vy * sn;
        const oz = uz * c + vz * sn;
        const nx = ox * nRad + ax * nAx;
        const ny = oy * nRad + ay * nAx;
        const nz = oz * nRad + az * nAx;
        const x = x0 + ax * along + ox * ring;
        const y = y0 + ay * along + oy * ring;
        const z = z0 + az * along + oz * ring;
        row.push(push(x, y, z, lit(col, nx, ny, nz)));
      }
      grid.push(row);
    }
    for (let i = 0; i < rows; i++) {
      for (let s = 0; s < segs; s++) {
        const a = grid[i][s];
        const b = grid[i + 1][s];
        const c = grid[i][s + 1];
        const d = grid[i + 1][s + 1];
        side.push(a, c, b, c, d, b);
      }
    }
  };

  const H = worldH;
  const yb = (t: number) => (t - 0.5) * H;
  const headRy = H * 0.105;
  const headRx = headRy * 0.78;
  const headRz = headRy * 0.9;
  const headY = yb(0.875);
  const headZ = -headRz * 0.7;

  const face = (nx: number, ny: number, nz: number) =>
    ny > 0.22 || nz < 0.02 || Math.abs(nx) > 0.78 ? hair : skin;
  addEllipsoid(0, headY, headZ, headRx, headRy, headRz, face, 14, 18);
  addEllipsoid(
    0,
    headY + headRy * 0.06,
    headZ - headRz * 0.08,
    headRx * 1.06,
    headRy * 1.02,
    headRz * 1.08,
    () => hair,
    12,
    16,
    (nx, ny, nz) => ny > 0.05 || nz < 0.18 || Math.abs(nx) > 0.62,
  );
  addEllipsoid(0, headY + headRy * 0.38, headZ + headRz * 0.42, headRx * 0.92, headRy * 0.16, headRz * 0.28, () => hair, 5, 10);
  addEllipsoid(0, headY - headRy * 0.78, headZ + headRz * 0.22, headRx * 0.48, headRy * 0.2, headRz * 0.42, () => skin, 6, 8);

  const eyeY = headY + headRy * 0.04;
  const eyeZ = headZ + headRz * 0.9;
  for (const s of [-1, 1]) {
    addEllipsoid(s * headRx * 0.34, eyeY, eyeZ, headRx * 0.18, headRy * 0.08, headRz * 0.07, () => sclera, 6, 8);
    addEllipsoid(s * headRx * 0.34, eyeY, eyeZ + headRz * 0.05, headRx * 0.08, headRy * 0.08, headRz * 0.045, () => iris, 5, 6);
    addEllipsoid(s * headRx * 0.34, eyeY + headRy * 0.16, eyeZ + headRz * 0.02, headRx * 0.2, headRy * 0.035, headRz * 0.05, () => hair, 3, 6);
    addEllipsoid(s * headRx * 1.02, headY - headRy * 0.02, headZ, headRx * 0.1, headRy * 0.18, headRz * 0.08, () => skin, 6, 8);
  }
  addEllipsoid(0, headY - headRy * 0.12, headZ + headRz * 1.02, headRx * 0.11, headRy * 0.16, headRz * 0.14, () => skin, 6, 8);
  addEllipsoid(0, headY - headRy * 0.42, headZ + headRz * 0.86, headRx * 0.2, headRy * 0.028, headRz * 0.05, () => lip, 3, 8);

  const neckY = headY - headRy * 0.95;
  addEllipsoid(0, neckY, headZ - headRz * 0.05, headRx * 0.38, H * 0.04, headRz * 0.36, () => skin, 6, 10);

  const chestRx = H * 0.125;
  const chestRy = H * 0.145;
  const chestRz = H * 0.058;
  const chestY = yb(0.56);
  const chestZ = -H * 0.1;
  addEllipsoid(0, chestY, chestZ, chestRx * 1.08, chestRy, chestRz, () => cloth, 14, 18);
  addEllipsoid(0, yb(0.4), chestZ - chestRz * 0.2, chestRx * 0.86, H * 0.05, chestRz * 0.9, () => cloth, 8, 14);

  const armR = H * 0.042;
  const thighR = H * 0.058;
  for (const s of [-1, 1]) {
    const shoulderX = s * H * 0.12;
    const elbowX = s * H * 0.145;
    const elbowY = yb(0.43);
    const elbowZ = chestZ;
    const handX = s * H * 0.055;
    const handY = yb(0.3);
    const handZ = chestZ + H * 0.01;
    addLimb(shoulderX, chestY + chestRy * 0.55, chestZ, elbowX, elbowY, elbowZ, armR, cloth);
    addLimb(elbowX, elbowY, elbowZ, handX, handY, handZ, armR * 0.82, cloth);
    addEllipsoid(handX, handY - H * 0.006, handZ + H * 0.008, H * 0.038, H * 0.014, H * 0.024, () => skin, 6, 8);
    const kx = s * H * 0.1;
    const kz = -H * 0.015;
    const kneeYFold = yb(0.2);
    addLimb(s * H * 0.055, yb(0.3), -H * 0.04, kx, kneeYFold, kz, thighR, pants);
    addEllipsoid(kx, kneeYFold + H * 0.005, kz, thighR * 0.86, thighR * 0.55, thighR * 0.72, () => pants, 8, 10);
    addLimb(kx, kneeYFold - H * 0.008, kz - H * 0.02, s * H * 0.04, yb(0.15), -H * 0.13, thighR * 0.65, pants);
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(side);
  geo.addGroup(0, side.length, 1);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function sampleLinear(canvas: HTMLCanvasElement, nx: number, ny: number) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [0.5, 0.4, 0.34];
  const w = canvas.width;
  const h = canvas.height;
  const data = ctx.getImageData(0, 0, w, h).data;
  const cx = Math.round(nx * (w - 1));
  const cy = Math.round(ny * (h - 1));
  for (let rad = 0; rad < 28; rad++) {
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (rad > 0 && Math.abs(dx) !== rad && Math.abs(dy) !== rad) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const i = (y * w + x) * 4;
        if (data[i + 3] < 170) continue;
        return [srgbToLinear(data[i]), srgbToLinear(data[i + 1]), srgbToLinear(data[i + 2])];
      }
    }
  }
  return [0.5, 0.4, 0.34];
}

/** Loads the seiza GLB and tints hair, skin and clothes from the portrait. */
function SeatedOpponent({ person }: { person: Opponent }) {
  const cut = useSeizaCutout(seatedSrc(person));
  const height = 18.4 * stature(person.age);
  const gltf = useGLTF("/models/seiza.glb?v=5");
  const built = useMemo(() => {
    const root = gltf.scene.clone(true);
    const materials: THREE.Material[] = [];
    const tint = cut
      ? {
          hair: sampleLinear(cut.canvas, 0.5, 0.08),
          skin: sampleLinear(cut.canvas, 0.5, 0.24),
          cloth: sampleLinear(cut.canvas, 0.22, 0.46),
          pants: sampleLinear(cut.canvas, 0.5, 0.92),
        }
      : null;
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.raycast = () => null;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      const key = mesh.name === "hair" || mesh.name === "skin" || mesh.name === "cloth" || mesh.name === "pants" ? mesh.name : null;
      const color = key && tint ? tint[key] : null;
      if (color) mat.color.setRGB(color[0], color[1], color[2], THREE.LinearSRGBColorSpace);
      if (mesh.name === "skin") {
        mat.roughness = 0.68;
        mat.metalness = 0;
        mat.envMapIntensity = 0.45;
      } else if (mesh.name === "hair") {
        mat.roughness = 0.52;
        mat.metalness = 0.04;
        mat.envMapIntensity = 0.22;
      } else if (mesh.name === "cloth" || mesh.name === "pants") {
        mat.roughness = 0.9;
        mat.metalness = 0;
        mat.envMapIntensity = 0.14;
      } else {
        mat.envMapIntensity = 0.28;
      }
      materials.push(mat);
    });
    return { root, materials };
  }, [cut, gltf, height]);
  useEffect(
    () => () => {
      built.materials.forEach((material) => material.dispose());
    },
    [built],
  );

  const frontZ = -BOARD_D / 2 - 2.05;
  return <primitive object={built.root} position={[0, FLOOR_Y + 0.34, frontZ]} scale={height} />;
}

/** Cushion under the opponent, with a fan, tea and sweets on the tatami beside them. */
function HostSeat() {
  const built = useMemo(() => {
    const root = new THREE.Group();
    const geos: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];
    const add = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      pos: [number, number, number],
      rot?: [number, number, number],
      scale?: [number, number, number],
    ) => {
      if (!geos.includes(geo)) geos.push(geo);
      if (!mats.includes(mat)) mats.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
      if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.raycast = () => null;
      root.add(mesh);
      return mesh;
    };
    const mat = (color: string, roughness: number, extra?: THREE.MeshStandardMaterialParameters) => {
      const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
      mats.push(material);
      return material;
    };
    const cloth = mat("#7a2a36", 0.94);
    const clothDark = mat("#4e1a22", 0.96);
    const piping = mat("#e4d2b0", 0.82);
    const wood = mat("#5c3b24", 0.72);
    const ceramic = mat("#f3efe6", 0.42, { envMapIntensity: 0.2 });
    const tea = mat("#6e8f38", 0.55);
    const sweetPink = mat("#e7a3b4", 0.7);
    const sweetWhite = mat("#f7f1e4", 0.62);
    const sweetGreen = mat("#8aaa58", 0.68);

    const cushionZ = -1.6;
    add(new THREE.BoxGeometry(7.8, 0.18, 7.8), clothDark, [0, 0.09, cushionZ]);
    add(new THREE.BoxGeometry(7.2, 0.22, 7.2), cloth, [0, 0.26, cushionZ]);
    add(new THREE.BoxGeometry(7.5, 0.05, 0.12), piping, [0, 0.4, cushionZ + 3.55]);
    add(new THREE.BoxGeometry(7.5, 0.05, 0.12), piping, [0, 0.4, cushionZ - 3.55]);
    add(new THREE.BoxGeometry(0.12, 0.05, 7.3), piping, [3.75, 0.4, cushionZ]);
    add(new THREE.BoxGeometry(0.12, 0.05, 7.3), piping, [-3.75, 0.4, cushionZ]);

    const fanPaper = mat("#f7f1df", 0.9, { side: THREE.DoubleSide });
    const fanGroup = new THREE.Group();
    fanGroup.position.set(9.7, 0, -2.15);
    fanGroup.rotation.y = 1.05;
    root.add(fanGroup);
    const sector = new THREE.Shape();
    sector.moveTo(0, 0);
    sector.absarc(0, 0, 2.35, -0.72, 0.72, false);
    sector.lineTo(0, 0);
    const fanGeo = new THREE.ShapeGeometry(sector, 12);
    fanGeo.rotateX(-Math.PI / 2);
    const fanMesh = new THREE.Mesh(fanGeo, fanPaper);
    fanMesh.position.y = 0.07;
    fanMesh.castShadow = true;
    fanMesh.receiveShadow = true;
    fanMesh.raycast = () => null;
    fanGroup.add(fanMesh);
    geos.push(fanGeo);
    const pivot = new THREE.CylinderGeometry(0.1, 0.1, 0.16, 10);
    const pivotMesh = new THREE.Mesh(pivot, wood);
    pivotMesh.position.y = 0.12;
    pivotMesh.castShadow = true;
    pivotMesh.raycast = () => null;
    fanGroup.add(pivotMesh);
    geos.push(pivot);
    for (let i = 0; i < 7; i++) {
      const a = -0.72 + (1.44 * i) / 6;
      const rib = new THREE.BoxGeometry(2.15, 0.03, 0.045);
      const ribMesh = new THREE.Mesh(rib, wood);
      ribMesh.position.set(Math.cos(a) * 1.05, 0.1, -Math.sin(a) * 1.05);
      ribMesh.rotation.y = a;
      ribMesh.castShadow = true;
      ribMesh.raycast = () => null;
      fanGroup.add(ribMesh);
      geos.push(rib);
    }

    const saucer = new THREE.CylinderGeometry(0.78, 0.82, 0.08, 24);
    add(saucer, ceramic, [8.55, 0.07, -1.7]);
    const cup = new THREE.CylinderGeometry(0.42, 0.34, 0.92, 24);
    add(cup, ceramic, [8.55, 0.52, -1.7]);
    const surface = new THREE.CircleGeometry(0.36, 20);
    add(surface, tea, [8.55, 0.95, -1.7], [-Math.PI / 2, 0, 0]);

    const plate = new THREE.CylinderGeometry(1.15, 1.18, 0.08, 28);
    add(plate, ceramic, [8.35, 0.07, -3.7]);
    const sweet = new THREE.SphereGeometry(0.34, 16, 12);
    add(sweet, sweetPink, [7.95, 0.26, -4.0], undefined, [1, 0.62, 1]);
    add(sweet, sweetWhite, [8.7, 0.26, -3.95], undefined, [1, 0.58, 1]);
    add(sweet, sweetGreen, [8.35, 0.26, -3.35], undefined, [1.05, 0.6, 1.05]);

    return { root, geos, mats };
  }, [7]);
  useEffect(
    () => () => {
      built.geos.forEach((geo) => geo.dispose());
      built.mats.forEach((material) => material.dispose());
    },
    [built],
  );
  const frontZ = -BOARD_D / 2 - 2.05;
  return <primitive object={built.root} position={[0, FLOOR_Y, frontZ]} />;
}

useGLTF.preload("/models/seiza.glb?v=5");

function TatamiFloor({ material }: { material: THREE.Material }) {
  const geo = useMemo(() => {
    const surface = new THREE.PlaneGeometry(MAT_W, MAT_D);
    surface.setAttribute("uv2", surface.attributes.uv);
    return surface;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      {tatamiX.flatMap((x) =>
        tatamiZ.map((z) => (
          <group key={`${x}${z}`} position={[x, FLOOR_Y, z]}>
            <mesh position={[0, -0.04, 0]} receiveShadow>
              <boxGeometry args={[MAT_W + 0.04, 0.08, MAT_D + 0.04]} />
              <meshStandardMaterial color="#241c14" roughness={0.92} metalness={0} />
            </mesh>
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo} material={material} receiveShadow />
          </group>
        )),
      )}
    </group>
  );
}

/** A window of garden light. Kept weak so it does not wash the sun's shadows off the board. */
function Daylight() {
  const opening = useRef<THREE.RectAreaLight>(null);
  useLayoutEffect(() => {
    opening.current?.lookAt(0, 0.2, 8);
  }, []);
  return <rectAreaLight ref={opening} position={[0, 7.6, -13.4]} width={17} height={8} intensity={0.45} color="#fff4e2" />;
}

function Scene({
  board,
  hands,
  selected,
  selectedDrop,
  targets,
  lastMove,
  canDrop,
  goteDrop = false,
  across,
  onSquareClick,
  onHandClick,
  locked,
  resetToken,
}: Shogi3DBoardProps & { locked: boolean; resetToken: number }) {
  const mats = useMemo(() => {
    const weaveNormal = normalTexture("weave");
    weaveNormal.repeat.set(1, 10);
    const top = new THREE.MeshPhysicalMaterial({
      map: boardTopTexture(),
      roughness: 0.46,
      metalness: 0.02,
      clearcoat: 0.22,
      clearcoatRoughness: 0.38,
      envMapIntensity: 0.45,
    });
    const side = new THREE.MeshPhysicalMaterial({
      map: woodTexture("#d9ab62", "#7a4a1c", 5, 60),
      roughness: 0.42,
      metalness: 0.03,
      clearcoat: 0.24,
      envMapIntensity: 0.35,
    });
    const piece = new THREE.MeshPhysicalMaterial({
      map: woodTexture("#efd29a", "#a8793e", 17, 50),
      roughness: 0.34,
      metalness: 0.04,
      clearcoat: 0.38,
      clearcoatRoughness: 0.28,
      envMapIntensity: 0.5,
    });
    const stand = new THREE.MeshPhysicalMaterial({
      map: standWoodTexture(),
      color: "#ffffff",
      roughness: 0.62,
      roughnessMap: softRoughness(17),
      metalness: 0,
      clearcoat: 0.04,
      clearcoatRoughness: 0.7,
      envMapIntensity: 0.22,
    });
    const leg = new THREE.MeshPhysicalMaterial({
      color: "#c7954e",
      roughness: 0.52,
      metalness: 0.02,
      clearcoat: 0.08,
      envMapIntensity: 0.18,
    });
    const tatami = new THREE.MeshStandardMaterial({
      map: tatamiTexture(),
      normalMap: weaveNormal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughness: 0.9,
      roughnessMap: softRoughness(21),
      metalness: 0,
      envMapIntensity: 0.1,
    });
    return { top, side, piece, stand, leg, tatami };
  }, []);

  useEffect(() => {
    let alive = true;
    const swap = (material: THREE.MeshStandardMaterial, map: THREE.Texture) => {
      const previous = material.map;
      material.map = map;
      material.needsUpdate = true;
      if (previous && previous !== map) previous.dispose();
    };
    (async () => {
      try {
        const [tatami, edge] = await Promise.all([
          loadImage("/textures/tatami.png"),
          loadImage("/textures/board-edge.png"),
        ]);
        if (!alive) return;
        const tatamiMap = photoTexture(tatami);
        tatamiMap.wrapS = THREE.RepeatWrapping;
        tatamiMap.wrapT = THREE.RepeatWrapping;
        tatamiMap.repeat.set(1, 1);
        const edgeMap = photoTexture(edge, 0.72);
        edgeMap.wrapS = THREE.RepeatWrapping;
        edgeMap.wrapT = THREE.RepeatWrapping;
        const legMap = edgeMap.clone();
        applyLuxuryWood(mats);
        const standMap = standWoodTexture();
        const standNormal = normalTexture("fine");
        standNormal.repeat.set(1.6, 3);
        mats.stand.color.set("#ffffff");
        mats.stand.roughness = 0.64;
        mats.stand.roughnessMap = softRoughness(17);
        mats.stand.clearcoat = 0.03;
        mats.stand.clearcoatRoughness = 0.74;
        mats.stand.normalMap = standNormal;
        mats.stand.normalScale.set(0.05, 0.05);
        mats.stand.envMapIntensity = 0.18;
        swap(mats.stand, standMap);
        mats.leg.color.set("#ffffff");
        swap(mats.leg, legMap);
        swap(mats.tatami, tatamiMap);
      } catch {
        /* The drawn wood and tatami stay up if a photo is missing. */
      }
    })();
    return () => {
      alive = false;
    };
  }, [mats]);

  applyLuxuryWood(mats);
  if (mats.top.userData.lightRev !== 1) {
    mats.top.roughness = 0.38;
    mats.top.clearcoat = 0.1;
    mats.top.clearcoatRoughness = 0.55;
    mats.top.envMapIntensity = 0.42;
    mats.side.envMapIntensity = 0.18;
    mats.piece.roughness = 0.86;
    mats.piece.envMapIntensity = 0.08;
    mats.piece.specularIntensity = 0.2;
    mats.piece.needsUpdate = true;
    mats.top.needsUpdate = true;
    mats.side.needsUpdate = true;
    mats.top.userData.lightRev = 1;
  }
  if (mats.stand.userData.standRev !== STAND_LOOK) {
    const previous = mats.stand.map;
    const standMap = standWoodTexture();
    const standNormal = normalTexture("fine");
    standNormal.repeat.set(1.6, 3);
    mats.stand.map = standMap;
    mats.stand.color.set("#ffffff");
    mats.stand.roughness = 0.64;
    mats.stand.roughnessMap = softRoughness(17);
    mats.stand.clearcoat = 0.03;
    mats.stand.clearcoatRoughness = 0.74;
    mats.stand.normalMap = standNormal;
    mats.stand.normalScale.set(0.05, 0.05);
    mats.stand.envMapIntensity = 0.18;
    mats.stand.needsUpdate = true;
    mats.stand.userData.standRev = STAND_LOOK;
    if (previous && previous !== standMap) previous.dispose();
  }
  if (mats.tatami.userData.fiberRev !== 1) {
    mats.tatami.roughness = 0.9;
    mats.tatami.roughnessMap = softRoughness(21);
    mats.tatami.normalScale.set(0.4, 0.4);
    mats.tatami.envMapIntensity = 0.1;
    mats.tatami.metalness = 0;
    mats.tatami.needsUpdate = true;
    mats.tatami.userData.fiberRev = 1;
  }

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => {
        (m as THREE.MeshStandardMaterial).map?.dispose();
        m.dispose();
      });
      document.body.style.cursor = "";
    },
    [mats],
  );

  const leg = useMemo(() => legGeometry(), []);
  useEffect(() => () => leg.dispose(), [leg]);

  const moveId = lastMove ? `${lastMove.from ? `${lastMove.from.r}${lastMove.from.c}` : "d"}${lastMove.to.r}${lastMove.to.c}` : "none";

  // Where the last-moved piece should animate from (a square, or the stand for drops).
  const animFrom = (r: number, c: number, type: PieceType, side: Side): V3 | null => {
    if (!lastMove || lastMove.to.r !== r || lastMove.to.c !== c) return null;
    if (lastMove.from) return [squareX(lastMove.from.c), 0, squareZ(lastMove.from.r)];
    const base = BASE_TYPE[type];
    if (base === "king") return null;
    return standSlot(side, base, hands[side][base], hands[side][base] + 1);
  };

  const click = (coord: Coord) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSquareClick(coord);
  };

  const opponentMove = lastMove?.by === "gote";

  return (
    <>
      <color attach="background" args={["#d5ddd4"]} />
      <fog attach="fog" args={["#d5ddd4", 62, 148]} />
      <hemisphereLight args={["#fff8ee", "#6a7460", 0.32]} />
      <Daylight />
      <directionalLight
        position={[14, 9.2, -24]}
        intensity={4.2}
        color="#fff4d8"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={96}
        shadow-bias={-0.0002}
        shadow-normalBias={0.015}
        shadow-radius={2}
      />
      <directionalLight position={[0, 18, 4]} intensity={0.22} color="#fff8ef" />
      <Environment files="/hdri/interior.hdr" environmentIntensity={0.22} />

      <TatamiFloor material={mats.tatami} />
      <Washitsu floorY={FLOOR_Y} />
      <Garden floorY={FLOOR_Y} />

      {/* board */}
      <RoundedBox
        args={[BOARD_W, BOARD_THICK, BOARD_D]}
        radius={0.07}
        smoothness={3}
        position={[0, -BOARD_THICK / 2, 0]}
        material={mats.side}
        castShadow
        receiveShadow
      />
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.top} receiveShadow>
        <planeGeometry args={[BOARD_W - 0.06, BOARD_D - 0.06]} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            geometry={leg}
            material={mats.leg}
            position={[sx * (BOARD_W / 2 - 1.4), FLOOR_Y, sz * (BOARD_D / 2 - 1.5)]}
            castShadow
          />
        )),
      )}

      {/* click targets */}
      {Array.from({ length: 81 }, (_, i) => {
        const r = Math.floor(i / 9);
        const c = i % 9;
        return (
          <mesh
            key={i}
            position={[squareX(c), 0.004, squareZ(r)]}
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={click({ r, c })}
          >
            <planeGeometry args={[SW, SH]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        );
      })}

      {/* highlights */}
      {lastMove?.from && (
        <Overlay
          r={lastMove.from.r}
          c={lastMove.from.c}
          color={opponentMove ? "#4a8ae0" : "#d49a3a"}
          opacity={opponentMove ? 0.3 : 0.22}
          layer={0}
        />
      )}
      {lastMove && (
        <Overlay
          r={lastMove.to.r}
          c={lastMove.to.c}
          color={opponentMove ? "#3d7ad4" : "#d49a3a"}
          opacity={opponentMove ? 0.5 : 0.3}
          layer={0}
        />
      )}
      {selected && <Overlay r={selected.r} c={selected.c} color="#e07a30" opacity={0.45} layer={1} />}
      {targets.map((t) => {
        const occupied = Boolean(board[t.r][t.c]);
        return (
          <mesh
            key={`t-${t.r}-${t.c}`}
            position={[squareX(t.c), 0.02, squareZ(t.r)]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={4}
            raycast={() => null}
          >
            {occupied ? <ringGeometry args={[0.4, 0.48, 40]} /> : <circleGeometry args={[0.11, 32]} />}
            <meshBasicMaterial
              color="#1f6a3a"
              transparent
              opacity={0.8}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-4}
            />
          </mesh>
        );
      })}

      {/* pieces on the board */}
      {board.map((row, r) =>
        row.map((piece, c) => {
          if (!piece) return null;
          const from = animFrom(r, c, piece.type, piece.side);
          return (
            <Piece3D
              key={`${r}-${c}-${piece.side}${piece.type}${from ? moveId : ""}`}
              type={piece.type}
              side={piece.side}
              target={[squareX(c), 0, squareZ(r)]}
              from={from}
              selected={Boolean(selected && selected.r === r && selected.c === c)}
              material={mats.piece}
              onClick={click({ r, c })}
            />
          );
        }),
      )}

      {/* stands and pieces in hand */}
      {(["sente", "gote"] as Side[]).map((side) => (
        <group key={side}>
          <Stand side={side} material={mats.stand} />
          {HAND_ORDER.flatMap((type) => {
            const count = hands[side][type];
            return Array.from({ length: count }, (_, i) => {
              const target = standSlot(side, type, i, count);
              const interactive = (side === "sente" && canDrop) || (side === "gote" && goteDrop);
              return (
                <Piece3D
                  key={`${side}-${type}-${i}`}
                  type={type}
                  side={side}
                  target={target}
                  from={[target[0], target[1] + 1.4, target[2]]}
                  selected={interactive && selectedDrop === type && i === count - 1}
                  material={mats.piece}
                  onClick={
                    interactive
                      ? (e) => {
                          e.stopPropagation();
                          onHandClick(type);
                        }
                      : undefined
                  }
                />
              );
            });
          })}
        </group>
      ))}

      <Suspense fallback={null}>
        <SeatedOpponent person={across} />
        <HostSeat key="seat-7" />
      </Suspense>

      <ContactShadows position={[0, FLOOR_Y + 0.02, 0]} opacity={0.42} scale={30} blur={2.2} far={4} color="#3a2a1c" />
      <CinematicGrade />
      <CameraRig locked={locked} resetToken={resetToken} />
    </>
  );
}

export default function Shogi3DBoard(props: Shogi3DBoardProps) {
  const [locked, setLocked] = useState(true);
  const [resetToken, setResetToken] = useState(0);

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
        gl={{
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.38,
          outputColorSpace: THREE.SRGBColorSpace,
          powerPreference: "high-performance",
        }}
      >
        <Scene {...props} locked={locked} resetToken={resetToken} />
      </Canvas>

      <div className="absolute right-2 bottom-2 flex gap-1.5 sm:bottom-3 sm:left-3 sm:right-auto sm:gap-2">
        <button
          type="button"
          aria-pressed={locked}
          onClick={() => setLocked((v) => !v)}
          className={[
            "border px-3 py-1 text-[11px] tracking-widest backdrop-blur-sm transition",
            locked
              ? "border-[#e6cf94]/70 bg-[#b0874a]/30 text-[#f3e3b8]"
              : "border-[#d4b896]/30 bg-black/40 text-[#d4b896]/80 hover:text-[#f0e2c8]",
          ].join(" ")}
        >
          {locked ? "視点固定中" : "視点を固定"}
        </button>
        <button
          type="button"
          onClick={() => setResetToken((n) => n + 1)}
          className="border border-[#d4b896]/30 bg-black/40 px-3 py-1 text-[11px] tracking-widest text-[#d4b896]/80 backdrop-blur-sm transition hover:text-[#f0e2c8]"
        >
          視点リセット
        </button>
      </div>
      <p className="pointer-events-none absolute right-3 bottom-4 hidden text-[10px] tracking-widest text-[#d4b896]/45 sm:block">
        {locked ? "固定を外すとドラッグで視点を回せます" : "ドラッグで視点回転・ホイールで拡大縮小"}
      </p>
    </div>
  );
}
