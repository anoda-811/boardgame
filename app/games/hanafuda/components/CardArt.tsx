import type { HanafudaCard } from "@/lib/hanafuda/cards";

/* Traditional hanafuda palette: flat inks with bold black outlines. */
const INK = "#1a1612";
const PAPER = "#f7f0de";
const RED = "#c8221e";
const DEEP_RED = "#8f1614";
const GREEN = "#2f7a3a";
const DEEP_GREEN = "#1d4f28";
const YELLOW = "#e9b625";
const PURPLE = "#5b3a8c";
const BLUE = "#1f4c9a";
const BROWN = "#7a4a22";
const PINK = "#f2b3c0";
const WHITE = "#fffaf0";

const line = { stroke: INK, strokeWidth: 0.9, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** Hanafuda face art (viewBox 70×100). */
export function CardArt({ card }: { card: HanafudaCard }) {
  const variant = Number(card.id.split("-")[1] ?? 0);
  return (
    <svg viewBox="0 0 70 100" className="h-full w-full" aria-hidden shapeRendering="geometricPrecision">
      <rect x="0.5" y="0.5" width="69" height="99" rx="4" fill={INK} />
      <rect x="2.2" y="2.2" width="65.6" height="95.6" rx="2.6" fill={PAPER} />
      <svg x="2.2" y="2.2" width="65.6" height="95.6" viewBox="2.2 2.2 65.6 95.6" overflow="hidden">
        <MonthArt card={card} v={variant} />
      </svg>
      <rect x="2.2" y="2.2" width="65.6" height="95.6" rx="2.6" fill="none" stroke={INK} strokeWidth="0.6" />
    </svg>
  );
}

function MonthArt({ card, v }: { card: HanafudaCard; v: number }) {
  switch (card.month) {
    case 1:
      return <PineCard card={card} v={v} />;
    case 2:
      return <PlumCard card={card} v={v} />;
    case 3:
      return <CherryCard card={card} v={v} />;
    case 4:
      return <WisteriaCard card={card} v={v} />;
    case 5:
      return <IrisCard card={card} v={v} />;
    case 6:
      return <PeonyCard card={card} v={v} />;
    case 7:
      return <CloverCard card={card} v={v} />;
    case 8:
      return <SusukiCard card={card} v={v} />;
    case 9:
      return <ChrysanthemumCard card={card} v={v} />;
    case 10:
      return <MapleCard card={card} v={v} />;
    case 11:
      return <WillowCard card={card} v={v} />;
    case 12:
      return <PaulowniaCard card={card} v={v} />;
    default:
      return null;
  }
}

type CardProps = { card: HanafudaCard; v: number };

/* ======================================================================
   Shared pieces
   ====================================================================== */

function Tanzaku({
  color,
  text,
  x = 26,
  y = 14,
  rot = -14,
}: {
  color: string;
  text?: string;
  x?: number;
  y?: number;
  rot?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M0 0 H13 V44 L6.5 50 L0 44 Z" fill={color} {...line} strokeWidth={1.1} />
      <path d="M1.8 2 V42" stroke={WHITE} strokeWidth="0.8" opacity="0.35" />
      {text &&
        [...text].map((ch, i) => (
          <text
            key={i}
            x="6.5"
            y={9 + i * 7.6}
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fill={INK}
            fontFamily="'Shippori Mincho', serif"
          >
            {ch}
          </text>
        ))}
    </g>
  );
}

function Flower5({
  cx,
  cy,
  r,
  fill,
  center = YELLOW,
  rot = 0,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  center?: string;
  rot?: number;
}) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      {Array.from({ length: 5 }, (_, i) => (
        <circle
          key={i}
          cx={Math.cos((i * 2 * Math.PI) / 5 - Math.PI / 2) * r * 0.58}
          cy={Math.sin((i * 2 * Math.PI) / 5 - Math.PI / 2) * r * 0.58}
          r={r * 0.5}
          fill={fill}
          {...line}
          strokeWidth={0.7}
        />
      ))}
      <circle r={r * 0.26} fill={center} stroke={INK} strokeWidth={0.5} />
    </g>
  );
}

function Leaf({
  x,
  y,
  len,
  width,
  rot,
  fill = GREEN,
}: {
  x: number;
  y: number;
  len: number;
  width: number;
  rot: number;
  fill?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path
        d={`M0 0 C${width} ${-len * 0.3} ${width * 0.6} ${-len * 0.8} 0 ${-len} C${-width * 0.6} ${-len * 0.8} ${-width} ${-len * 0.3} 0 0 Z`}
        fill={fill}
        {...line}
        strokeWidth={0.7}
      />
      <path d={`M0 0 L0 ${-len * 0.9}`} stroke={INK} strokeWidth="0.45" opacity="0.7" />
    </g>
  );
}

function Branch({ d, width = 2.6, color = INK }: { d: string; width?: number; color?: string }) {
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />;
}

function SkyBand({ y, color, wave = true }: { y: number; color: string; wave?: boolean }) {
  return wave ? (
    <path
      d={`M0 0 H70 V${y} C58 ${y + 5} 46 ${y - 4} 35 ${y + 2} C24 ${y + 7} 12 ${y - 3} 0 ${y + 3} Z`}
      fill={color}
    />
  ) : (
    <rect x="0" y="0" width="70" height={y} fill={color} />
  );
}

/* ======================================================================
   1月 松
   ====================================================================== */

function PineTuft({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-12 2 C-10 -9 10 -9 12 2 C6 -1 -6 -1 -12 2 Z" fill={GREEN} {...line} />
      {[-9, -5, -1.5, 1.5, 5, 9].map((dx) => (
        <path key={dx} d={`M0 1 L${dx} ${-6 + Math.abs(dx) * 0.35}`} stroke={DEEP_GREEN} strokeWidth="0.6" />
      ))}
    </g>
  );
}

function PineTree({ flip = false }: { flip?: boolean }) {
  return (
    <g transform={flip ? "translate(70 0) scale(-1 1)" : undefined}>
      <path
        d="M14 98 C18 84 14 74 22 64 C28 56 26 48 34 40 C38 36 44 34 48 30"
        fill="none"
        stroke={BROWN}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M14 98 C18 84 14 74 22 64 C28 56 26 48 34 40 C38 36 44 34 48 30"
        fill="none"
        stroke={INK}
        strokeWidth="0.9"
        strokeDasharray="3 5"
      />
      <path d="M22 64 C14 60 10 56 6 50" fill="none" stroke={BROWN} strokeWidth="2.6" strokeLinecap="round" />
      <PineTuft x={48} y={30} s={1.2} />
      <PineTuft x={30} y={44} s={1.1} />
      <PineTuft x={8} y={50} s={1} />
      <PineTuft x={50} y={48} s={0.95} />
      <PineTuft x={24} y={68} s={1.05} />
    </g>
  );
}

function PineCard({ card, v }: CardProps) {
  if (card.kind === "bright") {
    return (
      <g>
        <circle cx="44" cy="30" r="20" fill={RED} {...line} />
        <g transform="translate(0 20) scale(1 0.8)">
          <PineTuft x={12} y={90} s={1.2} />
          <PineTuft x={56} y={96} s={1.1} />
        </g>
        <Crane />
      </g>
    );
  }
  if (card.kind === "ribbon") {
    return (
      <g>
        <SkyBand y={12} color={RED} />
        <PineTree />
        <Tanzaku color={RED} text="あかよろし" x={26} y={22} rot={-10} />
      </g>
    );
  }
  return (
    <g>
      <SkyBand y={v === 2 ? 22 : 16} color={RED} />
      <PineTree flip={v === 3} />
    </g>
  );
}

function Crane() {
  return (
    <g>
      {/* legs */}
      <path d="M30 70 L27 90 M34 70 L37 88" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      {/* tail */}
      <path d="M40 60 C50 62 56 70 58 78 C52 74 46 72 38 70 Z" fill={INK} />
      {/* body */}
      <path d="M18 58 C20 48 34 46 42 54 C46 60 40 70 30 70 C22 70 17 64 18 58 Z" fill={WHITE} {...line} />
      <path d="M24 60 C30 56 36 58 40 62" fill="none" stroke={INK} strokeWidth="0.6" />
      {/* neck */}
      <path d="M22 54 C18 44 16 36 20 28" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      {/* head */}
      <ellipse cx="21" cy="26" rx="4" ry="3.2" fill={WHITE} {...line} />
      <circle cx="21.5" cy="23.6" r="1.6" fill={RED} />
      <path d="M17.5 26.5 L8 29" stroke={YELLOW} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M17.5 26.5 L8 29" stroke={INK} strokeWidth="0.4" />
      <circle cx="20" cy="25.8" r="0.6" fill={INK} />
    </g>
  );
}

/* ======================================================================
   2月 梅
   ====================================================================== */

function PlumBranch({ v }: { v: number }) {
  const blossoms: [number, number, number, string][] = [
    [20, 34, 5, RED],
    [34, 26, 4.5, WHITE],
    [46, 40, 5, RED],
    [26, 54, 4.5, RED],
    [52, 60, 4, WHITE],
    [16, 72, 4.5, RED],
    [40, 76, 4, RED],
  ];
  return (
    <g>
      <Branch d="M8 98 C12 80 10 70 18 60 C24 52 22 42 30 30 M18 60 C28 58 36 52 48 42 M30 30 C36 22 42 18 50 14 M24 76 C32 74 40 70 50 62" width={3} />
      {blossoms
        .filter((_, i) => v !== 3 || i % 3 !== 1)
        .map(([x, y, r, c], i) => (
          <Flower5 key={i} cx={x} cy={y} r={r} fill={c} center={c === WHITE ? RED : YELLOW} rot={i * 17} />
        ))}
    </g>
  );
}

function PlumCard({ card, v }: CardProps) {
  return (
    <g>
      <SkyBand y={v === 2 ? 20 : 14} color={RED} />
      <PlumBranch v={v} />
      {card.kind === "animal" && <Warbler />}
      {card.kind === "ribbon" && <Tanzaku color={RED} text="あかよろし" x={30} y={22} rot={10} />}
    </g>
  );
}

function Warbler() {
  return (
    <g transform="translate(30 42)">
      <path d="M0 10 C2 2 12 -2 20 2 C24 4 26 8 24 12 C18 18 6 18 0 10 Z" fill="#8a9a2a" {...line} />
      <path d="M2 10 C-4 12 -8 16 -10 20 C-4 18 0 16 4 14 Z" fill="#6c7a20" {...line} strokeWidth={0.7} />
      <circle cx="21" cy="5" r="4.6" fill="#9aaa34" {...line} />
      <path d="M25 5 L30 4.5 L25 6.6 Z" fill={INK} />
      <circle cx="22" cy="4.4" r="0.8" fill={INK} />
      <path d="M8 8 C12 6 16 7 18 10" fill="none" stroke={INK} strokeWidth="0.6" />
      <path d="M10 16 L9 22 M14 16 L15 22" stroke={INK} strokeWidth="0.9" />
    </g>
  );
}

/* ======================================================================
   3月 桜
   ====================================================================== */

function CherryCloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const spots: [number, number][] = [
    [0, 0],
    [-8, 3],
    [8, 3],
    [-4, -5],
    [5, -5],
    [0, 6],
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {spots.map(([dx, dy], i) => (
        <Flower5 key={i} cx={dx} cy={dy} r={5} fill={i % 2 ? WHITE : PINK} center={RED} rot={i * 23} />
      ))}
    </g>
  );
}

function CherryCard({ card, v }: CardProps) {
  if (card.kind === "bright") {
    return (
      <g>
        <SkyBand y={10} color={RED} />
        <Branch d="M0 30 C14 26 24 20 34 12 M40 30 C50 22 60 20 70 22" width={2.4} />
        <CherryCloud x={14} y={18} s={0.9} />
        <CherryCloud x={52} y={16} s={0.9} />
        <CherryCloud x={34} y={30} s={0.8} />
        <Curtain />
      </g>
    );
  }
  return (
    <g>
      <SkyBand y={v === 3 ? 18 : 12} color={RED} />
      <Branch d="M4 98 C10 80 16 70 22 58 C28 46 32 38 40 30 M22 58 C34 56 44 50 56 44 M40 30 C48 24 54 22 62 18" width={2.8} />
      <CherryCloud x={40} y={30} />
      <CherryCloud x={20} y={58} s={0.95} />
      {v !== 2 && <CherryCloud x={54} y={46} s={0.85} />}
      {card.kind === "ribbon" ? (
        <Tanzaku color={RED} text="みよしの" x={30} y={50} rot={-12} />
      ) : (
        <CherryCloud x={24} y={82} s={0.9} />
      )}
    </g>
  );
}

function Curtain() {
  return (
    <g>
      <path d="M0 42 H70" stroke={INK} strokeWidth="2.2" />
      <path
        d="M0 43 C10 50 18 50 23 44 C28 50 42 50 47 44 C52 50 60 50 70 43 V98 H0 Z"
        fill={RED}
        {...line}
      />
      {/* white band with cherry crests */}
      <path d="M0 64 C12 66 24 62 35 64 C46 66 58 62 70 64 V76 C58 74 46 78 35 76 C24 74 12 78 0 76 Z" fill={WHITE} {...line} />
      {[12, 35, 58].map((x) => (
        <Flower5 key={x} cx={x} cy={70} r={4} fill={RED} center={WHITE} />
      ))}
      {[10, 26, 44, 60].map((x) => (
        <path key={x} d={`M${x} 50 C${x + 2} 60 ${x - 2} 80 ${x + 1} 96`} fill="none" stroke={DEEP_RED} strokeWidth="1" />
      ))}
      {[23, 47].map((x) => (
        <g key={x}>
          <path d={`M${x} 44 L${x} 52`} stroke={INK} strokeWidth="1" />
          <circle cx={x} cy={54} r="2.2" fill={YELLOW} {...line} strokeWidth={0.6} />
        </g>
      ))}
    </g>
  );
}

/* ======================================================================
   4月 藤
   ====================================================================== */

function WisteriaDrop({ x, y, len }: { x: number; y: number; len: number }) {
  const count = Math.round(len / 5);
  return (
    <g>
      <path d={`M${x} ${y} C${x + 2} ${y + len * 0.4} ${x - 2} ${y + len * 0.7} ${x} ${y + len}`} fill="none" stroke={INK} strokeWidth="0.9" />
      {Array.from({ length: count }, (_, i) => {
        const t = i / count;
        const r = 3.2 * (1 - t * 0.55);
        return (
          <g key={i}>
            <ellipse cx={x - r * 0.6} cy={y + 3 + i * 5} rx={r} ry={r * 0.8} fill={PURPLE} {...line} strokeWidth={0.5} />
            <ellipse cx={x + r * 0.6} cy={y + 5 + i * 5} rx={r * 0.9} ry={r * 0.75} fill="#7d5bb0" {...line} strokeWidth={0.5} />
          </g>
        );
      })}
    </g>
  );
}

function WisteriaCard({ card, v }: CardProps) {
  const drops: [number, number, number][] =
    card.kind === "animal"
      ? [
          [10, 8, 42],
          [24, 8, 26],
        ]
      : [
          [14, 8, 44],
          [30, 8, 54],
          [48, 8, 40],
          [60, 8, 30],
        ];
  return (
    <g>
      {card.kind === "animal" && (
        <>
          <rect x="0" y="0" width="70" height="100" fill="#f2d98a" />
          <circle cx="48" cy="26" r="12" fill={RED} {...line} />
          <circle cx="53" cy="22" r="10.5" fill="#f2d98a" />
        </>
      )}
      <Branch d="M0 7 C18 11 40 3 70 8" width={3} />
      {drops.map(([x, y, len], i) => (
        <WisteriaDrop key={i} x={x} y={y} len={v === 3 && i === 1 ? len - 10 : len} />
      ))}
      <Leaf x={6} y={98} len={22} width={5} rot={20} />
      <Leaf x={20} y={98} len={18} width={4} rot={-10} />
      <Leaf x={64} y={98} len={20} width={5} rot={-24} />
      {card.kind === "animal" && <Cuckoo />}
      {card.kind === "ribbon" && <Tanzaku color={RED} x={30} y={46} rot={-8} />}
    </g>
  );
}

function Cuckoo() {
  return (
    <g transform="translate(18 44) rotate(-12)">
      <path d="M0 10 C8 2 22 0 32 6 C24 10 14 14 0 10 Z" fill={INK} />
      <path d="M8 6 C14 -8 26 -12 34 -10 C26 -4 20 2 14 8 Z" fill={INK} />
      <path d="M10 10 C16 18 24 22 34 22 C26 16 20 12 16 10 Z" fill={INK} />
      <path d="M32 6 C36 5 38 6 40 7 L34 8 Z" fill={INK} />
      <circle cx="31" cy="5.6" r="0.7" fill={WHITE} />
      <path d="M0 10 L-8 8 L-6 12 Z" fill={INK} />
      <path d="M18 9 C22 11 26 11 30 9" fill="none" stroke={WHITE} strokeWidth="0.5" opacity="0.7" />
    </g>
  );
}

/* ======================================================================
   5月 菖蒲
   ====================================================================== */

function IrisFlower({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 C-10 -2 -12 8 -6 12 C-4 8 -2 4 0 2 Z" fill={PURPLE} {...line} />
      <path d="M0 0 C10 -2 12 8 6 12 C4 8 2 4 0 2 Z" fill={PURPLE} {...line} />
      <path d="M0 2 C-4 -6 -2 -12 0 -14 C2 -12 4 -6 0 2 Z" fill="#7d5bb0" {...line} />
      <path d="M-5 5 L-3 3 M5 5 L3 3" stroke={YELLOW} strokeWidth="1.3" />
      <path d="M0 2 L0 30" stroke={DEEP_GREEN} strokeWidth="1.4" />
    </g>
  );
}

function IrisCard({ card, v }: CardProps) {
  return (
    <g>
      {[8, 16, 26, 44, 54, 62].map((x, i) => (
        <path
          key={x}
          d={`M${x} 100 C${x + (i % 2 ? 4 : -4)} 70 ${x + (i % 2 ? 2 : -2)} 50 ${x + (i % 2 ? 8 : -6)} ${28 + (i % 3) * 6} C${x + (i % 2 ? 4 : -2)} 52 ${x + 3} 76 ${x + 4} 100 Z`}
          fill={GREEN}
          {...line}
          strokeWidth={0.7}
        />
      ))}
      <IrisFlower x={20} y={30} s={1.1} />
      <IrisFlower x={48} y={24} s={1.05} />
      {v !== 3 && <IrisFlower x={34} y={46} s={0.9} />}
      {card.kind === "animal" && <Bridge />}
      {card.kind === "ribbon" && <Tanzaku color={RED} x={28} y={48} rot={12} />}
    </g>
  );
}

function Bridge() {
  const planks: [number, number][] = [
    [0, 66],
    [22, 76],
    [44, 64],
  ];
  return (
    <g>
      <path d="M0 88 C12 84 22 92 35 88 C48 84 58 92 70 88 V100 H0 Z" fill={BLUE} opacity="0.85" />
      {planks.map(([x, y], i) => (
        <g key={i}>
          <path
            d={`M${x} ${y} L${x + 28} ${y + (i % 2 ? -10 : 10)} L${x + 28} ${y + (i % 2 ? -4 : 16)} L${x} ${y + 6} Z`}
            fill="#c9974a"
            {...line}
          />
          <path d={`M${x + 4} ${y + 6} V${y + 20} M${x + 24} ${y + (i % 2 ? -3 : 15)} V${y + (i % 2 ? 12 : 28)}`} stroke={INK} strokeWidth="1.4" />
        </g>
      ))}
    </g>
  );
}

/* ======================================================================
   6月 牡丹
   ====================================================================== */

function Peony({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-15 2 C-18 -10 -8 -16 0 -12 C8 -16 18 -10 15 2 C12 12 -12 12 -15 2 Z" fill={RED} {...line} />
      <path d="M-10 0 C-12 -8 -4 -11 0 -8 C4 -11 12 -8 10 0 C8 6 -8 6 -10 0 Z" fill="#e03a33" {...line} strokeWidth={0.7} />
      <path d="M-5 -1 C-6 -6 -2 -7 0 -5 C2 -7 6 -6 5 -1 C4 2 -4 2 -5 -1 Z" fill={DEEP_RED} {...line} strokeWidth={0.6} />
      <circle cx="0" cy="-2" r="1.6" fill={YELLOW} />
    </g>
  );
}

function PeonyCard({ card, v }: CardProps) {
  return (
    <g>
      <path d="M35 100 C34 86 36 76 35 64" stroke={INK} strokeWidth="2" fill="none" />
      <Leaf x={35} y={86} len={22} width={8} rot={-60} fill={DEEP_GREEN} />
      <Leaf x={35} y={86} len={22} width={8} rot={60} fill={DEEP_GREEN} />
      <Leaf x={35} y={74} len={18} width={7} rot={-35} fill={GREEN} />
      <Leaf x={35} y={74} len={18} width={7} rot={35} fill={GREEN} />
      <Peony x={35} y={62} s={1.35} />
      {v !== 2 && card.kind === "chaff" && <Peony x={16} y={38} s={0.8} />}
      {v === 3 && <Peony x={54} y={34} s={0.75} />}
      {card.kind === "animal" && <Butterflies />}
      {card.kind === "ribbon" && <Tanzaku color={BLUE} x={28} y={6} rot={-6} />}
    </g>
  );
}

function Butterfly({ x, y, s, rot, wing, spot }: { x: number; y: number; s: number; rot: number; wing: string; spot: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M0 0 C-10 -14 -20 -6 -14 2 C-18 8 -10 14 0 4 Z" fill={wing} {...line} />
      <path d="M0 0 C10 -14 20 -6 14 2 C18 8 10 14 0 4 Z" fill={wing} {...line} />
      <circle cx="-9" cy="-4" r="2" fill={spot} stroke={INK} strokeWidth="0.5" />
      <circle cx="9" cy="-4" r="2" fill={spot} stroke={INK} strokeWidth="0.5" />
      <path d="M0 -4 V8" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M0 -4 L-3 -10 M0 -4 L3 -10" stroke={INK} strokeWidth="0.6" />
    </g>
  );
}

function Butterflies() {
  return (
    <g>
      <Butterfly x={20} y={22} s={1.1} rot={-18} wing={BLUE} spot={YELLOW} />
      <Butterfly x={50} y={32} s={0.95} rot={16} wing={YELLOW} spot={RED} />
    </g>
  );
}

/* ======================================================================
   7月 萩
   ====================================================================== */

function CloverArch({ d, dots }: { d: string; dots: [number, number][] }) {
  return (
    <g>
      <path d={d} fill="none" stroke={DEEP_RED} strokeWidth="1.3" strokeLinecap="round" />
      {dots.map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx="2.6" ry="1.7" fill={i % 3 === 0 ? GREEN : RED} {...line} strokeWidth={0.5} transform={`rotate(${i * 40} ${x} ${y})`} />
        </g>
      ))}
    </g>
  );
}

function CloverCard({ card, v }: CardProps) {
  return (
    <g>
      <SkyBand y={v === 3 ? 16 : 10} color={RED} wave={false} />
      <CloverArch
        d="M8 100 C10 70 22 40 48 20"
        dots={[
          [14, 74],
          [18, 62],
          [22, 52],
          [28, 42],
          [34, 34],
          [42, 26],
          [48, 20],
        ]}
      />
      <CloverArch
        d="M24 100 C30 76 44 56 64 44"
        dots={[
          [30, 80],
          [36, 68],
          [44, 58],
          [52, 52],
          [60, 46],
        ]}
      />
      {v !== 2 && (
        <CloverArch
          d="M60 100 C54 80 44 66 30 60"
          dots={[
            [56, 86],
            [50, 76],
            [42, 68],
            [34, 62],
          ]}
        />
      )}
      {card.kind === "chaff" && (
        <CloverArch
          d="M2 60 C14 52 24 40 30 24"
          dots={[
            [8, 56],
            [15, 50],
            [21, 42],
            [26, 34],
            [29, 26],
          ]}
        />
      )}
      {card.kind === "animal" && <Boar />}
      {card.kind === "ribbon" && <Tanzaku color={RED} x={34} y={26} rot={14} />}
    </g>
  );
}

function Boar() {
  return (
    <g transform="translate(8 56)">
      <path d="M4 18 C2 6 16 -2 32 0 C44 2 52 8 56 16 L60 18 L56 22 C50 30 34 32 20 30 C10 28 5 24 4 18 Z" fill={BROWN} {...line} />
      <path d="M8 12 C18 6 34 4 48 10" fill="none" stroke={INK} strokeWidth="1.2" />
      <path d="M8 18 C18 14 32 14 44 16" fill="none" stroke={INK} strokeWidth="0.6" opacity="0.6" />
      <circle cx="50" cy="12" r="1" fill={INK} />
      <path d="M52 20 C55 21 57 19 57 17" fill="none" stroke={WHITE} strokeWidth="1.2" />
      <path d="M44 6 L46 0 L49 6" fill={BROWN} {...line} strokeWidth={0.7} />
      <path d="M12 28 L6 38 M22 30 L20 40 M38 30 L42 40 M46 28 L54 36" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4 16 C0 14 -2 16 -2 20" fill="none" stroke={INK} strokeWidth="1" />
    </g>
  );
}

/* ======================================================================
   8月 芒
   ====================================================================== */

function Hill({ top = 58 }: { top?: number }) {
  return (
    <g>
      <path d={`M-4 100 C0 ${top + 8} 20 ${top} 35 ${top} C50 ${top} 70 ${top + 8} 74 100 Z`} fill={INK} />
      {Array.from({ length: 11 }, (_, i) => {
        const x = 4 + i * 6;
        return (
          <path
            key={i}
            d={`M${x} 100 C${x + 1} ${top + 18} ${x + 4} ${top + 6} ${x + 8} ${top - 4}`}
            fill="none"
            stroke={WHITE}
            strokeWidth="0.8"
            opacity="0.85"
          />
        );
      })}
    </g>
  );
}

function SusukiCard({ card, v }: CardProps) {
  if (card.kind === "bright") {
    return (
      <g>
        <rect x="0" y="0" width="70" height="100" fill={RED} />
        <circle cx="35" cy="36" r="22" fill={WHITE} {...line} strokeWidth={1.1} />
        <Hill top={66} />
      </g>
    );
  }
  if (card.kind === "animal") {
    return (
      <g>
        <rect x="0" y="0" width="70" height="100" fill={YELLOW} />
        <Hill top={70} />
        <Goose x={14} y={20} s={1} />
        <Goose x={32} y={34} s={0.9} />
        <Goose x={48} y={16} s={0.85} />
      </g>
    );
  }
  return (
    <g>
      {v === 3 ? <SkyBand y={34} color={RED} /> : <rect x="0" y="0" width="70" height="40" fill={RED} />}
      <Hill top={v === 3 ? 48 : 44} />
    </g>
  );
}

function Goose({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 8 C4 -2 12 -6 18 -4 C14 0 12 4 12 8 C16 2 24 -2 30 0 C24 6 18 10 10 12 C6 12 2 11 0 8 Z" fill={INK} />
      <path d="M0 8 C-4 8 -7 9 -9 11 L-2 10 Z" fill={INK} />
      <path d="M12 12 L16 16" stroke={INK} strokeWidth="1" />
    </g>
  );
}

/* ======================================================================
   9月 菊
   ====================================================================== */

function Chrysanthemum({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  const count = 16;
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: count }, (_, i) => {
        const a = (i * 360) / count;
        return (
          <path
            key={i}
            d={`M0 0 C${r * 0.22} ${-r * 0.4} ${r * 0.18} ${-r * 0.9} 0 ${-r} C${-r * 0.18} ${-r * 0.9} ${-r * 0.22} ${-r * 0.4} 0 0 Z`}
            transform={`rotate(${a})`}
            fill={fill}
            {...line}
            strokeWidth={0.5}
          />
        );
      })}
      <circle r={r * 0.3} fill={fill === YELLOW ? RED : YELLOW} {...line} strokeWidth={0.6} />
    </g>
  );
}

function ChrysanthemumCard({ card, v }: CardProps) {
  return (
    <g>
      <path d="M20 100 C22 84 24 72 22 60 M46 100 C44 86 46 74 50 62" stroke={INK} strokeWidth="1.8" fill="none" />
      <Leaf x={22} y={86} len={16} width={7} rot={-55} />
      <Leaf x={46} y={88} len={16} width={7} rot={55} />
      <Leaf x={24} y={72} len={14} width={6} rot={40} fill={DEEP_GREEN} />
      <Chrysanthemum x={22} y={52} r={12} fill={YELLOW} />
      <Chrysanthemum x={50} y={56} r={10} fill={RED} />
      {v !== 3 && card.kind === "chaff" && <Chrysanthemum x={36} y={28} r={10} fill={v === 2 ? RED : YELLOW} />}
      {card.kind === "animal" && <SakeCup />}
      {card.kind === "ribbon" && <Tanzaku color={BLUE} x={28} y={6} rot={-6} />}
    </g>
  );
}

function SakeCup() {
  return (
    <g transform="translate(35 26)">
      <ellipse cx="0" cy="0" rx="20" ry="9" fill={RED} {...line} strokeWidth={1.1} />
      <ellipse cx="0" cy="-1" rx="16" ry="6.5" fill={DEEP_RED} />
      <text x="0" y="2.4" textAnchor="middle" fontSize="9" fontWeight="700" fill={YELLOW} fontFamily="'Shippori Mincho', serif">
        寿
      </text>
      <path d="M-8 8 L-6 16 H6 L8 8" fill={RED} {...line} />
      <path d="M-10 16 H10" stroke={INK} strokeWidth="1.4" />
    </g>
  );
}

/* ======================================================================
   10月 紅葉
   ====================================================================== */

function MapleLeaf({ x, y, s, rot, fill }: { x: number; y: number; s: number; rot: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path
        d="M0 10 L-1 4 L-9 6 L-6 1 L-11 -3 L-5 -3 L-6 -10 L-2 -6 L0 -12 L2 -6 L6 -10 L5 -3 L11 -3 L6 1 L9 6 L1 4 Z"
        fill={fill}
        {...line}
        strokeWidth={0.7}
      />
      <path d="M0 10 V-8 M0 2 L-7 -2 M0 2 L7 -2" stroke={INK} strokeWidth="0.4" opacity="0.7" />
    </g>
  );
}

function MapleCard({ card, v }: CardProps) {
  const leaves: [number, number, number, number, string][] = [
    [18, 16, 1.2, -20, RED],
    [42, 12, 1.1, 15, RED],
    [58, 26, 1, 30, YELLOW],
    [30, 34, 1.15, -5, RED],
    [12, 44, 1, 20, YELLOW],
    [52, 48, 1.1, -25, RED],
    [26, 62, 1, 10, RED],
    [46, 72, 1.05, -15, YELLOW],
    [16, 84, 0.95, 25, RED],
  ];
  const shown = card.kind === "animal" ? leaves.slice(0, 5) : leaves.filter((_, i) => v !== 3 || i % 4 !== 2);
  return (
    <g>
      <Branch d="M0 22 C14 24 26 18 40 8 M0 50 C12 46 24 40 34 34 M70 40 C60 44 54 50 50 56" width={2.2} />
      {shown.map(([x, y, s, r, c], i) => (
        <MapleLeaf key={i} x={x} y={y} s={s} rot={r} fill={c} />
      ))}
      {card.kind === "animal" && <Deer />}
      {card.kind === "ribbon" && <Tanzaku color={BLUE} x={30} y={40} rot={10} />}
    </g>
  );
}

function Deer() {
  return (
    <g transform="translate(6 46)">
      <path d="M10 26 C8 16 18 10 32 12 C42 13 48 16 50 22 C50 30 40 34 26 34 C16 34 11 31 10 26 Z" fill="#b8742e" {...line} />
      {[
        [20, 20],
        [28, 18],
        [36, 22],
        [24, 27],
        [40, 28],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.3" fill={WHITE} />
      ))}
      <path d="M44 16 C46 8 50 2 54 0 C58 2 58 8 54 12 C52 14 48 16 44 16 Z" fill="#b8742e" {...line} />
      <path d="M53 1 L50 -8 L46 -12 M50 -8 L54 -14 M55 1 L60 -8 L64 -10 M60 -8 L58 -14" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="54.5" cy="5" r="0.8" fill={INK} />
      <path d="M14 32 L12 46 M22 34 L22 48 M38 33 L40 47 M46 30 L50 44" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 24 L6 22" stroke={INK} strokeWidth="1.2" />
    </g>
  );
}

/* ======================================================================
   11月 柳
   ====================================================================== */

function WillowStrands({ x = 54, count = 6 }: { x?: number; count?: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const sx = x - i * 5;
        return (
          <g key={i}>
            <path d={`M${sx + 8} 0 C${sx + 2} 20 ${sx} 40 ${sx - 4} ${56 + (i % 3) * 8}`} fill="none" stroke={GREEN} strokeWidth="1.1" />
            {Array.from({ length: 6 }, (_, j) => (
              <ellipse
                key={j}
                cx={sx + 6 - j * 1.6}
                cy={8 + j * 8}
                rx="1.2"
                ry="3.2"
                fill={GREEN}
                stroke={INK}
                strokeWidth="0.3"
                transform={`rotate(20 ${sx + 6 - j * 1.6} ${8 + j * 8})`}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

function WillowCard({ card }: CardProps) {
  if (card.isRain) return <RainMan />;
  if (card.kind === "chaff") return <Thunder />;
  return (
    <g>
      {card.kind === "animal" && <rect x="0" y="0" width="70" height="100" fill="#f2d98a" />}
      <WillowStrands />
      {card.kind === "animal" && (
        <>
          <path d="M0 84 C14 80 24 88 36 84 C48 80 58 88 70 84 V100 H0 Z" fill={BLUE} />
          <Swallow />
        </>
      )}
      {card.kind === "ribbon" && <Tanzaku color={RED} x={16} y={30} rot={-12} />}
    </g>
  );
}

function Swallow() {
  return (
    <g transform="translate(12 52) rotate(18)">
      <path d="M0 8 C8 2 18 0 26 4 C20 8 12 12 0 8 Z" fill={BLUE} {...line} />
      <path d="M10 4 C14 -8 22 -14 30 -14 C24 -8 20 -2 16 4 Z" fill={INK} />
      <path d="M8 8 C14 16 22 20 30 20 C24 14 18 10 14 8 Z" fill={INK} />
      <path d="M0 8 L-12 2 M0 8 L-12 12" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="26" cy="5" r="2" fill={RED} />
      <circle cx="25" cy="3.4" r="0.6" fill={WHITE} />
    </g>
  );
}

function RainMan() {
  return (
    <g>
      <rect x="0" y="0" width="70" height="100" fill="#3c4a5a" />
      {Array.from({ length: 14 }, (_, i) => (
        <path key={i} d={`M${(i * 11) % 70} ${(i * 17) % 40} l-4 14`} stroke={WHITE} strokeWidth="0.6" opacity="0.5" />
      ))}
      <WillowStrands x={62} count={3} />
      {/* stream */}
      <path d="M0 80 C12 76 22 84 35 80 C48 76 58 84 70 80 V100 H0 Z" fill={BLUE} />
      <path d="M4 88 C14 84 22 90 32 87 M38 90 C48 86 56 92 66 88" stroke={WHITE} strokeWidth="0.8" fill="none" opacity="0.8" />
      {/* umbrella */}
      <path d="M14 36 C18 22 40 18 52 30 Z" fill={YELLOW} {...line} />
      {[22, 30, 38, 46].map((x) => (
        <path key={x} d={`M33 26 L${x} 34`} stroke={INK} strokeWidth="0.5" />
      ))}
      <path d="M33 26 L32 60" stroke={INK} strokeWidth="1" />
      {/* robe */}
      <path d="M24 42 C22 54 20 66 18 78 H44 C42 66 40 54 38 42 Z" fill={RED} {...line} />
      <path d="M24 42 C28 50 34 50 38 42" fill={INK} />
      <path d="M22 60 C28 58 36 60 42 58" stroke={INK} strokeWidth="1.8" fill="none" />
      <circle cx="31" cy="38" r="4" fill="#f1dcc0" {...line} />
      <path d="M27 35 C30 31 34 32 35 36" fill={INK} />
      <path d="M22 78 L20 84 M40 78 L42 84" stroke={INK} strokeWidth="1.6" />
      {/* frog */}
      <g transform="translate(52 66) rotate(-30)">
        <ellipse cx="0" cy="0" rx="5" ry="3.6" fill={GREEN} {...line} />
        <circle cx="-3" cy="-3" r="1.4" fill={GREEN} {...line} strokeWidth={0.5} />
        <circle cx="-3" cy="-3" r="0.5" fill={INK} />
        <path d="M3 2 L8 6 L10 4 M-1 3 L-3 8" stroke={INK} strokeWidth="0.9" fill="none" />
      </g>
    </g>
  );
}

function Thunder() {
  return (
    <g>
      <rect x="0" y="0" width="70" height="100" fill={RED} />
      <path d="M0 18 C14 10 26 22 40 14 C52 8 62 16 70 12 V0 H0 Z" fill={INK} />
      {[
        [14, 40],
        [36, 32],
        [56, 42],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <ellipse cx="0" cy="0" rx="7" ry="7" fill={INK} />
          <circle r="4.4" fill={RED} stroke={YELLOW} strokeWidth="0.8" />
          <path d="M0 -4.4 A4.4 4.4 0 0 1 0 4.4 A2.2 2.2 0 0 1 0 0 A2.2 2.2 0 0 0 0 -4.4 Z" fill={YELLOW} />
        </g>
      ))}
      <path d="M40 50 L30 66 L38 66 L26 88 L46 62 L38 62 L48 50 Z" fill={YELLOW} {...line} />
      <path d="M8 92 C20 84 50 84 62 92" stroke={INK} strokeWidth="2" fill="none" />
    </g>
  );
}

/* ======================================================================
   12月 桐
   ====================================================================== */

function PaulowniaLeaf({ x, y, s, rot }: { x: number; y: number; s: number; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path
        d="M0 0 C-14 -2 -18 -14 -10 -20 C-8 -26 0 -28 0 -22 C0 -28 8 -26 10 -20 C18 -14 14 -2 0 0 Z"
        fill={INK}
        stroke={GREEN}
        strokeWidth="0.6"
      />
      <path d="M0 0 V-22 M0 -8 L-10 -14 M0 -8 L10 -14" stroke={GREEN} strokeWidth="0.7" />
    </g>
  );
}

function PaulowniaFlowers({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 V-24" stroke={INK} strokeWidth="1" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <ellipse cx={-3} cy={-4 - i * 5} rx="2.6" ry="2" fill={PURPLE} {...line} strokeWidth={0.5} />
          <ellipse cx={3} cy={-6 - i * 5} rx="2.6" ry="2" fill="#7d5bb0" {...line} strokeWidth={0.5} />
        </g>
      ))}
    </g>
  );
}

function PaulowniaCard({ card, v }: CardProps) {
  if (card.kind === "bright") {
    return (
      <g>
        <SkyBand y={36} color={RED} />
        <PaulowniaLeaf x={16} y={98} s={1.3} rot={-12} />
        <PaulowniaLeaf x={54} y={98} s={1.2} rot={14} />
        <Phoenix />
      </g>
    );
  }
  return (
    <g>
      {v === 3 && <rect x="0" y="62" width="70" height="38" fill={YELLOW} />}
      <PaulowniaFlowers x={20} y={50} s={1.05} />
      <PaulowniaFlowers x={35} y={42} s={1.2} />
      <PaulowniaFlowers x={50} y={50} s={1.05} />
      <PaulowniaLeaf x={14} y={96} s={1.25} rot={-16} />
      <PaulowniaLeaf x={35} y={92} s={1.35} rot={0} />
      <PaulowniaLeaf x={56} y={96} s={1.25} rot={16} />
      {v === 2 && <rect x="0" y="0" width="70" height="12" fill={YELLOW} />}
    </g>
  );
}

function Phoenix() {
  const tails: [string, string, number, number][] = [
    [BLUE, "M38 50 C52 54 62 64 68 80 C60 72 50 64 36 56 Z", 66, 76],
    [GREEN, "M36 52 C46 62 54 78 60 96 C52 88 44 74 33 58 Z", 58, 90],
    [RED, "M33 55 C36 68 38 82 40 98 C33 90 29 76 29 58 Z", 38, 93],
  ];
  return (
    <g>
      {/* tail streamers */}
      {tails.map(([fill, d, ex, ey], i) => (
        <g key={i}>
          <path d={d} fill={fill} {...line} />
          <circle cx={ex} cy={ey} r="2.6" fill={YELLOW} stroke={INK} strokeWidth="0.6" />
          <circle cx={ex} cy={ey} r="1.1" fill={RED} />
        </g>
      ))}
      {/* wings */}
      <path d="M28 42 C28 28 32 16 42 4 C44 18 42 30 35 44 Z" fill={GREEN} {...line} />
      <path d="M30 44 C34 28 44 14 62 6 C58 20 50 32 38 46 Z" fill={RED} {...line} />
      <path d="M33 46 C42 34 54 26 68 24 C60 34 50 42 39 49 Z" fill={YELLOW} {...line} />
      {[
        "M36 40 C42 30 50 20 58 12",
        "M38 44 C46 36 54 30 64 27",
      ].map((d, i) => (
        <path key={i} d={d} fill="none" stroke={INK} strokeWidth="0.6" />
      ))}
      {/* body */}
      <ellipse cx="32" cy="50" rx="9" ry="6.5" transform="rotate(-30 32 50)" fill={YELLOW} {...line} />
      <path d="M26 50 C30 48 34 50 36 54" fill="none" stroke={RED} strokeWidth="1.2" />
      {/* neck and head */}
      <path d="M28 46 C20 42 15 34 18 24" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M28 46 C20 42 15 34 18 24" fill="none" stroke={GREEN} strokeWidth="4.2" strokeLinecap="round" />
      <circle cx="18" cy="21" r="4.6" fill={GREEN} {...line} />
      <path d="M14 20 L6 22.5 L14 24 Z" fill={YELLOW} {...line} strokeWidth={0.6} />
      <ellipse cx="15.5" cy="26" rx="1.6" ry="2.4" fill={RED} {...line} strokeWidth={0.5} />
      <circle cx="17" cy="20" r="1" fill={WHITE} />
      <circle cx="17" cy="20" r="0.5" fill={INK} />
      <path d="M20 17 C22 12 26 9 30 9 M19 17 C19 11 22 7 25 5 M18 17 C16 12 16 8 18 5" fill="none" stroke={RED} strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

/* ======================================================================
   Back
   ====================================================================== */

export function CardBackArt() {
  return (
    <svg viewBox="0 0 70 100" className="h-full w-full" aria-hidden>
      <rect x="0.5" y="0.5" width="69" height="99" rx="4" fill="#15110e" />
      <rect x="2.2" y="2.2" width="65.6" height="95.6" rx="2.6" fill="#2a1d17" />
      <rect x="2.2" y="2.2" width="65.6" height="95.6" rx="2.6" fill="#8f1614" opacity="0.18" />
      <path d="M2.2 20 C24 10 46 30 67.8 18 V2.2 H2.2 Z" fill="#ffffff" opacity="0.05" />
      <rect x="2.2" y="2.2" width="65.6" height="95.6" rx="2.6" fill="none" stroke="#000" strokeWidth="0.6" />
    </svg>
  );
}
