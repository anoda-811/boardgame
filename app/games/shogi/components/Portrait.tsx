import type { Opponent } from "@/lib/shogi/career";

const SKIN = ["#f6d3b4", "#e2b48c", "#c48a62"];
const HAIR: Record<Opponent["hair"], string> = {
  short: "#1c140e",
  long: "#24160f",
  gray: "#8d8a84",
  white: "#f3f0e6",
  bald: "#f3f0e6",
};

/** A small illustrated portrait. The same opponent always looks the same. */
export function Portrait({ person, className = "" }: { person: Opponent; className?: string }) {
  const skin = SKIN[person.skin];
  const hair = HAIR[person.hair];
  const aged = person.age >= 60;
  const id = person.name.replace(/\s/g, "");

  return (
    <svg viewBox="0 0 200 240" className={className} role="img" aria-label={`${person.name}の肖像`}>
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={person.outfit === "kimono" ? "#3a2414" : "#243044"} />
          <stop offset="100%" stopColor="#120c08" />
        </linearGradient>
        <linearGradient id={`cloth-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={person.outfit === "jacket" ? "#2c3f34" : person.outfit === "suit" ? "#2a3140" : "#4a2c18"} />
          <stop offset="100%" stopColor={person.outfit === "kimono" ? "#2a160c" : "#141820"} />
        </linearGradient>
        <clipPath id={`clip-${id}`}>
          <rect width="200" height="240" rx="8" />
        </clipPath>
      </defs>
      <g clipPath={`url(#clip-${id})`}>
        <rect width="200" height="240" fill={`url(#bg-${id})`} />
        <ellipse cx="100" cy="250" rx="92" ry="70" fill={`url(#cloth-${id})`} />
        {person.outfit === "kimono" ? (
          <path d="M100 168 L146 240 L54 240 Z" fill="#6b3a22" />
        ) : (
          <>
            <path d="M78 176 L100 210 L122 176" fill="#f4efe6" />
            <path d="M96 188 L100 240 L104 188" fill={person.outfit === "suit" ? "#8a1e1e" : "#1d4a34"} />
          </>
        )}
        <rect x="86" y="150" width="28" height="28" rx="8" fill={skin} />
        <ellipse cx="46" cy="118" rx="10" ry="14" fill={skin} />
        <ellipse cx="154" cy="118" rx="10" ry="14" fill={skin} />
        <ellipse cx="100" cy="112" rx="58" ry="66" fill={skin} />

        {person.hair === "bald" ? (
          <>
            <path d="M52 100 Q40 150 58 168 Q70 140 62 108 Z" fill={hair} opacity="0.9" />
            <path d="M148 100 Q160 150 142 168 Q130 140 138 108 Z" fill={hair} opacity="0.9" />
          </>
        ) : person.hair === "long" ? (
          <>
            <path d="M44 120 Q38 42 100 36 Q162 42 156 120 Q146 72 100 68 Q54 72 44 120 Z" fill={hair} />
            <path d="M46 112 Q34 170 54 214 L70 200 Q56 156 66 114 Z" fill={hair} />
            <path d="M154 112 Q166 170 146 214 L130 200 Q144 156 134 114 Z" fill={hair} />
          </>
        ) : (
          <path d="M44 112 Q40 48 100 40 Q160 48 156 112 Q150 78 100 74 Q50 78 44 112 Z" fill={hair} />
        )}

        <path d="M62 104 Q78 96 90 104" fill="none" stroke="#3a2418" strokeWidth="3" strokeLinecap="round" />
        <path d="M110 104 Q122 96 138 104" fill="none" stroke="#3a2418" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="78" cy="116" rx="7" ry={aged ? 4 : 5.5} fill="#1a120c" />
        <ellipse cx="122" cy="116" rx="7" ry={aged ? 4 : 5.5} fill="#1a120c" />
        <ellipse cx="80" cy="114" rx="2" ry="2" fill="#fff" />
        <ellipse cx="124" cy="114" rx="2" ry="2" fill="#fff" />
        <path d="M100 122 Q106 132 100 136" fill="none" stroke="#a8785c" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d={aged ? "M84 150 Q100 156 116 150" : "M86 148 Q100 156 114 148"}
          fill="none"
          stroke="#8a4e42"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {aged && (
          <g fill="none" stroke="#c49a7a" strokeWidth="1.2" opacity="0.8">
            <path d="M58 108 Q52 118 60 126" />
            <path d="M142 108 Q148 118 140 126" />
            <path d="M70 156 Q100 164 130 156" />
          </g>
        )}
        {person.beard !== "none" && (
          <path
            d={person.beard === "full" ? "M62 146 Q100 210 138 146 Q124 168 100 172 Q76 168 62 146 Z" : "M78 150 Q100 168 122 150 Q112 160 100 160 Q88 160 78 150 Z"}
            fill={person.age >= 65 ? "#d9d4c8" : "#2a2118"}
            opacity="0.9"
          />
        )}
        {person.glasses && (
          <g fill="none" stroke="#d9c7a0" strokeWidth="3">
            <circle cx="78" cy="116" r="16" />
            <circle cx="122" cy="116" r="16" />
            <path d="M94 116 H106" />
          </g>
        )}
      </g>
    </svg>
  );
}
