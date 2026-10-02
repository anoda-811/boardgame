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
  DEFAULT_RULES,
  drawFromDeck,
  nextRound,
  revealOpponentDraw,
  revealOpponentHand,
  selectFieldCard,
  selectHandCard,
  startMatch,
  TARGET_SCORES,
  type GameState,
  type HanafudaRules,
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

function RuleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "border px-2.5 py-1 text-[11px] tracking-widest transition sm:text-xs",
        active
          ? "border-[#d4c08a]/70 bg-[#d4c08a]/20 text-[#f3e7c8]"
          : "border-[#d8e0d0]/20 text-[#d8e0d0]/55 hover:border-[#d4c08a]/40 hover:text-[#f3e7c8]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function TitleScreen({
  rules,
  onChange,
  onStart,
}: {
  rules: HanafudaRules;
  onChange: (rules: HanafudaRules) => void;
  onStart: () => void;
}) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-pine-deep text-[#f3e7c8]">
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

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-4 text-center">
        <p className="animate-fade-up mb-3 text-xs tracking-[0.45em] text-[#d4c08a]/80">
          HANAFUDA
        </p>
        <h1 className="animate-fade-up animate-title-glow font-[family-name:var(--font-display)] text-6xl tracking-[0.2em] text-[#f3e7c8] sm:text-7xl">
          花札
        </h1>
        <p className="animate-fade-up mt-3 max-w-sm text-sm leading-relaxed tracking-wide text-[#d8e0d0]/75 sm:text-base">
          十二の月と、四十八枚の花。
          <br />
          こいこいの対局へようこそ。
        </p>
        <div className="animate-fade-up mt-5 flex w-full max-w-md flex-col items-center gap-3 text-left">
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[11px] tracking-widest text-[#d8e0d0]/55">勝負</p>
            <div className="flex gap-1.5">
              <RuleChip active={rules.format === "target"} onClick={() => onChange({ ...rules, format: "target" })}>
                先取
              </RuleChip>
              <RuleChip active={rules.format === "twelve"} onClick={() => onChange({ ...rules, format: "twelve" })}>
                12回勝負
              </RuleChip>
            </div>
          </div>
          {rules.format === "target" && (
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[11px] tracking-widest text-[#d8e0d0]/55">先取</p>
              <div className="flex justify-center gap-1.5">
                {TARGET_SCORES.map((score) => (
                  <RuleChip
                    key={score}
                    active={rules.targetScore === score}
                    onClick={() => onChange({ ...rules, targetScore: score })}
                  >
                    {score}文
                  </RuleChip>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[11px] tracking-widest text-[#d8e0d0]/55">こいこい</p>
            <div className="flex gap-1.5">
              <RuleChip active={rules.koikoiDoubles} onClick={() => onChange({ ...rules, koikoiDoubles: true })}>
                倍になる
              </RuleChip>
              <RuleChip active={!rules.koikoiDoubles} onClick={() => onChange({ ...rules, koikoiDoubles: false })}>
                倍にならない
              </RuleChip>
            </div>
          </div>
        </div>
        <div className="animate-fade-up mt-5 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="min-w-48 border border-[#d4c08a]/60 bg-[#d4c08a]/15 px-8 py-3 font-[family-name:var(--font-display)] text-lg tracking-[0.35em] text-[#f3e7c8] transition hover:bg-[#d4c08a]/25"
          >
            はじめる
          </button>
          <p className="text-xs tracking-widest text-[#d8e0d0]/45">
            CPU対戦・{rules.format === "twelve" ? "12回勝負" : `${rules.targetScore}文先取`}・こいこい
            {rules.koikoiDoubles ? "倍" : "等倍"}
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

      <footer className="relative z-10 shrink-0 pb-5 text-center">
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

function outcomeLabel(state: GameState) {
  const winner =
    state.phase === "matchOver"
      ? state.scores.player === state.scores.opponent
        ? "draw"
        : state.scores.player > state.scores.opponent
          ? "player"
          : "opponent"
      : (state.roundResult?.winner ?? "draw");
  if (winner === "draw") return "引き分け";
  return winner === "player" ? "あなたの勝ち" : "相手の勝ち";
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
                  {state.phase === "matchOver"
                    ? state.rules.format === "twelve"
                      ? "12回勝負"
                      : `${state.rules.targetScore}文先取`
                    : `第${state.dealMonth}回`}
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl">{outcomeLabel(state)}</h3>
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
                  合計 {state.scores.player} — {state.scores.opponent}（
                  {state.rules.format === "twelve"
                    ? `${state.dealMonth}/12回`
                    : `${state.rules.targetScore}文先取`}
                  ）
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
                      onClick={() => setState(startMatch(state.rules))}
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
  const [rules, setRules] = useState<HanafudaRules>(DEFAULT_RULES);
  const [state, setState] = useState<GameState>(() => createInitialState());

  if (state.phase === "title") {
    return (
      <TitleScreen
        rules={rules}
        onChange={setRules}
        onStart={() => {
          primeCardAudio();
          setState(startMatch(rules));
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
