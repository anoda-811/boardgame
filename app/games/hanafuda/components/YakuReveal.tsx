"use client";

import { useEffect, useState } from "react";
import type { HanafudaCard } from "@/lib/hanafuda/cards";
import type { Yaku } from "@/lib/hanafuda/yaku";
import { CardArt } from "./CardArt";

type Props = {
  yaku: Yaku;
  cards: HanafudaCard[];
  who: "player" | "opponent";
  choice: boolean;
  onKoi: () => void;
  onStop: () => void;
};

export function YakuReveal({ yaku, cards, who, choice, onKoi, onStop }: Props) {
  const [ready, setReady] = useState(false);
  const n = Math.max(cards.length, 1);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1100);
    return () => window.clearTimeout(timer);
  }, [yaku.id, who]);

  const width =
    n <= 3
      ? "clamp(4.6rem, 16vw, 8.6rem)"
      : n <= 5
        ? "clamp(3.6rem, 12vw, 6.8rem)"
        : n <= 8
          ? "clamp(2.7rem, 9vw, 4.8rem)"
          : "clamp(2.1rem, 7.2vw, 3.4rem)";

  return (
    <div className="yaku-veil fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 bg-[#070503]/90" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(214,168,72,0.28),transparent_62%)]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-12 bg-gradient-to-b from-transparent via-[#e6c887]/35 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px translate-x-12 bg-gradient-to-b from-transparent via-[#e6c887]/35 to-transparent"
      />

      <div className="relative flex max-h-full w-full max-w-5xl flex-col items-center py-8">
        <p className="text-[11px] tracking-[0.55em] text-[#e6c887]/75">
          {who === "player" ? "あなたの役" : "あいての役"}
        </p>

        <div className="mt-6 flex items-end justify-center" style={{ perspective: "980px" }}>
          {cards.map((card, index) => {
            const offset = index - (n - 1) / 2;
            return (
              <div
                key={card.id}
                className="yaku-card shrink-0"
                style={{
                  width,
                  aspectRatio: "7 / 10",
                  marginLeft: index === 0 ? 0 : n > 8 ? "-0.85rem" : n > 5 ? "0.15rem" : "0.55rem",
                  animationDelay: `${index * 80}ms`,
                  zIndex: index,
                  ["--yaku-lean" as string]: `${offset * (n > 8 ? 1.6 : 4.5)}deg`,
                  ["--yaku-drop" as string]: `${Math.abs(offset) * (n > 8 ? 3 : 7)}px`,
                }}
              >
                <div className="h-full w-full overflow-hidden rounded-[5px] shadow-[0_18px_30px_rgba(0,0,0,0.55)] ring-1 ring-[#f3d9a8]/40">
                  <CardArt card={card} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="yaku-rule mt-8 h-px w-[min(18rem,70vw)] bg-gradient-to-r from-transparent via-[#e6c887] to-transparent" />

        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
          <h2
            className="yaku-name order-2 font-[family-name:var(--font-display)] text-[clamp(2.6rem,8vw,5.4rem)] leading-none text-[#f6e7c1] sm:order-1"
            style={{
              textShadow: "0 0 24px rgba(230, 184, 90, 0.45), 0 2px 0 rgba(90, 48, 12, 0.65)",
            }}
          >
            {yaku.name}
          </h2>
          <span className="yaku-seal order-1 inline-flex h-11 w-11 items-center justify-center border-2 border-[#a32020]/90 font-[family-name:var(--font-display)] text-lg text-[#e7b0a8] sm:order-2 sm:h-12 sm:w-12 sm:text-xl">
            役
          </span>
        </div>
        <p className="mt-3 text-sm tracking-[0.45em] text-[#e6c887]/80">{yaku.points}文</p>

        {choice && (
          <div
            className={[
              "mt-8 flex flex-col gap-3 transition duration-500 sm:flex-row",
              ready ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={onKoi}
              className="border border-[#e6c887]/70 bg-[#e6c887]/15 px-8 py-3 font-[family-name:var(--font-display)] tracking-[0.35em] text-[#f6e7c1] hover:bg-[#e6c887]/28"
            >
              こいこい
            </button>
            <button
              type="button"
              onClick={onStop}
              className="border border-[#f3e7c8]/35 px-8 py-3 font-[family-name:var(--font-display)] tracking-[0.35em] text-[#f3e7c8]/85 hover:border-[#f3e7c8]/60"
            >
              しょうぶ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
