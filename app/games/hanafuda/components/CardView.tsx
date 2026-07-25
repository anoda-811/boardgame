import type { HanafudaCard } from "@/lib/hanafuda/cards";
import { CardArt, CardBackArt } from "./CardArt";

type Props = {
  card: HanafudaCard;
  selected?: boolean;
  dimmed?: boolean;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
};

const sizeClass = {
  sm: "h-[4.5rem] w-[3.15rem]",
  md: "h-[5.75rem] w-[4rem]",
  lg: "h-[7rem] w-[4.9rem]",
} as const;

export function CardView({
  card,
  selected,
  dimmed,
  faceDown,
  size = "md",
  onClick,
  disabled,
}: Props) {
  const clickable = Boolean(onClick) && !disabled;

  const frameClass = [
    "relative overflow-hidden rounded-[4px] shadow-[0_4px_12px_rgba(0,0,0,0.22)] transition duration-200",
    sizeClass[size],
    selected
      ? "z-10 -translate-y-2 ring-2 ring-[#d4c08a] ring-offset-1 ring-offset-[#163024]"
      : "",
    dimmed ? "opacity-35 grayscale-[0.35]" : "",
  ].join(" ");

  if (faceDown) {
    return (
      <div className={frameClass} aria-hidden>
        <CardBackArt />
      </div>
    );
  }

  const art = <CardArt card={card} />;

  if (!clickable) {
    return (
      <div className={frameClass} aria-label={`${card.flower}の${card.name}`}>
        {art}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        frameClass,
        "cursor-pointer p-0 hover:-translate-y-1 hover:shadow-[0_8px_18px_rgba(0,0,0,0.32)]",
        disabled ? "opacity-50" : "",
      ].join(" ")}
      aria-label={`${card.flower}の${card.name}`}
    >
      {art}
    </button>
  );
}
