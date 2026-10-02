"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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

type StageFit = {
  handBand: number;
  tableW: number;
  deckWidth: number;
  fieldWidth: number;
  oppCard: number;
  oppCaptured: number;
  playerCaptured: number;
  handWidth: number;
  handStep: number;
  bow: number;
  turn: number;
  perspective: number;
  card: number;
};

/** Grow the desktop table with the window so the felt is a frame, not an empty field. */
function desktopFit(w: number, h: number): StageFit {
  const tableW = Math.round(Math.min(Math.max(1000, w * 0.9), 2400));
  const provisional = Math.max(1, Math.min(tableW / 1000, h / 700));
  const handGuess = Math.round(150 * Math.min(provisional, 1.8));
  const tableH = Math.max(480, h - handGuess);
  const byHeight = (tableH * 0.88) / 430;
  const byWidth = (tableW * 0.86) / 900;
  const card = Math.max(1, Math.min(byHeight, byWidth, 2.3));
  return {
    handBand: Math.round(148 * card),
    tableW,
    deckWidth: Math.round(62 * card),
    fieldWidth: Math.round(78 * card),
    oppCard: Math.round(40 * card),
    oppCaptured: Math.round(46 * card),
    playerCaptured: Math.round(56 * card),
    handWidth: Math.round(86 * card),
    handStep: Math.round(64 * card),
    bow: 1.5 * Math.min(card, 1.6),
    turn: 4.5,
    perspective: Math.round(tableW * 1.15),
    card,
  };
}

function CapturedPiles({
  cards,
  width,
  tight,
  gap,
}: {
  cards: HanafudaCard[];
  width: number;
  tight?: boolean;
  gap?: number;
}) {
  return (
    <div className="flex items-end justify-center" style={{ gap: tight ? 6 : (gap ?? 20) }}>
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
        <span className="tracking-widest text-[#e6c887]">
          {state.rules.format === "target"
            ? `${state.scores[who]}/${state.rules.targetScore}文`
            : `${state.scores[who]}文`}
        </span>
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
  width,
  stepMax,
  bow,
  turn,
}: {
  cards: HanafudaCard[];
  field: HanafudaCard[];
  canPick: boolean;
  onPick: (id: string) => void;
  width: number;
  stepMax: number;
  bow: number;
  turn: number;
}) {
  const n = cards.length;
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
  const step = Math.min(stepMax, room / Math.max(1, n - 1));
  const sag = n > 1 ? ((n - 1) / 2) ** 2 * bow : 0;
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
            className="group absolute left-1/2 p-0 transition-transform duration-200 ease-out"
            style={{
              width,
              height,
              bottom: Math.round(12 + width * 0.08),
              marginLeft: -width / 2,
              transformOrigin: "50% 160%",
              transform: `translateX(${o * step}px) translateY(${o * o * bow - sag}px) rotate(${o * turn}deg)`,
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
  const roomRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = roomRef.current;
    if (!el) return;
    const update = () => setRoom({ w: el.clientWidth, h: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
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
  const fitted = !narrow && room.w >= 200 ? desktopFit(room.w, room.h) : null;
  const handBand = narrow ? 112 : (fitted?.handBand ?? 154);
  const deckWidth = narrow ? 46 : (fitted?.deckWidth ?? 62);
  const fieldWidth = narrow ? 48 : (fitted?.fieldWidth ?? 78);
  const oppCard = narrow ? 28 : (fitted?.oppCard ?? 40);
  const cardScale = fitted?.card ?? 1;

  return (
    <div ref={roomRef} className="hana-room relative min-h-0 flex-1 overflow-clip">
      {/* lamp glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-40 w-[70%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,_rgba(255,200,130,0.25),transparent_70%)]"
      />

      {/* the table, tilted away from the player */}
      <div
        className="absolute inset-x-0 top-0 flex justify-center"
        style={{
          perspective: fitted ? `${fitted.perspective}px` : "1100px",
          perspectiveOrigin: "50% 10%",
          bottom: handBand,
        }}
      >
        <div
          className={
            narrow
              ? "hana-table relative h-full w-[min(98%,1000px)] self-end p-1.5"
              : fitted
                ? "hana-table relative h-[112%] self-end"
                : "hana-table relative h-[118%] w-[min(92%,1000px)] self-end p-4"
          }
          style={{
            transform: narrow ? "rotateX(12deg)" : "rotateX(34deg)",
            transformOrigin: "50% 100%",
            transformStyle: "preserve-3d",
            ...(fitted
              ? { width: fitted.tableW, maxWidth: "94%", padding: Math.round(16 * cardScale) }
              : {}),
          }}
        >
          <div
            className={
              narrow
                ? "hana-felt grid h-full grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-1 px-1.5 py-1.5"
                : "hana-felt grid h-full grid-rows-[auto_auto_minmax(0,1fr)_auto]"
            }
            style={
              narrow
                ? undefined
                : {
                    gap: Math.round(8 * cardScale),
                    padding: `${Math.round(12 * cardScale)}px ${Math.round(16 * cardScale)}px`,
                  }
            }
          >
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
                    marginLeft: i === 0 ? 0 : narrow ? -12 : Math.round(-16 * cardScale),
                    transform: `rotate(${(i - (oppHand.length - 1) / 2) * -3}deg)`,
                  }}
                />
              ))}
            </div>

            {/* opponent's captured cards */}
            <CapturedPiles
              cards={state.captured.opponent}
              width={narrow ? 30 : (fitted?.oppCaptured ?? 46)}
              tight={narrow}
              gap={Math.round(20 * cardScale)}
            />

            {/* field */}
            <div
              className="flex min-h-0 items-center px-0.5 sm:px-2"
              style={{ gap: narrow ? 8 : Math.round(24 * cardScale) }}
            >
              <div
                className="flex shrink-0 flex-col items-center"
                style={{ gap: narrow ? 16 : Math.round(28 * cardScale) }}
              >
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

              <div
                className="flex min-w-0 flex-1 flex-wrap content-center items-center justify-center"
                style={{ gap: narrow ? 4 : Math.round(10 * cardScale) }}
              >
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
            <CapturedPiles
              cards={state.captured.player}
              width={narrow ? 36 : (fitted?.playerCaptured ?? 56)}
              tight={narrow}
              gap={Math.round(20 * cardScale)}
            />
          </div>
        </div>
      </div>

      {/* HUD */}
      <div className={narrow ? "absolute left-1 top-1 z-10 max-w-[34%] origin-top-left scale-90" : "absolute left-3 top-3 z-10"}>
        <Hud state={state} who="opponent" label="あいて" />
      </div>
      <div
        className={narrow ? "absolute right-1 z-30 max-w-[40%] origin-bottom-right scale-90" : "absolute right-3 z-30"}
        style={{ bottom: handBand + (narrow ? 4 : 10) }}
      >
        <Hud state={state} who="player" label="あなた" />
      </div>
      <div className={narrow ? "pointer-events-none absolute left-1/2 top-1 z-10 max-w-[34%] -translate-x-1/2 rounded-full border border-[#f3d9a8]/20 bg-black/50 px-2 py-0.5 text-center text-[10px] tracking-wide text-[#f3e7c8]/85 backdrop-blur-[2px]" : "pointer-events-none absolute left-1/2 top-3 z-10 max-w-[60%] -translate-x-1/2 rounded-full border border-[#f3d9a8]/20 bg-black/50 px-4 py-1 text-center text-xs tracking-wide text-[#f3e7c8]/85 backdrop-blur-[2px]"}>
        {state.rules.format === "twelve" && (
          <span className="mr-2 text-[#e6c887]">{state.dealMonth}/12</span>
        )}
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
          width={narrow ? 58 : (fitted?.handWidth ?? 86)}
          stepMax={narrow ? 34 : (fitted?.handStep ?? 62)}
          bow={narrow ? 0.6 : (fitted?.bow ?? 1.5)}
          turn={narrow ? 2.4 : (fitted?.turn ?? 4.5)}
        />
      </div>
    </div>
  );
}
