import type { Piece, PieceType } from "@/lib/shogi/types";
import { PIECE_LABEL } from "@/lib/shogi/types";

function pieceChar(piece: Piece): string {
  if (piece.type === "king") {
    return piece.side === "sente" ? "玉" : "王";
  }
  return PIECE_LABEL[piece.type];
}

function isPromotedType(type: PieceType): boolean {
  return (
    type === "dragon" ||
    type === "horse" ||
    type === "promotedSilver" ||
    type === "promotedKnight" ||
    type === "promotedLance" ||
    type === "tokin"
  );
}

type PieceViewProps = {
  piece: Piece;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  className?: string;
};

const sizeMap = {
  sm: "h-9 w-8",
  md: "h-[92%] w-[78%]",
  lg: "h-12 w-10",
} as const;

export function PieceView({
  piece,
  size = "md",
  selected,
  className = "",
}: PieceViewProps) {
  const label = pieceChar(piece);
  const promoted = isPromotedType(piece.type);
  const long = label.length > 1;

  return (
    <div
      className={[
        "relative",
        sizeMap[size],
        piece.side === "gote" ? "rotate-180" : "",
        selected ? "drop-shadow-[0_0_8px_rgba(212,168,80,0.85)]" : "",
        className,
      ].join(" ")}
    >
      <svg viewBox="0 0 100 120" className="h-full w-full drop-shadow-[0_3px_4px_rgba(0,0,0,0.45)]">
        <defs>
          <linearGradient id={`piece-body-${piece.side}-${piece.type}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f7ead0" />
            <stop offset="35%" stopColor="#e8d0a4" />
            <stop offset="70%" stopColor="#d4b078" />
            <stop offset="100%" stopColor="#c49a5c" />
          </linearGradient>
          <linearGradient id={`piece-edge-${piece.side}-${piece.type}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff6e4" stopOpacity="0.55" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#6b4a28" stopOpacity="0.35" />
          </linearGradient>
          <filter id={`piece-inner-${piece.side}-${piece.type}`}>
            <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* thickness / side bevel */}
        <path
          d="M50 8 L92 36 L84 114 L16 114 L8 36 Z"
          fill="#8a6238"
          transform="translate(0 2.5)"
          opacity="0.9"
        />

        {/* main face - classic pentagon */}
        <path
          d="M50 6 L90 34 L82 112 L18 112 L10 34 Z"
          fill={`url(#piece-body-${piece.side}-${piece.type})`}
          stroke="#7a5530"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M50 6 L90 34 L82 112 L18 112 L10 34 Z"
          fill={`url(#piece-edge-${piece.side}-${piece.type})`}
        />

        {/* subtle wood grain lines */}
        <g opacity="0.12" stroke="#6b4420" strokeWidth="0.6">
          <path d="M28 48 Q50 46 72 50" fill="none" />
          <path d="M26 62 Q50 58 74 64" fill="none" />
          <path d="M28 78 Q50 74 72 80" fill="none" />
        </g>

        <text
          x="50"
          y={long ? "68" : "72"}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-display), 'Hiragino Mincho ProN', serif"
          fontSize={long ? 22 : 36}
          fontWeight="600"
          fill={promoted ? "#9a1a1a" : "#1a1008"}
          letterSpacing={long ? "-1" : "0"}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}

export function PieceStandPreview({ labels }: { labels: string[] }) {
  return (
    <div className="flex items-end justify-center gap-1.5">
      {labels.map((label, i) => (
        <div
          key={`${label}-${i}`}
          className="animate-drift h-14 w-11"
          style={{ animationDelay: `${i * 0.2}s` }}
        >
          <svg viewBox="0 0 100 120" className="h-full w-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]">
            <defs>
              <linearGradient id={`prev-${i}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f7ead0" />
                <stop offset="100%" stopColor="#c49a5c" />
              </linearGradient>
            </defs>
            <path
              d="M50 8 L92 36 L84 114 L16 114 L8 36 Z"
              fill="#8a6238"
              transform="translate(0 2)"
            />
            <path
              d="M50 6 L90 34 L82 112 L18 112 L10 34 Z"
              fill={`url(#prev-${i})`}
              stroke="#7a5530"
              strokeWidth="1.4"
            />
            <text
              x="50"
              y="72"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="serif"
              fontSize="34"
              fontWeight="600"
              fill="#1a1008"
            >
              {label}
            </text>
          </svg>
        </div>
      ))}
    </div>
  );
}
