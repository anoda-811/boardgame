"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  applyAiMove,
  choosePromote,
  createTitleState,
  selectDrop,
  selectSquare,
  startGame,
  type ShogiState,
} from "@/lib/shogi/game";
import {
  HAND_ORDER,
  PIECE_LABEL,
  type Coord,
  type Piece,
  type UnpromotedType,
} from "@/lib/shogi/types";
import { PieceStandPreview, PieceView } from "./PieceView";

function HandTray({
  label,
  hand,
  interactive,
  selected,
  onSelect,
}: {
  label: string;
  hand: ShogiState["hands"]["sente"];
  interactive?: boolean;
  selected?: UnpromotedType | null;
  onSelect?: (piece: UnpromotedType) => void;
}) {
  const items = HAND_ORDER.filter((p) => hand[p] > 0);

  return (
    <div className="shogi-komadai flex h-[4.75rem] flex-col justify-center overflow-hidden rounded-sm px-3 py-2">
      <p className="mb-1.5 shrink-0 text-[10px] tracking-[0.3em] text-[#d4b896]/70">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-[#d4b896]/35">持ち駒なし</p>
      ) : (
        <div className="flex min-h-0 flex-wrap gap-2 overflow-x-auto overflow-y-hidden">
          {items.map((type) => {
            const active = selected === type;
            const piece: Piece = { type, side: "sente" };
            const body = (
              <>
                <PieceView piece={piece} size="sm" selected={active} />
                {hand[type] > 1 && (
                  <span className="absolute -right-1 -top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6b1515] px-1 text-[10px] text-[#f0e2c8] shadow">
                    {hand[type]}
                  </span>
                )}
              </>
            );

            if (!interactive || !onSelect) {
              return (
                <div key={type} className="relative shrink-0">
                  {body}
                </div>
              );
            }

            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelect(type)}
                className={[
                  "relative shrink-0 transition",
                  active ? "-translate-y-1" : "hover:-translate-y-0.5",
                ].join(" ")}
                aria-label={`${PIECE_LABEL[type]}を打つ`}
              >
                {body}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BoardSquare({
  piece,
  coord,
  selected,
  legal,
  lastFrom,
  lastTo,
  opponentMove,
  onClick,
}: {
  piece: Piece | null;
  coord: Coord;
  selected: boolean;
  legal: boolean;
  lastFrom: boolean;
  lastTo: boolean;
  opponentMove: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative flex aspect-square items-center justify-center",
        selected ? "bg-[#c45c2a]/28" : "",
        lastFrom && !selected
          ? opponentMove
            ? "bg-[#5a8fd4]/35"
            : "bg-[#d4a85a]/20"
          : "",
        lastTo && !selected
          ? opponentMove
            ? "animate-last-move bg-[#3d7ad4]/45"
            : "bg-[#d4a85a]/28"
          : "",
      ].join(" ")}
      aria-label={`${coord.r + 1}段${9 - coord.c}筋`}
    >
      {lastTo && opponentMove && (
        <span className="pointer-events-none absolute inset-0 z-[1] ring-2 ring-inset ring-[#7eb6ff]/90" />
      )}
      {lastFrom && opponentMove && !lastTo && (
        <span className="pointer-events-none absolute inset-0 z-[1] ring-1 ring-inset ring-[#7eb6ff]/45" />
      )}
      {legal && (
        <span
          className={[
            "absolute z-[1] rounded-full",
            piece
              ? "inset-[12%] border-[2.5px] border-[#1f5c32]/75"
              : "h-2 w-2 bg-[#1f5c32]/65 sm:h-2.5 sm:w-2.5",
          ].join(" ")}
        />
      )}
      {piece && (
        <PieceView
          piece={piece}
          size="md"
          selected={selected || (lastTo && opponentMove)}
          className="z-[2]"
        />
      )}
    </button>
  );
}

/** Star marks on traditional boards (4 points). */
function BoardStars() {
  // intersections: files 3 & 6 (0-index cols 2 & 5? wait)
  // In shogi from sente view: stars at (3,3), (3,7), (7,3), (7,7) in 1-indexed ranks/files
  // Our board: row 0 = gote back, col 0 = 9-file (left from sente)
  // Stars at intersections of 4th/6th files and 3rd/7th ranks from each side
  // Standard: between squares - at crossing of lines after 3rd file and 3rd rank etc.
  // Positions as % of board grid (9x9 cells): at corners of center 3x3 block of intersections
  // Line intersections at (3,3), (3,6), (6,3), (6,6) in 0-based line coords (0..9)
  const points = [
    { x: "33.333%", y: "33.333%" },
    { x: "66.666%", y: "33.333%" },
    { x: "33.333%", y: "66.666%" },
    { x: "66.666%", y: "66.666%" },
  ];
  return (
    <>
      {points.map((p) => (
        <span
          key={`${p.x}-${p.y}`}
          className="pointer-events-none absolute z-[1] h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1a1008]/85 shadow-sm sm:h-1.5 sm:w-1.5"
          style={{ left: p.x, top: p.y }}
        />
      ))}
    </>
  );
}

function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#120c08] text-[#f0e2c8]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#3a2414_0%,_#120c08_58%,_#070504_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(ellipse_at_top,_rgba(212,168,90,0.16),transparent_55%)]"
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="animate-fade-up mb-6 text-xs tracking-[0.45em] text-[#d4b896]/75">
          SHOGI
        </p>
        <h1 className="animate-fade-up animate-title-glow font-[family-name:var(--font-display)] text-7xl tracking-[0.2em] sm:text-8xl">
          将棋
        </h1>
        <p className="animate-fade-up mt-5 max-w-sm text-sm leading-relaxed tracking-wide text-[#d4b896]/70 sm:text-base">
          榧の盤に、つややかな駒。
          <br />
          先手番であなたが指します。
        </p>

        <div className="animate-fade-up mt-10">
          <PieceStandPreview labels={["香", "桂", "銀", "金", "玉"]} />
        </div>

        <div className="animate-fade-up mt-12 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={onStart}
            className="min-w-48 border border-[#d4b896]/55 bg-[#d4b896]/12 px-8 py-3 font-[family-name:var(--font-display)] text-lg tracking-[0.35em] transition hover:bg-[#d4b896]/22"
          >
            はじめる
          </button>
          <p className="text-xs tracking-widest text-[#d4b896]/40">
            CPU対戦・持ち駒あり
          </p>
        </div>
      </div>

      <footer className="relative z-10 pb-8 text-center">
        <Link
          href="/"
          className="text-sm tracking-widest text-[#d4b896]/50 transition hover:text-[#f0e2c8]"
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
  state: ShogiState;
  setState: React.Dispatch<React.SetStateAction<ShogiState>>;
  onExit: () => void;
}) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state.phase !== "playing" || state.turn !== "gote") return;
    const timer = window.setTimeout(() => {
      startTransition(() => {
        setState((s) =>
          s.phase === "playing" && s.turn === "gote" ? applyAiMove(s) : s,
        );
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.turn, setState]);

  const isLastFrom = (r: number, c: number) =>
    Boolean(
      state.lastMove?.from &&
        state.lastMove.from.r === r &&
        state.lastMove.from.c === c,
    );
  const isLastTo = (r: number, c: number) =>
    Boolean(state.lastMove && state.lastMove.to.r === r && state.lastMove.to.c === c);
  const opponentMove = state.lastMove?.by === "gote";

  return (
    <div className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-[#120c08] text-[#f0e2c8]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#2e1c10_0%,_#120c08_55%,_#070504_100%)]"
      />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-3xl grid-rows-[auto_4.75rem_minmax(0,1fr)_4.75rem] gap-3 px-3 py-4 sm:px-6 sm:py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#d4b896]/65">SHOGI</p>
            <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-widest">
              将棋
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="max-w-[14rem] text-right text-xs text-[#d4b896]/70 sm:max-w-none">
              {state.message}
            </p>
            <button
              type="button"
              onClick={onExit}
              className="shrink-0 border border-[#d4b896]/25 px-3 py-1 text-xs tracking-widest hover:border-[#d4b896]/50"
            >
              タイトル
            </button>
          </div>
        </header>

        <HandTray label="あいての持ち駒" hand={state.hands.gote} />

        <div className="flex min-h-0 items-center justify-center">
          <div className="shogi-table w-full max-w-[min(100%,540px)] p-[10px] sm:p-4">
            <div className="shogi-board relative aspect-square w-full overflow-hidden">
              <BoardStars />
              <div className="relative z-[2] grid h-full w-full grid-cols-9 grid-rows-9">
                {state.board.map((row, r) =>
                  row.map((piece, c) => {
                    const selected =
                      state.selected?.r === r && state.selected?.c === c;
                    const legal = state.legalTargets.some(
                      (t) => t.r === r && t.c === c,
                    );
                    return (
                      <BoardSquare
                        key={`${r}-${c}`}
                        piece={piece}
                        coord={{ r, c }}
                        selected={Boolean(selected)}
                        legal={legal}
                        lastFrom={isLastFrom(r, c)}
                        lastTo={isLastTo(r, c)}
                        opponentMove={Boolean(opponentMove)}
                        onClick={() =>
                          setState((s) => selectSquare(s, { r, c }))
                        }
                      />
                    );
                  }),
                )}
              </div>
            </div>
          </div>
        </div>

        <HandTray
          label="あなたの持ち駒"
          hand={state.hands.sente}
          interactive={state.phase === "playing" && state.turn === "sente"}
          selected={state.selectedDrop}
          onSelect={(piece) => setState((s) => selectDrop(s, piece))}
        />

        {state.phase === "promote" && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-sm border border-[#d4b896]/35 bg-[#1e140c] p-6 text-center shadow-2xl">
              <p className="text-xs tracking-[0.35em] text-[#d4b896]/75">PROMOTE</p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
                成りますか？
              </h3>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  className="border border-[#d4b896]/55 bg-[#d4b896]/15 px-6 py-3 tracking-[0.3em]"
                  onClick={() => setState((s) => choosePromote(s, true))}
                >
                  成る
                </button>
                <button
                  type="button"
                  className="border border-[#f0e2c8]/35 px-6 py-3 tracking-[0.3em]"
                  onClick={() => setState((s) => choosePromote(s, false))}
                >
                  不成
                </button>
              </div>
            </div>
          </div>
        )}

        {state.phase === "ended" && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-sm border border-[#d4b896]/35 bg-[#1e140c] p-6 text-center shadow-2xl">
              <p className="text-xs tracking-[0.35em] text-[#d4b896]/75">RESULT</p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
                {state.winner === "sente" ? "あなたの勝ち" : "相手の勝ち"}
              </h3>
              <p className="mt-3 text-sm text-[#d4b896]/70">{state.message}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  className="border border-[#d4b896]/55 bg-[#d4b896]/15 px-6 py-3 tracking-[0.3em]"
                  onClick={() => setState(startGame())}
                >
                  もう一度
                </button>
                <button
                  type="button"
                  className="border border-[#f0e2c8]/35 px-6 py-3 tracking-[0.3em]"
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

export function ShogiApp() {
  const [state, setState] = useState<ShogiState>(() => createTitleState());

  if (state.phase === "title") {
    return <TitleScreen onStart={() => setState(startGame())} />;
  }

  return (
    <GameScreen
      state={state}
      setState={setState}
      onExit={() => setState(createTitleState())}
    />
  );
}
