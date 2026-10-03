"use client";

import { useEffect, useMemo, useRef, type ComponentRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { STREETS, streetOpen, type HanafudaStory, type Street } from "@/lib/hanafuda/story";

function wardPos(street: Street): [number, number, number] {
  return [(street.x - 46) * 0.36, 0, (street.y - 46) * 0.3];
}

function Label({ text, y = 2.4, dim }: { text: string; y?: number; dim?: boolean }) {
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = "600 64px 'Yu Mincho', 'Hiragino Mincho ProN', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = dim ? "rgba(216,224,208,0.4)" : "#f6ecd2";
    ctx.fillText(text, 256, 64);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [text, dim]);
  useEffect(() => () => tex?.dispose(), [tex]);
  if (!tex) return null;
  return (
    <sprite position={[0, y, 0]} scale={[3.2, 0.8, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  );
}

function River() {
  const geo = useMemo(() => {
    const pts = [
      new THREE.Vector3(7.2, 0, -14),
      new THREE.Vector3(4.6, 0, -6),
      new THREE.Vector3(8, 0, 1.5),
      new THREE.Vector3(5.4, 0, 8),
      new THREE.Vector3(7.4, 0, 15),
    ];
    const width = 1.7;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i < pts.length; i += 1) {
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(pts.length - 1, i + 1)];
      const dx = next.x - prev.x;
      const dz = next.z - prev.z;
      const len = Math.hypot(dx, dz) || 1;
      const nx = (-dz / len) * width;
      const nz = (dx / len) * width;
      positions.push(pts[i].x + nx, 0.05, pts[i].z + nz, pts[i].x - nx, 0.05, pts[i].z - nz);
      if (i < pts.length - 1) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color="#184854" roughness={0.22} metalness={0.18} />
    </mesh>
  );
}

function Road({ a, b }: { a: [number, number, number]; b: [number, number, number] }) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dz);
  return (
    <mesh position={[(a[0] + b[0]) / 2, 0.04, (a[2] + b[2]) / 2]} rotation={[0, Math.atan2(dx, dz), 0]} receiveShadow>
      <boxGeometry args={[0.85, 0.03, len]} />
      <meshStandardMaterial color="#6d5c46" roughness={0.95} />
    </mesh>
  );
}

function housesFor(id: string) {
  let seed = 0;
  for (let i = 0; i < id.length; i += 1) seed = (seed * 33 + id.charCodeAt(i)) >>> 0;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: 14 }, (_, index) => {
    const angle = (index / 14) * Math.PI * 2 + next() * 0.4;
    const radius = 1.15 + next() * 1.35;
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      w: 0.55 + next() * 0.45,
      d: 0.5 + next() * 0.35,
      h: 0.38 + next() * 0.45,
      rot: next() * 0.6,
    };
  });
}

function Ward({
  street,
  open,
  active,
  onHover,
  onPick,
}: {
  street: Street;
  open: boolean;
  active: boolean;
  onHover: (id: string) => void;
  onPick: (id: string) => void;
}) {
  const gl = useThree((state) => state.gl);
  const [x, , z] = wardPos(street);
  const houses = useMemo(() => housesFor(street.id), [street.id]);
  const wall = open ? "#efe2cf" : "#6a6458";
  const roof = active ? "#4a5648" : open ? "#2e3532" : "#3a3a36";
  return (
    <group
      position={[x, 0, z]}
      onPointerOver={(event) => {
        event.stopPropagation();
        gl.domElement.style.cursor = open ? "pointer" : "default";
        onHover(street.id);
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = "auto";
      }}
      onClick={(event) => {
        event.stopPropagation();
        onHover(street.id);
        if (open) onPick(street.id);
      }}
    >
      {houses.map((house, index) => (
        <group key={index} position={[house.x, 0, house.z]} rotation={[0, house.rot, 0]}>
          <mesh position={[0, house.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[house.w, house.h, house.d]} />
            <meshStandardMaterial color={wall} roughness={0.9} />
          </mesh>
          <mesh position={[0, house.h + 0.08, 0]} castShadow>
            <boxGeometry args={[house.w + 0.16, 0.12, house.d + 0.16]} />
            <meshStandardMaterial color={roof} roughness={0.75} />
          </mesh>
        </group>
      ))}
      {street.id === "yashiki" && (
        <mesh position={[0, 0.7, -2.3]} castShadow>
          <boxGeometry args={[3.4, 1.4, 0.35]} />
          <meshStandardMaterial color={open ? "#d9cbb6" : "#7a7368"} />
        </mesh>
      )}
      {street.id === "nihonbashi" && (
        <group position={[2.3, 0, 0.2]}>
          <mesh position={[0, 0.16, 0]} castShadow>
            <boxGeometry args={[1.8, 0.1, 0.55]} />
            <meshStandardMaterial color="#7a6248" />
          </mesh>
        </group>
      )}
      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
          <ringGeometry args={[2.15, 2.4, 40]} />
          <meshBasicMaterial color="#e6c887" transparent opacity={0.9} />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <circleGeometry args={[2.5, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Label text={street.name} dim={!open} />
    </group>
  );
}

function SkyWorld({
  story,
  hotId,
  diveId,
  onHover,
  onPick,
  onArrive,
}: {
  story: HanafudaStory;
  hotId: string;
  diveId: string | null;
  onHover: (id: string) => void;
  onPick: (id: string) => void;
  onArrive: () => void;
}) {
  const camera = useThree((state) => state.camera);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const dest = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const arrived = useRef(false);
  const wards = STREETS.map((street) => wardPos(street));

  useEffect(() => {
    arrived.current = false;
  }, [diveId]);

  useFrame((_, dt) => {
    if (!diveId || arrived.current) return;
    const street = STREETS.find((item) => item.id === diveId);
    if (!street) return;
    const [x, , z] = wardPos(street);
    dest.current.set(x + 0.4, 4.6, z + 3.4);
    look.current.set(x, 0.2, z);
    const k = 1 - Math.exp(-3.1 * dt);
    camera.position.lerp(dest.current, k);
    controls.current?.target.lerp(look.current, k);
    if (camera.position.distanceTo(dest.current) < 0.35) {
      arrived.current = true;
      onArrive();
    }
  });

  return (
    <>
      <color attach="background" args={["#10241a"]} />
      <fog attach="fog" args={["#10241a", 28, 52]} />
      <hemisphereLight args={["#d7e4d4", "#243028", 0.7]} />
      <directionalLight position={[12, 22, 8]} intensity={1.35} color="#fff0d2" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial color="#3c4a38" roughness={1} />
      </mesh>
      <River />
      <Road a={wards[0]} b={wards[1]} />
      <Road a={wards[1]} b={wards[2]} />
      <mesh position={[6.2, 0.12, 6]}>
        <boxGeometry args={[0.9, 0.12, 0.28]} />
        <meshStandardMaterial color="#24343c" />
      </mesh>
      <mesh position={[5.2, 0.12, -2]}>
        <boxGeometry args={[0.7, 0.1, 0.24]} />
        <meshStandardMaterial color="#24343c" />
      </mesh>
      <group position={[-8, 0, -3]}>
        <mesh position={[0, 0.7, 0]}>
          <coneGeometry args={[0.7, 1.4, 7]} />
          <meshStandardMaterial color="#1d4034" />
        </mesh>
      </group>
      <group position={[2.4, 0, 6.5]}>
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.45, 10, 10]} />
          <meshStandardMaterial color="#e7a8b4" />
        </mesh>
      </group>
      {STREETS.map((street) => (
        <Ward
          key={street.id}
          street={street}
          open={streetOpen(story, street.id)}
          active={street.id === hotId}
          onHover={onHover}
          onPick={onPick}
        />
      ))}
      <RiverLabel />
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={!diveId}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0.18}
        maxPolarAngle={1.05}
        minDistance={8}
        maxDistance={36}
        target={[0, 0, 0.4]}
      />
    </>
  );
}

function RiverLabel() {
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.font = "500 28px 'Yu Mincho', serif";
    ctx.fillStyle = "rgba(159,208,216,0.9)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("隅田川", 128, 32);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);
  useEffect(() => () => tex?.dispose(), [tex]);
  if (!tex) return null;
  return (
    <sprite position={[8.2, 1.4, -5]} scale={[2.8, 0.7, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  );
}

export function EdoSky({
  story,
  hotId,
  diveId,
  onHover,
  onPick,
  onArrive,
}: {
  story: HanafudaStory;
  hotId: string;
  diveId: string | null;
  onHover: (id: string) => void;
  onPick: (id: string) => void;
  onArrive: () => void;
}) {
  return (
    <div className="relative min-h-0 overflow-hidden bg-[#10241a]">
      <Canvas
        className="h-full w-full"
        shadows
        camera={{ position: [0, 22, 16], fov: 42, near: 0.1, far: 80 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
      >
        <SkyWorld story={story} hotId={hotId} diveId={diveId} onHover={onHover} onPick={onPick} onArrive={onArrive} />
      </Canvas>
    </div>
  );
}
