"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ENGAWA_DEPTH, ENGAWA_OUTER_Z, GARDEN_DROP, JAMB_X, POST, ROOM_BACK_Z, ROOM_FRONT_Z, ROOM_HALF_W, WALL_T } from "./houseLayout";

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

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
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

/**
 * One washitsu: posts, beams, plaster, shoji in their tracks, threshold, and the engawa beyond.
 * The garden continues past the veranda.
 */
export function Washitsu({ floorY }: { floorY: number }) {
  const built = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];
    const root = new THREE.Group();
    const keep = (tex: THREE.Texture) => {
      textures.push(tex);
      return tex;
    };
    const addMat = <T extends THREE.Material>(material: T) => {
      mats.push(material);
      return material;
    };

    const woodMap = keep(
      canvasTex((ctx, w, h) => {
        const rand = rng(4);
        ctx.fillStyle = "#6a4b32";
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 28; i++) {
          const x = (i + rand()) * (w / 28);
          ctx.strokeStyle = rand() > 0.5 ? "rgba(48,28,16,0.45)" : "rgba(140,100,64,0.35)";
          ctx.lineWidth = 1 + rand() * 2.5;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.bezierCurveTo(x + rand() * 8, h * 0.35, x - rand() * 6, h * 0.7, x + rand() * 4, h);
          ctx.stroke();
        }
      }, 128, 256),
    );
    woodMap.repeat.set(1, 2);
    const woodNormal = keep(normalFrom((x, y) => Math.sin(x * 0.45) * 0.35 + hash(x * 0.08, y * 0.02) * 0.25, 64, 1.3));
    woodNormal.repeat.set(1, 2);
    const wood = addMat(
      new THREE.MeshStandardMaterial({
        map: woodMap,
        normalMap: woodNormal,
        normalScale: new THREE.Vector2(0.28, 0.28),
        roughness: 0.74,
        metalness: 0.02,
        envMapIntensity: 0.22,
      }),
    );
    const beam = addMat(
      new THREE.MeshStandardMaterial({
        color: "#7a5840",
        map: woodMap,
        normalMap: woodNormal,
        normalScale: new THREE.Vector2(0.22, 0.22),
        roughness: 0.7,
        metalness: 0.02,
        envMapIntensity: 0.22,
      }),
    );

    const deckMap = keep(
      canvasTex((ctx, w, h) => {
        ctx.fillStyle = "#6d4e34";
        ctx.fillRect(0, 0, w, h);
        const rand = rng(29);
        const rows = 12;
        for (let i = 0; i < rows; i++) {
          const y = (i * h) / rows;
          ctx.fillStyle = i % 2 ? "#7c5a3c" : "#5e412c";
          ctx.fillRect(0, y, w, h / rows - 1);
          ctx.strokeStyle = "rgba(36,20,10,0.55)";
          ctx.strokeRect(0.5, y + 0.5, w - 1, h / rows - 2);
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          const x = rand() * w;
          ctx.moveTo(x, y + 2);
          ctx.lineTo(x + rand() * 16, y + h / rows - 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }, 256, 512),
    );
    const deck = addMat(
      new THREE.MeshStandardMaterial({
        map: deckMap,
        normalMap: woodNormal,
        normalScale: new THREE.Vector2(0.2, 0.2),
        roughness: 0.76,
        metalness: 0.02,
        envMapIntensity: 0.22,
      }),
    );

    const plasterMap = keep(
      canvasTex((ctx, w, h) => {
        ctx.fillStyle = "#e6dccb";
        ctx.fillRect(0, 0, w, h);
        const rand = rng(8);
        for (let i = 0; i < 80; i++) {
          const x = rand() * w;
          const y = rand() * h;
          const r = 20 + rand() * 50;
          const g = ctx.createRadialGradient(x, y, 2, x, y, r);
          g.addColorStop(0, rand() > 0.5 ? "rgba(120,100,70,0.08)" : "rgba(255,250,240,0.16)");
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
      }, 256, 256),
    );
    plasterMap.repeat.set(2, 2);
    const plaster = addMat(
      new THREE.MeshStandardMaterial({
        map: plasterMap,
        roughness: 0.96,
        metalness: 0,
        envMapIntensity: 0.16,
      }),
    );

    const washiMap = keep(
      canvasTex((ctx, w, h) => {
        ctx.fillStyle = "#f3e7d0";
        ctx.fillRect(0, 0, w, h);
        const rand = rng(11);
        for (let i = 0; i < 900; i++) {
          ctx.strokeStyle = rand() > 0.7 ? "rgba(150,120,70,0.18)" : "rgba(255,252,245,0.2)";
          ctx.lineWidth = rand() > 0.85 ? 1.2 : 0.4;
          ctx.beginPath();
          const y = rand() * h;
          ctx.moveTo(0, y);
          ctx.lineTo(w, y + (rand() - 0.5) * 6);
          ctx.stroke();
        }
      }, 256, 256),
    );
    const paper = addMat(
      new THREE.MeshPhysicalMaterial({
        map: washiMap,
        color: "#fff6e8",
        roughness: 0.84,
        metalness: 0,
        transmission: 0.62,
        thickness: 0.2,
        transparent: true,
        side: THREE.DoubleSide,
        envMapIntensity: 0.2,
      }),
    );

    const track = addMat(new THREE.MeshStandardMaterial({ color: "#2c1e14", roughness: 0.86, metalness: 0 }));
    const cloth = addMat(new THREE.MeshStandardMaterial({ color: "#4e463c", roughness: 0.94, metalness: 0 }));
    const clay = addMat(new THREE.MeshStandardMaterial({ color: "#cbb89a", roughness: 0.42, metalness: 0.02, envMapIntensity: 0.12 }));

    const box = (material: THREE.Material, size: [number, number, number], pos: [number, number, number], shadow = true) => {
      const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
      geos.push(geo);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };

    const ceilY = floorY + 19.2;
    const kamoiH = 0.95;
    const kamoiBottom = floorY + 14.5;
    const kamoiY = kamoiBottom + kamoiH / 2;
    const shikiiH = 0.42;
    const shikiiY = floorY + shikiiH / 2;
    const wallZ = ROOM_BACK_Z - WALL_T / 2;
    const roomH = ceilY - floorY;
    const roomMidY = floorY + roomH / 2;

    const postXs = [-ROOM_HALF_W, -JAMB_X, JAMB_X, ROOM_HALF_W];
    for (const x of postXs) {
      box(wood, [POST, roomH, POST], [x, roomMidY, wallZ]);
    }
    for (const x of [-ROOM_HALF_W, ROOM_HALF_W]) {
      box(wood, [POST, roomH, POST], [x, roomMidY, ROOM_FRONT_Z - WALL_T / 2]);
    }

    const segments: [number, number][] = [
      [-ROOM_HALF_W, -JAMB_X],
      [-JAMB_X, JAMB_X],
      [JAMB_X, ROOM_HALF_W],
    ];
    for (const [a, b] of segments) {
      const span = b - a - POST;
      const mid = (a + b) / 2;
      const deep = a < 0 && b > 0 ? 1.5 : WALL_T;
      box(beam, [span, kamoiH, deep], [mid, kamoiY, wallZ]);
      box(wood, [span, shikiiH, WALL_T + 0.35], [mid, shikiiY, wallZ + 0.12]);
      const plasterBottom = kamoiY + kamoiH / 2;
      const plasterH = ceilY - plasterBottom;
      box(plaster, [span, plasterH, WALL_T * 0.92], [mid, plasterBottom + plasterH / 2, wallZ], false);
    }

    const addShoji = (x: number, z: number) => {
      const w = ROOM_HALF_W - JAMB_X - POST - 0.22;
      const h = kamoiBottom - (floorY + shikiiH) + 0.1;
      const y = floorY + shikiiH + h / 2;
      const d = 0.34;
      const stile = 0.16;
      const rail = 0.2;
      box(wood, [stile, h, d], [x - w / 2 + stile / 2, y, z]);
      box(wood, [stile, h, d], [x + w / 2 - stile / 2, y, z]);
      box(wood, [w, rail, d], [x, y + h / 2 - rail / 2, z]);
      box(wood, [w, rail, d], [x, y - h / 2 + rail / 2, z]);
      const pw = w - stile * 2;
      const ph = h - rail * 2;
      const paperGeo = new THREE.PlaneGeometry(pw, ph);
      geos.push(paperGeo);
      const sheet = new THREE.Mesh(paperGeo, paper);
      sheet.position.set(x, y, z - 0.02);
      sheet.castShadow = false;
      sheet.receiveShadow = true;
      root.add(sheet);
      const cols = 4;
      const rows = 6;
      for (let c = 1; c < cols; c++) {
        const cx = x - pw / 2 + (pw * c) / cols;
        box(wood, [0.045, ph, 0.06], [cx, y, z + 0.12]);
      }
      for (let r = 1; r < rows; r++) {
        const ry = y - ph / 2 + (ph * r) / rows;
        box(wood, [pw, 0.045, 0.05], [x, ry, z + 0.15]);
      }
    };

    const bayMid = (-ROOM_HALF_W - JAMB_X) / 2;
    addShoji(bayMid, wallZ + 0.42);
    addShoji(bayMid, wallZ + 0.08);
    addShoji(-bayMid, wallZ + 0.42);
    addShoji(-bayMid, wallZ + 0.08);

    const sideLen = ROOM_FRONT_Z - ROOM_BACK_Z;
    const sideZ = (ROOM_FRONT_Z + ROOM_BACK_Z) / 2;
    for (const side of [-1, 1]) {
      const x = side * (ROOM_HALF_W + WALL_T / 2);
      box(plaster, [WALL_T, roomH, sideLen], [x, roomMidY, sideZ], false);
      const nageshiY = floorY + 11.4;
      box(beam, [0.28, 0.48, sideLen - POST], [side * (ROOM_HALF_W - 0.16), nageshiY, sideZ]);
      box(wood, [0.22, 0.55, sideLen - 0.2], [side * (ROOM_HALF_W - 0.12), floorY + 0.28, sideZ]);
    }
    box(plaster, [ROOM_HALF_W * 2, roomH, WALL_T], [0, roomMidY, ROOM_FRONT_Z - WALL_T / 2], false);

    const ceilGeo = new THREE.BoxGeometry(ROOM_HALF_W * 2 + WALL_T * 2, 0.28, sideLen + WALL_T);
    geos.push(ceilGeo);
    const ceiling = new THREE.Mesh(ceilGeo, beam);
    ceiling.position.set(0, ceilY, sideZ);
    ceiling.receiveShadow = true;
    root.add(ceiling);
    for (const z of [-8, 2, 14]) {
      box(wood, [ROOM_HALF_W * 2 - POST, 0.55, 0.62], [0, ceilY - 0.4, z]);
    }

    const deckZ = (ROOM_BACK_Z - WALL_T + ENGAWA_OUTER_Z) / 2;
    box(deck, [ROOM_HALF_W * 2 + POST, 0.22, ENGAWA_DEPTH], [0, floorY - 0.12, deckZ]);
    box(wood, [ROOM_HALF_W * 2 + POST, 0.28, 0.36], [0, floorY - 0.42, ENGAWA_OUTER_Z + 0.15]);
    const stepY = floorY - GARDEN_DROP * 0.45;
    box(deck, [JAMB_X * 2, GARDEN_DROP * 0.7, 1.15], [0, stepY, ENGAWA_OUTER_Z - 0.45]);

    const eaveY = kamoiY + 0.15;
    const eaveDepth = ENGAWA_DEPTH + WALL_T;
    const eaveZ = ROOM_BACK_Z - WALL_T / 2 - eaveDepth / 2 + 0.2;
    box(beam, [ROOM_HALF_W * 2 + POST * 2, 0.38, eaveDepth], [0, eaveY, eaveZ]);
    const outerPostH = eaveY - (floorY - 0.12);
    for (const x of postXs) {
      box(wood, [POST * 0.85, outerPostH, POST * 0.85], [x, floorY - 0.12 + outerPostH / 2, ENGAWA_OUTER_Z]);
    }
    const railH = 3.15;
    box(wood, [JAMB_X * 2 - POST, 0.12, 0.14], [0, floorY + railH, ENGAWA_OUTER_Z + 0.15]);
    box(wood, [JAMB_X * 2 - POST, 0.1, 0.12], [0, floorY + 1.35, ENGAWA_OUTER_Z + 0.15]);

    for (const x of postXs) {
      box(wood, [POST + 0.22, 0.18, POST + 0.22], [x, kamoiBottom - 0.02, wallZ]);
    }
    box(track, [JAMB_X * 2 - POST, 0.05, 0.1], [0, floorY + shikiiH, wallZ + 0.34]);
    box(track, [JAMB_X * 2 - POST, 0.05, 0.1], [0, kamoiBottom, wallZ + 0.34]);
    for (const side of [-1, 1]) {
      box(wood, [0.1, 0.05, sideLen - POST], [side * (ROOM_HALF_W - 0.08), floorY + 0.06, sideZ], false);
    }
    box(cloth, [3.2, 0.12, 3.2], [-9.4, floorY + 0.08, 9.6], false);
    box(wood, [1.5, 0.08, 0.9], [ROOM_HALF_W - 0.85, floorY + 2.2, 6.5], false);
    const cupGeo = new THREE.CylinderGeometry(0.16, 0.13, 0.38, 12);
    geos.push(cupGeo);
    const cup = new THREE.Mesh(cupGeo, clay);
    cup.position.set(ROOM_HALF_W - 0.85, floorY + 2.42, 6.5);
    cup.castShadow = true;
    cup.receiveShadow = true;
    root.add(cup);

    root.traverse((obj) => {
      obj.raycast = () => undefined;
    });
    return { root, geos, mats, textures };
  }, [floorY]);

  if (built.root.userData.sunRev !== 1) {
    built.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      if (!mat?.isMeshPhysicalMaterial || mat.transmission <= 0) return;
      mat.transmission = 0.62;
      mat.roughness = 0.78;
      mat.emissive.set("#fff3dc");
      mat.emissiveIntensity = 0.12;
      mesh.castShadow = false;
      mat.needsUpdate = true;
    });
    built.root.userData.sunRev = 1;
  }

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
