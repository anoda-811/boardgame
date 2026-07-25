"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { evaluateYaku } from "@/lib/hanafuda/yaku";
import {
  chooseKoikoi,
  confirmOpponentDraw,
  confirmOpponentHand,
  confirmRevealedDraw,
  createInitialState,
  drawFromDeck,
  nextRound,
  revealOpponentDraw,
  revealOpponentHand,
  selectFieldCard,
  selectHandCard,
  startMatch,
  type GameState,
} from "@/lib/hanafuda/game";
import { CardView } from "./CardView";
import { CardBackArt } from "./CardArt";

const petals = [
  { left: "8%", delay: "0s", duration: "11s", size: 12 },
  { left: "22%", delay: "2s", duration: "13s", size: 9 },
  { left: "38%", delay: "4.5s", duration: "10s", size: 14 },
  { left: "55%", delay: "1.2s", duration: "14s", size: 10 },
  { left: "70%", delay: "3.4s", duration: "12s", size: 11 },
  { left: "84%", delay: "5.8s", duration: "15s", size: 8 },
];

function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-pine-deep text-[#f3e7c8]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#2a4a34_0%,_#163024_55%,_#0d1c14_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(ellipse_at_top,_rgba(184,149,61,0.16),transparent_60%)]"
      />

      {petals.map((petal, index) => (
        <span
          key={index}
          className="petal"
          style={{
            left: petal.left,
            width: petal.size,
            height: petal.size * 1.3,
            animationDelay: petal.delay,
            animationDuration: petal.duration,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="animate-fade-up mb-6 text-xs tracking-[0.45em] text-[#d4c08a]/80">
          HANAFUDA
        </p>
        <h1 className="animate-fade-up animate-title-glow font-[family-name:var(--font-display)] text-7xl tracking-[0.2em] text-[#f3e7c8] sm:text-8xl">
          花札
        </h1>
        <p className="animate-fade-up mt-5 max-w-sm text-sm leading-relaxed tracking-wide text-[#d8e0d0]/75 sm:text-base">
          十二の月と、四十八枚の花。
          <br />
          こいこいの対局へようこそ。
        </p>
        <div className="animate-fade-up mt-12 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={onStart}
            className="min-w-48 border border-[#d4c08a]/60 bg-[#d4c08a]/15 px-8 py-3 font-[family-name:var(--font-display)] text-lg tracking-[0.35em] text-[#f3e7c8] transition hover:bg-[#d4c08a]/25"
          >
            はじめる
          </button>
          <p className="text-xs tracking-widest text-[#d8e0d0]/45">
            CPU対戦・12文先取
          </p>
        </div>
      </div>

      <footer className="relative z-10 pb-8 text-center">
        <Link
          href="/"
          className="text-sm tracking-widest text-[#d8e0d0]/55 transition hover:text-[#f3e7c8]"
        >
          ← ボードゲーム集にもどる
        </Link>
      </footer>
    </div>
  );
}

function CapturedRow({
  label,
  cards,
}: {
  label: string;
  cards: GameState["captured"]["player"];
}) {
  if (cards.length === 0) return null;
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] tracking-widest text-[#d8e0d0]/45">{label}</p>
      <div className="flex items-end">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="relative shrink-0"
            style={{ marginLeft: index === 0 ? 0 : -18 }}
          >
            <CardView card={card} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CapturedSummary({
  label,
  state,
  who,
}: {
  label: string;
  state: GameState;
  who: "player" | "opponent";
}) {
  const yaku = evaluateYaku(state.captured[who]);
  const groups = useMemo(() => {
    const captured = state.captured[who];
    return {
      bright: captured.filter((c) => c.kind === "bright"),
      animal: captured.filter((c) => c.kind === "animal"),
      ribbon: captured.filter((c) => c.kind === "ribbon"),
      chaff: captured.filter((c) => c.kind === "chaff"),
    };
  }, [state.captured, who]);

  const total = state.captured[who].length;

  return (
    <div className="rounded-sm border border-[#d4c08a]/20 bg-black/20 px-3 py-2 text-[#f3e7c8]">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-[family-name:var(--font-display)] text-lg">{label}</p>
        <p className="text-sm tracking-widest text-[#d4c08a]">
          {state.scores[who]}文
          <span className="ml-2 text-[#d8e0d0]/45">取り札 {total}</span>
        </p>
      </div>
      {yaku.list.length > 0 && (
        <p className="mt-1 text-xs text-[#d4c08a]/90">
          {yaku.list.map((y) => `${y.name}(${y.points})`).join("・")}
          <span className="text-[#d8e0d0]/60"> / 役合計 {yaku.total}文</span>
        </p>
      )}
      {total === 0 ? (
        <p className="mt-3 text-xs text-[#d8e0d0]/40">まだ取り札はありません</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 overflow-x-auto pb-1">
          <CapturedRow label="光" cards={groups.bright} />
          <CapturedRow label="種" cards={groups.animal} />
          <CapturedRow label="短" cards={groups.ribbon} />
          <CapturedRow label="カス" cards={groups.chaff} />
        </div>
      )}
    </div>
  );
}

function DeckPile({
  count,
  canDraw,
  onDraw,
}: {
  count: number;
  canDraw: boolean;
  onDraw: () => void;
}) {
  if (count <= 0) {
    return (
      <div className="flex h-[5.75rem] w-[4rem] items-center justify-center rounded-[4px] border border-dashed border-[#d8e0d0]/25 text-[10px] tracking-widest text-[#d8e0d0]/35">
        空
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!canDraw}
      onClick={onDraw}
      className={[
        "relative h-[5.75rem] w-[4rem] rounded-[4px] p-0 transition",
        canDraw
          ? "animate-deck-pulse cursor-pointer hover:-translate-y-1"
          : "cursor-default opacity-90",
      ].join(" ")}
      aria-label={canDraw ? "山札をめくる" : `山札 残り${count}枚`}
    >
      <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] overflow-hidden rounded-[4px] opacity-50">
        <CardBackArt />
      </div>
      <div className="absolute inset-0 overflow-hidden rounded-[4px] shadow-[0_6px_14px_rgba(0,0,0,0.35)]">
        <CardBackArt />
      </div>
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] tracking-widest text-[#d4c08a]/80">
        {canDraw ? "タップでめくる" : `山札 ${count}`}
      </span>
    </button>
  );
}

function StageCard({
  state,
}: {
  state: GameState;
}) {
  const showing =
    state.pendingCard &&
    (state.phase === "revealDraw" ||
      state.phase === "selectDrawField" ||
      state.phase === "selectField" ||
      state.phase === "opponentShowHand" ||
      state.phase === "opponentRevealDraw");

  if (!showing || !state.pendingCard) {
    return (
      <div className="flex h-[5.75rem] w-[4rem] items-center justify-center rounded-[4px] border border-dashed border-[#d8e0d0]/15 text-[10px] tracking-widest text-[#d8e0d0]/30">
        めくり
      </div>
    );
  }

  return (
    <div className="animate-card-reveal">
      <CardView card={state.pendingCard} size="md" selected />
    </div>
  );
}

function GameScreen({
  state,
  setState,
  onExit,
}: {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onExit: () => void;
}) {
  const [, startTransition] = useTransition();
  const selectingField =
    state.phase === "selectField" || state.phase === "selectDrawField";
  const canPickHand = state.phase === "selectHand";
  const canDraw = state.phase === "awaitDraw";

  // Opponent paced turns
  useEffect(() => {
    let timer: number | undefined;

    if (state.phase === "opponentShowHand" && !state.pendingCard) {
      timer = window.setTimeout(() => {
        startTransition(() => {
          setState((s) =>
            s.phase === "opponentShowHand" && !s.pendingCard
              ? revealOpponentHand(s)
              : s,
          );
        });
      }, 500);
    } else if (state.phase === "opponentShowHand" && state.pendingCard) {
      timer = window.setTimeout(() => {
        startTransition(() => {
          setState((s) =>
            s.phase === "opponentShowHand" && s.pendingCard
              ? confirmOpponentHand(s)
              : s,
          );
        });
      }, 1100);
    } else if (state.phase === "opponentAwaitDraw") {
      timer = window.setTimeout(() => {
        startTransition(() => {
          setState((s) =>
            s.phase === "opponentAwaitDraw" ? revealOpponentDraw(s) : s,
          );
        });
      }, 800);
    } else if (state.phase === "opponentRevealDraw") {
      timer = window.setTimeout(() => {
        startTransition(() => {
          setState((s) =>
            s.phase === "opponentRevealDraw" ? confirmOpponentDraw(s) : s,
          );
        });
      }, 1200);
    } else if (state.phase === "revealDraw") {
      timer = window.setTimeout(() => {
        startTransition(() => {
          setState((s) =>
            s.phase === "revealDraw" ? confirmRevealedDraw(s) : s,
          );
        });
      }, 1000);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [state.phase, state.pendingCard, setState]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-pine-deep text-[#f3e7c8]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#2a4a34_0%,_#163024_55%,_#0d1c14_100%)]"
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#d4c08a]/70">KOI-KOI</p>
            <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-widest">
              こいこい
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#d8e0d0]/70">
            {state.koikoiCount > 0 && (
              <span className="text-[#d4c08a]">こいこい×{state.koikoiCount}</span>
            )}
            <button
              type="button"
              onClick={onExit}
              className="border border-[#d8e0d0]/25 px-3 py-1 text-xs tracking-widest hover:border-[#d4c08a]/50"
            >
              タイトル
            </button>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <CapturedSummary label="あいて" state={state} who="opponent" />
          <CapturedSummary label="あなた" state={state} who="player" />
        </div>

        <section className="rounded-sm border border-[#d4c08a]/15 bg-black/15 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm tracking-[0.25em] text-[#d8e0d0]/65">場札</h2>
            <p className="text-xs text-[#d8e0d0]/55">{state.message}</p>
          </div>

          <div className="mb-4 flex items-end justify-center gap-6 sm:gap-10">
            <div className="flex flex-col items-center gap-6">
              <p className="text-[10px] tracking-widest text-[#d8e0d0]/45">山札</p>
              <DeckPile
                count={state.deck.length}
                canDraw={canDraw}
                onDraw={() => setState((s) => drawFromDeck(s))}
              />
            </div>
            <div className="flex flex-col items-center gap-6">
              <p className="text-[10px] tracking-widest text-[#d8e0d0]/45">
                {state.phase === "selectField" || state.phase === "opponentShowHand"
                  ? "出した札"
                  : "めくった札"}
              </p>
              <StageCard state={state} />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {state.field.map((card) => {
              const highlight =
                selectingField &&
                state.pendingMatches.some((m) => m.id === card.id);
              return (
                <CardView
                  key={card.id}
                  card={card}
                  size="md"
                  selected={highlight}
                  dimmed={selectingField && !highlight}
                  disabled={!highlight}
                  onClick={
                    highlight
                      ? () => setState(selectFieldCard(state, card.id))
                      : undefined
                  }
                />
              );
            })}
            {state.field.length === 0 && (
              <p className="py-6 text-sm text-[#d8e0d0]/40">場札はありません</p>
            )}
          </div>
        </section>

        <section className="rounded-sm border border-[#d4c08a]/15 bg-black/20 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm tracking-[0.25em] text-[#d8e0d0]/65">手札</h2>
            <div className="flex gap-1">
              {state.hands.opponent.map((card) => (
                <CardView key={card.id} card={card} faceDown size="sm" />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {state.hands.player.map((card) => (
              <CardView
                key={card.id}
                card={card}
                size="lg"
                disabled={!canPickHand}
                onClick={
                  canPickHand
                    ? () => setState(selectHandCard(state, card.id))
                    : undefined
                }
              />
            ))}
            {state.hands.player.length === 0 && (
              <p className="py-4 text-sm text-[#d8e0d0]/40">手札なし</p>
            )}
          </div>
        </section>

        {state.phase === "koikoi" && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/55 p-4">
            <div className="w-full max-w-md border border-[#d4c08a]/35 bg-[#163024] p-6 text-center shadow-2xl">
              <p className="text-xs tracking-[0.35em] text-[#d4c08a]/80">YAKU</p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
                役が揃いました
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#d8e0d0]/75">
                {state.message}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  className="border border-[#d4c08a]/60 bg-[#d4c08a]/15 px-6 py-3 tracking-[0.3em]"
                  onClick={() => setState(chooseKoikoi(state, true))}
                >
                  こいこい
                </button>
                <button
                  type="button"
                  className="border border-[#f3e7c8]/40 px-6 py-3 tracking-[0.3em]"
                  onClick={() => setState(chooseKoikoi(state, false))}
                >
                  しょうぶ
                </button>
              </div>
            </div>
          </div>
        )}

        {(state.phase === "roundOver" || state.phase === "matchOver") &&
          state.roundResult && (
            <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/55 p-4">
              <div className="w-full max-w-md border border-[#d4c08a]/35 bg-[#163024] p-6 text-center shadow-2xl">
                <p className="text-xs tracking-[0.35em] text-[#d4c08a]/80">
                  {state.phase === "matchOver" ? "MATCH" : "ROUND"}
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
                  {state.roundResult.winner === "draw"
                    ? "引き分け"
                    : state.roundResult.winner === "player"
                      ? "あなたの勝ち"
                      : "相手の勝ち"}
                </h3>
                <p className="mt-3 text-sm text-[#d8e0d0]/75">
                  {state.roundResult.reason}
                  {state.roundResult.points > 0
                    ? ` / +${state.roundResult.points}文`
                    : ""}
                </p>
                {state.roundResult.yaku.list.length > 0 && (
                  <p className="mt-2 text-sm text-[#d4c08a]">
                    {state.roundResult.yaku.list
                      .map((y) => `${y.name}(${y.points})`)
                      .join("・")}
                  </p>
                )}
                <p className="mt-4 text-sm tracking-widest text-[#d8e0d0]/65">
                  合計 {state.scores.player} — {state.scores.opponent}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  {state.phase === "roundOver" ? (
                    <button
                      type="button"
                      className="border border-[#d4c08a]/60 bg-[#d4c08a]/15 px-6 py-3 tracking-[0.3em]"
                      onClick={() => setState(nextRound(state))}
                    >
                      次の局へ
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="border border-[#d4c08a]/60 bg-[#d4c08a]/15 px-6 py-3 tracking-[0.3em]"
                      onClick={() => setState(startMatch())}
                    >
                      もう一度
                    </button>
                  )}
                  <button
                    type="button"
                    className="border border-[#f3e7c8]/40 px-6 py-3 tracking-[0.3em]"
                    onClick={onExit}
                  >
                    タイトルへ
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

export function HanafudaApp() {
  const [state, setState] = useState<GameState>(() => createInitialState());

  if (state.phase === "title") {
    return <TitleScreen onStart={() => setState(startMatch())} />;
  }

  return (
    <GameScreen
      state={state}
      setState={setState}
      onExit={() => setState(createInitialState())}
    />
  );
}
