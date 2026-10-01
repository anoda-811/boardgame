"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import * as THREE from "three";
import type { Board, Color, Coord, PieceType } from "@/lib/chess/engine";

export type Chess3DBoardProps = {
  board: Board;
  selected: Coord | null;
  targets: Coord[];
  lastMove: { from: Coord; to: Coord; by: Color } | null;
  checkedKing: Coord | null;
  onSquareClick: (coord: Coord) => void;
};

const BOARD_TOP = 0.06;
const CAMERA_POSITION: [number, number, number] = [0, 9.2, 9.4];
const CAMERA_TARGET: [number, number, number] = [0, 0, 0.3];
const CAMERA_FOV = 38;

/** Wider view on a narrow screen so the board stays inside the portrait frame. */
function viewFov(base: number) {
  if (typeof window === "undefined" || !window.matchMedia("(max-width: 760px)").matches) return base;
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const halfV = (base * Math.PI) / 360;
  const halfH = Math.atan(Math.tan(halfV) * 0.9);
  const fitted = (Math.atan(Math.tan(halfH) / Math.max(0.42, aspect)) * 360) / Math.PI;
  return Math.min(78, Math.max(base, fitted));
}

function squareX(c: number) {
  return c - 3.5;
}
function squareZ(r: number) {
  return r - 3.5;
}

/* ---------- geometry ---------- */

type P = [number, number];

function arc(cx: number, cy: number, radius: number, from: number, to: number, steps: number): P[] {
  const pts: P[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = from + ((to - from) * i) / steps;
    pts.push([Math.max(0, cx + Math.cos(a) * radius), cy + Math.sin(a) * radius]);
  }
  return pts;
}

const BASE: P[] = [
  [0, 0],
  [0.36, 0],
  [0.375, 0.03],
  [0.37, 0.06],
  [0.33, 0.09],
  [0.3, 0.11],
  [0.3, 0.14],
  [0.26, 0.17],
];

const PROFILES: Record<Exclude<PieceType, "n">, P[]> = {
  p: [
    ...BASE,
    [0.2, 0.22],
    [0.15, 0.32],
    [0.12, 0.42],
    [0.19, 0.45],
    [0.19, 0.48],
    [0.11, 0.5],
    ...arc(0, 0.63, 0.16, -Math.PI / 2 + 0.75, Math.PI / 2, 12),
  ],
  r: [
    ...BASE,
    [0.23, 0.22],
    [0.2, 0.4],
    [0.19, 0.62],
    [0.25, 0.66],
    [0.26, 0.7],
    [0.25, 0.72],
    [0.25, 0.86],
    [0.2, 0.86],
    [0.2, 0.8],
    [0, 0.8],
  ],
  b: [
    ...BASE,
    [0.21, 0.22],
    [0.16, 0.4],
    [0.12, 0.62],
    [0.22, 0.66],
    [0.22, 0.7],
    [0.12, 0.72],
    [0.16, 0.78],
    [0.185, 0.86],
    [0.17, 0.94],
    [0.12, 1.0],
    [0.06, 1.05],
    [0, 1.07],
  ],
  q: [
    ...BASE,
    [0.23, 0.22],
    [0.17, 0.45],
    [0.13, 0.76],
    [0.24, 0.8],
    [0.24, 0.84],
    [0.14, 0.87],
    [0.18, 0.96],
    [0.25, 1.08],
    [0.21, 1.11],
    [0.12, 1.1],
    [0, 1.13],
  ],
  k: [
    ...BASE,
    [0.23, 0.22],
    [0.17, 0.48],
    [0.13, 0.8],
    [0.24, 0.84],
    [0.24, 0.88],
    [0.14, 0.91],
    [0.18, 1.0],
    [0.22, 1.1],
    [0.19, 1.15],
    [0.1, 1.16],
    [0, 1.17],
  ],
};

const KNIGHT_BASE: P[] = [...BASE, [0.24, 0.2], [0.22, 0.22], [0, 0.22]];

function lathe(points: P[]) {
  const geo = new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    48,
  );
  geo.computeVertexNormals();
  return geo;
}

function knightHead() {
  const s = new THREE.Shape();
  s.moveTo(-0.2, 0.2);
  s.lineTo(0.19, 0.2);
  s.quadraticCurveTo(0.12, 0.34, 0.2, 0.5);
  s.quadraticCurveTo(0.3, 0.6, 0.32, 0.7);
  s.quadraticCurveTo(0.31, 0.77, 0.24, 0.78);
  s.quadraticCurveTo(0.16, 0.82, 0.12, 0.9);
  s.lineTo(0.07, 1.0);
  s.lineTo(0.0, 0.9);
  s.quadraticCurveTo(-0.14, 0.9, -0.2, 0.76);
  s.quadraticCurveTo(-0.27, 0.56, -0.22, 0.38);
  s.lineTo(-0.2, 0.2);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 5,
    curveSegments: 16,
  });
  geo.translate(0, 0, -0.11);
  geo.computeVertexNormals();
  return geo;
}

let geometryCache: {
  lathe: Record<Exclude<PieceType, "n">, THREE.BufferGeometry>;
  knightBase: THREE.BufferGeometry;
  knightHead: THREE.BufferGeometry;
} | null = null;

function geometries() {
  if (!geometryCache) {
    geometryCache = {
      lathe: {
        p: lathe(PROFILES.p),
        r: lathe(PROFILES.r),
        b: lathe(PROFILES.b),
        q: lathe(PROFILES.q),
        k: lathe(PROFILES.k),
      },
      knightBase: lathe(KNIGHT_BASE),
      knightHead: knightHead(),
    };
  }
  return geometryCache;
}

function woodTexture(base: string, grain: string, seed: number) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };

  for (let i = 0; i < 70; i += 1) {
    const x = rand() * size;
    const amp = 2 + rand() * 6;
    const freq = 0.01 + rand() * 0.03;
    ctx.strokeStyle = grain;
    ctx.globalAlpha = 0.05 + rand() * 0.14;
    ctx.lineWidth = 0.6 + rand() * 2.2;
    ctx.beginPath();
    for (let y = 0; y <= size; y += 4) {
      const px = x + Math.sin(y * freq + i) * amp;
      if (y === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ---------- pieces ---------- */

function PieceMesh({
  type,
  color,
  material,
}: {
  type: PieceType;
  color: Color;
  material: THREE.Material;
}) {
  const geo = geometries();

  if (type === "n") {
    return (
      <group rotation={[0, color === "w" ? Math.PI / 6 : Math.PI + Math.PI / 6, 0]}>
        <mesh geometry={geo.knightBase} material={material} castShadow receiveShadow />
        <mesh geometry={geo.knightHead} material={material} castShadow receiveShadow />
      </group>
    );
  }

  return (
    <group>
      <mesh geometry={geo.lathe[type]} material={material} castShadow receiveShadow />
      {type === "r" &&
        [0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.2, 0.9, Math.sin(a) * 0.2]}
              rotation={[0, -a, 0]}
              material={material}
              castShadow
            >
              <boxGeometry args={[0.09, 0.09, 0.13]} />
            </mesh>
          );
        })}
      {type === "b" && (
        <mesh position={[0, 1.1, 0]} material={material} castShadow>
          <sphereGeometry args={[0.05, 16, 16]} />
        </mesh>
      )}
      {type === "q" && (
        <>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.22, 1.12, Math.sin(a) * 0.22]}
                material={material}
                castShadow
              >
                <sphereGeometry args={[0.035, 12, 12]} />
              </mesh>
            );
          })}
          <mesh position={[0, 1.2, 0]} material={material} castShadow>
            <sphereGeometry args={[0.07, 16, 16]} />
          </mesh>
        </>
      )}
      {type === "k" && (
        <>
          <mesh position={[0, 1.3, 0]} material={material} castShadow>
            <boxGeometry args={[0.06, 0.26, 0.06]} />
          </mesh>
          <mesh position={[0, 1.33, 0]} material={material} castShadow>
            <boxGeometry args={[0.18, 0.06, 0.06]} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Piece3D({
  type,
  color,
  r,
  c,
  from,
  selected,
  material,
  onClick,
}: {
  type: PieceType;
  color: Color;
  r: number;
  c: number;
  from: Coord | null;
  selected: boolean;
  material: THREE.Material;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const anim = useRef<{ t: number; fx: number; fz: number } | null>(
    from ? { t: 0, fx: squareX(from.c), fz: squareZ(from.r) } : null,
  );
  const tx = squareX(c);
  const tz = squareZ(r);
  const hop = type === "n" ? 0.9 : 0.35;

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const lift = selected ? 0.18 : 0;

    const a = anim.current;
    if (a && a.t < 1) {
      a.t = Math.min(1, a.t + delta / 0.45);
      const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
      g.position.set(
        a.fx + (tx - a.fx) * e,
        BOARD_TOP + Math.sin(Math.PI * e) * hop,
        a.fz + (tz - a.fz) * e,
      );
      return;
    }

    g.position.x = tx;
    g.position.z = tz;
    g.position.y += (BOARD_TOP + lift - g.position.y) * Math.min(1, delta * 12);
  });

  const start = from
    ? ([squareX(from.c), BOARD_TOP, squareZ(from.r)] as const)
    : ([tx, BOARD_TOP, tz] as const);

  return (
    <group
      ref={ref}
      position={start}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <PieceMesh type={type} color={color} material={material} />
    </group>
  );
}

/* ---------- board ---------- */

const SQUARE_SURFACE = BOARD_TOP + 0.002;

function Overlay({
  r,
  c,
  color,
  opacity,
  layer,
}: {
  r: number;
  c: number;
  color: string;
  opacity: number;
  layer: number;
}) {
  return (
    <mesh
      position={[squareX(c), SQUARE_SURFACE + 0.008 + layer * 0.004, squareZ(r)]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={layer + 1}
      raycast={() => null}
    >
      <planeGeometry args={[0.98, 0.98]} />
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
    fit();
    if (resetToken !== 0 && controls.current) {
      camera.position.set(...CAMERA_POSITION);
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
      minPolarAngle={0.35}
      maxPolarAngle={1.15}
      minDistance={8}
      maxDistance={17}
      rotateSpeed={0.6}
    />
  );
}

function Scene({
  board,
  selected,
  targets,
  lastMove,
  checkedKing,
  onSquareClick,
  locked,
  resetToken,
}: Chess3DBoardProps & { locked: boolean; resetToken: number }) {
  const materials = useMemo(() => {
    const light = new THREE.MeshStandardMaterial({
      map: woodTexture("#ecd7ab", "#9a6a3a", 11),
      roughness: 0.5,
    });
    const dark = new THREE.MeshStandardMaterial({
      map: woodTexture("#8e5d39", "#3a200f", 29),
      roughness: 0.45,
    });
    const frame = new THREE.MeshStandardMaterial({
      map: woodTexture("#26170f", "#0a0604", 47),
      roughness: 0.32,
      metalness: 0.05,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: "#c9a860",
      metalness: 0.9,
      roughness: 0.3,
    });
    const ivory = new THREE.MeshPhysicalMaterial({
      color: "#f2e6cc",
      roughness: 0.32,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      sheen: 0.3,
      sheenColor: new THREE.Color("#fff4dc"),
    });
    const ebony = new THREE.MeshPhysicalMaterial({
      color: "#1c1512",
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    return { light, dark, frame, gold, ivory, ebony };
  }, []);

  useEffect(
    () => () => {
      Object.values(materials).forEach((m) => {
        (m as THREE.MeshStandardMaterial).map?.dispose();
        m.dispose();
      });
      document.body.style.cursor = "";
    },
    [materials],
  );

  // Where each moved piece should animate from (including the castling rook).
  const animFrom = useMemo(() => {
    const map = new Map<string, Coord>();
    if (!lastMove) return map;
    map.set(`${lastMove.to.r}-${lastMove.to.c}`, lastMove.from);
    const moved = board[lastMove.to.r][lastMove.to.c];
    if (moved?.type === "k" && Math.abs(lastMove.to.c - lastMove.from.c) === 2) {
      const row = lastMove.to.r;
      if (lastMove.to.c === 6) map.set(`${row}-5`, { r: row, c: 7 });
      else map.set(`${row}-3`, { r: row, c: 0 });
    }
    return map;
  }, [lastMove, board]);

  const moveId = lastMove
    ? `${lastMove.from.r}${lastMove.from.c}${lastMove.to.r}${lastMove.to.c}`
    : "none";

  const click = (coord: Coord) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSquareClick(coord);
  };

  const opponentMove = lastMove?.by === "b";

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[4, 10, 6]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0004}
      />
      <pointLight position={[-6, 5, -4]} intensity={18} color="#ffd9a0" distance={20} />

      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 6, -6]} scale={[12, 4, 1]} />
        <Lightformer intensity={1.2} position={[-6, 4, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer intensity={1.6} position={[6, 4, 2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} color="#ffe2b8" />
        <Lightformer intensity={0.6} position={[0, -2, 6]} scale={[10, 2, 1]} />
      </Environment>

      {/* frame */}
      <mesh position={[0, -0.28, 0]} material={materials.frame} receiveShadow castShadow>
        <boxGeometry args={[9.7, 0.56, 9.7]} />
      </mesh>
      <mesh position={[0, 0.001, 0]} material={materials.gold} receiveShadow>
        <boxGeometry args={[8.26, 0.004, 8.26]} />
      </mesh>

      {/* squares */}
      {Array.from({ length: 64 }, (_, i) => {
        const r = Math.floor(i / 8);
        const c = i % 8;
        const light = (r + c) % 2 === 0;
        return (
          <mesh
            key={i}
            position={[squareX(c), BOARD_TOP / 2 + 0.002, squareZ(r)]}
            material={light ? materials.light : materials.dark}
            receiveShadow
            onClick={click({ r, c })}
          >
            <boxGeometry args={[1, BOARD_TOP, 1]} />
          </mesh>
        );
      })}

      {/* highlights */}
      {lastMove && (
        <>
          <Overlay
            r={lastMove.from.r}
            c={lastMove.from.c}
            color={opponentMove ? "#4a8ae0" : "#e0b54a"}
            opacity={opponentMove ? 0.35 : 0.3}
            layer={0}
          />
          <Overlay
            r={lastMove.to.r}
            c={lastMove.to.c}
            color={opponentMove ? "#3d7ad4" : "#e0b54a"}
            opacity={opponentMove ? 0.55 : 0.38}
            layer={0}
          />
        </>
      )}
      {selected && (
        <Overlay r={selected.r} c={selected.c} color="#f0b040" opacity={0.55} layer={1} />
      )}
      {checkedKing && (
        <Overlay r={checkedKing.r} c={checkedKing.c} color="#e02a1e" opacity={0.6} layer={2} />
      )}
      {targets.map((t) => {
        const occupied = Boolean(board[t.r][t.c]);
        return (
          <mesh
            key={`t-${t.r}-${t.c}`}
            position={[squareX(t.c), SQUARE_SURFACE + 0.024, squareZ(t.r)]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={4}
            raycast={() => null}
          >
            {occupied ? (
              <ringGeometry args={[0.38, 0.46, 40]} />
            ) : (
              <circleGeometry args={[0.14, 32]} />
            )}
            <meshBasicMaterial
              color="#2f8a4e"
              transparent
              opacity={0.75}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-4}
              polygonOffsetUnits={-4}
            />
          </mesh>
        );
      })}

      {/* pieces */}
      {board.map((row, r) =>
        row.map((piece, c) => {
          if (!piece) return null;
          const from = animFrom.get(`${r}-${c}`) ?? null;
          return (
            <Piece3D
              key={`${r}-${c}-${piece.color}${piece.type}${from ? moveId : ""}`}
              type={piece.type}
              color={piece.color}
              r={r}
              c={c}
              from={from}
              selected={Boolean(selected && selected.r === r && selected.c === c)}
              material={piece.color === "w" ? materials.ivory : materials.ebony}
              onClick={click({ r, c })}
            />
          );
        }),
      )}

      <ContactShadows position={[0, -0.56, 0]} opacity={0.55} scale={16} blur={2.6} far={2} />

      <CameraRig locked={locked} resetToken={resetToken} />
    </>
  );
}

export default function Chess3DBoard(props: Chess3DBoardProps) {
  const [locked, setLocked] = useState(true);
  const [resetToken, setResetToken] = useState(0);

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
        gl={{ antialias: true }}
      >
        <Scene {...props} locked={locked} resetToken={resetToken} />
      </Canvas>

      <div className="absolute top-2 left-2 flex gap-1.5 sm:top-3 sm:left-3 sm:gap-2">
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
      <p className="pointer-events-none absolute right-3 bottom-2 hidden text-[10px] tracking-widest text-[#c9a860]/45 sm:block">
        {locked
          ? "固定を外すとドラッグで視点を回せます"
          : "ドラッグで視点回転・ホイールで拡大縮小"}
      </p>
    </div>
  );
}
