"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { inCheck } from "@/lib/shogi/board";
import { cancelEngineSearch, requestEngineMove } from "@/lib/shogi/engine";
import {
  AI_RANK_ORDER,
  AI_RANKS,
  applyAiMove,
  applyGoteMove,
  choosePromote,
  createTitleState,
  selectDrop,
  selectSquare,
  startGame,
  type AiRank,
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
import { Portrait } from "./Portrait";
import { playMoveSound, primeAudio } from "../../chess/components/woodSound";
import { CareerHome, JunniTable } from "./CareerHome";
import {
  applyResult,
  createCareer,
  currentEvent,
  figureForRank,
  isStoryCareer,
  loadCareer,
  saveCareer,
  type Career,
  type Opponent,
} from "@/lib/shogi/career";

const Shogi3DBoard = dynamic(() => import("./Shogi3DBoard"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs tracking-[0.3em] text-[#d4b896]/60">
      盤を準備中…
    </div>
  ),
});

export type ViewMode = "2d" | "3d";

const VIEW_LABEL: Record<ViewMode, { label: string; description: string }> = {
  "3d": { label: "立体", description: "足付き盤と駒台・対局の臨場感" },
  "2d": { label: "平面", description: "真上から見る盤" },
};

function ViewChoice({ view, onChange }: { view: ViewMode; onChange: (view: ViewMode) => void }) {
  return (
    <div className="grid w-full max-w-sm grid-cols-2 gap-2" role="radiogroup" aria-label="表示モード">
      {(Object.keys(VIEW_LABEL) as ViewMode[]).map((key) => {
        const active = key === view;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={[
              "flex flex-col items-center gap-1 border px-2 py-3 transition",
              active
                ? "border-[#e6cf94]/80 bg-[#d4b896]/20 shadow-[0_0_18px_rgba(212,184,150,0.25)]"
                : "border-[#d4b896]/20 bg-black/20 hover:border-[#d4b896]/45",
            ].join(" ")}
          >
            <span className="font-[family-name:var(--font-display)] text-base tracking-[0.2em]">
              {VIEW_LABEL[key].label}
            </span>
            <span className="text-[10px] leading-snug text-[#d4b896]/60">{VIEW_LABEL[key].description}</span>
          </button>
        );
      })}
    </div>
  );
}

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

function TitleScreen({
  view,
  onViewChange,
  level,
  onLevel,
  onStart,
  onStory,
  hasCareer,
}: {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  level: AiRank;
  onLevel: (level: AiRank) => void;
  onStart: () => void;
  onStory: () => void;
  hasCareer: boolean;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#120c08] text-[#f0e2c8]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#3a2414_0%,_#120c08_58%,_#070504_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(ellipse_at_top,_rgba(212,168,90,0.16),transparent_55%)]"
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-[clamp(0.75rem,3vh,4rem)] text-center">
        <p className="animate-fade-up mb-[clamp(0.5rem,2vh,1.5rem)] text-xs tracking-[0.45em] text-[#d4b896]/75">
          SHOGI
        </p>
        <h1 className="animate-fade-up animate-title-glow font-[family-name:var(--font-display)] text-[clamp(3rem,10vh,6rem)] leading-none tracking-[0.2em]">
          将棋
        </h1>
        <p className="animate-fade-up mt-[clamp(0.5rem,2vh,1.25rem)] max-w-sm text-sm leading-relaxed tracking-wide text-[#d4b896]/70 sm:text-base">
          榧の盤に、つややかな駒。
          <br />
          先手番であなたが指します。
        </p>

        <div className="animate-fade-up mt-[clamp(0.75rem,4vh,2.5rem)]">
          <PieceStandPreview labels={["香", "桂", "銀", "金", "玉"]} />
        </div>

        <div className="animate-fade-up mt-[clamp(0.5rem,2.5vh,1.5rem)] flex w-full max-w-md flex-col items-center">
          <p className="mb-2 text-[10px] tracking-[0.35em] text-[#d4b896]/65">相手の強さ</p>
          <div className="grid w-full grid-cols-5 gap-1.5" role="radiogroup" aria-label="相手の強さ">
            {AI_RANK_ORDER.map((key) => {
              const active = key === level;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  title={AI_RANKS[key].description}
                  onClick={() => onLevel(key)}
                  className={[
                    "border px-1 py-2 text-xs tracking-widest transition",
                    active
                      ? "border-[#e6cf94]/80 bg-[#d4b896]/20"
                      : "border-[#d4b896]/20 bg-black/20 hover:border-[#d4b896]/45",
                  ].join(" ")}
                >
                  {AI_RANKS[key].label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-[#d4b896]/55">{AI_RANKS[level].description}</p>
        </div>

        <div className="animate-fade-up mt-[clamp(0.4rem,2vh,1rem)] flex w-full flex-col items-center">
          <p className="mb-2 text-[10px] tracking-[0.35em] text-[#d4b896]/65">表示モード</p>
          <ViewChoice view={view} onChange={onViewChange} />
        </div>

        <div className="animate-fade-up mt-[clamp(0.6rem,2.5vh,1.5rem)] flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="min-w-48 border border-[#d4b896]/55 bg-[#d4b896]/12 px-8 py-3 font-[family-name:var(--font-display)] text-lg tracking-[0.35em] transition hover:bg-[#d4b896]/22"
          >
            フリー対局
          </button>
          <button
            type="button"
            onClick={onStory}
            className="min-w-48 border border-[#f0e2c8]/30 px-8 py-2.5 tracking-[0.3em] transition hover:border-[#d4b896]/55"
          >
            {hasCareer ? "ストーリー（続き）" : "ストーリー"}
          </button>
          <p className="text-xs tracking-widest text-[#d4b896]/40">2026年、小学5年から。教室、試験、奨励会</p>
        </div>
      </div>

      <footer className="relative z-10 pb-[clamp(0.75rem,3vh,2rem)] text-center">
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
  view,
  onViewChange,
  level,
  story,
  onExit,
}: {
  state: ShogiState;
  setState: React.Dispatch<React.SetStateAction<ShogiState>>;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  level: AiRank;
  story?: { label: string; opponent: string; person: Opponent; career: Career; onDone: (won: boolean) => void };
  onExit: () => void;
}) {
  const [, startTransition] = useTransition();
  const [soundOn, setSoundOn] = useState(true);
  const [tableOpen, setTableOpen] = useState(false);
  const across = story?.person ?? figureForRank(level);

  const handCount = (["sente", "gote"] as const).reduce(
    (sum, side) => sum + Object.values(state.hands[side]).reduce((a, b) => a + b, 0),
    0,
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const soundRef = useRef({ on: soundOn, view, hands: handCount });
  useEffect(() => {
    soundRef.current.on = soundOn;
    soundRef.current.view = view;
  }, [soundOn, view]);

  useEffect(() => {
    const prev = soundRef.current.hands;
    soundRef.current.hands = handCount;
    if (!state.lastMove || !soundRef.current.on) return;
    const kind = inCheck(state.board, state.turn) ? "check" : handCount > prev ? "capture" : "move";
    playMoveSound(kind, soundRef.current.view === "3d" ? 430 : 0);
    // Only a new move should trigger a sound.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastMove]);

  useEffect(() => {
    if (state.phase !== "playing" || state.turn !== "gote") return;
    let alive = true;
    const timer = window.setTimeout(() => {
      const snapshot = stateRef.current;
      if (!alive || snapshot.phase !== "playing" || snapshot.turn !== "gote") return;
      void (async () => {
        const move = await requestEngineMove(snapshot.board, snapshot.hands, snapshot.turn, level);
        if (!alive) return;
        startTransition(() => {
          setState((s) => {
            if (s.phase !== "playing" || s.turn !== "gote") return s;
            if (move) {
              const played = applyGoteMove(s, move);
              if (played !== s) return played;
            }
            return applyAiMove(s, level);
          });
        });
      })();
    }, 650);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      cancelEngineSearch();
    };
  }, [state.phase, state.turn, setState, level]);

  const isLastFrom = (r: number, c: number) =>
    Boolean(
      state.lastMove?.from &&
        state.lastMove.from.r === r &&
        state.lastMove.from.c === c,
    );
  const isLastTo = (r: number, c: number) =>
    Boolean(state.lastMove && state.lastMove.to.r === r && state.lastMove.to.c === c);
  const opponentMove = state.lastMove?.by === "gote";

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs tracking-[0.35em] text-[#d4b896]/65">SHOGI</p>
            <h1 className="flex items-baseline gap-3 font-[family-name:var(--font-display)] text-2xl tracking-widest">
              将棋
              <span className="border border-[#d4b896]/35 px-2 py-0.5 font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] text-[#e6cf94]">
                {story ? story.label : AI_RANKS[level].label}
              </span>
            </h1>
      </div>
      <div className="flex items-center gap-3">
        <p className="max-w-[14rem] text-right text-xs text-[#d4b896]/75 sm:max-w-none">
          {story && <span className="mb-0.5 block text-[10px] tracking-widest text-[#e6cf94]/80">対 {story.opponent}</span>}
          {state.message}
        </p>
        <div className="flex shrink-0 border border-[#d4b896]/25" role="radiogroup" aria-label="表示モード">
          {(["2d", "3d"] as ViewMode[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={view === key}
              onClick={() => onViewChange(key)}
              className={[
                "px-3 py-1 text-xs tracking-widest transition",
                view === key ? "bg-[#d4b896]/25 text-[#f3e3b8]" : "text-[#d4b896]/60 hover:text-[#f0e2c8]",
              ].join(" ")}
            >
              {VIEW_LABEL[key].label}
            </button>
          ))}
        </div>
        {story && (
          <button
            type="button"
            onClick={() => setTableOpen(true)}
            className="shrink-0 border border-[#d4b896]/25 px-3 py-1 text-xs tracking-widest hover:border-[#d4b896]/50"
          >
            {story.career.path === "pro" ? "順位表" : "席次"}
          </button>
        )}
        <button
          type="button"
          aria-pressed={soundOn}
          onClick={() => {
            if (!soundOn) {
              primeAudio();
              playMoveSound("move");
            }
            setSoundOn((v) => !v);
          }}
          className={[
            "shrink-0 border px-3 py-1 text-xs tracking-widest transition",
            soundOn
              ? "border-[#d4b896]/25 hover:border-[#d4b896]/50"
              : "border-[#d4b896]/15 text-[#d4b896]/45 hover:text-[#f0e2c8]",
          ].join(" ")}
        >
          {soundOn ? "音 あり" : "音 なし"}
        </button>
        <button
          type="button"
          onClick={onExit}
          className="shrink-0 border border-[#d4b896]/25 px-3 py-1 text-xs tracking-widest hover:border-[#d4b896]/50"
        >
          タイトル
        </button>
      </div>
    </header>
  );

  const modals = (
    <>
      {state.phase === "promote" && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm border border-[#d4b896]/35 bg-[#1e140c] p-6 text-center shadow-2xl">
            <p className="text-xs tracking-[0.35em] text-[#d4b896]/75">PROMOTE</p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl">成りますか？</h3>
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

      {tableOpen && story && <JunniTable career={story.career} onClose={() => setTableOpen(false)} />}

      {state.phase === "ended" && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm border border-[#d4b896]/35 bg-[#1e140c] p-6 text-center shadow-2xl">
            <p className="text-xs tracking-[0.35em] text-[#d4b896]/75">RESULT</p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
              {state.winner === "sente" ? "あなたの勝ち" : "相手の勝ち"}
            </h3>
            <p className="mt-3 text-sm text-[#d4b896]/70">{state.message}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              {story ? (
                <button
                  type="button"
                  className="border border-[#d4b896]/55 bg-[#d4b896]/15 px-6 py-3 tracking-[0.3em]"
                  onClick={() => story.onDone(state.winner === "sente")}
                >
                  暦にもどる
                </button>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (view === "3d") {
    return (
      <div
        className="relative h-dvh min-h-[520px] overflow-clip bg-[#120c08] text-[#f0e2c8]"
        onPointerDown={() => soundOn && primeAudio()}
      >
        <div className="relative z-10 mx-auto grid h-full w-full grid-rows-[auto_minmax(0,1fr)] gap-2 px-3 py-3 sm:px-6">
          {header}
          <div className="relative min-h-0 overflow-hidden rounded-md shadow-[inset_0_0_60px_rgba(0,0,0,0.6)]">
            <Shogi3DBoard
              board={state.board}
              hands={state.hands}
              selected={state.selected}
              selectedDrop={state.selectedDrop}
              targets={state.legalTargets}
              lastMove={state.lastMove}
              canDrop={state.phase === "playing" && state.turn === "sente"}
              across={across}
              onSquareClick={(coord) => setState((s) => selectSquare(s, coord))}
              onHandClick={(piece) => setState((s) => selectDrop(s, piece))}
            />
          </div>
          {modals}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-[#120c08] text-[#f0e2c8]"
      onPointerDown={() => soundOn && primeAudio()}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#2e1c10_0%,_#120c08_55%,_#070504_100%)]"
      />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-3xl grid-rows-[auto_4.75rem_minmax(0,1fr)_4.75rem] gap-3 px-3 py-4 sm:px-6 sm:py-6">
        {header}

        <div className="flex items-stretch gap-2">
          <div className="flex w-16 shrink-0 flex-col items-center justify-center">
            <Portrait person={across} className="h-14 w-12" />
            <p className="mt-0.5 max-w-full truncate text-[9px] tracking-widest text-[#d4b896]/75">{across.name}</p>
          </div>
          <div className="min-w-0 flex-1">
            <HandTray label="あいての持ち駒" hand={state.hands.gote} />
          </div>
        </div>

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

        {modals}
      </div>
    </div>
  );
}

const subscribeCareer = () => () => {};
let cachedCareer: Career | null | undefined;
function readCareer() {
  if (cachedCareer === undefined) cachedCareer = loadCareer();
  return cachedCareer;
}

export function ShogiApp() {
  const [state, setState] = useState<ShogiState>(() => createTitleState());
  const [view, setView] = useState<ViewMode>("3d");
  const [level, setLevel] = useState<AiRank>("10kyu");
  const [matchLevel, setMatchLevel] = useState<AiRank>("10kyu");
  const [screen, setScreen] = useState<"title" | "career" | "play">("title");
  const [mode, setMode] = useState<"free" | "story">("free");
  const saved = useSyncExternalStore(subscribeCareer, readCareer, () => null);
  const [draft, setDraft] = useState<Career | null>(null);
  const career = isStoryCareer(draft) ? draft : isStoryCareer(saved) ? saved : null;

  useEffect(() => {
    if (isStoryCareer(draft)) saveCareer(draft);
  }, [draft]);

  if (screen === "career" && career) {
    return (
      <CareerHome
        career={career}
        onChange={setDraft}
        onExit={() => setScreen("title")}
        onReset={() => setDraft(createCareer())}
        onPlay={() => {
          const event = currentEvent(career);
          if (!event) return;
          setMatchLevel(event.opponent.level);
          setMode("story");
          setState(startGame());
          setScreen("play");
        }}
      />
    );
  }

  if (screen === "play") {
    const event = mode === "story" && career ? currentEvent(career) : null;
    return (
      <GameScreen
        state={state}
        setState={setState}
        view={view}
        onViewChange={setView}
        level={matchLevel}
        story={
          event && career
            ? {
                label: event.label,
                opponent: `${event.opponent.name}（${event.opponent.rankLabel}・${event.opponent.age}歳）`,
                person: event.opponent,
                career,
                onDone: (won) => {
                  if (career) setDraft(applyResult(career, won));
                  setState(createTitleState());
                  setScreen("career");
                },
              }
            : undefined
        }
        onExit={() => {
          setState(createTitleState());
          setScreen(mode === "story" ? "career" : "title");
        }}
      />
    );
  }

  return (
    <TitleScreen
      view={view}
      onViewChange={setView}
      level={level}
      onLevel={setLevel}
      hasCareer={career !== null}
      onStart={() => {
        setMatchLevel(level);
        setMode("free");
        setState(startGame());
        setScreen("play");
      }}
      onStory={() => {
        if (!career) setDraft(createCareer());
        setScreen("career");
      }}
    />
  );
}
