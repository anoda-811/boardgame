import Link from "next/link";
import { CardArt } from "./games/hanafuda/components/CardArt";
import { PieceStandPreview } from "./games/shogi/components/PieceView";
import type { HanafudaCard } from "@/lib/hanafuda/cards";

const previewCards: HanafudaCard[] = [
  {
    id: "3-0",
    month: 3,
    kind: "bright",
    name: "幕",
    flower: "桜",
    mark: "幕",
  },
  {
    id: "1-0",
    month: 1,
    kind: "bright",
    name: "鶴",
    flower: "松",
    mark: "鶴",
  },
  {
    id: "10-0",
    month: 10,
    kind: "animal",
    name: "鹿",
    flower: "紅葉",
    mark: "鹿",
  },
];

const games = [
  {
    id: "hanafuda",
    title: "花札",
    subtitle: "こいこい",
    description: "月あかりの下で遊ぶ、伝統の花合わせ。",
    href: "/games/hanafuda",
    available: true,
    accent: "from-[#7a1520] via-[#9a1f2b] to-[#5c1018]",
  },
  {
    id: "shogi",
    title: "将棋",
    subtitle: "対局",
    description: "盤上の駆け引き。先手であなたが指す。",
    href: "/games/shogi",
    available: true,
    accent: "from-[#5a3a1e] via-[#3d2814] to-[#1a120c]",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#f4faf1_0%,_#dbe8d8_45%,_#c5d6c4_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#9bb89a]/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-[#d4c08a]/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2318241c' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-14 sm:px-10 sm:py-20">
        <header className="animate-fade-up mb-16 max-w-2xl">
          <p className="mb-4 font-[family-name:var(--font-body)] text-sm tracking-[0.35em] text-pine/70">
            BOARD GAME COLLECTION
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-tight tracking-wide text-ink sm:text-7xl">
            ボードゲーム集
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink/70 sm:text-lg">
            好きなゲームを選んで、すぐ遊べる小さな遊び場。
          </p>
        </header>

        <section
          aria-label="ゲーム一覧"
          className="animate-fade-up grid gap-5 sm:grid-cols-2"
          style={{ animationDelay: "120ms" }}
        >
          {games.map((game) => {
            const content = (
              <>
                <div
                  className={`relative mb-6 aspect-[16/10] overflow-hidden rounded-sm bg-gradient-to-br ${game.accent}`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
                  {game.id === "hanafuda" ? (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 sm:gap-3">
                      {previewCards.map((card, index) => (
                        <div
                          key={card.id}
                          className="animate-drift"
                          style={{
                            animationDelay: `${index * 0.35}s`,
                          }}
                        >
                          <div
                            className="h-24 w-[4.2rem] overflow-hidden rounded-[4px] shadow-[0_12px_28px_rgba(0,0,0,0.4)] sm:h-28 sm:w-[4.9rem]"
                            style={{
                              transform: `rotate(${(index - 1) * 8}deg)`,
                            }}
                          >
                            <CardArt card={card} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : game.id === "shogi" ? (
                    <div className="absolute inset-0 flex items-center justify-center px-4">
                      <PieceStandPreview labels={["香", "桂", "銀", "金", "玉"]} />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-[family-name:var(--font-display)] text-4xl text-white/25">
                        …
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs tracking-[0.25em] text-pine/55 uppercase">
                      {game.subtitle}
                    </p>
                    <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-ink">
                      {game.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink/65">
                      {game.description}
                    </p>
                  </div>
                  <span className="mt-1 shrink-0 text-sm text-lacquer">開く →</span>
                </div>
              </>
            );

            return (
              <Link
                key={game.id}
                href={game.href}
                className="group border border-pine/15 bg-panel/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-pine/35 hover:bg-panel hover:shadow-[0_18px_40px_rgba(35,64,48,0.12)]"
              >
                {content}
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}
