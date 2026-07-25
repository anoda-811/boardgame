import type { HanafudaCard } from "@/lib/hanafuda/cards";
import { useId } from "react";

/** Traditional-ish hanafuda face art (viewBox 70×100). */
export function CardArt({ card }: { card: HanafudaCard }) {
  const kasuVariant = Number(card.id.split("-")[1] ?? 0);

  return (
    <svg
      viewBox="0 0 70 100"
      className="h-full w-full"
      aria-hidden
      shapeRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id={`paper-${card.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff8ea" />
          <stop offset="55%" stopColor="#f4e8d0" />
          <stop offset="100%" stopColor="#ead9b8" />
        </linearGradient>
        <radialGradient id={`glow-${card.id}`} cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect
        x="1.5"
        y="1.5"
        width="67"
        height="97"
        rx="3.5"
        fill={`url(#paper-${card.id})`}
        stroke="#c9b48a"
        strokeWidth="1.2"
      />
      <rect
        x="4"
        y="4"
        width="62"
        height="92"
        rx="2"
        fill="none"
        stroke="#d7c4a0"
        strokeWidth="0.6"
        opacity="0.7"
      />
      <rect x="1.5" y="1.5" width="67" height="97" rx="3.5" fill={`url(#glow-${card.id})`} />

      <MonthScene month={card.month} kasuVariant={kasuVariant} kind={card.kind} />
      <FeatureMotif card={card} />

      {card.kind === "bright" && (
        <circle cx="58" cy="12" r="5.5" fill="#c4a35a" opacity="0.9" />
      )}
      {card.kind === "bright" && (
        <text
          x="58"
          y="14.2"
          textAnchor="middle"
          fontSize="6"
          fill="#fff8ea"
          fontFamily="serif"
        >
          光
        </text>
      )}
    </svg>
  );
}

function MonthScene({
  month,
  kasuVariant,
  kind,
}: {
  month: number;
  kasuVariant: number;
  kind: HanafudaCard["kind"];
}) {
  const dense = kind === "chaff";
  switch (month) {
    case 1:
      return <Pine dense={dense} variant={kasuVariant} />;
    case 2:
      return <Plum dense={dense} variant={kasuVariant} />;
    case 3:
      return <Cherry dense={dense} variant={kasuVariant} />;
    case 4:
      return <Wisteria dense={dense} variant={kasuVariant} />;
    case 5:
      return <Iris dense={dense} variant={kasuVariant} />;
    case 6:
      return <Peony dense={dense} variant={kasuVariant} />;
    case 7:
      return <Clover dense={dense} variant={kasuVariant} />;
    case 8:
      return <Susuki dense={dense} variant={kasuVariant} />;
    case 9:
      return <Chrysanthemum dense={dense} variant={kasuVariant} />;
    case 10:
      return <Maple dense={dense} variant={kasuVariant} />;
    case 11:
      return <Willow dense={dense} variant={kasuVariant} />;
    case 12:
      return <Paulownia dense={dense} variant={kasuVariant} />;
    default:
      return null;
  }
}

function FeatureMotif({ card }: { card: HanafudaCard }) {
  if (card.kind === "ribbon") {
    return <Ribbon ribbon={card.ribbon ?? "plain"} poetry={card.ribbon === "red-poetry"} />;
  }

  switch (card.name) {
    case "鶴":
      return <Crane />;
    case "鶯":
      return <Warbler />;
    case "幕":
      return <Curtain />;
    case "不如帰":
      return <Cuckoo />;
    case "八橋":
      return <Bridge />;
    case "蝶":
      return <Butterfly />;
    case "猪":
      return <Boar />;
    case "月":
      return <Moon />;
    case "雁":
      return <Geese />;
    case "盃":
      return <SakeCup />;
    case "鹿":
      return <Deer />;
    case "小野道風":
      return <RainMan />;
    case "燕":
      return <Swallow />;
    case "鳳凰":
      return <Phoenix />;
    default:
      return null;
  }
}

/* ---------- month flora ---------- */

function Pine({ dense, variant }: { dense: boolean; variant: number }) {
  return (
    <g>
      <path
        d="M12 92 C20 70 22 55 28 40 C24 52 18 62 14 78 Z"
        fill="#2f5c3a"
      />
      <path
        d="M28 40 C34 28 40 34 36 48 C42 36 48 42 44 58 C50 48 54 56 50 70 C46 82 38 90 28 92 Z"
        fill="#3f7348"
      />
      <path d="M34 55 L36 92" stroke="#5a3a22" strokeWidth="1.6" />
      {dense && variant % 2 === 1 && (
        <path d="M48 92 C52 78 56 68 60 58 C58 70 54 80 50 92 Z" fill="#2f5c3a" />
      )}
      <circle cx="22" cy="58" r="1.4" fill="#c45c5c" />
      <circle cx="40" cy="50" r="1.3" fill="#c45c5c" />
      {dense && <circle cx="46" cy="66" r="1.2" fill="#c45c5c" />}
    </g>
  );
}

function Plum({ dense, variant }: { dense: boolean; variant: number }) {
  return (
    <g>
      <path d="M18 92 C22 70 20 52 16 40" stroke="#5a3a22" strokeWidth="2" fill="none" />
      <path d="M18 60 C28 52 36 58 42 48" stroke="#5a3a22" strokeWidth="1.4" fill="none" />
      <Blossom cx={20} cy={48} r={7} color="#e8a0b8" />
      <Blossom cx={34} cy={42} r={6} color="#f0b8c8" />
      <Blossom cx={28} cy={62} r={5.5} color="#d988a4" />
      {(dense || variant > 1) && <Blossom cx={48} cy={56} r={5} color="#e8a0b8" />}
      {dense && variant % 2 === 0 && <Blossom cx={42} cy={74} r={4.5} color="#f0b8c8" />}
    </g>
  );
}

function Cherry({ dense, variant }: { dense: boolean; variant: number }) {
  return (
    <g>
      <path d="M14 92 C24 74 30 58 38 44" stroke="#6b4428" strokeWidth="1.8" fill="none" />
      <path d="M38 52 C46 46 52 52 58 44" stroke="#6b4428" strokeWidth="1.2" fill="none" />
      <Blossom cx={30} cy={50} r={7} color="#f4c2d0" />
      <Blossom cx={44} cy={40} r={6.5} color="#ffd6e2" />
      <Blossom cx={52} cy={56} r={5.5} color="#efadc0" />
      {dense && <Blossom cx={24} cy={68} r={5} color="#f4c2d0" />}
      {dense && variant % 2 === 1 && <Blossom cx={40} cy={72} r={4.5} color="#ffd6e2" />}
      <circle cx={18} cy={36} r={1.2} fill="#f4c2d0" opacity="0.7" />
      <circle cx={58} cy={30} r={1} fill="#f4c2d0" opacity="0.55" />
    </g>
  );
}

function Wisteria({ dense, variant }: { dense: boolean; variant: number }) {
  return (
    <g>
      <path d="M10 28 H60" stroke="#4a6b3a" strokeWidth="2" />
      <WisteriaHang x={18} />
      <WisteriaHang x={32} />
      <WisteriaHang x={46} />
      {dense && <WisteriaHang x={24} offset={6} />}
      {dense && variant % 2 === 0 && <WisteriaHang x={40} offset={4} />}
    </g>
  );
}

function WisteriaHang({ x, offset = 0 }: { x: number; offset?: number }) {
  return (
    <g transform={`translate(${x} ${28 + offset})`}>
      <path d="M0 0 C-2 18 2 34 0 48" stroke="#6b8f5a" strokeWidth="1.2" fill="none" />
      {[8, 16, 24, 32, 40].map((y, i) => (
        <ellipse
          key={y}
          cx={i % 2 === 0 ? -3 : 3}
          cy={y}
          rx={4 - i * 0.35}
          ry={3}
          fill={i % 2 === 0 ? "#8b6bb5" : "#a789cc"}
        />
      ))}
    </g>
  );
}

function Iris({ dense, variant }: { dense: boolean; variant: number }) {
  return (
    <g>
      <path d="M22 92 L22 48" stroke="#3d6b45" strokeWidth="1.6" />
      <path d="M22 70 C10 58 12 48 22 52 C32 48 34 58 22 70" fill="#5a7ec2" />
      <path d="M22 58 C16 46 20 40 22 44 C24 40 28 46 22 58" fill="#7b96d6" />
      <path d="M18 92 C8 80 10 70 18 74" fill="#4f7a55" />
      <path d="M26 92 C36 80 34 70 26 74" fill="#4f7a55" />
      {(dense || variant > 1) && (
        <g transform="translate(24 4)">
          <path d="M22 88 L22 52" stroke="#3d6b45" strokeWidth="1.3" />
          <path d="M22 68 C12 58 14 50 22 54 C30 50 32 58 22 68" fill="#6a8ad0" />
        </g>
      )}
    </g>
  );
}

function Peony({ dense, variant }: { dense: boolean; variant: number }) {
  return (
    <g>
      <path d="M34 92 L34 62" stroke="#3f6b3a" strokeWidth="2" />
      <path d="M34 78 C20 70 18 62 28 64" fill="#4f7a4a" />
      <path d="M34 78 C48 70 50 62 40 64" fill="#4f7a4a" />
      <FlowerBurst cx={34} cy={48} color="#e89bb0" />
      {dense && variant % 2 === 1 && (
        <g transform="translate(14 18) scale(0.7)">
          <FlowerBurst cx={34} cy={48} color="#f0b0c0" />
        </g>
      )}
    </g>
  );
}

function Clover({ dense, variant }: { dense: boolean; variant: number }) {
  return (
    <g>
      <path d="M16 92 C24 70 28 58 40 46" stroke="#5a7a40" strokeWidth="1.4" fill="none" />
      <path d="M28 70 C36 64 44 70 50 60" stroke="#5a7a40" strokeWidth="1.1" fill="none" />
      <Blossom cx={40} cy={48} r={4} color="#e8a0b4" petals={4} />
      <Blossom cx={50} cy={58} r={3.5} color="#f0b8c4" petals={4} />
      <Blossom cx={32} cy={62} r={3.2} color="#d988a0" petals={4} />
      {dense && <Blossom cx={22} cy={74} r={3} color="#e8a0b4" petals={4} />}
      {dense && variant % 2 === 0 && <Blossom cx={44} cy={72} r={2.8} color="#f0b8c4" petals={4} />}
    </g>
  );
}

function Susuki({ dense, variant }: { dense: boolean; variant: number }) {
  return (
    <g>
      <path d="M20 92 L28 30" stroke="#c4a35a" strokeWidth="1.4" />
      <path d="M32 92 L36 38" stroke="#d4b56a" strokeWidth="1.2" />
      <path d="M44 92 L40 34" stroke="#b8953d" strokeWidth="1.3" />
      <ellipse cx="28" cy="28" rx="5" ry="10" fill="#e6c97a" opacity="0.85" transform="rotate(-18 28 28)" />
      <ellipse cx="36" cy="34" rx="4.5" ry="9" fill="#d4b56a" opacity="0.8" transform="rotate(8 36 34)" />
      <ellipse cx="40" cy="30" rx="5" ry="10" fill="#e6c97a" opacity="0.75" transform="rotate(16 40 30)" />
      {dense && (
        <path d="M52 92 L48 42" stroke="#c4a35a" strokeWidth="1.1" />
      )}
      {dense && variant % 2 === 1 && (
        <ellipse cx="48" cy="38" rx="4" ry="8" fill="#d4b56a" opacity="0.7" transform="rotate(20 48 38)" />
      )}
    </g>
  );
}

function Chrysanthemum({ dense, variant }: { dense: boolean; variant: number }) {
  return (
    <g>
      <path d="M34 92 L34 58" stroke="#4a6b3a" strokeWidth="1.8" />
      <path d="M34 74 C22 68 20 60 30 62" fill="#5a7a4a" />
      <FlowerBurst cx={34} cy={46} color="#e6c35a" spikes />
      {dense && variant % 2 === 0 && (
        <g transform="translate(-14 16) scale(0.65)">
          <FlowerBurst cx={34} cy={46} color="#f0d078" spikes />
        </g>
      )}
    </g>
  );
}

function Maple({ dense, variant }: { dense: boolean; variant: number }) {
  return (
    <g>
      <path d="M18 92 C26 74 30 60 40 48" stroke="#6b3a22" strokeWidth="1.5" fill="none" />
      <MapleLeaf cx={36} cy={46} color="#c45c3a" rot={-20} />
      <MapleLeaf cx={48} cy={54} color="#d4783a" rot={15} />
      <MapleLeaf cx={28} cy={60} color="#a83e28" rot={-5} />
      {dense && <MapleLeaf cx={42} cy={70} color="#c45c3a" rot={25} />}
      {dense && variant % 2 === 1 && <MapleLeaf cx={54} cy={66} color="#e09048" rot={-10} />}
    </g>
  );
}

function Willow({ dense, variant }: { dense: boolean; variant: number }) {
  return (
    <g>
      <path d="M36 18 C36 18 34 92 34 92" stroke="#5a3a22" strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M36 24 C${20 - i * 4} ${40 + i * 10} ${18 - i * 3} ${70 + i * 4} ${22 - i * 2} 92`}
          stroke="#5f8a4a"
          strokeWidth="1.1"
          fill="none"
        />
      ))}
      {[0, 1, 2].map((i) => (
        <path
          key={`r${i}`}
          d={`M36 28 C${48 + i * 4} ${42 + i * 10} ${52 + i * 3} ${68 + i * 5} ${50 + i * 2} 92`}
          stroke="#6f9a58"
          strokeWidth="1.1"
          fill="none"
        />
      ))}
      {dense && variant % 2 === 0 && (
        <path d="M36 40 C12 55 14 78 20 92" stroke="#5f8a4a" strokeWidth="1" fill="none" />
      )}
    </g>
  );
}

function Paulownia({ dense, variant }: { dense: boolean; variant: number }) {
  return (
    <g>
      <path d="M34 92 L34 50" stroke="#4a6b3a" strokeWidth="2" />
      <path d="M34 70 C18 62 16 52 28 54" fill="#5a7a4a" />
      <path d="M34 70 C50 62 52 52 40 54" fill="#5a7a4a" />
      <Blossom cx={34} cy={42} r={6} color="#9b7eb8" />
      <Blossom cx={24} cy={52} r={4.5} color="#b598d0" />
      <Blossom cx={44} cy={52} r={4.5} color="#b598d0" />
      {dense && <Blossom cx={34} cy={60} r={4} color="#8a6aa8" />}
      {dense && variant >= 2 && <Blossom cx={18} cy={66} r={3.5} color="#9b7eb8" />}
      {dense && variant >= 3 && <Blossom cx={50} cy={66} r={3.5} color="#9b7eb8" />}
    </g>
  );
}

/* ---------- helpers ---------- */

function Blossom({
  cx,
  cy,
  r,
  color,
  petals = 5,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
  petals?: number;
}) {
  const nodes = Array.from({ length: petals }, (_, i) => {
    const a = (Math.PI * 2 * i) / petals - Math.PI / 2;
    return (
      <ellipse
        key={i}
        cx={cx + Math.cos(a) * r * 0.55}
        cy={cy + Math.sin(a) * r * 0.55}
        rx={r * 0.55}
        ry={r * 0.38}
        transform={`rotate(${(360 / petals) * i} ${cx + Math.cos(a) * r * 0.55} ${cy + Math.sin(a) * r * 0.55})`}
        fill={color}
      />
    );
  });
  return (
    <g>
      {nodes}
      <circle cx={cx} cy={cy} r={r * 0.28} fill="#f5e6a0" />
    </g>
  );
}

function FlowerBurst({
  cx,
  cy,
  color,
  spikes,
}: {
  cx: number;
  cy: number;
  color: string;
  spikes?: boolean;
}) {
  const count = spikes ? 12 : 8;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const a = (Math.PI * 2 * i) / count;
        const x = cx + Math.cos(a) * 10;
        const y = cy + Math.sin(a) * 10;
        return (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={spikes ? 3.2 : 5}
            ry={spikes ? 8 : 5.5}
            transform={`rotate(${(360 / count) * i} ${x} ${y})`}
            fill={color}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={4} fill="#f7e7a0" />
    </g>
  );
}

function MapleLeaf({
  cx,
  cy,
  color,
  rot,
}: {
  cx: number;
  cy: number;
  color: string;
  rot: number;
}) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <path
        d="M0 8 L-3 2 L-8 2 L-4 -2 L-6 -8 L0 -4 L6 -8 L4 -2 L8 2 L3 2 Z"
        fill={color}
      />
      <path d="M0 8 L0 -2" stroke="#6b2a18" strokeWidth="0.6" />
    </g>
  );
}

function Ribbon({
  ribbon,
  poetry,
}: {
  ribbon: NonNullable<HanafudaCard["ribbon"]>;
  poetry: boolean;
}) {
  const fill =
    ribbon === "blue" ? "#3d5a80" : ribbon === "red-poetry" ? "#b01e2e" : "#c45c3a";
  return (
    <g>
      <path
        d="M22 18 C28 28 26 48 24 70 C30 58 36 48 42 40 C40 56 38 72 40 88 L28 88 C30 72 28 52 22 18 Z"
        fill={fill}
        opacity="0.92"
      />
      <path
        d="M24 22 C30 34 30 50 28 66"
        stroke="#fff8ea"
        strokeWidth="1"
        opacity="0.35"
        fill="none"
      />
      {poetry && (
        <>
          <text
            x="30"
            y="48"
            fontSize="5"
            fill="#f7e7c8"
            opacity="0.9"
            transform="rotate(-12 30 48)"
          >
            あ
          </text>
          <text
            x="32"
            y="56"
            fontSize="5"
            fill="#f7e7c8"
            opacity="0.9"
            transform="rotate(-12 32 56)"
          >
            か
          </text>
        </>
      )}
    </g>
  );
}

/* ---------- special motifs ---------- */

function Crane() {
  return (
    <g transform="translate(8 8)">
      <path d="M18 42 C10 28 22 12 34 18 C42 8 52 16 46 28 C58 30 54 46 42 42 C36 52 24 52 18 42 Z" fill="#f8f4ea" stroke="#2a2a2a" strokeWidth="0.8" />
      <path d="M34 20 L40 8" stroke="#c45c3a" strokeWidth="1.2" />
      <circle cx="30" cy="22" r="1.1" fill="#1c1c1c" />
      <path d="M42 42 L50 58" stroke="#2a2a2a" strokeWidth="1" />
    </g>
  );
}

function Warbler() {
  return (
    <g transform="translate(28 20)">
      <ellipse cx="12" cy="20" rx="11" ry="8" fill="#6f9a3e" />
      <ellipse cx="22" cy="16" rx="6" ry="5" fill="#7eaa48" />
      <path d="M26 16 L32 14" stroke="#c45c3a" strokeWidth="1.2" />
      <circle cx="24" cy="15" r="0.9" fill="#1c1c1c" />
      <path d="M6 18 C0 10 4 6 10 12" fill="#5f8a34" />
      <ellipse cx="10" cy="24" rx="3" ry="2" fill="#d8c078" />
    </g>
  );
}

function Curtain() {
  return (
    <g>
      <rect x="14" y="16" width="42" height="6" rx="1" fill="#b01e2e" />
      <path d="M16 22 C20 40 18 60 16 78" fill="#c43a3a" />
      <path d="M28 22 C32 42 30 62 28 80" fill="#9a1f2b" />
      <path d="M40 22 C44 40 42 60 40 78" fill="#c43a3a" />
      <path d="M52 22 C56 42 54 62 52 80" fill="#9a1f2b" />
      <circle cx="22" cy="34" r="2" fill="#d4c08a" />
      <circle cx="34" cy="38" r="2" fill="#d4c08a" />
      <circle cx="46" cy="34" r="2" fill="#d4c08a" />
    </g>
  );
}

function Cuckoo() {
  return (
    <g transform="translate(30 22)">
      <ellipse cx="10" cy="18" rx="10" ry="7" fill="#4a5560" />
      <ellipse cx="18" cy="14" rx="5.5" ry="4.5" fill="#5a6570" />
      <path d="M22 14 L28 12" stroke="#c4a35a" strokeWidth="1.1" />
      <circle cx="20" cy="13" r="0.8" fill="#fff" />
      <path d="M2 16 C-4 8 0 4 6 10" fill="#3a4550" />
    </g>
  );
}

function Bridge() {
  return (
    <g>
      <path d="M10 70 C24 48 46 48 60 70" fill="none" stroke="#6b4428" strokeWidth="3" />
      <path d="M14 68 L14 78" stroke="#6b4428" strokeWidth="2" />
      <path d="M35 52 L35 62" stroke="#6b4428" strokeWidth="2" />
      <path d="M56 68 L56 78" stroke="#6b4428" strokeWidth="2" />
      <path d="M8 78 H62" stroke="#3d6b9a" strokeWidth="2" opacity="0.55" />
    </g>
  );
}

function Butterfly() {
  return (
    <g transform="translate(22 18)">
      <ellipse cx="8" cy="16" rx="8" ry="12" fill="#7b6bb5" transform="rotate(-20 8 16)" />
      <ellipse cx="24" cy="16" rx="8" ry="12" fill="#9b88d0" transform="rotate(20 24 16)" />
      <ellipse cx="10" cy="28" rx="5" ry="7" fill="#c4a35a" transform="rotate(-30 10 28)" />
      <ellipse cx="22" cy="28" rx="5" ry="7" fill="#d4b56a" transform="rotate(30 22 28)" />
      <rect x="14.5" y="12" width="3" height="22" rx="1.5" fill="#2a2a2a" />
      <circle cx="10" cy="14" r="1.5" fill="#f0e6a0" />
      <circle cx="22" cy="14" r="1.5" fill="#f0e6a0" />
    </g>
  );
}

function Boar() {
  return (
    <g transform="translate(16 28)">
      <ellipse cx="22" cy="24" rx="18" ry="12" fill="#5a4638" />
      <ellipse cx="38" cy="20" rx="8" ry="7" fill="#6a5648" />
      <circle cx="42" cy="18" r="1" fill="#1c1c1c" />
      <path d="M44 22 L50 24" stroke="#3a2a22" strokeWidth="1.5" />
      <path d="M10 28 L4 34" stroke="#3a2a22" strokeWidth="2" />
      <path d="M18 34 L14 40" stroke="#3a2a22" strokeWidth="2" />
      <path d="M28 34 L30 40" stroke="#3a2a22" strokeWidth="2" />
      <path d="M34 30 L40 36" stroke="#3a2a22" strokeWidth="2" />
    </g>
  );
}

function Moon() {
  return (
    <g>
      <circle cx="48" cy="28" r="16" fill="#f7e7a8" opacity="0.25" />
      <circle cx="48" cy="28" r="13" fill="#f0e2a8" />
      <circle cx="48" cy="28" r="13" fill="none" stroke="#fff6c8" strokeWidth="1.2" opacity="0.7" />
      <circle cx="43" cy="25" r="2.2" fill="#e6d48a" opacity="0.45" />
      <circle cx="52" cy="32" r="1.4" fill="#e6d48a" opacity="0.35" />
    </g>
  );
}

function Geese() {
  return (
    <g>
      <Goose x={18} y={28} />
      <Goose x={32} y={38} />
      <Goose x={24} y={48} />
    </g>
  );
}

function Goose({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 8 C6 0 16 0 20 8" fill="none" stroke="#3a4550" strokeWidth="1.6" />
      <path d="M20 8 C26 4 30 8 26 12" fill="#4a5560" />
      <circle cx="28" cy="10" r="0.7" fill="#fff" />
    </g>
  );
}

function SakeCup() {
  return (
    <g transform="translate(20 30)">
      <ellipse cx="15" cy="12" rx="14" ry="5" fill="#c4a35a" />
      <path d="M3 12 L6 36 H24 L27 12" fill="#d4b56a" stroke="#8a7030" strokeWidth="0.8" />
      <ellipse cx="15" cy="36" rx="9" ry="3" fill="#b8953d" />
      <ellipse cx="15" cy="12" rx="10" ry="3" fill="#f0e2a8" opacity="0.7" />
    </g>
  );
}

function Deer() {
  return (
    <g transform="translate(14 24)">
      <path d="M18 8 L12 0 M18 8 L22 0 M26 10 L22 0 M26 10 L30 2" stroke="#6b4428" strokeWidth="1.3" fill="none" />
      <ellipse cx="22" cy="28" rx="16" ry="11" fill="#c48a4a" />
      <ellipse cx="36" cy="22" rx="7" ry="6" fill="#d4a05a" />
      <circle cx="39" cy="20" r="1" fill="#1c1c1c" />
      <path d="M10 34 L6 42 M18 38 L16 46 M28 38 L30 46 M34 32 L40 40" stroke="#6b4428" strokeWidth="1.8" />
    </g>
  );
}

function RainMan() {
  return (
    <g>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M${14 + i * 8} 18 l-3 14`}
          stroke="#7a9ab8"
          strokeWidth="1.2"
          opacity="0.7"
        />
      ))}
      <g transform="translate(22 34)">
        <path d="M8 8 C4 0 20 0 16 8 L18 34 H6 Z" fill="#4a5560" />
        <path d="M6 16 H18" stroke="#c45c3a" strokeWidth="1.2" />
        <circle cx="12" cy="10" r="3.5" fill="#e8dcc0" />
        <path d="M4 34 H20 L16 42 H8 Z" fill="#3a4550" />
        <path d="M10 42 L6 52 M14 42 L18 52" stroke="#2a2a2a" strokeWidth="1.4" />
      </g>
      <path d="M18 70 C28 78 40 78 52 68" fill="none" stroke="#6b8f5a" strokeWidth="2" />
    </g>
  );
}

function Swallow() {
  return (
    <g transform="translate(24 24)">
      <path d="M8 20 C0 8 12 4 18 12 C28 2 40 12 28 20 C36 28 24 34 18 28 C12 36 4 28 8 20 Z" fill="#3a4550" />
      <path d="M28 16 L36 10" stroke="#c45c3a" strokeWidth="1.1" />
      <circle cx="24" cy="14" r="0.9" fill="#fff" />
    </g>
  );
}

function Phoenix() {
  return (
    <g transform="translate(10 16)">
      <path d="M24 40 C8 28 12 8 28 14 C36 4 50 12 44 24 C56 22 58 40 44 38 C40 52 28 52 24 40 Z" fill="#c43a3a" />
      <path d="M28 16 C24 4 34 0 36 10" fill="#d4a05a" />
      <path d="M44 38 C52 48 48 58 40 52" fill="#e09048" />
      <path d="M20 38 C10 48 8 58 18 50" fill="#9a1f2b" />
      <circle cx="32" cy="18" r="1.1" fill="#1c1c1c" />
      <path d="M36 16 L42 10" stroke="#c4a35a" strokeWidth="1.2" />
    </g>
  );
}

export function CardBackArt() {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 70 100" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`back-grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b1e1e" />
          <stop offset="50%" stopColor="#5c1018" />
          <stop offset="100%" stopColor="#3d0c12" />
        </linearGradient>
        <pattern
          id={`back-pattern-${uid}`}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="4" cy="4" r="1.1" fill="#d4c08a" opacity="0.22" />
        </pattern>
      </defs>
      <rect
        x="1.5"
        y="1.5"
        width="67"
        height="97"
        rx="3.5"
        fill={`url(#back-grad-${uid})`}
        stroke="#d4c08a"
        strokeWidth="1.2"
      />
      <rect
        x="5"
        y="5"
        width="60"
        height="90"
        rx="2"
        fill={`url(#back-pattern-${uid})`}
      />
      <rect
        x="12"
        y="20"
        width="46"
        height="60"
        rx="2"
        fill="none"
        stroke="#d4c08a"
        strokeWidth="0.8"
        opacity="0.55"
      />
      <text
        x="35"
        y="54"
        textAnchor="middle"
        fontSize="14"
        fill="#d4c08a"
        opacity="0.85"
        fontFamily="serif"
      >
        花
      </text>
    </svg>
  );
}
