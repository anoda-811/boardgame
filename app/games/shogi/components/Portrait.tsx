import { portraitSrc } from "@/lib/shogi/portraits";
import type { Opponent } from "@/lib/shogi/career";

/** Painted bust. The same opponent always looks the same. */
export function Portrait({ person, className = "" }: { person: Opponent; className?: string }) {
  return (
    <img
      src={portraitSrc(person)}
      alt={`${person.name}の肖像`}
      className={`object-cover object-[center_18%] ${className}`}
    />
  );
}
