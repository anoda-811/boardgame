"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { HanafudaCard } from "@/lib/hanafuda/cards";
import { cardsForYaku, evaluateYaku, type Yaku } from "@/lib/hanafuda/yaku";
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
import { Table3D } from "./Table3D";
import { YakuChoice, YakuReveal } from "./YakuReveal";
import { playCardSound, primeCardAudio } from "./cardSound";

type YakuFlash = {
  key: string;
  yaku: Yaku;
  cards: HanafudaCard[];
  who: "player" | "opponent";
};

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
        <div className="animate-fade-up mt-10 flex flex-col items-center gap-4">
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
          <Link
            href="/games/hanafuda/cards"
            className="text-xs tracking-widest text-[#d4c08a]/75 underline-offset-4 transition hover:text-[#f3e7c8] hover:underline"
          >
            札の一覧を見る
          </Link>
          <Link
            href="/games/hanafuda/yaku"
            className="text-xs tracking-widest text-[#d4c08a]/75 underline-offset-4 transition hover:text-[#f3e7c8] hover:underline"
          >
            役の一覧を見る
          </Link>
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
  const [soundOn, setSoundOn] = useState(true);
  const [yakuQueue, setYakuQueue] = useState<YakuFlash[]>([]);
  const [settledCapture, setSettledCapture] = useState<string | null>(null);
  const seenYaku = useRef<{ player: Set<string>; opponent: Set<string> } | null>(null);

  const capturedKey = `${state.captured.player.map((card) => card.id).join(",")}|${state.captured.opponent.map((card) => card.id).join(",")}`;
  useEffect(() => {
    const sides = ["player", "opponent"] as const;
    const current = {
      player: new Set(evaluateYaku(state.captured.player).list.map((yaku) => yaku.id)),
      opponent: new Set(evaluateYaku(state.captured.opponent).list.map((yaku) => yaku.id)),
    };
    const prev = seenYaku.current;
    seenYaku.current = current;
    setSettledCapture(capturedKey);
    if (!prev) return;
    const fresh: YakuFlash[] = [];
    for (const who of sides) {
      const result = evaluateYaku(state.captured[who]);
      for (const yaku of result.list) {
        if (prev[who].has(yaku.id)) continue;
        fresh.push({
          key: `${who}-${yaku.id}-${capturedKey.length}`,
          yaku,
          cards: cardsForYaku(state.captured[who], yaku),
          who,
        });
      }
    }
    if (fresh.length > 0) setYakuQueue((queue) => [...queue, ...fresh]);
  }, [capturedKey, state.captured]);

  const choosing = state.phase === "koikoi";
  const choiceYaku = choosing ? evaluateYaku(state.captured.player) : null;
  const showing = yakuQueue[0];
  const awaitChoice = false;
  useEffect(() => {
    if (!showing || awaitChoice) return;
    const timer = window.setTimeout(() => setYakuQueue((queue) => queue.slice(1)), 2600);
    return () => window.clearTimeout(timer);
  }, [showing, awaitChoice]);

  const soundRef = useRef({ on: soundOn, field: 0, captured: 0, pending: "" });
  useEffect(() => {
    soundRef.current.on = soundOn;
  }, [soundOn]);

  const fieldCount = state.field.length;
  const capturedCount = state.captured.player.length + state.captured.opponent.length;
  const pendingId = state.pendingCard?.id ?? "";
  useEffect(() => {
    const prev = soundRef.current;
    const capturedMore = capturedCount > prev.captured;
    const placed = fieldCount > prev.field && !capturedMore;
    const revealed = pendingId !== "" && pendingId !== prev.pending;
    const newRound = capturedCount < prev.captured;
    prev.field = fieldCount;
    prev.captured = capturedCount;
    prev.pending = pendingId;
    if (!prev.on || newRound) return;

    if (capturedMore) playCardSound("slap", 240);
    else if (placed) playCardSound("place", 240);
    else if (revealed) playCardSound("flip");
  }, [fieldCount, capturedCount, pendingId]);

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

  const header = (
    <header className="flex items-center justify-between gap-2">
      <div className="shrink-0">
        <p className="hidden text-xs tracking-[0.35em] text-[#d4c08a]/70 sm:block">KOI-KOI</p>
        <h1 className="font-[family-name:var(--font-display)] text-xl tracking-widest sm:text-2xl">
          こいこい
        </h1>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5 text-sm text-[#d8e0d0]/70 sm:gap-3">
        <button
          type="button"
          aria-pressed={soundOn}
          onClick={() => {
            if (!soundOn) {
              primeCardAudio();
              playCardSound("place");
            }
            setSoundOn((v) => !v);
          }}
          className={[
            "border px-2 py-1 text-[11px] tracking-widest transition sm:px-3 sm:text-xs",
            soundOn
              ? "border-[#d8e0d0]/25 hover:border-[#d4c08a]/50"
              : "border-[#d8e0d0]/15 text-[#d8e0d0]/40 hover:text-[#f3e7c8]",
          ].join(" ")}
        >
          {soundOn ? "音 あり" : "音 なし"}
        </button>
        <button
          type="button"
          onClick={onExit}
          className="border border-[#d8e0d0]/25 px-2 py-1 text-[11px] tracking-widest hover:border-[#d4c08a]/50 sm:px-3 sm:text-xs"
        >
          タイトル
        </button>
      </div>
    </header>
  );

  const dismissYaku = () => setYakuQueue((queue) => queue.slice(1));
  const prime = () => {
    if (soundOn) primeCardAudio();
  };

  return (
    <div
      className="relative flex h-dvh flex-col overflow-clip bg-[#0b0705] text-[#f3e7c8] sm:min-h-[560px]"
      onPointerDown={prime}
    >
      <div className="relative z-30 border-b border-[#f3d9a8]/10 bg-black/40 px-4 py-2 sm:px-6">{header}</div>
      <Table3D
        state={state}
        onPickHand={(id) => setState((s) => (s.phase === "selectHand" ? selectHandCard(s, id) : s))}
        onPickField={(id) =>
          setState((s) =>
            s.phase === "selectField" || s.phase === "selectDrawField" ? selectFieldCard(s, id) : s,
          )
        }
        onDraw={() => setState((s) => (s.phase === "awaitDraw" ? drawFromDeck(s) : s))}
      />
      <GameModals state={state} setState={setState} onExit={onExit} hold={yakuQueue.length > 0 || choosing} />
      {showing && (
        <YakuReveal
          key={showing.key}
          yaku={showing.yaku}
          cards={showing.cards}
          who={showing.who}
          choice={awaitChoice}
          onKoi={() => {
            dismissYaku();
            setState((s) => chooseKoikoi(s, true));
          }}
          onStop={() => {
            dismissYaku();
            setState((s) => chooseKoikoi(s, false));
          }}
        />
      )}
      {choiceYaku && choiceYaku.list.length > 0 && !showing && settledCapture === capturedKey && (
        <YakuChoice
          entries={choiceYaku.list.map((yaku) => ({
            yaku,
            cards: cardsForYaku(state.captured.player, yaku),
          }))}
          total={choiceYaku.total}
          onKoi={() => setState((s) => chooseKoikoi(s, true))}
          onStop={() => setState((s) => chooseKoikoi(s, false))}
        />
      )}
    </div>
  );
}

function GameModals({
  state,
  setState,
  onExit,
  hold,
}: {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onExit: () => void;
  hold: boolean;
}) {
  if (hold) return null;
  return (
    <>
        {(state.phase === "roundOver" || state.phase === "matchOver") &&
          state.roundResult && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
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
    </>
  );
}

export function HanafudaApp() {
  const [state, setState] = useState<GameState>(() => createInitialState());

  if (state.phase === "title") {
    return (
      <TitleScreen
        onStart={() => {
          primeCardAudio();
          setState(startMatch());
        }}
      />
    );
  }

  return (
    <GameScreen
      state={state}
      setState={setState}
      onExit={() => setState(createInitialState())}
    />
  );
}
