import type { Metadata } from "next";
import Link from "next/link";
import { createDeck } from "@/lib/hanafuda/cards";
import { catalogCards, YAKU_CATALOG } from "@/lib/hanafuda/yaku";
import { CardArt } from "../components/CardArt";

export const metadata: Metadata = {
  title: "役の一覧｜花札｜ボードゲーム集",
  description: "こいこいの役と、そろう札",
};

export default function HanafudaYakuPage() {
  const deck = createDeck();

  return (
    <div className="min-h-screen bg-pine-deep text-[#f3e7c8]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#d4c08a]/70">HANAFUDA</p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-widest">役の一覧</h1>
          </div>
          <Link
            href="/games/hanafuda"
            className="border border-[#d8e0d0]/25 px-3 py-1 text-xs tracking-widest hover:border-[#d4c08a]/50"
          >
            ← 花札へ
          </Link>
        </header>

        <div className="grid gap-5">
          {YAKU_CATALOG.map((yaku) => {
            const cards = catalogCards(deck, yaku.name);
            return (
              <section key={yaku.name} className="rounded-sm border border-[#d4c08a]/15 bg-black/20 p-3 sm:p-4">
                <h2 className="flex items-baseline justify-between gap-3 font-[family-name:var(--font-display)] text-xl tracking-[0.15em]">
                  {yaku.name}
                  <span className="text-sm tracking-widest text-[#d4c08a]">{yaku.points}</span>
                </h2>
                <p className="mt-1 text-xs tracking-wide text-[#d8e0d0]/60">{yaku.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cards.map((card) => (
                    <figure key={card.id} className="flex w-[4.4rem] flex-col items-center gap-1 sm:w-[5.1rem]">
                      <div className="aspect-[7/10] w-full overflow-hidden rounded-[4px] shadow-[0_4px_10px_rgba(0,0,0,0.35)]">
                        <CardArt card={card} />
                      </div>
                      <figcaption className="text-center text-[10px] leading-tight text-[#d8e0d0]/75">
                        {card.flower}
                        <span className="ml-1 text-[#d4c08a]/80">{card.kind === "chaff" ? "カス" : card.name}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs tracking-widest text-[#d8e0d0]/50">
          7文以上、またはこいこいすると点が倍になります
        </p>
      </div>
    </div>
  );
}
