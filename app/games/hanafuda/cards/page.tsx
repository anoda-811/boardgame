import type { Metadata } from "next";
import Link from "next/link";
import { createDeck, kindLabel } from "@/lib/hanafuda/cards";
import { CardArt } from "../components/CardArt";

export const metadata: Metadata = {
  title: "札の一覧｜花札｜ボードゲーム集",
  description: "花札48枚の絵柄と種類",
};

const MONTH_NAMES = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

export default function HanafudaCardsPage() {
  const deck = createDeck();
  const months = Array.from({ length: 12 }, (_, i) => deck.filter((c) => c.month === i + 1));

  return (
    <div className="min-h-screen bg-pine-deep text-[#f3e7c8]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#d4c08a]/70">HANAFUDA</p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-widest">札の一覧</h1>
          </div>
          <Link
            href="/games/hanafuda"
            className="border border-[#d8e0d0]/25 px-3 py-1 text-xs tracking-widest hover:border-[#d4c08a]/50"
          >
            ← 花札へ
          </Link>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          {months.map((cards, i) => (
            <section key={i} className="rounded-sm border border-[#d4c08a]/15 bg-black/20 p-3">
              <h2 className="mb-2 flex items-baseline gap-2 font-[family-name:var(--font-display)] text-lg">
                {MONTH_NAMES[i]}
                <span className="text-sm text-[#d4c08a]">{cards[0].flower}</span>
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {cards.map((card) => (
                  <figure key={card.id} className="flex flex-col items-center gap-1">
                    <div className="aspect-[7/10] w-full overflow-hidden rounded-[4px] shadow-[0_4px_10px_rgba(0,0,0,0.35)]">
                      <CardArt card={card} />
                    </div>
                    <figcaption className="text-center text-[10px] leading-tight text-[#d8e0d0]/75">
                      {card.kind === "chaff" ? "カス" : card.name}
                      <span className="ml-1 text-[#d4c08a]/80">{kindLabel(card.kind)}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
