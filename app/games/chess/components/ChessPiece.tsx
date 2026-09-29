import type { Color, PieceType } from "@/lib/chess/engine";

// U+FE0E forces text presentation so Windows doesn't render ♟ as an emoji.
const GLYPH: Record<PieceType, string> = {
  k: "\u265A\uFE0E",
  q: "\u265B\uFE0E",
  r: "\u265C\uFE0E",
  b: "\u265D\uFE0E",
  n: "\u265E\uFE0E",
  p: "\u265F\uFE0E",
};

export const PIECE_NAME: Record<PieceType, string> = {
  k: "キング",
  q: "クイーン",
  r: "ルーク",
  b: "ビショップ",
  n: "ナイト",
  p: "ポーン",
};

/** Render once per page; pieces reference these gradients by id. */
export function ChessDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        <linearGradient id="chess-ivory" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#fffdf6" />
          <stop offset="45%" stopColor="#f1e6cf" />
          <stop offset="100%" stopColor="#c9b48c" />
        </linearGradient>
        <linearGradient id="chess-ebony" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#5a5049" />
          <stop offset="40%" stopColor="#2a221e" />
          <stop offset="100%" stopColor="#0c0907" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ChessPiece({
  type,
  color,
  className = "",
}: {
  type: PieceType;
  color: Color;
  className?: string;
}) {
  const white = color === "w";
  return (
    <svg
      viewBox="0 0 100 100"
      className={`h-full w-full ${className}`}
      style={{
        filter: white
          ? "drop-shadow(0 3px 2px rgba(40,25,10,0.45))"
          : "drop-shadow(0 3px 2px rgba(0,0,0,0.55))",
      }}
      aria-hidden
    >
      <text
        x="50"
        y="54"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="82"
        fontFamily="'Segoe UI Symbol', 'Noto Sans Symbols 2', 'DejaVu Sans', serif"
        fill={white ? "url(#chess-ivory)" : "url(#chess-ebony)"}
        stroke={white ? "#3a2a18" : "#d8c49a"}
        strokeWidth={white ? 2.4 : 1.6}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {GLYPH[type]}
      </text>
    </svg>
  );
}

export function ChessPreviewRow({ types }: { types: PieceType[] }) {
  return (
    <div className="flex items-end justify-center gap-1">
      <ChessDefs />
      {types.map((type, i) => (
        <div
          key={`${type}-${i}`}
          className="animate-drift h-14 w-12 sm:h-16 sm:w-14"
          style={{ animationDelay: `${i * 0.2}s` }}
        >
          <ChessPiece type={type} color={i % 2 === 0 ? "w" : "b"} />
        </div>
      ))}
    </div>
  );
}
