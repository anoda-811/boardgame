import fs from "node:fs";

const raw = JSON.parse(fs.readFileSync(process.env.TEMP + "/japan-pref.geojson", "utf8"));

function ringArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(sum) / 2;
}

function centroid(ring) {
  let x = 0;
  let y = 0;
  for (const point of ring) {
    x += point[0];
    y += point[1];
  }
  return [x / ring.length, y / ring.length];
}

function distPoint(point, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return Math.abs(dy * point[0] - dx * point[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

function simplify(points, epsilon) {
  if (points.length < 3) return points;
  let max = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i += 1) {
    const distance = distPoint(points[i], points[0], points[end]);
    if (distance > max) {
      max = distance;
      index = i;
    }
  }
  if (max > epsilon) {
    const left = simplify(points.slice(0, index + 1), epsilon);
    const right = simplify(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

function inMain(point) {
  const [lon, lat] = point;
  return lat >= 30.1 && lat <= 45.7 && lon >= 129 && lon <= 146.2;
}

const mid = (37 * Math.PI) / 180;
const xScale = Math.cos(mid);

function projectMain(lon, lat) {
  return [lon * xScale, -lat];
}

const shapes = [];

for (const feature of raw.features) {
  const id = feature.properties.id;
  const full = feature.properties.nam_ja;
  const name = full === "北海道" ? "北海道" : full === "東京都" ? "江戸" : full.replace(/[都道府県]$/, "");
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates[0]]
      : feature.geometry.coordinates.map((polygon) => polygon[0]);
  const kept = [];
  for (const ring of polygons) {
    const center = centroid(ring);
    const area = ringArea(ring);
    if (id === 47) {
      if (center[1] < 29 && center[0] > 126 && center[0] < 130 && area > 0.002) kept.push({ ring, area, center });
    } else if (inMain(center) && area > 0.001) {
      kept.push({ ring, area, center });
    }
  }
  kept.sort((a, b) => b.area - a.area);
  const largest = kept[0]?.area ?? 0;
  const used = kept.filter((item) => item.area > largest * 0.04).slice(0, 4);
  if (used.length === 0) {
    console.error("missing", id, name);
    continue;
  }
  shapes.push({ id, name, rings: used.map((item) => item.ring) });
}

const mainPoints = [];
for (const shape of shapes) {
  if (shape.id === 47) continue;
  for (const ring of shape.rings) {
    for (const point of ring) mainPoints.push(projectMain(point[0], point[1]));
  }
}
const xs = mainPoints.map((point) => point[0]);
const ys = mainPoints.map((point) => point[1]);
const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const minY = Math.min(...ys);
const maxY = Math.max(...ys);
const pad = 18;
const width = 640;
const height = 760;

function fitMain(lon, lat) {
  const [x, y] = projectMain(lon, lat);
  return [
    pad + ((x - minX) / (maxX - minX)) * (width - pad * 2),
    pad + ((y - minY) / (maxY - minY)) * (height - 120),
  ];
}

function fitOkinawa(lon, lat) {
  const x = 36 + ((lon - 126.6) / (128.4 - 126.6)) * 110;
  const y = 690 + ((28.6 - lat) / (28.6 - 26.0)) * 78;
  return [x, y];
}

function pathFor(rings, project) {
  return rings
    .map((ring) => {
      const open = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
        ? ring.slice(0, -1)
        : ring;
      const simplified = simplify(open, 0.03);
      const points = simplified.map((point) => project(point[0], point[1]));
      const head = points[0];
      let d = `M${head[0].toFixed(1)} ${head[1].toFixed(1)}`;
      for (let i = 1; i < points.length; i += 1) {
        d += `L${points[i][0].toFixed(1)} ${points[i][1].toFixed(1)}`;
      }
      return `${d}Z`;
    })
    .join("");
}

function centerOf(d) {
  const nums = [...d.matchAll(/-?\d+\.?\d*/g)].map(Number);
  let x = 0;
  let y = 0;
  let n = 0;
  for (let i = 0; i < nums.length; i += 2) {
    x += nums[i];
    y += nums[i + 1];
    n += 1;
  }
  return [+(x / n).toFixed(1), +(y / n).toFixed(1)];
}

const out = shapes
  .sort((a, b) => a.id - b.id)
  .map((shape) => {
    const d = pathFor(shape.rings, shape.id === 47 ? fitOkinawa : fitMain);
    const [cx, cy] = centerOf(d);
    return { id: shape.id, name: shape.name, d, cx, cy };
  });

const body = `export type PrefShape = { id: number; name: string; d: string; cx: number; cy: number };

export const PREFECTURES: PrefShape[] = ${JSON.stringify(out)};
`;

fs.writeFileSync(new URL("../lib/hanafuda/prefectures.ts", import.meta.url), body);
console.log("prefectures", out.length, "bytes", body.length);
