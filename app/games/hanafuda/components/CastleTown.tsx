"use client";

import { useState } from "react";
import { domainSeat, hanById, type Han } from "@/lib/hanafuda/domains";
import type { HanafudaStory } from "@/lib/hanafuda/story";
import { TownScene, type TownPin } from "./TownScene";
import { DebtLine, MoneyActions } from "./MoneyActions";

const PINS: TownPin[] = [
  { id: "nagaya", label: "長屋", kind: "nagaya", x: 22, y: 72 },
  { id: "market", label: "市場", kind: "market", x: 38, y: 50 },
  { id: "tea", label: "茶屋", kind: "tea", x: 68, y: 64 },
  { id: "shrine", label: "神社", kind: "shrine", x: 76, y: 32 },
  { id: "castle", label: "城", kind: "mansion", x: 46, y: 20 },
];

export function CastleTown({
  hanId,
  story,
  inside,
  playIntro,
  onIntroDone,
  onEnter,
  onLeaveTown,
  onPlay,
  onOddJob,
  onBorrow,
  onRepay,
  onReset,
  onJapan,
  onExit,
}: {
  hanId: number;
  story: HanafudaStory;
  inside: boolean;
  playIntro: boolean;
  onIntroDone: () => void;
  onEnter: () => void;
  onLeaveTown: () => void;
  onPlay: () => void;
  onOddJob: () => void;
  onBorrow: () => void;
  onRepay: () => void;
  onReset: () => void;
  onJapan: () => void;
  onExit: () => void;
}) {
  const han = hanById(hanId);
  const [spot, setSpot] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  if (!han) return null;
  const townName = han.name.endsWith("藩") ? han.name.slice(0, -1) : han.name;
  const held = story.conquered.includes(han.id);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#10241a] text-[#f3e7c8]">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#d4c08a]/15 px-3 py-2 sm:px-5">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.35em] text-[#d4c08a]/70">{inside ? "町" : "都市"}</p>
          <h1 className="truncate font-[family-name:var(--font-display)] text-xl tracking-[0.2em] sm:text-2xl">{inside ? townName : han.name}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <p className="text-right text-[11px] leading-tight tracking-widest text-[#e6c887]">
            所持 {story.purse}文
            <span className="mt-0.5 block text-[10px] text-[#d8e0d0]/55">{held ? "制覇" : "未制覇"}</span>
            <DebtLine story={story} />
          </p>
          {inside ? (
            <button type="button" onClick={onLeaveTown} className="border border-[#d4c08a]/40 px-2 py-1 text-[11px] tracking-widest hover:border-[#d4c08a]/70 sm:px-3">
              {han.name}
            </button>
          ) : (
            <button type="button" onClick={onJapan} className="border border-[#d4c08a]/40 px-2 py-1 text-[11px] tracking-widest hover:border-[#d4c08a]/70 sm:px-3">
              日本
            </button>
          )}
          <button type="button" onClick={onExit} className="border border-[#d8e0d0]/25 px-2 py-1 text-[11px] tracking-widest hover:border-[#d4c08a]/50 sm:px-3">
            タイトル
          </button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_18rem] sm:grid-rows-1">
        {inside ? (
          <TownScene
            kicker={han.name}
            title={townName}
            scenery="castle"
            pins={PINS.map((pin) => ({ ...pin, done: pin.id === "castle" && held }))}
            selectedId={spot}
            playIntro={playIntro}
            onIntroDone={onIntroDone}
            onSelect={setSpot}
          />
        ) : (
          <CityGate name={townName} onEnter={onEnter} />
        )}
        <aside className="max-h-[46%] overflow-y-auto border-t border-[#d4c08a]/15 bg-[#10241a]/95 px-4 py-3 sm:max-h-none sm:border-l sm:border-t-0">
          {inside ? (
            <CastlePanel han={han} spot={spot} held={held} onPlay={onPlay} />
          ) : (
            <CityGatePanel name={townName} place={han.place} onEnter={onEnter} />
          )}
          <MoneyActions story={story} onOddJob={onOddJob} onBorrow={onBorrow} onRepay={onRepay} />
          {story.log[0] && <p className="mt-4 text-[11px] leading-relaxed text-[#d8e0d0]/45">{story.log[0].text}</p>}
          <div className="mt-4">
            {confirmReset ? (
              <div className="flex gap-2">
                <button type="button" onClick={onReset} className="border border-[#d4c08a]/40 px-2 py-1 text-[10px] tracking-widest">
                  所持を捨てる
                </button>
                <button type="button" onClick={() => setConfirmReset(false)} className="px-2 py-1 text-[10px] tracking-widest text-[#d8e0d0]/55">
                  やめる
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmReset(true)} className="text-[10px] tracking-widest text-[#d8e0d0]/35 hover:text-[#d8e0d0]/70">
                初めから
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function CityGate({ name, onEnter }: { name: string; onEnter: () => void }) {
  return (
    <div className="relative min-h-0 bg-[#143028]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <rect width="100" height="100" fill="#17342c" />
        <path d="M12 72 H88 M28 18 V82" fill="none" stroke="#d4c08a" strokeOpacity="0.3" strokeWidth="0.7" />
        <rect x="38" y="16" width="24" height="14" fill="#10241a" stroke="#d4c08a" strokeOpacity="0.4" />
      </svg>
      <button type="button" onClick={onEnter} className="absolute left-1/2 top-[58%] z-10 -translate-x-1/2 -translate-y-1/2 text-center">
        <svg viewBox="0 0 48 36" className="mx-auto h-12 w-14">
          <path d="M4 16 L24 4 L44 16 V32 H4 Z" fill="#1a3a30" stroke="#e6c887" strokeWidth="1.6" />
          <rect x="19" y="20" width="10" height="12" fill="#10241a" stroke="#e6c887" />
        </svg>
        <span className="mt-1 block text-[12px] tracking-[0.2em] text-[#f6ecd2]">{name}</span>
      </button>
    </div>
  );
}

function CityGatePanel({ name, place, onEnter }: { name: string; place: string; onEnter: () => void }) {
  return (
    <>
      <p className="text-[10px] tracking-[0.28em] text-[#d4c08a]/70">城下</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-[0.16em]">{name}</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#d8e0d0]/75">{place}</p>
      <p className="mt-3 text-[11px] leading-relaxed text-[#d8e0d0]/50">通りと建物が並んでいる。入って、どこへ行くかを選ぶ。</p>
      <button type="button" onClick={onEnter} className="mt-4 w-full border border-[#d4c08a]/60 bg-[#d4c08a]/15 py-2.5 tracking-[0.3em] hover:bg-[#d4c08a]/25">
        入る
      </button>
    </>
  );
}

function CastlePanel({ han, spot, held, onPlay }: { han: Han; spot: string | null; held: boolean; onPlay: () => void }) {
  const seat = domainSeat(han.id);
  if (spot === "castle") {
    return (
      <>
        <p className="text-[10px] tracking-[0.28em] text-[#d4c08a]/70">城</p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-[0.16em]">城</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#d8e0d0]/75">{seat.place}</p>
        <p className="mt-4 text-[10px] tracking-[0.28em] text-[#d4c08a]/70">花札師</p>
        <p className="mt-1 text-lg tracking-[0.14em] text-[#e6c887]">{seat.opponent}</p>
        <p className="mt-1 text-sm leading-relaxed text-[#d8e0d0]/70">{seat.boss}</p>
        <p className="mt-3 text-[11px] leading-relaxed text-[#d8e0d0]/55">
          3回勝負。文が多い方が勝ち、その文を相手からもらう。負けると、相手の文だけ失う。
          {!held && " ここに勝てば、この藩を制覇する。"}
        </p>
        <button type="button" onClick={onPlay} className="mt-4 w-full border border-[#d4c08a]/60 bg-[#d4c08a]/15 py-2.5 tracking-[0.3em] hover:bg-[#d4c08a]/25">
          入る
        </button>
      </>
    );
  }
  const sights: Record<string, { title: string; text: string }> = {
    nagaya: { title: "長屋", text: seat.place },
    market: { title: "市場", text: "城下の市場。人の往来だけが、音を立てている。" },
    tea: { title: "茶屋", text: "茶の湯気。札を出す者は、城のほうにいる。" },
    shrine: { title: "神社", text: "松の影。賽銭の皿が、光っている。" },
  };
  const sight = spot ? sights[spot] : null;
  if (!sight) return <p className="text-sm leading-relaxed text-[#d8e0d0]/55">どこへ行こう。建物を選ぶ。</p>;
  return (
    <>
      <p className="text-[10px] tracking-[0.28em] text-[#d4c08a]/70">通り</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-[0.16em]">{sight.title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#d8e0d0]/75">{sight.text}</p>
    </>
  );
}
