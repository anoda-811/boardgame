"use client";

import { useState } from "react";
import { EDO_ID } from "@/lib/hanafuda/domains";
import {
  EDO_BOSS_ID,
  STREETS,
  seatOpen,
  streetById,
  streetOpen,
  type HanafudaStory,
  type Seat,
  type Street,
} from "@/lib/hanafuda/story";
import { TownScene, type BuildingKind } from "./TownScene";
import { EdoSky } from "./EdoSky";
import { DebtLine, MoneyActions } from "./MoneyActions";

type Spot = {
  id: string;
  label: string;
  kind: BuildingKind;
  x: number;
  y: number;
  seatId?: string;
  sight?: string;
};

const SPOTS: Record<string, Spot[]> = {
  honjo: [
    { id: "rokube", label: "長屋", kind: "nagaya", x: 22, y: 74, seatId: "rokube" },
    { id: "market", label: "市場", kind: "market", x: 18, y: 44, sight: "魚と野菜の匂い。屋台の陰で、人が札の話をしている。" },
    { id: "tea-honjo", label: "茶屋", kind: "tea", x: 46, y: 56, seatId: "tea-honjo" },
    { id: "oshima", label: "舟宿", kind: "boat", x: 76, y: 66, seatId: "oshima" },
    { id: "shrine", label: "神社", kind: "shrine", x: 64, y: 24, sight: "鳥居の奥は静かだ。今日は、札の音がしない。" },
    { id: "tatsugoro", label: "火消", kind: "fire", x: 34, y: 28, seatId: "tatsugoro" },
  ],
  nihonbashi: [
    { id: "denbe", label: "市場", kind: "market", x: 26, y: 72, seatId: "denbe" },
    { id: "tavern", label: "酒場", kind: "tavern", x: 18, y: 40, sight: "灯の下で杯が鳴る。札を出す者は、橋のほうだ。" },
    { id: "sakichi", label: "花札屋", kind: "shop", x: 42, y: 50, seatId: "sakichi" },
    { id: "tea-nihonbashi", label: "茶屋", kind: "tea", x: 74, y: 64, seatId: "tea-nihonbashi" },
    { id: "kyube", label: "日本橋", kind: "bridge", x: 64, y: 32, seatId: "kyube" },
    { id: "dojo", label: "道場", kind: "dojo", x: 82, y: 26, sight: "木刀の音。札の席は、今日は空いている。" },
  ],
  yashiki: [
    { id: "gon", label: "長屋門", kind: "gate", x: 28, y: 74, seatId: "gon" },
    { id: "nagaya", label: "長屋", kind: "nagaya", x: 18, y: 46, sight: "門前の長屋。洗濯の紐が、風に揺れている。" },
    { id: "sakakibara", label: "屋敷", kind: "mansion", x: 42, y: 48, seatId: "sakakibara" },
    { id: "tea-yashiki", label: "茶屋", kind: "tea", x: 72, y: 62, seatId: "tea-yashiki" },
    { id: "shrine", label: "神社", kind: "shrine", x: 76, y: 28, sight: "松の影。賽銭の皿だけが、光っている。" },
    { id: "kichizo", label: "奥座敷", kind: "mansion", x: 48, y: 20, seatId: "kichizo" },
  ],
};

const SCENERY = { honjo: "river", nihonbashi: "bridge", yashiki: "castle" } as const;

export function EdoMap({
  story,
  streetId,
  onStreet,
  onPlay,
  onOddJob,
  onBorrow,
  onRepay,
  onReset,
  onJapan,
  onExit,
}: {
  story: HanafudaStory;
  streetId: string | null;
  onStreet: (id: string | null) => void;
  onPlay: (seat: Seat) => void;
  onOddJob: () => void;
  onBorrow: () => void;
  onRepay: () => void;
  onReset: () => void;
  onJapan: () => void;
  onExit: () => void;
}) {
  const street = streetId ? streetById(streetId) : null;
  const [hotStreet, setHotStreet] = useState(STREETS[0].id);
  const [spotId, setSpotId] = useState<string | null>(null);
  const [introId, setIntroId] = useState<string | null>(null);
  const [diveId, setDiveId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const glance = STREETS.find((item) => item.id === hotStreet) ?? STREETS[0];
  const spots = street ? SPOTS[street.id] ?? [] : [];
  const spot = spots.find((item) => item.id === spotId) ?? null;
  const seat = spot?.seatId ? [...(street?.seats ?? []), street?.tea].find((item) => item?.id === spot.seatId) ?? null : null;

  const beginDive = (id: string) => {
    if (diveId || !streetOpen(story, id)) return;
    setHotStreet(id);
    setDiveId(id);
  };

  const enter = (id: string) => {
    setSpotId(null);
    setIntroId(id);
    setDiveId(null);
    onStreet(id);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#10241a] text-[#f3e7c8]">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#d4c08a]/15 px-3 py-2 sm:px-5">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.35em] text-[#d4c08a]/70">{street ? "町" : "都市"}</p>
          <h1 className="truncate font-[family-name:var(--font-display)] text-xl tracking-[0.2em] sm:text-2xl">
            {street ? street.name : "江戸の町"}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <p className="text-right text-[11px] leading-tight tracking-widest text-[#e6c887]">
            所持 {story.purse}文
            <span className="mt-0.5 block text-[10px] text-[#d8e0d0]/55">
              {story.wins}勝 {story.losses}敗
            </span>
            <DebtLine story={story} />
          </p>
          {street ? (
            <button
              type="button"
              onClick={() => onStreet(null)}
              className="border border-[#d4c08a]/40 px-2 py-1 text-[11px] tracking-widest hover:border-[#d4c08a]/70 sm:px-3"
            >
              江戸
            </button>
          ) : (
            <button
              type="button"
              onClick={onJapan}
              className="border border-[#d4c08a]/40 px-2 py-1 text-[11px] tracking-widest hover:border-[#d4c08a]/70 sm:px-3"
            >
              日本
            </button>
          )}
          <button
            type="button"
            onClick={onExit}
            className="border border-[#d8e0d0]/25 px-2 py-1 text-[11px] tracking-widest hover:border-[#d4c08a]/50 sm:px-3"
          >
            タイトル
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_18rem] sm:grid-rows-1">
        {street ? (
          <TownScene
            kicker="江戸"
            title={street.name}
            scenery={SCENERY[street.id as keyof typeof SCENERY] ?? "river"}
            selectedId={spotId}
            playIntro={introId === street.id}
            onIntroDone={() => setIntroId(null)}
            onSelect={setSpotId}
            pins={spots.map((item) => ({
              id: item.id,
              label: item.label,
              kind: item.kind,
              x: item.x,
              y: item.y,
              done: !!item.seatId && (story.cleared ?? []).includes(item.seatId),
              dim: !!item.seatId && !seatOpen(story, item.seatId),
            }))}
          />
        ) : (
          <EdoSky
            story={story}
            hotId={glance.id}
            diveId={diveId}
            onHover={setHotStreet}
            onPick={beginDive}
            onArrive={() => {
              if (diveId) enter(diveId);
            }}
          />
        )}

        <aside className="max-h-[46%] overflow-y-auto border-t border-[#d4c08a]/15 bg-[#10241a]/95 px-4 py-3 sm:max-h-none sm:border-l sm:border-t-0">
          {street ? (
            <SpotPanel spot={spot} seat={seat ?? null} story={story} onPlay={onPlay} />
          ) : (
            <CityPanel street={glance} open={streetOpen(story, glance.id)} onEnter={() => beginDive(glance.id)} />
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

function CityPanel({ street, open, onEnter }: { street: Street; open: boolean; onEnter: () => void }) {
  return (
    <>
      <p className="text-[10px] tracking-[0.28em] text-[#d4c08a]/70">城下</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-[0.16em]">{street.name}</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#d8e0d0]/75">{street.blurb}</p>
      <p className="mt-3 text-[11px] leading-relaxed text-[#d8e0d0]/50">通りと建物が並んでいる。入って、どこへ行くかを選ぶ。</p>
      {open ? (
        <button
          type="button"
          onClick={onEnter}
          className="mt-4 w-full border border-[#d4c08a]/60 bg-[#d4c08a]/15 py-2.5 tracking-[0.3em] hover:bg-[#d4c08a]/25"
        >
          入る
        </button>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-[#d8e0d0]/45">手前の街の奥に勝つと、ここが開く。</p>
      )}
    </>
  );
}

function SpotPanel({
  spot,
  seat,
  story,
  onPlay,
}: {
  spot: Spot | null;
  seat: Seat | null;
  story: HanafudaStory;
  onPlay: (seat: Seat) => void;
}) {
  if (!spot) {
    return <p className="text-sm leading-relaxed text-[#d8e0d0]/55">どこへ行こう。建物を選ぶ。</p>;
  }
  const open = seat ? seatOpen(story, seat.id) : false;
  const boss = seat?.id === EDO_BOSS_ID;
  return (
    <>
      <p className="text-[10px] tracking-[0.28em] text-[#d4c08a]/70">{seat ? (seat.ladder ? "建物" : "茶屋") : "通り"}</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-[0.16em]">{spot.label}</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#d8e0d0]/75">{seat?.blurb ?? spot.sight}</p>
      {seat && open && (
        <>
          <p className="mt-4 text-[10px] tracking-[0.28em] text-[#d4c08a]/70">花札師</p>
          <p className="mt-1 text-lg tracking-[0.14em] text-[#e6c887]">{seat.opponent}</p>
          <p className="mt-1 text-xs text-[#d8e0d0]/60">「{seat.line}」</p>
          <p className="mt-3 text-[11px] leading-relaxed text-[#d8e0d0]/55">
            3回勝負。文が多い方が勝ち、その文を相手からもらう。負けると、相手の文だけ失う。
            {boss && !story.conquered.includes(EDO_ID) && " ここに勝てば、隣の藩が開く。"}
          </p>
          <button
            type="button"
            onClick={() => onPlay(seat)}
            className="mt-4 w-full border border-[#d4c08a]/60 bg-[#d4c08a]/15 py-2.5 tracking-[0.3em] hover:bg-[#d4c08a]/25"
          >
            入る
          </button>
        </>
      )}
    </>
  );
}
