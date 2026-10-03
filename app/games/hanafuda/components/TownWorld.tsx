"use client";

import { useContext, useEffect, useMemo, useRef, createContext, type ReactNode } from "react";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { BuildingKind, TownPin } from "./TownScene";

type Scenery = "river" | "bridge" | "castle";

const TileContext = createContext<THREE.Texture | null>(null);

function pinPos(pin: { x: number; y: number }): [number, number, number] {
  return [(pin.x - 50) * 0.2, 0, (pin.y - 50) * 0.18];
}

function Rise({ delay, play, children }: { delay: number; play: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    if (!play) {
      start.current = null;
      group.scale.setScalar(0.001);
      return;
    }
    if (start.current === null) start.current = performance.now() + delay;
    const t = Math.min(1, Math.max(0, (performance.now() - start.current) / 520));
    const s = t * t * (3 - 2 * t);
    group.scale.setScalar(Math.max(0.001, s));
  });
  return <group ref={ref}>{children}</group>;
}

function Label({ text, active, dim }: { text: string; active: boolean; dim?: boolean }) {
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = "600 32px 'Yu Mincho', 'Hiragino Mincho ProN', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = active ? "#f6ecd2" : dim ? "rgba(216,224,208,0.4)" : "rgba(246,236,210,0.94)";
    ctx.fillText(text, 128, 34);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [text, active, dim]);
  useEffect(() => () => tex?.dispose(), [tex]);
  if (!tex) return null;
  return (
    <sprite position={[0, 2.55, 0]} scale={[2.4, 0.6, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  );
}

function Roof({ w, d, y, rise = 0.62, color = "#ffffff" }: { w: number; d: number; y: number; rise?: number; color?: string }) {
  const map = useContext(TileContext);
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(0, rise);
    shape.lineTo(w / 2, 0);
    const extruded = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    extruded.translate(0, 0, -d / 2);
    return extruded;
  }, [w, d, rise]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={[0, y, 0]} castShadow>
      <meshStandardMaterial color={color} map={map ?? undefined} roughness={0.78} />
    </mesh>
  );
}

function Landmark({
  kind,
  active,
  dim,
}: {
  kind: BuildingKind;
  active: boolean;
  dim?: boolean;
}) {
  const wall = dim ? "#6d6558" : "#efe2cf";
  const wood = dim ? "#4a3a30" : "#6a4330";
  const tile = active ? "#3d4638" : "#2a312e";
  if (kind === "shrine") {
    return (
      <group>
        <mesh position={[-0.55, 0.9, 0]} castShadow>
          <boxGeometry args={[0.12, 1.8, 0.12]} />
          <meshStandardMaterial color="#8d3a32" roughness={0.6} />
        </mesh>
        <mesh position={[0.55, 0.9, 0]} castShadow>
          <boxGeometry args={[0.12, 1.8, 0.12]} />
          <meshStandardMaterial color="#8d3a32" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.72, 0]} castShadow>
          <boxGeometry args={[1.7, 0.12, 0.16]} />
          <meshStandardMaterial color="#8d3a32" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.95, 0]} castShadow>
          <boxGeometry args={[1.35, 0.1, 0.22]} />
          <meshStandardMaterial color="#111" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.55, -0.7]} castShadow>
          <boxGeometry args={[1.1, 1.1, 0.9]} />
          <meshStandardMaterial color={wall} roughness={0.86} />
        </mesh>
        <Roof w={1.5} d={1.2} y={1.1} />
      </group>
    );
  }
  if (kind === "bridge") {
    return (
      <group>
        <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.16, 1.1]} />
          <meshStandardMaterial color="#7a6248" roughness={0.8} />
        </mesh>
        {[-0.9, 0, 0.9].map((z) => (
          <mesh key={z} position={[0, 0.55, z]} castShadow>
            <boxGeometry args={[2.2, 0.08, 0.06]} />
            <meshStandardMaterial color={wood} />
          </mesh>
        ))}
        <mesh position={[0, 0.85, 0]}>
          <torusGeometry args={[0.7, 0.04, 8, 18, Math.PI]} />
          <meshStandardMaterial color={wood} />
        </mesh>
      </group>
    );
  }
  if (kind === "boat") {
    return (
      <group>
        <mesh position={[0, 0.55, -0.15]} castShadow>
          <boxGeometry args={[1.35, 1.1, 1]} />
          <meshStandardMaterial color={wall} roughness={0.86} />
        </mesh>
        <Roof w={1.7} d={1.3} y={1.1} color={tile} />
        <mesh position={[0.15, 0.16, 0.85]} castShadow>
          <boxGeometry args={[1.15, 0.22, 0.42]} />
          <meshStandardMaterial color="#5c4030" roughness={0.7} />
        </mesh>
      </group>
    );
  }
  if (kind === "market" || kind === "shop") {
    return (
      <group>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[1.6, 0.9, 1]} />
          <meshStandardMaterial color={wood} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.05, 0.15]} castShadow>
          <boxGeometry args={[1.9, 0.08, 1.15]} />
          <meshStandardMaterial color={kind === "shop" ? "#1e4d62" : "#8d3a3a"} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.7, 0.52]}>
          <boxGeometry args={[1.2, 0.35, 0.06]} />
          <meshStandardMaterial color="#c4a265" roughness={0.5} />
        </mesh>
      </group>
    );
  }
  if (kind === "gate") {
    return (
      <group>
        <mesh position={[-0.7, 0.9, 0]} castShadow>
          <boxGeometry args={[0.28, 1.8, 0.7]} />
          <meshStandardMaterial color={wall} />
        </mesh>
        <mesh position={[0.7, 0.9, 0]} castShadow>
          <boxGeometry args={[0.28, 1.8, 0.7]} />
          <meshStandardMaterial color={wall} />
        </mesh>
        <Roof w={2.1} d={1.05} y={1.8} rise={0.4} color={tile} />
      </group>
    );
  }
  const wide = kind === "nagaya" || kind === "mansion" || kind === "dojo";
  const w = wide ? 1.7 : 1.2;
  const h = kind === "mansion" || kind === "fire" ? 1.55 : 1.25;
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, kind === "nagaya" ? 1.15 : 1.25]} />
        <meshStandardMaterial color={wall} roughness={0.88} />
      </mesh>
      <mesh position={[0, h * 0.42, 0.64]}>
        <boxGeometry args={[0.38, 0.62, 0.04]} />
        <meshStandardMaterial color="#241810" />
      </mesh>
      {kind === "tea" && (
        <mesh position={[0, h * 0.72, 0.66]}>
          <boxGeometry args={[0.7, 0.28, 0.02]} />
          <meshStandardMaterial color="#1e4d62" />
        </mesh>
      )}
      {kind === "fire" && (
        <mesh position={[0, h + 0.35, 0]}>
          <sphereGeometry args={[0.16, 10, 10]} />
          <meshStandardMaterial color="#c4513a" emissive="#c4513a" emissiveIntensity={0.35} />
        </mesh>
      )}
      {kind === "tavern" && (
        <mesh position={[0.55, h * 0.8, 0.66]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#ffb15a" emissive="#ffb15a" emissiveIntensity={1.4} />
        </mesh>
      )}
      <Roof w={w + 0.45} d={(kind === "nagaya" ? 1.15 : 1.25) + 0.35} y={h} color={tile} />
    </group>
  );
}

function Walkers() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const root = ref.current;
    if (!root) return;
    root.children.forEach((child, index) => {
      const t = clock.elapsedTime * 0.22 + index * 1.7;
      const x = Math.sin(t) * 3.4;
      child.position.set(x, 0, 1.15 + (index % 2) * 0.45);
      child.rotation.y = Math.cos(t) > 0 ? Math.PI / 2 : -Math.PI / 2;
    });
  });
  const robes = ["#24324a", "#6a4330", "#3d3428", "#1e3a34", "#5c3040"];
  return (
    <group ref={ref}>
      {robes.map((color, index) => (
        <group key={color}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <capsuleGeometry args={[0.11, 0.38, 4, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.82, 0]} castShadow>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshStandardMaterial color="#e6c8a8" roughness={0.7} />
          </mesh>
          <mesh position={[index % 2 === 0 ? 0.12 : -0.12, 0.55, 0.08]} rotation={[0.4, 0, 0.2]}>
            <boxGeometry args={[0.04, 0.28, 0.04]} />
            <meshStandardMaterial color="#c4a265" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Petals() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < 16; i += 1) {
      const t = (clock.elapsedTime * 0.08 + i * 0.17) % 1;
      dummy.position.set(-6 + (i % 8) * 1.5, 3.4 - t * 3.2, -1 + (i % 4) * 0.8);
      dummy.rotation.set(t * 3, t * 2, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 16]}>
      <planeGeometry args={[0.14, 0.09]} />
      <meshBasicMaterial color="#f4c6cc" side={THREE.DoubleSide} transparent opacity={0.85} />
    </instancedMesh>
  );
}

function Lanterns() {
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  useFrame(({ clock }) => {
    lights.current.forEach((light, index) => {
      if (!light) return;
      light.intensity = 0.55 + Math.sin(clock.elapsedTime * 2.4 + index) * 0.12;
    });
  });
  const posts = [
    [-4.6, 1.4],
    [-1.8, -1.3],
    [1.5, 1.8],
    [3.6, -0.8],
  ];
  return (
    <group>
      {posts.map(([x, z], index) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 1.4, 6]} />
            <meshStandardMaterial color="#3a2a20" />
          </mesh>
          <mesh position={[0, 1.45, 0]}>
            <boxGeometry args={[0.22, 0.28, 0.22]} />
            <meshStandardMaterial color="#ffb15a" emissive="#ff9a3c" emissiveIntensity={1.6} />
          </mesh>
          <pointLight
            ref={(node) => {
              lights.current[index] = node;
            }}
            position={[0, 1.45, 0]}
            color="#ffb36b"
            distance={5.5}
            decay={2}
            intensity={0.6}
          />
        </group>
      ))}
    </group>
  );
}

function Tree({ x, z, pine }: { x: number; z: number; pine?: boolean }) {
  if (pine) {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.7, 6]} />
          <meshStandardMaterial color="#4a3424" />
        </mesh>
        <mesh position={[0, 1.15, 0]} castShadow>
          <coneGeometry args={[0.55, 1.1, 7]} />
          <meshStandardMaterial color="#1d4034" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.7, 0]} castShadow>
          <coneGeometry args={[0.38, 0.8, 7]} />
          <meshStandardMaterial color="#245043" roughness={0.85} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.9, 6]} />
        <meshStandardMaterial color="#5a3a2c" />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <sphereGeometry args={[0.55, 10, 10]} />
        <meshStandardMaterial color="#e7a8b4" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Filler({ x, z, n }: { x: number; z: number; n: number }) {
  const wall = ["#efe2cf", "#e7d3b4", "#d9c6aa"][n % 3];
  if (n % 5 === 0) {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.38, 0]} castShadow>
          <boxGeometry args={[1.1, 0.76, 0.7]} />
          <meshStandardMaterial color="#6a4330" />
        </mesh>
        <mesh position={[0, 0.82, 0.05]} rotation={[0.15, 0, 0]} castShadow>
          <boxGeometry args={[1.3, 0.06, 0.85]} />
          <meshStandardMaterial color={n % 2 ? "#8d3a3a" : "#1e4d62"} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.25, 0.96, 0.95]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[1.45, 0.16, 1.15]} />
        <meshStandardMaterial color="#cfc6b8" roughness={0.8} />
      </mesh>
      <Roof w={1.55} d={1.25} y={1.12} rise={0.48} />
    </group>
  );
}

function Sign({ title }: { title: string }) {
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#6a4330";
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = "#e6c887";
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 240, 112);
    ctx.fillStyle = "#f6ecd2";
    ctx.font = "600 48px 'Yu Mincho', 'Hiragino Mincho ProN', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title, 128, 68);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [title]);
  useEffect(() => () => tex?.dispose(), [tex]);
  if (!tex) return null;
  return (
    <group position={[-4.2, 0, 1.5]}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.08, 1.4, 0.08]} />
        <meshStandardMaterial color="#3a2a20" />
      </mesh>
      <mesh position={[0.55, 1.15, 0]} castShadow>
        <boxGeometry args={[1.05, 0.55, 0.06]} />
        <meshStandardMaterial map={tex} roughness={0.7} />
      </mesh>
    </group>
  );
}

export function TownWorld({
  pins,
  scenery,
  selectedId,
  reveal,
  title,
  onSelect,
}: {
  pins: TownPin[];
  scenery: Scenery;
  selectedId: string | null;
  reveal: boolean;
  title: string;
  onSelect: (id: string) => void;
}) {
  const gl = useThree((state) => state.gl);
  const tile = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#3a403c";
    ctx.fillRect(0, 0, 64, 128);
    for (let y = 0; y < 128; y += 10) {
      ctx.fillStyle = y % 20 === 0 ? "#2a302c" : "#4a524c";
      ctx.fillRect(0, y, 64, 6);
      ctx.fillStyle = "#5c6560";
      for (let x = (y / 10) % 2 === 0 ? 0 : 8; x < 64; x += 16) ctx.fillRect(x, y + 1, 7, 4);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);
  useEffect(() => () => tile?.dispose(), [tile]);
  const fillers = useMemo(() => {
    const spots: { x: number; z: number; n: number }[] = [];
    let n = 0;
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const x = -7.2 + col * 2.05 + (row % 2) * 0.3;
        const z = -5.2 + row * 1.85;
        if (Math.abs(z - 0.7) < 0.95) continue;
        if (Math.abs(x + 0.6) < 0.8) continue;
        if (scenery !== "castle" && x > 5.6) continue;
        const crowded = pins.some((pin) => {
          const [px, , pz] = pinPos(pin);
          return Math.hypot(px - x, pz - z) < 1.55;
        });
        if (crowded) continue;
        spots.push({ x, z, n });
        n += 1;
      }
    }
    return spots;
  }, [pins, scenery]);

  return (
    <TileContext.Provider value={tile}>
      <color attach="background" args={["#10241a"]} />
      <fog attach="fog" args={["#10241a", 12, 26]} />
      <hemisphereLight args={["#d7e4d4", "#243028", 0.55]} />
      <directionalLight
        position={[10, 16, 8]}
        intensity={1.25}
        color="#fff0d2"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={2}
        shadow-camera-far={40}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#3e4a38" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.7]} receiveShadow>
        <planeGeometry args={[16, 1.15]} />
        <meshStandardMaterial color="#6d5c46" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.2, 0.02, 0]} receiveShadow>
        <planeGeometry args={[1.05, 14]} />
        <meshStandardMaterial color="#6d5c46" roughness={0.95} />
      </mesh>
      {scenery !== "castle" && (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.6, -0.05, 0]}>
            <planeGeometry args={[5.2, 16]} />
            <meshStandardMaterial color="#163e48" roughness={0.22} metalness={0.18} />
          </mesh>
          <mesh position={[5.4, 0.08, 1.2]}>
            <boxGeometry args={[1.7, 0.22, 0.5]} />
            <meshStandardMaterial color="#24343c" />
          </mesh>
        </group>
      )}
      {scenery === "bridge" && (
        <group position={[4.2, 0, -0.2]}>
          <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.2, 0.18, 1.3]} />
            <meshStandardMaterial color="#7a6248" roughness={0.78} />
          </mesh>
          {[-1.6, 1.6].map((x) => (
            <mesh key={x} position={[x, 0.7, 0.55]} castShadow>
              <boxGeometry args={[0.08, 0.7, 0.08]} />
              <meshStandardMaterial color="#3a2a20" />
            </mesh>
          ))}
        </group>
      )}
      {scenery === "castle" && (
        <group position={[0, 0, -6.4]}>
          <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[10, 2.2, 0.8]} />
            <meshStandardMaterial color="#d9cbb6" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.35, 0]} castShadow>
            <boxGeometry args={[4.2, 0.7, 1]} />
            <meshStandardMaterial color="#cfc1aa" />
          </mesh>
          <mesh position={[0, 0.7, 0.45]}>
            <boxGeometry args={[1.4, 1.4, 0.2]} />
            <meshStandardMaterial color="#1a1612" />
          </mesh>
        </group>
      )}
      <Tree x={-6.2} z={-2.4} />
      <Tree x={4.6} z={-3.2} pine />
      <Tree x={-3.2} z={3.6} pine />
      <Tree x={2.4} z={3.2} />
      <Lanterns />
      <Walkers />
      <Petals />
      <Sign title={title} />
      {fillers.map((spot) => (
        <Filler key={`${spot.x}-${spot.z}`} x={spot.x} z={spot.z} n={spot.n} />
      ))}
      {pins.map((pin, index) => {
        const [x, , z] = pinPos(pin);
        const active = pin.id === selectedId;
        return (
          <Rise key={pin.id} delay={index * 70} play={reveal}>
            <group
              position={[x, pin.kind === "boat" ? -0.05 : 0, z]}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(pin.id);
              }}
              onPointerOver={(event) => {
                event.stopPropagation();
                gl.domElement.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                gl.domElement.style.cursor = "auto";
              }}
            >
              <Landmark kind={pin.kind} active={active} dim={pin.dim} />
              <Label text={pin.done ? `${pin.label} 済` : pin.label} active={active} dim={pin.dim} />
              {active && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
                  <ringGeometry args={[0.85, 1.05, 24]} />
                  <meshBasicMaterial color="#e6c887" transparent opacity={0.85} />
                </mesh>
              )}
            </group>
          </Rise>
        );
      })}
      <ContactShadows position={[0, 0.01, 0]} opacity={0.28} scale={18} blur={2.2} far={4} color="#0c1814" />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0.25}
        maxPolarAngle={1.45}
        minDistance={6}
        maxDistance={14}
        target={[1.3, 1, 0]}
      />
    </TileContext.Provider>
  );
}
