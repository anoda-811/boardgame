"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { CardKind, HanafudaCard } from "@/lib/hanafuda/cards";
import type { GameState, PlayerId } from "@/lib/hanafuda/game";
import { evaluateYaku } from "@/lib/hanafuda/yaku";
import { CardArt, CardBackArt } from "./CardArt";

type Props = {
  state: GameState;
  onPickHand: (cardId: string) => void;
  onPickField: (cardId: string) => void;
  onDraw: () => void;
};

const KIND_ORDER: CardKind[] = ["bright", "animal", "ribbon", "chaff"];
const KIND_LABEL: Record<CardKind, string> = { bright: "光", animal: "種", ribbon: "短", chaff: "カス" };

function TableCard({
  card,
  width,
  faceDown,
  enter = "slap",
  glow,
  dim,
  onClick,
  style,
}: {
  card: HanafudaCard;
  width: number;
  faceDown?: boolean;
  enter?: "slap" | "flip" | "none";
  glow?: boolean;
  dim?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const size = { width, height: Math.round((width * 10) / 7) };
  const face = (
    <div
      className={[
        "hana-card3d h-full w-full overflow-hidden transition duration-200",
        glow ? "animate-hana-choice" : "",
        dim ? "brightness-[0.55] saturate-[0.7]" : "",
      ].join(" ")}
    >
      {faceDown ? <CardBackArt /> : <CardArt card={card} />}
    </div>
  );
  const enterClass =
    enter === "slap" ? "animate-hana-slap" : enter === "flip" ? "animate-hana-flip" : "";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${card.flower}の${card.name}`}
        className="relative shrink-0 cursor-pointer p-0 transition-transform duration-200 hover:-translate-y-2"
        style={{ ...size, ...style }}
      >
        <div className={`h-full w-full ${enterClass}`}>{face}</div>
      </button>
    );
  }
  return (
    <div className="relative shrink-0" style={{ ...size, ...style }} aria-hidden={faceDown}>
      <div className={`h-full w-full ${enterClass}`}>{face}</div>
    </div>
  );
}

function useNarrowScreen() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return narrow;
}

function CapturedPiles({ cards, width, tight }: { cards: HanafudaCard[]; width: number; tight?: boolean }) {
  return (
    <div className={tight ? "flex items-end justify-center gap-1.5" : "flex items-end justify-center gap-5"}>
      {KIND_ORDER.map((kind) => {
        const group = cards.filter((c) => c.kind === kind);
        return (
          <div key={kind} className="flex min-w-[2.5rem] flex-col items-center gap-1">
            <div className="flex items-end" style={{ minHeight: Math.round((width * 10) / 7) }}>
              {group.map((card, i) => (
                <TableCard
                  key={card.id}
                  card={card}
                  width={width}
                  style={{ marginLeft: i === 0 ? 0 : -width * 0.62 }}
                />
              ))}
            </div>
            <span className={tight ? "text-[9px] tracking-widest text-[#f3d9a8]/70" : "text-[11px] tracking-widest text-[#f3d9a8]/70"}>
              {KIND_LABEL[kind]} {group.length > 0 ? group.length : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DeckStack({
  count,
  canDraw,
  onDraw,
  width = 62,
}: {
  count: number;
  canDraw: boolean;
  onDraw: () => void;
  width?: number;
}) {
  const height = Math.round((width * 10) / 7);
  const layers = Math.min(6, Math.ceil(count / 4));
  if (count <= 0) {
    return (
      <div
        className="flex items-center justify-center rounded-[4px] border border-dashed border-[#f3d9a8]/25 text-[10px] tracking-widest text-[#f3d9a8]/40"
        style={{ width, height }}
      >
        空
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={!canDraw}
      onClick={onDraw}
      aria-label={canDraw ? "山札をめくる" : `山札 残り${count}枚`}
      className={[
        "relative p-0 transition-transform duration-200",
        canDraw ? "cursor-pointer hover:-translate-y-1.5" : "cursor-default",
      ].join(" ")}
      style={{ width, height }}
    >
      {Array.from({ length: layers }, (_, i) => (
        <div
          key={i}
          className={[
            "hana-card3d absolute inset-0 overflow-hidden",
            i === layers - 1 && canDraw ? "animate-hana-choice" : "",
          ].join(" ")}
          style={{ transform: `translate(${-i * 0.6}px, ${-i * 1.6}px)` }}
        >
          <CardBackArt />
        </div>
      ))}
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] tracking-widest text-[#f3d9a8]/80">
        {canDraw ? "タップでめくる" : `山札 ${count}`}
      </span>
    </button>
  );
}

function Hud({ state, who, label }: { state: GameState; who: PlayerId; label: string }) {
  const yaku = evaluateYaku(state.captured[who]);
  return (
    <div className="pointer-events-none rounded-sm border border-[#f3d9a8]/15 bg-black/45 px-3 py-1.5 text-[#f3e7c8] shadow-lg backdrop-blur-[2px]">
      <p className="flex items-baseline gap-2 text-sm">
        <span className="font-[family-name:var(--font-display)]">{label}</span>
        <span className="tracking-widest text-[#e6c887]">{state.scores[who]}文</span>
        <span className="text-[10px] text-[#f3e7c8]/45">取り札 {state.captured[who].length}</span>
      </p>
      {yaku.list.length > 0 && (
        <p className="text-[11px] text-[#e6c887]/90">
          {yaku.list.map((y) => `${y.name}(${y.points})`).join("・")}
        </p>
      )}
    </div>
  );
}

function PlayerHand({
  cards,
  field,
  canPick,
  onPick,
  narrow,
}: {
  cards: HanafudaCard[];
  field: HanafudaCard[];
  canPick: boolean;
  onPick: (id: string) => void;
  narrow?: boolean;
}) {
  const n = cards.length;
  const width = narrow ? 58 : 86;
  const height = Math.round((width * 10) / 7);
  const [box, setBox] = useState(0);
  useEffect(() => {
    const el = document.getElementById("hana-player-hand");
    if (!el) return;
    const update = () => setBox(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const room = Math.max(0, (box || 360) - width - 12);
  const step = narrow ? Math.min(34, room / Math.max(1, n - 1)) : 62;
  const sag = n > 1 ? ((n - 1) / 2) ** 2 * (narrow ? 0.6 : 1.5) : 0;
  return (
    <div id="hana-player-hand" className="relative h-full w-full">
      {cards.map((card, i) => {
        const o = i - (n - 1) / 2;
        const matches = canPick && field.some((f) => f.month === card.month);
        return (
          <button
            key={card.id}
            type="button"
            disabled={!canPick}
            onClick={() => onPick(card.id)}
            aria-label={`${card.flower}の${card.name}`}
            className="group absolute bottom-2 left-1/2 p-0 transition-transform duration-200 ease-out"
            style={{
              width,
              height,
              marginLeft: -width / 2,
              transformOrigin: "50% 160%",
              transform: `translateX(${o * step}px) translateY(${o * o * (narrow ? 0.6 : 1.5) - sag}px) rotate(${o * (narrow ? 2.4 : 4.5)}deg)`,
              zIndex: i,
            }}
          >
            <div
              className={[
                "hana-card3d h-full w-full overflow-hidden transition duration-200",
                canPick
                  ? "cursor-pointer group-hover:-translate-y-6 group-hover:shadow-[0_18px_28px_rgba(0,0,0,0.6)]"
                  : "brightness-[0.8]",
                matches ? "ring-2 ring-[#ffd678]/80" : "",
              ].join(" ")}
            >
              <CardArt card={card} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function Table3D({ state, onPickHand, onPickField, onDraw }: Props) {
  const narrow = useNarrowScreen();
  const selectingField = state.phase === "selectField" || state.phase === "selectDrawField";
  const canPickHand = state.phase === "selectHand";
  const canDraw = state.phase === "awaitDraw";

  const pending = state.pendingCard;
  const pendingFromDeck =
    state.phase === "revealDraw" || state.phase === "selectDrawField" || state.phase === "opponentRevealDraw";
  const showPending =
    pending &&
    (pendingFromDeck || state.phase === "selectField" || state.phase === "opponentShowHand");

  const oppHand = state.hands.opponent;
  const handBand = narrow ? 112 : 154;
  const deckWidth = narrow ? 46 : 62;
  const fieldWidth = narrow ? 48 : 78;
  const oppCard = narrow ? 28 : 40;

  return (
    <div className="hana-room relative min-h-0 flex-1 overflow-clip">
      {/* lamp glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-40 w-[70%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,_rgba(255,200,130,0.25),transparent_70%)]"
      />

      {/* the table, tilted away from the player */}
      <div
        className="absolute inset-x-0 top-0 flex justify-center"
        style={{ perspective: "1100px", perspectiveOrigin: "50% 10%", bottom: handBand }}
      >
        <div
          className={narrow ? "hana-table relative h-full w-[min(98%,1000px)] self-end p-1.5" : "hana-table relative h-[118%] w-[min(92%,1000px)] self-end p-4"}
          style={{
            transform: narrow ? "rotateX(12deg)" : "rotateX(34deg)",
            transformOrigin: "50% 100%",
            transformStyle: "preserve-3d",
          }}
        >
          <div className={narrow ? "hana-felt grid h-full grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-1 px-1.5 py-1.5" : "hana-felt grid h-full grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-2 px-4 py-3"}>
            {/* opponent's hand */}
            <div className="flex justify-center">
              {oppHand.map((card, i) => (
                <TableCard
                  key={card.id}
                  card={card}
                  width={oppCard}
                  faceDown
                  enter="none"
                  style={{
                    marginLeft: i === 0 ? 0 : narrow ? -12 : -16,
                    transform: `rotate(${(i - (oppHand.length - 1) / 2) * -3}deg)`,
                  }}
                />
              ))}
            </div>

            {/* opponent's captured cards */}
            <CapturedPiles cards={state.captured.opponent} width={narrow ? 30 : 46} tight={narrow} />

            {/* field */}
            <div className={narrow ? "flex min-h-0 items-center gap-2 px-0.5" : "flex min-h-0 items-center gap-6 px-2"}>
              <div className={narrow ? "flex shrink-0 flex-col items-center gap-4" : "flex shrink-0 flex-col items-center gap-7"}>
                <DeckStack count={state.deck.length} canDraw={canDraw} onDraw={onDraw} width={deckWidth} />
                <div className="relative" style={{ width: deckWidth, height: Math.round((deckWidth * 10) / 7) }}>
                  {showPending && pending ? (
                    <TableCard key={pending.id} card={pending} width={deckWidth} enter={pendingFromDeck ? "flip" : "slap"} glow />
                  ) : (
                    <div className="h-full w-full rounded-[4px] border border-dashed border-[#f3d9a8]/15" />
                  )}
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] tracking-widest text-[#f3d9a8]/55">
                    {pendingFromDeck ? "めくった札" : "出した札"}
                  </span>
                </div>
              </div>

              <div className={narrow ? "flex min-w-0 flex-1 flex-wrap content-center items-center justify-center gap-1" : "flex min-w-0 flex-1 flex-wrap content-center items-center justify-center gap-2.5"}>
                {state.field.map((card) => {
                  const choice = selectingField && state.pendingMatches.some((m) => m.id === card.id);
                  return (
                    <TableCard
                      key={card.id}
                      card={card}
                      width={fieldWidth}
                      glow={choice}
                      dim={selectingField && !choice}
                      onClick={choice ? () => onPickField(card.id) : undefined}
                    />
                  );
                })}
                {state.field.length === 0 && (
                  <p className="text-sm tracking-widest text-[#f3d9a8]/40">場札はありません</p>
                )}
              </div>
            </div>

            {/* player's captured cards */}
            <CapturedPiles cards={state.captured.player} width={narrow ? 36 : 56} tight={narrow} />
          </div>
        </div>
      </div>

      {/* HUD */}
      <div className={narrow ? "absolute left-1 top-1 z-10 max-w-[34%] origin-top-left scale-90" : "absolute left-3 top-3 z-10"}>
        <Hud state={state} who="opponent" label="あいて" />
      </div>
      <div
        className={narrow ? "absolute right-1 z-30 max-w-[40%] origin-bottom-right scale-90" : "absolute bottom-[164px] right-3 z-30"}
        style={narrow ? { bottom: handBand + 4 } : undefined}
      >
        <Hud state={state} who="player" label="あなた" />
      </div>
      <div className={narrow ? "pointer-events-none absolute left-1/2 top-1 z-10 max-w-[34%] -translate-x-1/2 rounded-full border border-[#f3d9a8]/20 bg-black/50 px-2 py-0.5 text-center text-[10px] tracking-wide text-[#f3e7c8]/85 backdrop-blur-[2px]" : "pointer-events-none absolute left-1/2 top-3 z-10 max-w-[60%] -translate-x-1/2 rounded-full border border-[#f3d9a8]/20 bg-black/50 px-4 py-1 text-center text-xs tracking-wide text-[#f3e7c8]/85 backdrop-blur-[2px]"}>
        {state.message}
        {state.koikoiCount > 0 && <span className="ml-2 text-[#e6c887]">こいこい×{state.koikoiCount}</span>}
      </div>

      {/* the player's hand, held up in a fan */}
      <div className="absolute inset-x-0 bottom-0 z-20" style={{ height: handBand }}>
        <PlayerHand
          cards={state.hands.player}
          field={state.field}
          canPick={canPickHand}
          onPick={onPickHand}
          narrow={narrow}
        />
      </div>
    </div>
  );
}
