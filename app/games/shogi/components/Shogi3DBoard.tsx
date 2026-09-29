"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react";
import * as THREE from "three";
import type { Opponent } from "@/lib/shogi/career";
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
const CAMERA_POSITION: V3 = [0, 17.6, 16.9];
const CAMERA_TARGET: V3 = [0, 2.2, -1.4];

const PIECE_THICK = 0.3;
const BEVEL = 0.08;
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

const FONT =
  '"HG行書体", "HGGyoshotai", "HG正楷書体-PRO", "HGSeikaishotaiPRO", "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", serif';

/* ---------- textures ---------- */

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

function boardTopTexture() {
  const w = 1024;
  const h = Math.round((w * BOARD_D) / BOARD_W);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#ecc986");
  g.addColorStop(0.5, "#e3bb72");
  g.addColorStop(1, "#d8ab60");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h, "#8a5a24", 220, 7);

  const px = w / BOARD_W;
  const left = (BOARD_W / 2 - 4.5 * SW) * px;
  const top = (BOARD_D / 2 - 4.5 * SH) * px;
  ctx.strokeStyle = "#2a1a0c";
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2.2;
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
  ctx.lineWidth = 3.5;
  ctx.strokeRect(left, top, 9 * SW * px, 9 * SH * px);
  ctx.fillStyle = "#2a1a0c";
  for (const [i, j] of [[3, 3], [6, 3], [3, 6], [6, 6]]) {
    ctx.beginPath();
    ctx.arc(left + i * SW * px, top + j * SH * px, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
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
  tex.repeat.set(5, 2.5);
  return tex;
}

const faceCache = new Map<string, THREE.MeshStandardMaterial>();

function faceMaterial(type: PieceType, side: Side) {
  const face = type === "king" && side === "gote" ? { text: "王", red: false } : FACE[type];
  const key = `${face.text}-${face.red}`;
  let mat = faceCache.get(key);
  if (!mat) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 300;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = face.red ? "#a3140f" : "#140a04";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${face.text === "と" ? 190 : 200}px ${FONT}`;
    ctx.fillText(face.text, 128, 168);
    const map = canvasTexture(canvas);
    mat = new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      roughness: 0.35,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    faceCache.set(key, mat);
  }
  return mat;
}

/* ---------- geometry ---------- */

let pieceGeo: THREE.BufferGeometry | null = null;
const LENGTH = SH * 0.9;
const WIDTH = SW * 0.84;
const SLOPE = Math.atan(((1 - TIP_RATIO) * PIECE_THICK * (1 + 2 * BEVEL)) / LENGTH);

/** Pentagonal wedge: thicker at the base, pointing to -z. */
function pieceGeometry() {
  if (pieceGeo) return pieceGeo;
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
    bevelSize: 0.035,
    bevelSegments: 3,
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

  return (
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
        <planeGeometry args={[WIDTH * 0.8, LENGTH * 0.78]} />
      </mesh>
      {selected && (
        <pointLight position={[0, 0.8, 0]} intensity={1.6} distance={2.2} color="#ffd98a" />
      )}
    </group>
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

function Stand({ side, material }: { side: Side; material: THREE.Material }) {
  const [x, y, z] = STAND_POS[side];
  const legH = y - FLOOR_Y - 0.3;
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, -0.15, 0]} material={material} castShadow receiveShadow>
        <boxGeometry args={[STAND_SIZE, 0.3, STAND_SIZE]} />
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
      <mesh position={[0, -0.3 - legH / 2, 0]} material={material} castShadow>
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
    camera.position.set(...CAMERA_POSITION);
    if (!controls.current) return;
    controls.current.target.set(...CAMERA_TARGET);
    controls.current.update();
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

/** Board width stands in for a 38cm board, so the sitter matches a real person. */
const cm = (n: number) => (n * BOARD_W) / 38;

const SKIN = ["#f0c7a4", "#d9a67e", "#b8835c"];
const HAIR_COLOR: Record<Opponent["hair"], string> = {
  short: "#1a120e",
  long: "#24160f",
  gray: "#8a8680",
  white: "#f2efe6",
  bald: "#c9a07a",
};
const CLOTH: Record<Opponent["outfit"], { main: string; dark: string; accent: string; collar: string }> = {
  kimono: { main: "#3c2618", dark: "#24150e", accent: "#1a2744", collar: "#f3ecdf" },
  suit: { main: "#2c3548", dark: "#1a2030", accent: "#8d1e22", collar: "#f6f2ea" },
  jacket: { main: "#314438", dark: "#1c2822", accent: "#1d4a34", collar: "#f4f0e6" },
};

function stature(age: number) {
  if (age < 16) return 0.8;
  if (age < 20) return 0.92;
  if (age > 70) return 0.94;
  return 1;
}

function limbPose(from: V3, to: V3, radius: number) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const length = dir.length();
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return { position: mid.toArray() as V3, quaternion, shaft: length + radius * 0.35 };
}

function Limb({
  from,
  to,
  radius,
  material,
}: {
  from: V3;
  to: V3;
  radius: number;
  material: THREE.Material;
}) {
  const pose = useMemo(() => limbPose(from, to, radius), [from, to, radius]);
  return (
    <mesh position={pose.position} quaternion={pose.quaternion} material={material} castShadow receiveShadow raycast={() => null}>
      <cylinderGeometry args={[radius, radius * 0.92, pose.shaft, 10]} />
    </mesh>
  );
}

function Solid({
  position,
  rotation,
  scale,
  material,
  children,
}: {
  position?: V3;
  rotation?: V3;
  scale?: V3;
  material: THREE.Material;
  children: ReactNode;
}) {
  return (
    <mesh position={position} rotation={rotation} scale={scale} material={material} castShadow receiveShadow raycast={() => null}>
      {children}
    </mesh>
  );
}

/** A person kneeling in seiza just past the far edge, at the same scale as the board. */
function SeatedOpponent({ person }: { person: Opponent }) {
  const mats = useMemo(() => {
    const cloth = CLOTH[person.outfit];
    const skin = new THREE.MeshStandardMaterial({ color: SKIN[person.skin], roughness: 0.58 });
    const hair = new THREE.MeshStandardMaterial({ color: HAIR_COLOR[person.hair], roughness: 0.72 });
    const robe = new THREE.MeshStandardMaterial({ color: cloth.main, roughness: 0.86 });
    const robeDark = new THREE.MeshStandardMaterial({ color: cloth.dark, roughness: 0.9 });
    const accent = new THREE.MeshStandardMaterial({ color: cloth.accent, roughness: 0.8 });
    const collar = new THREE.MeshStandardMaterial({ color: cloth.collar, roughness: 0.7 });
    const eye = new THREE.MeshStandardMaterial({ color: "#f7f4ee", roughness: 0.35 });
    const pupil = new THREE.MeshStandardMaterial({ color: "#1a120c", roughness: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: "#d9d3c4", roughness: 0.22, metalness: 0.65 });
    const tabi = new THREE.MeshStandardMaterial({ color: "#f3efe6", roughness: 0.8 });
    const cushion = new THREE.MeshStandardMaterial({ color: "#6e2430", roughness: 0.92 });
    return { skin, hair, robe, robeDark, accent, collar, eye, pupil, glass, tabi, cushion };
  }, [person]);

  useEffect(
    () => () => {
      Object.values(mats).forEach((material) => material.dispose());
    },
    [mats],
  );

  const beard = person.age >= 65 ? "#d5d0c6" : HAIR_COLOR[person.hair];
  const beardMat = useMemo(() => new THREE.MeshStandardMaterial({ color: beard, roughness: 0.8 }), [beard]);
  useEffect(() => () => beardMat.dispose(), [beardMat]);

  const arm = cm(5);
  const shoulder: V3[] = [
    [cm(12), cm(55), -cm(18)],
    [-cm(12), cm(55), -cm(18)],
  ];
  const elbow: V3[] = [
    [cm(22), cm(38), -cm(12)],
    [-cm(22), cm(38), -cm(12)],
  ];
  const wrist: V3[] = [
    [cm(10), cm(17), -cm(6)],
    [-cm(10), cm(17), -cm(6)],
  ];

  return (
    <group position={[0, FLOOR_Y, -BOARD_D / 2 - cm(2)]} scale={stature(person.age) * 0.52}>
      <Solid position={[0, cm(0.6), -cm(18)]} material={mats.cushion}>
        <boxGeometry args={[cm(46), cm(1.2), cm(40)]} />
      </Solid>

      {/* calves folded under, then thighs — a low mound, not a pedestal */}
      <Solid position={[0, cm(6.5), -cm(18)]} scale={[1.35, 0.32, 1.05]} material={mats.robeDark}>
        <sphereGeometry args={[cm(16), 22, 14]} />
      </Solid>
      <Solid position={[0, cm(11), -cm(2)]} rotation={[0, 0, Math.PI / 2]} material={mats.robe}>
        <capsuleGeometry args={[cm(6.5), cm(30), 5, 12]} />
      </Solid>
      <Solid position={[cm(7), cm(3), -cm(34)]} rotation={[0.8, 0.15, 0]} scale={[0.9, 0.45, 1.5]} material={mats.tabi}>
        <sphereGeometry args={[cm(3.8), 12, 10]} />
      </Solid>
      <Solid position={[-cm(7), cm(3), -cm(34)]} rotation={[0.8, -0.15, 0]} scale={[0.9, 0.45, 1.5]} material={mats.tabi}>
        <sphereGeometry args={[cm(3.8), 12, 10]} />
      </Solid>

      <Solid position={[0, cm(14), -cm(14)]} scale={[1.45, 0.28, 1]} material={mats.robe}>
        <sphereGeometry args={[cm(15), 22, 14]} />
      </Solid>
      {person.outfit === "kimono" ? (
        <Solid position={[0, cm(20), -cm(16)]} material={mats.accent}>
          <boxGeometry args={[cm(26), cm(3.4), cm(16)]} />
        </Solid>
      ) : null}

      <Solid position={[0, cm(46), -cm(20)]} material={mats.robe}>
        <capsuleGeometry args={[cm(10.5), cm(22), 6, 14]} />
      </Solid>
      <Solid position={[0, cm(57), -cm(20)]} scale={[1.2, 0.55, 0.72]} material={mats.robe}>
        <sphereGeometry args={[cm(14), 20, 14]} />
      </Solid>

      <Limb from={shoulder[0]} to={elbow[0]} radius={arm} material={mats.robe} />
      <Limb from={shoulder[1]} to={elbow[1]} radius={arm} material={mats.robe} />
      <Limb from={elbow[0]} to={wrist[0]} radius={arm * 0.82} material={mats.robe} />
      <Limb from={elbow[1]} to={wrist[1]} radius={arm * 0.82} material={mats.robe} />
      <Solid position={wrist[0]} scale={[1.2, 0.45, 1.55]} rotation={[0.6, 0.35, 0.2]} material={mats.skin}>
        <sphereGeometry args={[cm(3.4), 14, 12]} />
      </Solid>
      <Solid position={wrist[1]} scale={[1.2, 0.45, 1.55]} rotation={[0.6, -0.35, -0.2]} material={mats.skin}>
        <sphereGeometry args={[cm(3.4), 14, 12]} />
      </Solid>

      <group position={[0, cm(66), -cm(18)]} rotation={[-0.18, 0, 0]}>
        <Solid position={[0, cm(6), cm(1)]} material={mats.skin}>
          <cylinderGeometry args={[cm(4.2), cm(5), cm(7), 12]} />
        </Solid>
        <Solid position={[0, cm(16), cm(2)]} scale={[1, 1.12, 0.95]} material={mats.skin}>
          <sphereGeometry args={[cm(8.2), 28, 20]} />
        </Solid>
        <Solid position={[cm(8.4), cm(16), cm(1.2)]} scale={[0.45, 0.85, 0.55]} material={mats.skin}>
          <sphereGeometry args={[cm(3.4), 12, 10]} />
        </Solid>
        <Solid position={[-cm(8.4), cm(16), cm(1.2)]} scale={[0.45, 0.85, 0.55]} material={mats.skin}>
          <sphereGeometry args={[cm(3.4), 12, 10]} />
        </Solid>

        {person.hair !== "bald" && (
          <Solid position={[0, cm(19.5), cm(1.2)]} material={mats.hair}>
            <sphereGeometry args={[cm(8.7), 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
          </Solid>
        )}
        {person.hair !== "bald" && person.hair !== "long" && (
          <Solid position={[0, cm(20.5), cm(6.2)]} scale={[1.15, 0.4, 0.65]} material={mats.hair}>
            <sphereGeometry args={[cm(5.8), 14, 10]} />
          </Solid>
        )}
        {person.hair === "bald" && (
          <Solid position={[0, cm(16), -cm(4)]} material={mats.hair}>
            <sphereGeometry args={[cm(8.4), 16, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.4]} />
          </Solid>
        )}
        {person.hair === "long" && (
          <>
            <Limb from={[cm(7.5), cm(16), cm(1)]} to={[cm(9), cm(-2), -cm(1)]} radius={cm(2.2)} material={mats.hair} />
            <Limb from={[-cm(7.5), cm(16), cm(1)]} to={[-cm(9), cm(-2), -cm(1)]} radius={cm(2.2)} material={mats.hair} />
          </>
        )}

        <Solid position={[cm(3.1), cm(17.2), cm(9.2)]} scale={[1, 0.72, 0.55]} material={mats.eye}>
          <sphereGeometry args={[cm(1.35), 12, 10]} />
        </Solid>
        <Solid position={[-cm(3.1), cm(17.2), cm(9.2)]} scale={[1, 0.72, 0.55]} material={mats.eye}>
          <sphereGeometry args={[cm(1.35), 12, 10]} />
        </Solid>
        <Solid position={[cm(3.1), cm(17.1), cm(10)]} material={mats.pupil}>
          <sphereGeometry args={[cm(0.62), 10, 8]} />
        </Solid>
        <Solid position={[-cm(3.1), cm(17.1), cm(10)]} material={mats.pupil}>
          <sphereGeometry args={[cm(0.62), 10, 8]} />
        </Solid>
        <Limb from={[cm(5.2), cm(19.4), cm(8.6)]} to={[cm(1.3), cm(18.8), cm(8.8)]} radius={cm(0.28)} material={mats.pupil} />
        <Limb from={[-cm(5.2), cm(19.4), cm(8.6)]} to={[-cm(1.3), cm(18.8), cm(8.8)]} radius={cm(0.28)} material={mats.pupil} />
        <Solid position={[0, cm(15.2), cm(9.6)]} scale={[0.7, 0.85, 1]} material={mats.skin}>
          <sphereGeometry args={[cm(1.15), 10, 8]} />
        </Solid>
        <Solid position={[0, cm(13.2), cm(9.2)]} rotation={[0, 0, 0]} scale={[1.8, 0.35, 0.4]} material={mats.pupil}>
          <sphereGeometry args={[cm(1.1), 10, 8]} />
        </Solid>

        {person.beard !== "none" && (
          <Solid
            position={[0, person.beard === "full" ? cm(11) : cm(12.6), cm(7.5)]}
            scale={person.beard === "full" ? [1.15, 1.05, 0.75] : [0.85, 0.45, 0.5]}
            material={beardMat}
          >
            <sphereGeometry args={[person.beard === "full" ? cm(6.2) : cm(4.2), 14, 12]} />
          </Solid>
        )}

        {person.glasses && (
          <>
            <Solid position={[cm(3.1), cm(17.2), cm(10.1)]} material={mats.glass}>
              <torusGeometry args={[cm(2.15), cm(0.16), 8, 18]} />
            </Solid>
            <Solid position={[-cm(3.1), cm(17.2), cm(10.1)]} material={mats.glass}>
              <torusGeometry args={[cm(2.15), cm(0.16), 8, 18]} />
            </Solid>
            <Solid position={[0, cm(17.2), cm(10)]} rotation={[0, 0, Math.PI / 2]} material={mats.glass}>
              <cylinderGeometry args={[cm(0.12), cm(0.12), cm(2.2), 6]} />
            </Solid>
          </>
        )}
      </group>
    </group>
  );
}

function Scene({
  board,
  hands,
  selected,
  selectedDrop,
  targets,
  lastMove,
  canDrop,
  across,
  onSquareClick,
  onHandClick,
  locked,
  resetToken,
}: Shogi3DBoardProps & { locked: boolean; resetToken: number }) {
  const mats = useMemo(() => {
    const top = new THREE.MeshPhysicalMaterial({
      map: boardTopTexture(),
      roughness: 0.42,
      clearcoat: 0.35,
      clearcoatRoughness: 0.35,
    });
    const side = new THREE.MeshPhysicalMaterial({
      map: woodTexture("#d9ab62", "#7a4a1c", 5, 60),
      roughness: 0.45,
      clearcoat: 0.3,
    });
    const piece = new THREE.MeshPhysicalMaterial({
      map: woodTexture("#efd29a", "#a8793e", 17, 50),
      roughness: 0.38,
      clearcoat: 0.55,
      clearcoatRoughness: 0.25,
    });
    const stand = new THREE.MeshPhysicalMaterial({
      map: woodTexture("#7a3f1c", "#2e1408", 23),
      roughness: 0.35,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
    });
    const leg = new THREE.MeshPhysicalMaterial({ color: "#c7954e", roughness: 0.45, clearcoat: 0.3 });
    const tatami = new THREE.MeshStandardMaterial({ map: tatamiTexture(), roughness: 0.95 });
    return { top, side, piece, stand, leg, tatami };
  }, []);

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
      <color attach="background" args={["#140d08"]} />
      <fog attach="fog" args={["#140d08", 55, 120]} />
      <ambientLight intensity={0.48} color="#ffe8cc" />
      <directionalLight
        position={[-10, 32, 16]}
        intensity={2.4}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.0004}
      />
      <pointLight position={[6, 8, 6]} intensity={18} color="#ffc98a" distance={40} />
      <pointLight position={[0, 16, -4]} intensity={28} color="#fff4e2" distance={36} />
      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} color="#fff4e0" />
        <Lightformer intensity={1.3} position={[-9, 4, 0]} rotation-y={Math.PI / 2} scale={[12, 4, 1]} color="#ffe6c0" />
        <Lightformer intensity={0.9} position={[9, 4, 0]} rotation-y={-Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer intensity={0.8} position={[0, 3, 12]} scale={[14, 3, 1]} />
      </Environment>

      {/* tatami */}
      <mesh position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.tatami} receiveShadow>
        <planeGeometry args={[90, 90]} />
      </mesh>

      {/* board */}
      <mesh position={[0, -BOARD_THICK / 2, 0]} material={mats.side} castShadow receiveShadow>
        <boxGeometry args={[BOARD_W, BOARD_THICK, BOARD_D]} />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.top} receiveShadow>
        <planeGeometry args={[BOARD_W, BOARD_D]} />
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
              const interactive = side === "sente" && canDrop;
              return (
                <Piece3D
                  key={`${side}-${type}-${i}`}
                  type={type}
                  side={side}
                  target={target}
                  from={[target[0], target[1] + 1.4, target[2]]}
                  selected={side === "sente" && selectedDrop === type && i === count - 1}
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

      <SeatedOpponent person={across} />

      <ContactShadows position={[0, FLOOR_Y + 0.01, 0]} opacity={0.55} scale={40} blur={2.8} far={6} />
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
        camera={{ position: CAMERA_POSITION, fov: 40 }}
        gl={{ antialias: true }}
      >
        <Scene {...props} locked={locked} resetToken={resetToken} />
      </Canvas>

      <div className="absolute bottom-3 left-3 flex gap-2">
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
      <p className="pointer-events-none absolute bottom-4 right-3 text-[10px] tracking-widest text-[#d4b896]/45">
        {locked ? "固定を外すとドラッグで視点を回せます" : "ドラッグで視点回転・ホイールで拡大縮小"}
      </p>
    </div>
  );
}
