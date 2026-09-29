"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  dealerOf,
  doraIndicators,
  HUMAN,
  roundLabel,
  seatWind,
  type MahjongState,
} from "@/lib/mahjong/game";
import { sortTiles, WIND_NAMES, type Tile } from "@/lib/mahjong/tiles";
import { drawTileFace, FACE_H, FACE_W } from "./tileFaces";

export type Mahjong3DProps = {
  state: MahjongState;
  /** Hand tiles the player may click right now. */
  selectable: Set<number>;
  /** Seats whose hands are laid open (round result). */
  revealed: number[];
  onTileClick: (id: number) => void;
};

const W = 0.62;
const H = 0.84;
const D = 0.46;
const HUMAN_SCALE = 1.18;
const HUMAN_TILT = -0.72;
const POND_Z = 1.78;
const WALL_Z = 5.45;
const HAND_Z = 7.25;
const TABLE = 8.9;
const CAMERA_POSITION: [number, number, number] = [0, 16, 13.8];
const CAMERA_TARGET: [number, number, number] = [0, 0, 1.9];

/* ---------- shared resources ---------- */

type Resources = {
  body: THREE.BufferGeometry;
  back: THREE.BufferGeometry;
  face: THREE.PlaneGeometry;
  ivory: THREE.Material;
  backMat: THREE.Material;
  faces: Map<string, THREE.MeshStandardMaterial>;
};

let resources: Resources | null = null;

function res(): Resources {
  if (!resources) {
    const bodyDepth = D * 0.64;
    const body = new RoundedBoxGeometry(W, H, bodyDepth, 3, 0.07);
    body.translate(0, 0, D / 2 - bodyDepth / 2);
    const backDepth = D - bodyDepth + 0.02;
    const back = new RoundedBoxGeometry(W, H, backDepth, 3, 0.07);
    back.translate(0, 0, -D / 2 + backDepth / 2);
    resources = {
      body,
      back,
      face: new THREE.PlaneGeometry(W - 0.07, H - 0.07),
      ivory: new THREE.MeshPhysicalMaterial({
        color: "#f4efe2",
        roughness: 0.3,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
      }),
      backMat: new THREE.MeshPhysicalMaterial({
        color: "#2b62b0",
        roughness: 0.28,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
      faces: new Map(),
    };
  }
  return resources;
}

function faceMaterial(tile: Tile | null) {
  const r = res();
  const key = tile ? `${tile.kind}-${tile.red}` : "blank";
  let mat = r.faces.get(key);
  if (!mat) {
    const canvas = document.createElement("canvas");
    canvas.width = FACE_W * 2;
    canvas.height = FACE_H * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    drawTileFace(ctx, tile ? tile.kind : null, tile?.red ?? false);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    mat = new THREE.MeshStandardMaterial({ map, roughness: 0.32 });
    r.faces.set(key, mat);
  }
  return mat;
}

/* ---------- layout ---------- */

type Placement = {
  tile: Tile;
  pos: [number, number, number];
  /** Euler angles applied in YXZ order: [tilt, yaw, spin]. */
  rot: [number, number, number];
  scale: number;
  hidden: boolean;
  interactive: boolean;
  highlight?: boolean;
};

function toWorld(seat: number, x: number, y: number, z: number): [number, number, number] {
  const a = (seat * Math.PI) / 2;
  return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
}

const FLAT = -Math.PI / 2;
const FACE_DOWN = Math.PI / 2;

function layout(state: MahjongState, selectable: Set<number>, revealed: number[]): Placement[] {
  const out: Placement[] = [];
  const yawOf = (seat: number) => (seat * Math.PI) / 2;

  state.players.forEach((p, seat) => {
    const yaw = yawOf(seat);
    const human = seat === HUMAN;
    const open = revealed.includes(seat);
    const s = human ? HUMAN_SCALE : 1;
    const w = W * s;

    // Hand: sorted, with the fresh draw set apart on the right.
    const drawn = state.turn === seat ? p.hand.find((t) => t.id === state.drawnId) : undefined;
    const rest = sortTiles(p.hand.filter((t) => t !== drawn));
    const tiles = drawn ? [...rest, drawn] : rest;
    const startX = -6.75 * w;
    tiles.forEach((tile, i) => {
      const gap = tile === drawn ? 0.22 : 0;
      const x = startX + i * (w + 0.015) + gap + w / 2;
      if (open) {
        out.push({
          tile,
          pos: toWorld(seat, x, D / 2, HAND_Z + 0.1),
          rot: [FLAT, yaw, 0],
          scale: s,
          hidden: false,
          interactive: false,
        });
      } else if (human) {
        out.push({
          tile,
          pos: toWorld(seat, x, (H * s * Math.cos(HUMAN_TILT)) / 2 + 0.12, HAND_Z + 0.35),
          rot: [HUMAN_TILT, yaw, 0],
          scale: s,
          hidden: false,
          interactive: selectable.has(tile.id),
          highlight: selectable.size > 0 && selectable.size < p.hand.length && selectable.has(tile.id),
        });
      } else {
        out.push({
          tile,
          pos: toWorld(seat, x, H / 2, HAND_Z),
          rot: [0, yaw, 0],
          scale: 1,
          hidden: true,
          interactive: false,
        });
      }
    });

    // Melds, from the right-hand corner inwards.
    let mx = 7.95;
    for (const meld of p.melds) {
      const rel = (meld.from - seat + 4) % 4; // 1 下家, 2 対面, 3 上家
      const others = meld.tiles.filter((t) => t.id !== meld.calledId);
      const called = meld.tiles.find((t) => t.id === meld.calledId)!;
      const order =
        rel === 3 ? [called, ...others] : rel === 2 ? [others[0], called, others[1]] : [...others, called];
      for (const tile of [...order].reverse()) {
        const side = tile === called;
        const width = side ? H : W;
        mx -= width / 2;
        out.push({
          tile,
          pos: toWorld(seat, mx, D / 2, HAND_Z + 0.35 + (side ? (H - W) / 2 : 0)),
          rot: [FLAT, yaw, side ? Math.PI / 2 : 0],
          scale: 1,
          hidden: false,
          interactive: false,
        });
        mx -= width / 2 + 0.02;
      }
      mx -= 0.12;
    }

    // Pond: rows of six; the riichi tile lies sideways.
    let col = 0;
    let row = 0;
    let px = -3 * W;
    for (const d of p.discards) {
      if (d.called) continue;
      if (col === 6 && row < 3) {
        col = 0;
        row++;
        px = -3 * W;
      }
      const width = d.riichi ? H : W;
      out.push({
        tile: d.tile,
        pos: toWorld(seat, px + width / 2, D / 2, POND_Z + row * (H + 0.03) + H / 2),
        rot: [FLAT, yaw, d.riichi ? Math.PI / 2 : 0],
        scale: 1,
        hidden: false,
        interactive: false,
      });
      px += width + 0.02;
      col++;
    }
  });

  // Wall: 68 stacks in a ring; the live wall is drawn from `start` onwards.
  const start = (dealerOf(state) * 17 + 6) % 68;
  const stackPos = (k: number, top: boolean) => {
    const ring = ((k % 68) + 68) % 68;
    const side = Math.floor(ring / 17);
    const i = ring % 17;
    return toWorld(side, (i - 8) * (W + 0.01), top ? D * 1.5 + 0.005 : D / 2, WALL_Z);
  };
  const liveDrawn = 122 - state.wall.length;
  state.wall.forEach((tile, i) => {
    const g = liveDrawn + i;
    const k = start + Math.floor(g / 2);
    out.push({
      tile,
      pos: stackPos(k, g % 2 === 0),
      rot: [FACE_DOWN, yawOf(Math.floor((((k % 68) + 68) % 68) / 17)), 0],
      scale: 1,
      hidden: true,
      interactive: false,
    });
  });
  const indicators = new Set(doraIndicators(state).map((t) => t.id));
  state.deadWall.forEach((tile, j) => {
    const k = start - 7 + Math.floor(j / 2);
    const side = Math.floor((((k % 68) + 68) % 68) / 17);
    const up = indicators.has(tile.id);
    out.push({
      tile,
      pos: stackPos(k, j % 2 === 0),
      rot: [up ? FLAT : FACE_DOWN, yawOf(side), 0],
      scale: 1,
      hidden: !up,
      interactive: false,
    });
  });

  return out;
}

/* ---------- tiles ---------- */

function Tile3D({
  placement,
  onClick,
}: {
  placement: Placement;
  onClick: (id: number) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const r = res();
  const { tile, pos, rot, scale, hidden, interactive, highlight } = placement;
  const target = useMemo(() => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], "YXZ"));
    return { p: new THREE.Vector3(...pos), q };
  }, [pos, rot]);
  const lift = interactive && hover ? 0.28 : highlight ? 0.1 : 0;

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const k = 1 - Math.exp(-delta * 11);
    const dest = target.p.clone();
    // Tiles travelling across the table rise a little on the way.
    const far = Math.hypot(g.position.x - dest.x, g.position.z - dest.z);
    dest.y += lift + Math.min(0.6, far * 0.12);
    g.position.lerp(dest, k);
    g.quaternion.slerp(target.q, k);
    const sc = g.scale.x + (scale - g.scale.x) * k;
    g.scale.setScalar(sc);
  });

  const face = faceMaterial(hidden ? null : tile);

  return (
    <group
      ref={ref}
      position={pos}
      quaternion={target.q}
      scale={scale}
      onClick={
        interactive
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onClick(tile.id);
            }
          : undefined
      }
      onPointerOver={
        interactive
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              setHover(true);
              document.body.style.cursor = "pointer";
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? () => {
              setHover(false);
              document.body.style.cursor = "";
            }
          : undefined
      }
    >
      <mesh geometry={r.body} material={r.ivory} castShadow receiveShadow />
      <mesh geometry={r.back} material={r.backMat} castShadow />
      <mesh geometry={r.face} material={face} position={[0, 0, D / 2 + 0.002]} />
      {highlight && (
        <mesh position={[0, 0, D / 2 + 0.004]} raycast={() => null}>
          <planeGeometry args={[W - 0.02, H - 0.02]} />
          <meshBasicMaterial color="#ffd36a" transparent opacity={hover ? 0.28 : 0.14} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/* ---------- table ---------- */

function feltTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size * 0.72);
  g.addColorStop(0, "#227a4f");
  g.addColorStop(1, "#11482e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function woodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#4a2614";
  ctx.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = i % 3 ? "#2c150a" : "#6b3a1f";
    ctx.globalAlpha = 0.2 + Math.random() * 0.3;
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    const y = Math.random() * 64;
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 3);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function panelTexture(state: MahjongState) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0e1512";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(201,168,96,0.5)";
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, size - 20, size - 20);

  const font = '"Yu Mincho", "Hiragino Mincho ProN", serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f3e3b8";
  ctx.font = `700 64px ${font}`;
  ctx.fillText(roundLabel(state), size / 2, size / 2 - 40);
  ctx.font = `500 30px ${font}`;
  ctx.fillStyle = "#c9a860";
  ctx.fillText(`${state.honba}本場　供託 ${state.riichiSticks}`, size / 2, size / 2 + 18);
  ctx.fillText(`残り ${state.wall.length} 枚`, size / 2, size / 2 + 58);

  for (let seat = 0; seat < 4; seat++) {
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((-seat * Math.PI) / 2);
    const active = state.turn === seat && (state.phase === "draw" || state.phase === "discard");
    if (active) {
      const g = ctx.createLinearGradient(0, size / 2 - 60, 0, size / 2 - 12);
      g.addColorStop(0, "rgba(255,170,60,0)");
      g.addColorStop(1, "rgba(255,170,60,0.55)");
      ctx.fillStyle = g;
      ctx.fillRect(-size / 2 + 14, size / 2 - 60, size - 28, 46);
    }
    const wind = WIND_NAMES[seatWind(state, seat) - 27];
    ctx.fillStyle = seat === dealerOf(state) ? "#ff8a5c" : "#f3e3b8";
    ctx.font = `700 40px ${font}`;
    ctx.fillText(wind, -120, size / 2 - 38);
    ctx.fillStyle = "#efe6d2";
    ctx.font = `600 36px ${font}`;
    ctx.fillText(state.players[seat].score.toLocaleString(), 40, size / 2 - 38);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function CenterPanel({ state }: { state: MahjongState }) {
  const key = [
    state.round,
    state.honba,
    state.riichiSticks,
    state.wall.length,
    state.turn,
    state.phase,
    ...state.players.map((p) => p.score),
  ].join(",");
  // `key` captures every value the texture shows.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const texture = useMemo(() => panelTexture(state), [key]);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.1, 0.2, 3.1]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.201, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.9, 2.9]} />
        <meshStandardMaterial map={texture} roughness={0.5} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.35} />
      </mesh>
      {state.players.map((p, seat) =>
        p.riichi ? (
          <group key={seat} position={toWorld(seat, 0, 0.24, 1.3)} rotation={[0, (seat * Math.PI) / 2, 0]}>
            <mesh castShadow>
              <boxGeometry args={[2.0, 0.05, 0.14]} />
              <meshStandardMaterial color="#f5f1e6" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.01, 16]} />
              <meshStandardMaterial color="#c0241c" />
            </mesh>
          </group>
        ) : null,
      )}
    </group>
  );
}

function Table() {
  const mats = useMemo(
    () => ({
      felt: new THREE.MeshStandardMaterial({ map: feltTexture(), roughness: 0.95 }),
      wood: new THREE.MeshPhysicalMaterial({
        map: woodTexture(),
        roughness: 0.35,
        clearcoat: 0.7,
        clearcoatRoughness: 0.2,
      }),
    }),
    [],
  );
  useEffect(
    () => () => {
      mats.felt.map?.dispose();
      mats.wood.map?.dispose();
      mats.felt.dispose();
      mats.wood.dispose();
    },
    [mats],
  );
  const rim = TABLE + 0.45;
  return (
    <group>
      <mesh position={[0, -0.1, 0]} material={mats.felt} receiveShadow>
        <boxGeometry args={[TABLE * 2, 0.2, TABLE * 2]} />
      </mesh>
      {[0, 1, 2, 3].map((seat) => (
        <mesh
          key={seat}
          position={toWorld(seat, 0, 0.02, rim - 0.2)}
          rotation={[0, (seat * Math.PI) / 2, 0]}
          material={mats.wood}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[rim * 2 + 0.9, 0.5, 0.9]} />
        </mesh>
      ))}
      <mesh position={[0, -0.9, 0]} receiveShadow>
        <boxGeometry args={[rim * 2 + 1, 1.4, rim * 2 + 1]} />
        <meshStandardMaterial color="#2a160c" roughness={0.6} />
      </mesh>
    </group>
  );
}

function CameraRig({ locked, resetToken }: { locked: boolean; resetToken: number }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    if (resetToken === 0 || !controls.current) return;
    camera.position.set(...CAMERA_POSITION);
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
      maxPolarAngle={1.2}
      minDistance={9}
      maxDistance={26}
      rotateSpeed={0.6}
    />
  );
}

function Scene({
  state,
  selectable,
  revealed,
  onTileClick,
  locked,
  resetToken,
}: Mahjong3DProps & { locked: boolean; resetToken: number }) {
  const placements = useMemo(() => layout(state, selectable, revealed), [state, selectable, revealed]);
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 14, 8]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-bias={-0.0004}
      />
      <pointLight position={[0, 7, 0]} intensity={30} color="#ffe3b0" distance={20} />
      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer intensity={1.2} position={[-8, 4, 2]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
        <Lightformer intensity={1.2} position={[8, 4, 2]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} color="#ffe2b8" />
        <Lightformer intensity={0.8} position={[0, 3, 10]} scale={[12, 3, 1]} />
      </Environment>

      <Table />
      <CenterPanel state={state} />

      {placements.map((p) => (
        <Tile3D key={p.tile.id} placement={p} onClick={onTileClick} />
      ))}

      <ContactShadows position={[0, -1.62, 0]} opacity={0.5} scale={30} blur={2.6} far={3} />
      <CameraRig locked={locked} resetToken={resetToken} />
    </>
  );
}

export default function Mahjong3D(props: Mahjong3DProps) {
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
        <color attach="background" args={["#0a0f0c"]} />
        <Scene {...props} locked={locked} resetToken={resetToken} />
      </Canvas>

      <div className="absolute bottom-3 left-3 z-10 flex gap-2">
        <button
          type="button"
          aria-pressed={locked}
          onClick={() => setLocked((v) => !v)}
          className={[
            "border px-3 py-1 text-[11px] tracking-widest backdrop-blur-sm transition",
            locked
              ? "border-[#e6cf94]/70 bg-[#c9a860]/25 text-[#f3e3b8]"
              : "border-[#c9a860]/30 bg-black/40 text-[#c9a860]/80 hover:text-[#efe6d2]",
          ].join(" ")}
        >
          {locked ? "視点固定中" : "視点を固定"}
        </button>
        <button
          type="button"
          onClick={() => setResetToken((n) => n + 1)}
          className="border border-[#c9a860]/30 bg-black/40 px-3 py-1 text-[11px] tracking-widest text-[#c9a860]/80 backdrop-blur-sm transition hover:text-[#efe6d2]"
        >
          視点リセット
        </button>
      </div>
      <p className="pointer-events-none absolute bottom-4 right-3 text-[10px] tracking-widest text-[#c9a860]/45">
        {locked ? "固定を外すとドラッグで視点を回せます" : "ドラッグで視点回転・ホイールで拡大縮小"}
      </p>
    </div>
  );
}
