"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ENGAWA_OUTER_Z, GARDEN_DROP } from "./houseLayout";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvasTex(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function normalFrom(heightAt: (x: number, y: number) => number, size: number, strength: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const left = heightAt((x - 1 + size) % size, y);
      const right = heightAt((x + 1) % size, y);
      const down = heightAt(x, (y + 1) % size);
      const up = heightAt(x, (y - 1 + size) % size);
      let nx = (left - right) * strength;
      let ny = (down - up) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = (nx / len * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz / len * 0.5 + 0.5) * 255;
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

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Garden seen through the open doors. Built once; positions are seeded, not a grid. */
export function Garden({ floorY }: { floorY: number }) {
  const built = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];
    const root = new THREE.Group();
    const groundY = floorY - GARDEN_DROP;
    const keep = (tex: THREE.Texture) => {
      textures.push(tex);
      return tex;
    };
    const addMat = <T extends THREE.Material>(material: T) => {
      mats.push(material);
      return material;
    };

    const mossMap = keep(
      canvasTex((ctx, w, h) => {
        ctx.fillStyle = "#4d5c3f";
        ctx.fillRect(0, 0, w, h);
        const rand = rng(19);
        for (let i = 0; i < 240; i++) {
          const x = rand() * w;
          const y = rand() * h;
          const r = 18 + rand() * 70;
          const tone = ["#3c4a32", "#5d6b46", "#6e7a4c", "#3a4032", "#5a5340", "#445438"][i % 6];
          const g = ctx.createRadialGradient(x, y, 2, x, y, r);
          g.addColorStop(0, tone);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        for (let i = 0; i < 80; i++) {
          ctx.fillStyle = rand() > 0.5 ? "rgba(40,50,30,0.25)" : "rgba(120,130,80,0.12)";
          ctx.fillRect(rand() * w, rand() * h, 8 + rand() * 30, 2 + rand() * 4);
        }
      }, 512, 512),
    );
    mossMap.repeat.set(4, 5);
    const mossNormal = keep(
      normalFrom((x, y) => hash(x * 0.17, y * 0.17) * 0.65 + hash(x * 0.05, y * 0.04) * 0.35, 128, 2.4),
    );
    mossNormal.repeat.set(4, 5);
    const groundMat = addMat(
      new THREE.MeshStandardMaterial({
        map: mossMap,
        normalMap: mossNormal,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughness: 0.96,
        metalness: 0,
        envMapIntensity: 0.22,
      }),
    );

    const stoneMap = keep(
      canvasTex((ctx, w, h) => {
        ctx.fillStyle = "#7b776f";
        ctx.fillRect(0, 0, w, h);
        const rand = rng(41);
        for (let i = 0; i < 160; i++) {
          ctx.fillStyle = ["#6a655c", "#8d877c", "#5e5a54", "#948c80", "#4e5148"][i % 5];
          ctx.globalAlpha = 0.35 + rand() * 0.4;
          ctx.beginPath();
          ctx.ellipse(rand() * w, rand() * h, 10 + rand() * 40, 8 + rand() * 26, rand() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }, 256, 256),
    );
    stoneMap.repeat.set(1.4, 1.4);
    const stoneNormal = keep(normalFrom((x, y) => hash(x * 0.2, y * 0.23), 128, 3.1));
    const stoneMat = addMat(
      new THREE.MeshStandardMaterial({
        map: stoneMap,
        normalMap: stoneNormal,
        normalScale: new THREE.Vector2(0.7, 0.7),
        roughness: 0.88,
        metalness: 0.02,
        envMapIntensity: 0.16,
      }),
    );
    const lanternMat = addMat(
      new THREE.MeshStandardMaterial({
        color: "#8a8478",
        map: stoneMap,
        normalMap: stoneNormal,
        normalScale: new THREE.Vector2(0.4, 0.4),
        roughness: 0.82,
        metalness: 0.03,
        envMapIntensity: 0.18,
      }),
    );

    const barkMap = keep(
      canvasTex((ctx, w, h) => {
        ctx.fillStyle = "#5a4332";
        ctx.fillRect(0, 0, w, h);
        const rand = rng(7);
        for (let i = 0; i < 40; i++) {
          ctx.strokeStyle = rand() > 0.5 ? "#3e2d22" : "#6d543c";
          ctx.globalAlpha = 0.35 + rand() * 0.4;
          ctx.lineWidth = 1 + rand() * 3;
          ctx.beginPath();
          const x = rand() * w;
          ctx.moveTo(x, 0);
          ctx.bezierCurveTo(x + rand() * 10, h * 0.3, x - rand() * 8, h * 0.6, x + rand() * 6, h);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }, 128, 256),
    );
    barkMap.repeat.set(1, 2);
    const barkNormal = keep(normalFrom((x, y) => hash(x * 0.4, y * 0.07) * 0.7 + Math.sin(x * 0.55) * 0.3, 64, 1.5));
    barkNormal.repeat.set(1, 2);
    const barkMat = addMat(
      new THREE.MeshStandardMaterial({
        map: barkMap,
        normalMap: barkNormal,
        normalScale: new THREE.Vector2(0.32, 0.32),
        roughness: 0.88,
        metalness: 0,
        envMapIntensity: 0.2,
      }),
    );

    const foliageMap = (kind: "pine" | "broad" | "far", seed: number) =>
      keep(
        canvasTex((ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          const rand = rng(seed);
          const palette =
            kind === "pine"
              ? ["#243628", "#314838", "#456348", "#1c2e22", "#3a5840"]
              : kind === "broad"
                ? ["#5a763c", "#3e5832", "#6d8844", "#2a402c", "#7c9350", "#4a6438"]
                : ["#93a69a", "#7f9488", "#a3b2a6", "#6c8076"];
          const count = kind === "pine" ? 90 : 55;
          for (let i = 0; i < count; i++) {
            ctx.save();
            ctx.translate(w * (0.12 + rand() * 0.76), h * (0.08 + rand() * 0.84));
            ctx.rotate(rand() * Math.PI);
            ctx.fillStyle = palette[i % palette.length];
            ctx.globalAlpha = 0.72 + rand() * 0.28;
            ctx.beginPath();
            if (kind === "pine") ctx.ellipse(0, 0, 1.5 + rand() * 3.5, 12 + rand() * 26, 0, 0, Math.PI * 2);
            else ctx.ellipse(0, 0, 6 + rand() * 14, 3.5 + rand() * 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.globalAlpha = 1;
        }, 256, 256),
      );
    const leafRough = keep(
      canvasTex((ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const rand = rng(77);
        for (let i = 0; i < w * h; i++) {
          const v = 185 + Math.floor(rand() * 70);
          img.data[i * 4] = v;
          img.data[i * 4 + 1] = v;
          img.data[i * 4 + 2] = v;
          img.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
      }, 64, 64),
    );
    leafRough.colorSpace = THREE.NoColorSpace;
    const cards = (kind: "pine" | "broad" | "far", seed: number, emissive: string) =>
      addMat(
        new THREE.MeshStandardMaterial({
          map: foliageMap(kind, seed),
          roughnessMap: leafRough,
          color: "#ffffff",
          transparent: true,
          alphaTest: 0.42,
          side: THREE.DoubleSide,
          roughness: 0.86,
          metalness: 0,
          emissive,
          emissiveIntensity: kind === "far" ? 0.03 : 0.05,
          envMapIntensity: 0.22,
        }),
      );
    const pineMat = cards("pine", 5, "#101c14");
    const pineMatB = cards("pine", 6, "#142018");
    const broadMat = cards("broad", 9, "#1a2814");
    const broadMatB = cards("broad", 12, "#162210");
    const farMat = cards("far", 15, "#5e7066");

    const trunkGeo = new THREE.CylinderGeometry(0.72, 1, 1, 10);
    const branchGeo = new THREE.CylinderGeometry(0.45, 0.7, 1, 7);
    const cardGeo = new THREE.PlaneGeometry(1, 1.25);
    geos.push(trunkGeo, branchGeo, cardGeo);

    const mesh = (
      geo: THREE.BufferGeometry,
      material: THREE.Material,
      pos: [number, number, number],
      scale: [number, number, number],
      shadow: boolean,
    ) => {
      const m = new THREE.Mesh(geo, material);
      m.position.set(pos[0], pos[1], pos[2]);
      m.scale.set(scale[0], scale[1], scale[2]);
      m.castShadow = shadow;
      m.receiveShadow = true;
      root.add(m);
      return m;
    };

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(88, 92), groundMat);
    geos.push(ground.geometry);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, groundY, ENGAWA_OUTER_Z - 46);
    ground.receiveShadow = true;
    root.add(ground);

    const placeTree = (x: number, z: number, height: number, kind: "pine" | "broad" | "far", seed: number) => {
      const rand = rng(seed);
      const far = kind === "far";
      const trunkH = height * (kind === "pine" ? 0.46 : 0.42);
      const radius = far ? 0.16 + rand() * 0.06 : 0.22 + rand() * 0.1;
      mesh(trunkGeo, barkMat, [x, groundY + trunkH / 2, z], [radius, trunkH, radius], !far);
      if (!far) {
        for (let b = 0; b < 3; b++) {
          const len = height * (0.16 + rand() * 0.1);
          const yaw = rand() * Math.PI * 2;
          const lift = trunkH * (0.55 + rand() * 0.35);
          const branch = mesh(branchGeo, barkMat, [x, groundY + lift, z], [0.08, len, 0.08], true);
          branch.rotation.order = "YXZ";
          branch.rotation.y = yaw;
          branch.rotation.z = 0.7 + rand() * 0.5;
          branch.position.x += Math.sin(yaw) * len * 0.25;
          branch.position.z += Math.cos(yaw) * len * 0.25;
        }
      }
      const count = far ? 5 : kind === "pine" ? 11 : 9;
      for (let i = 0; i < count; i++) {
        const mat = far ? farMat : kind === "pine" ? (i % 2 ? pineMat : pineMatB) : i % 2 ? broadMat : broadMatB;
        const spread = height * (kind === "pine" ? 0.2 : 0.28) * (far ? 0.8 : 1);
        const s = height * (kind === "pine" ? 0.2 : 0.24) * (0.65 + rand() * 0.7);
        const y = groundY + trunkH * 0.62 + rand() * height * 0.42;
        const cx = x + (rand() - 0.5) * spread * 2;
        const cz = z + (rand() - 0.5) * spread * 1.5;
        for (let p = 0; p < 3; p++) {
          const card = mesh(cardGeo, mat, [cx, y, cz], [s * (kind === "pine" ? 0.7 : 1), s * (0.75 + rand() * 0.45), 1], !far && i === 0 && p === 0);
          card.rotation.y = (p / 3) * Math.PI + rand() * 0.6;
          card.rotation.z = (rand() - 0.5) * 0.5;
          card.rotation.x = (rand() - 0.5) * 0.35;
        }
      }
    };

    const trees: [number, number, number, "pine" | "broad" | "far", number][] = [
      [-5.6, -30.2, 32, "pine", 3],
      [6.8, -33.4, 28, "broad", 8],
      [-8.4, -38.5, 26, "broad", 11],
      [2.2, -41.0, 30, "pine", 15],
      [-1.4, -46.5, 24, "broad", 18],
      [9.6, -44.2, 22, "pine", 21],
      [-11.2, -50.0, 27, "broad", 27],
      [4.4, -53.5, 25, "broad", 31],
      [-6.5, -56.0, 23, "pine", 36],
      [12.4, -49.5, 20, "broad", 40],
      [0.6, -60.5, 22, "far", 44],
      [-14.0, -64.0, 26, "far", 48],
      [8.2, -66.5, 24, "far", 52],
      [-3.5, -70.0, 20, "far", 57],
      [15.5, -62.0, 22, "far", 61],
      [-9.2, -74.0, 23, "far", 66],
      [3.8, -76.5, 21, "far", 70],
      [11.0, -73.0, 18, "far", 74],
      [-16.5, -71.0, 19, "far", 79],
    ];
    for (const [x, z, h, kind, seed] of trees) placeTree(x, z, h, kind, seed);

    const bushes: [number, number, number, number][] = [
      [-3.2, -27.4, 2.4, 101],
      [1.6, -28.8, 1.8, 108],
      [4.8, -29.6, 2.8, 112],
      [-6.8, -33.2, 2.2, 119],
      [3.4, -36.4, 3.1, 124],
      [-1.1, -34.8, 1.6, 130],
      [7.6, -39.2, 2.5, 136],
      [-4.4, -42.6, 2.9, 141],
      [5.5, -27.2, 1.5, 147],
    ];
    for (const [x, z, h, seed] of bushes) {
      const rand = rng(seed);
      const n = 4 + Math.floor(rand() * 2);
      for (let i = 0; i < n; i++) {
        const s = h * (0.85 + rand() * 0.7);
        const cx = x + (rand() - 0.5) * h;
        const cz = z + (rand() - 0.5) * h * 0.8;
        const y = groundY + s * 0.35;
        for (let p = 0; p < 3; p++) {
          const card = mesh(cardGeo, i % 2 ? broadMatB : broadMat, [cx, y, cz], [s, s * 0.7, 1], i === 0 && p === 0);
          card.rotation.y = (p / 3) * Math.PI + rand();
          card.rotation.x = (rand() - 0.5) * 0.4;
        }
      }
    }

    const rockBase = new THREE.IcosahedronGeometry(1, 2);
    geos.push(rockBase);
    const rocks: [number, number, number, number][] = [
      [-2.2, -28.1, 1.15, 201],
      [1.4, -31.4, 1.7, 208],
      [5.2, -36.8, 1.35, 214],
      [-6.1, -36.2, 1.55, 220],
      [8.4, -42.5, 2.1, 226],
      [-0.6, -39.4, 0.85, 233],
      [3.8, -47.2, 1.4, 240],
      [-8.8, -45.0, 1.9, 246],
      [6.2, -28.6, 0.7, 252],
    ];
    for (const [x, z, s, seed] of rocks) {
      const rand = rng(seed);
      const geo = rockBase.clone();
      const pos = geo.attributes.position;
      const sx = s * (0.85 + rand() * 0.7);
      const sy = s * (0.42 + rand() * 0.32);
      const sz = s * (0.75 + rand() * 0.55);
      for (let i = 0; i < pos.count; i++) {
        const n = 0.78 + rand() * 0.4;
        pos.setXYZ(i, pos.getX(i) * n * sx, pos.getY(i) * n * sy, pos.getZ(i) * n * sz);
      }
      geo.computeVertexNormals();
      geos.push(geo);
      const rock = mesh(geo, stoneMat, [x, groundY + sy * 0.35, z], [1, 1, 1], true);
      rock.rotation.set(rand() * 0.5, rand() * Math.PI, rand() * 0.35);
      if (rand() > 0.35) {
        const moss = s * 0.9;
        const cap = mesh(cardGeo, broadMatB, [x, groundY + 0.15, z], [moss, moss * 0.55, 1], false);
        cap.rotation.x = -1.1;
        cap.rotation.y = rand() * 2;
      }
    }

    const pathRand = rng(300);
    for (let i = 0; i < 9; i++) {
      const along = i / 8;
      const z = ENGAWA_OUTER_Z - 1.2 - along * 14.5 + (pathRand() - 0.5) * 0.45;
      const x = 0.6 + Math.sin(along * 2.4) * 1.7 + (pathRand() - 0.5) * 0.35;
      const s = 0.7 + pathRand() * 0.55;
      const stoneGeo = rockBase.clone();
      const stonePos = stoneGeo.attributes.position;
      const sy = 0.14 + pathRand() * 0.05;
      for (let v = 0; v < stonePos.count; v++) {
        const n = 0.9 + pathRand() * 0.18;
        stonePos.setXYZ(v, stonePos.getX(v) * n * s * 1.2, stonePos.getY(v) * n * sy, stonePos.getZ(v) * n * s * 0.85);
      }
      stoneGeo.computeVertexNormals();
      geos.push(stoneGeo);
      const stone = mesh(stoneGeo, stoneMat, [x, groundY + sy * 0.4, z], [1, 1, 1], false);
      stone.rotation.y = pathRand() * Math.PI;
    }

    const mossPatch = new THREE.CircleGeometry(1, 16);
    geos.push(mossPatch);
    const patchMat = addMat(
      new THREE.MeshStandardMaterial({
        color: "#5a6b44",
        roughness: 1,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    for (const [x, z, s] of [
      [-1.2, -30.5, 2.4],
      [2.6, -34.2, 3.1],
      [-4.8, -40.0, 2.8],
      [6.4, -38.6, 2.2],
      [0.2, -44.8, 3.4],
      [-7.2, -32.4, 1.8],
    ] as [number, number, number][]) {
      const patch = mesh(mossPatch, patchMat, [x, groundY + 0.03, z], [s, s, 1], false);
      patch.rotation.x = -Math.PI / 2;
      patch.castShadow = false;
    }

    const addLantern = (x: number, z: number, scale: number) => {
      const g = new THREE.Group();
      g.position.set(x, groundY, z);
      g.scale.setScalar(scale);
      const part = (geo: THREE.BufferGeometry, pos: [number, number, number], mat: THREE.Material = lanternMat) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(pos[0], pos[1], pos[2]);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
        return m;
      };
      const base = new THREE.BoxGeometry(2.1, 0.55, 2.1);
      const post = new THREE.CylinderGeometry(0.28, 0.34, 2.1, 10);
      const chamber = new THREE.BoxGeometry(1.45, 1.25, 1.45);
      const window = new THREE.BoxGeometry(0.7, 0.55, 0.08);
      const roof = new THREE.ConeGeometry(1.25, 0.85, 16);
      const cap = new THREE.SphereGeometry(0.16, 8, 6);
      geos.push(base, post, chamber, window, roof, cap);
      part(base, [0, 0.28, 0]);
      part(post, [0, 1.55, 0]);
      part(chamber, [0, 3.15, 0]);
      const glow = addMat(
        new THREE.MeshStandardMaterial({
          color: "#e7b070",
          emissive: "#c47a3a",
          emissiveIntensity: 0.55,
          roughness: 0.6,
        }),
      );
      part(window, [0, 3.15, 0.74], glow);
      part(roof, [0, 4.15, 0]);
      part(cap, [0, 4.7, 0]);
      root.add(g);
    };
    addLantern(4.15, -32.2, 1.55);
    addLantern(-2.8, -49.5, 1.15);

    const ridgeMatNear = addMat(
      new THREE.MeshStandardMaterial({ color: "#7f9186", roughness: 1, metalness: 0, envMapIntensity: 0.05 }),
    );
    const ridgeMatFar = addMat(
      new THREE.MeshStandardMaterial({ color: "#a9b6ae", roughness: 1, metalness: 0, envMapIntensity: 0.04 }),
    );
    const addRidge = (z: number, width: number, height: number, mat: THREE.Material, seed: number) => {
      const geo = new THREE.PlaneGeometry(width, height, 48, 8);
      const pos = geo.attributes.position;
      const rand = rng(seed);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const ny = y / height + 0.5;
        const crest = Math.sin(x * 0.11 + seed) * 2.4 + Math.sin(x * 0.27) * 1.3;
        pos.setY(i, y + crest * Math.max(0, ny - 0.45) + (rand() - 0.5) * 0.15);
        pos.setZ(i, Math.sin(x * 0.19 + ny) * 1.6 * ny);
      }
      geo.computeVertexNormals();
      geos.push(geo);
      const ridge = new THREE.Mesh(geo, mat);
      ridge.position.set(0, groundY + height * 0.42, z);
      ridge.receiveShadow = true;
      root.add(ridge);
    };
    addRidge(-78, 76, 18, ridgeMatNear, 4);
    addRidge(-92, 96, 24, ridgeMatFar, 9);
    addRidge(-108, 120, 20, ridgeMatFar, 13);

    const skyMap = keep(
      canvasTex((ctx, w, h) => {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#8eb4c4");
        sky.addColorStop(0.38, "#c5dce0");
        sky.addColorStop(0.7, "#e7f0ea");
        sky.addColorStop(1, "#d5e2da");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        const rand = rng(17);
        for (let i = 0; i < 16; i++) {
          const x = rand() * w;
          const y = h * (0.08 + rand() * 0.42);
          const r = 50 + rand() * 120;
          const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
          g.addColorStop(0, "rgba(255,255,255,0.22)");
          g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g;
          ctx.fillRect(x - r, y - r * 0.45, r * 2, r);
        }
      }, 1024, 512),
    );
    const skyMat = addMat(
      new THREE.MeshBasicMaterial({ map: skyMap, side: THREE.BackSide, depthWrite: false, fog: false }),
    );
    const skyGeo = new THREE.SphereGeometry(160, 28, 16);
    geos.push(skyGeo);
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.set(0, 18, -24);
    sky.renderOrder = -2;
    root.add(sky);

    root.traverse((obj) => {
      obj.raycast = () => undefined;
    });
    return { root, geos, mats, textures };
  }, [floorY]);

  useEffect(
    () => () => {
      built.geos.forEach((geo) => geo.dispose());
      built.mats.forEach((material) => material.dispose());
      built.textures.forEach((tex) => tex.dispose());
    },
    [built],
  );

  return <primitive object={built.root} />;
}
