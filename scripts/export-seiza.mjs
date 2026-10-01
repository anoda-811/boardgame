import { mkdirSync, writeFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

const root = new THREE.Group();
root.name = "seiza";

function material(name, color, roughness, extra = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    name,
    color,
    roughness,
    metalness: 0,
    ...extra,
  });
  mat.name = name;
  return mat;
}

const skin = material("skin", "#d2a184", 0.42, { sheen: 0.35, sheenRoughness: 0.55, sheenColor: new THREE.Color("#ffd2bc") });
const hair = material("hair", "#1b1614", 0.62);
const cloth = material("cloth", "#3e4c3c", 0.78);
const pants = material("pants", "#1a1c20", 0.84);
const sclera = material("sclera", "#f3ece6", 0.28);
const iris = material("iris", "#2a1c14", 0.35);

function addEllipsoid(name, mat, cx, cy, cz, rx, ry, rz, stacks = 16, slices = 24, clip) {
  const geo = new THREE.SphereGeometry(1, slices, stacks);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, cx + pos.getX(i) * rx, cy + pos.getY(i) * ry, cz + pos.getZ(i) * rz);
  }
  geo.computeVertexNormals();
  if (clip) {
    const index = geo.index;
    const keep = [];
    const normal = geo.attributes.normal;
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      const nx = (normal.getX(a) + normal.getX(index.getX(i + 1)) + normal.getX(index.getX(i + 2))) / 3;
      const ny = (normal.getY(a) + normal.getY(index.getY(i + 1)) + normal.getY(index.getY(i + 2))) / 3;
      const nz = (normal.getZ(a) + normal.getZ(index.getZ(i + 1)) + normal.getZ(index.getZ(i + 2))) / 3;
      if (clip(nx, ny, nz)) keep.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
    }
    geo.setIndex(keep);
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
}

function addLimb(name, mat, x0, y0, z0, x1, y1, z1, radius) {
  const start = new THREE.Vector3(x0, y0, z0);
  const end = new THREE.Vector3(x1, y1, z1);
  const dir = end.clone().sub(start);
  const len = dir.length();
  const geo = new THREE.CapsuleGeometry(radius, Math.max(0.001, len), 8, 16);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.position.copy(mid);
  mesh.quaternion.copy(quat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
}

const H = 1;
const y = (t) => t * H;
const headRy = 0.1;
const headRx = headRy * 0.78;
const headRz = headRy * 0.9;
const headY = y(0.58);
const headZ = -0.02;

addEllipsoid("skin", skin, 0, headY, headZ, headRx, headRy, headRz, 20, 28);
addEllipsoid(
  "hair",
  hair,
  0,
  headY + headRy * 0.08,
  headZ - headRz * 0.06,
  headRx * 1.05,
  headRy * 1.04,
  headRz * 1.06,
  18,
  24,
  (nx, ny, nz) => ny > 0.08 || nz < 0.15 || Math.abs(nx) > 0.72,
);
addEllipsoid("hair", hair, 0, headY + headRy * 0.42, headZ + headRz * 0.35, headRx * 0.9, headRy * 0.14, headRz * 0.25, 8, 12);
addEllipsoid("skin", skin, 0, headY - headRy * 0.72, headZ + headRz * 0.2, headRx * 0.46, headRy * 0.18, headRz * 0.4, 8, 12);

const eyeY = headY + headRy * 0.02;
const eyeZ = headZ + headRz * 0.92;
for (const s of [-1, 1]) {
  addEllipsoid("sclera", sclera, s * headRx * 0.34, eyeY, eyeZ, headRx * 0.16, headRy * 0.07, headRz * 0.05, 8, 10);
  addEllipsoid("iris", iris, s * headRx * 0.34, eyeY, eyeZ + 0.012, headRx * 0.07, headRy * 0.07, headRz * 0.03, 8, 10);
  addEllipsoid("hair", hair, s * headRx * 0.34, eyeY + headRy * 0.16, eyeZ, headRx * 0.18, headRy * 0.03, headRz * 0.04, 4, 8);
  addEllipsoid("skin", skin, s * headRx * 1.02, headY, headZ, headRx * 0.09, headRy * 0.16, headRz * 0.07, 8, 10);
}
addEllipsoid("skin", skin, 0, headY - headRy * 0.1, headZ + headRz * 1.02, headRx * 0.1, headRy * 0.14, headRz * 0.12, 8, 10);
addEllipsoid("skin", skin, 0, headY - headRy * 0.4, headZ + headRz * 0.88, headRx * 0.16, headRy * 0.022, headRz * 0.04, 4, 8);

addEllipsoid("skin", skin, 0, headY - headRy * 0.95, headZ - 0.01, headRx * 0.36, 0.035, headRz * 0.34, 8, 12);

const chestRx = 0.13;
const chestRy = 0.078;
const chestRz = 0.055;
const chestY = y(0.38);
const chestZ = -0.05;
addEllipsoid("cloth", cloth, 0, chestY, chestZ, chestRx, chestRy, chestRz, 18, 24);
addEllipsoid("cloth", cloth, 0, y(0.26), chestZ - 0.01, chestRx * 0.88, 0.045, chestRz * 0.95, 10, 16);

for (const s of [-1, 1]) {
  const shoulder = [s * 0.115, chestY + chestRy * 0.2, chestZ];
  const elbow = [s * 0.13, y(0.28), chestZ + 0.01];
  const hand = [s * 0.05, y(0.16), -0.02];
  addLimb("cloth", cloth, ...shoulder, ...elbow, 0.036);
  addLimb("cloth", cloth, ...elbow, ...hand, 0.028);
  addEllipsoid("skin", skin, hand[0], hand[1] - 0.006, hand[2] + 0.012, 0.032, 0.012, 0.02, 8, 10);
  // Seiza: the shin and the top of the foot lie flat on the floor.
  // y=0 is the cushion. The shin center sits one radius above it.
  const shinY = 0.03;
  const hip = [s * 0.046, y(0.15), -0.03];
  const knee = [s * 0.088, shinY + 0.008, 0.015];
  const heel = [s * 0.036, shinY, -0.15];
  addLimb("pants", pants, ...hip, ...knee, 0.048);
  addEllipsoid("pants", pants, knee[0], knee[1], knee[2], 0.05, 0.034, 0.042, 10, 12);
  addLimb("pants", pants, knee[0], shinY, knee[2] - 0.02, heel[0], shinY, heel[2], 0.028);
  addEllipsoid("pants", pants, heel[0], 0.016, heel[2] - 0.02, 0.04, 0.016, 0.055, 8, 10);
}

class FileReaderPolyfill {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:application/octet-stream;base64,${Buffer.from(buffer).toString("base64")}`;
      this.onloadend?.();
    });
  }
}
globalThis.FileReader = FileReaderPolyfill;

const exporter = new GLTFExporter();
const data = await exporter.parseAsync(root, { binary: true });
mkdirSync("public/models", { recursive: true });
writeFileSync("public/models/seiza.glb", Buffer.from(data));
console.log("wrote public/models/seiza.glb", data.byteLength);
