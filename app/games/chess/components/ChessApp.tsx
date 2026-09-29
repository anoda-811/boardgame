"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  LEVELS,
  applyAiMove,
  cancelPromotion,
  choosePromotion,
  createTitleState,
  selectSquare,
  startGame,
  type ChessLevel,
  type ChessState,
} from "@/lib/chess/game";
import {
  VALUE,
  findKing,
  inCheck,
  type Color,
  type Coord,
  type Piece,
  type PieceType,
} from "@/lib/chess/engine";
import { ChessDefs, ChessPiece, ChessPreviewRow, PIECE_NAME } from "./ChessPiece";
import { playMoveSound, primeAudio } from "./woodSound";

const Chess3DBoard = dynamic(() => import("./Chess3DBoard"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs tracking-[0.3em] text-[#c9a860]/60">
      立体盤を準備中…
    </div>
  ),
});

export type ViewMode = "2d" | "3d";

const VIEW_LABEL: Record<ViewMode, { label: string; description: string }> = {
  "2d": { label: "平面", description: "真上から見る盤" },
  "3d": { label: "立体", description: "立体の駒・視点はドラッグで回転" },
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const CAPTURE_ORDER: PieceType[] = ["q", "r", "b", "n", "p"];

function materialOf(pieces: PieceType[]) {
  return pieces.reduce((sum, p) => sum + VALUE[p], 0);
}

function CapturedTray({
  label,
  pieces,
  capturedColor,
  advantage,
}: {
  label: string;
  pieces: PieceType[];
  capturedColor: Color;
  advantage: number;
}) {
  const sorted = [...pieces].sort(
    (a, b) => CAPTURE_ORDER.indexOf(a) - CAPTURE_ORDER.indexOf(b),
  );

  return (
    <div className="chess-tray flex h-[4.25rem] flex-col justify-center overflow-hidden rounded-sm px-3 py-2">
      <div className="mb-1 flex shrink-0 items-baseline justify-between">
        <p className="text-[10px] tracking-[0.3em] text-[#c9a860]/70">{label}</p>
        {advantage > 0 && (
          <p className="text-xs tracking-widest text-[#e6cf94]">
            +{Math.round(advantage / 100)}
          </p>
        )}
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs text-[#c9a860]/35">まだ取った駒はありません</p>
      ) : (
        <div className="flex min-h-0 items-center overflow-x-auto overflow-y-hidden">
          {sorted.map((type, i) => (
            <div
              key={`${type}-${i}`}
              className="h-7 w-6 shrink-0"
              style={{ marginLeft: i === 0 ? 0 : -6 }}
            >
              <ChessPiece type={type} color={capturedColor} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BoardSquare({
  piece,
  coord,
  selected,
  target,
  lastFrom,
  lastTo,
  opponentMove,
  checked,
  onClick,
}: {
  piece: Piece | null;
  coord: Coord;
  selected: boolean;
  target: boolean;
  lastFrom: boolean;
  lastTo: boolean;
  opponentMove: boolean;
  checked: boolean;
  onClick: () => void;
}) {
  const light = (coord.r + coord.c) % 2 === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative flex aspect-square items-center justify-center",
        light ? "chess-sq-light" : "chess-sq-dark",
      ].join(" ")}
      aria-label={`${FILES[coord.c]}${8 - coord.r}`}
    >
      {(lastFrom || lastTo) && (
        <span
          className={[
            "pointer-events-none absolute inset-0",
            opponentMove
              ? lastTo
                ? "animate-last-move bg-[#3d7ad4]/40 ring-2 ring-inset ring-[#7eb6ff]/85"
                : "bg-[#5a8fd4]/30 ring-1 ring-inset ring-[#7eb6ff]/45"
              : "bg-[#e0b54a]/30",
          ].join(" ")}
        />
      )}
      {selected && (
        <span className="pointer-events-none absolute inset-0 bg-[#e0a23a]/45 ring-2 ring-inset ring-[#f5d27a]/80" />
      )}
      {checked && (
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(220,40,30,0.85)_0%,rgba(220,40,30,0.35)_45%,transparent_72%)]" />
      )}
      {target && (
        <span
          className={[
            "pointer-events-none absolute z-[3] rounded-full",
            piece
              ? "inset-[6%] border-[3px] border-[#1d4f2c]/60"
              : "h-[28%] w-[28%] bg-[#1d4f2c]/45",
          ].join(" ")}
        />
      )}
      {piece && (
        <div className="relative z-[2] h-[88%] w-[88%]">
          <ChessPiece type={piece.type} color={piece.color} />
        </div>
      )}
    </button>
  );
}

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { key: T; label: string; description: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-[10px] tracking-[0.35em] text-[#c9a860]/65">{label}</p>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => {
          const active = option.key === value;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.key)}
              className={[
                "flex flex-col items-center gap-1 border px-2 py-3 transition",
                active
                  ? "border-[#e6cf94]/80 bg-[#c9a860]/20 shadow-[0_0_18px_rgba(201,168,96,0.25)]"
                  : "border-[#c9a860]/20 bg-black/20 hover:border-[#c9a860]/45",
              ].join(" ")}
            >
              <span className="font-[family-name:var(--font-display)] text-base tracking-[0.2em]">
                {option.label}
              </span>
              <span className="text-[10px] leading-snug text-[#c9a860]/60">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TitleScreen({
  level,
  onLevelChange,
  view,
  onViewChange,
  onStart,
}: {
  level: ChessLevel;
  onLevelChange: (level: ChessLevel) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onStart: () => void;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0b0e13] text-[#efe6d2]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1f2a36_0%,_#0b0e13_60%,_#050608_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(ellipse_at_top,_rgba(201,168,96,0.16),transparent_55%)]"
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-[clamp(0.75rem,3vh,4rem)] text-center">
        <p className="animate-fade-up mb-[clamp(0.5rem,2vh,1.5rem)] text-xs tracking-[0.45em] text-[#c9a860]/75">
          CHESS
        </p>
        <h1 className="animate-fade-up animate-title-glow font-[family-name:var(--font-display)] text-[clamp(3rem,10vh,6rem)] leading-none tracking-[0.2em]">
          チェス
        </h1>
        <p className="animate-fade-up mt-[clamp(0.5rem,2vh,1.25rem)] max-w-sm text-sm leading-relaxed tracking-wide text-[#c9a860]/70 sm:text-base">
          象牙と黒檀、六十四の升目。
          <br />
          白番であなたが指します。
        </p>

        <div className="animate-fade-up mt-[clamp(0.5rem,3vh,2.5rem)]">
          <ChessPreviewRow types={["r", "n", "b", "q", "k"]} />
        </div>

        <div className="animate-fade-up mt-[clamp(0.75rem,3vh,2.5rem)] flex w-full max-w-md flex-col gap-[clamp(0.5rem,2vh,1.25rem)]">
          <ChoiceGroup
            label="相手の強さ"
            value={level}
            onChange={onLevelChange}
            options={(Object.keys(LEVELS) as ChessLevel[]).map((key) => ({
              key,
              label: LEVELS[key].label,
              description: LEVELS[key].description,
            }))}
          />
          <ChoiceGroup
            label="表示モード"
            value={view}
            onChange={onViewChange}
            options={(Object.keys(VIEW_LABEL) as ViewMode[]).map((key) => ({
              key,
              ...VIEW_LABEL[key],
            }))}
          />
        </div>

        <div className="animate-fade-up mt-[clamp(0.75rem,3vh,2rem)] flex flex-col items-center gap-[clamp(0.5rem,1.5vh,1rem)]">
          <button
            type="button"
            onClick={onStart}
            className="min-w-48 border border-[#c9a860]/55 bg-[#c9a860]/12 px-8 py-3 font-[family-name:var(--font-display)] text-lg tracking-[0.35em] transition hover:bg-[#c9a860]/22"
          >
            はじめる
          </button>
          <p className="text-xs tracking-widest text-[#c9a860]/40">
            CPU対戦・キャスリング／アンパッサン対応
          </p>
        </div>
      </div>

      <footer className="relative z-10 pb-[clamp(0.75rem,3vh,2rem)] text-center">
        <Link
          href="/"
          className="text-sm tracking-widest text-[#c9a860]/50 transition hover:text-[#efe6d2]"
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
  onExit,
}: {
  state: ChessState;
  setState: React.Dispatch<React.SetStateAction<ChessState>>;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onExit: () => void;
}) {
  const [, startTransition] = useTransition();
  const [soundOn, setSoundOn] = useState(true);
  const { board, turn } = state.position;

  const soundRef = useRef({ on: soundOn, view, captures: 0 });
  useEffect(() => {
    soundRef.current.on = soundOn;
    soundRef.current.view = view;
  }, [soundOn, view]);

  const captureCount = state.captured.w.length + state.captured.b.length;
  useEffect(() => {
    const prev = soundRef.current.captures;
    soundRef.current.captures = captureCount;
    if (!state.lastMove || !soundRef.current.on) return;
    const kind = inCheck(board, turn) ? "check" : captureCount > prev ? "capture" : "move";
    playMoveSound(kind, soundRef.current.view === "3d" ? 400 : 0);
    // Only a new move should trigger a sound.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastMove]);

  useEffect(() => {
    if (state.phase !== "playing" || turn !== "b") return;
    const timer = window.setTimeout(() => {
      startTransition(() => {
        setState((s) =>
          s.phase === "playing" && s.position.turn === "b" ? applyAiMove(s) : s,
        );
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [state.phase, turn, setState]);

  const checkedKing = inCheck(board, turn) ? findKing(board, turn) : null;
  const opponentMove = state.lastMove?.by === "b";
  const whiteMaterial = materialOf(state.captured.w);
  const blackMaterial = materialOf(state.captured.b);

  const is = (a: Coord | null | undefined, r: number, c: number) =>
    Boolean(a && a.r === r && a.c === c);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0b0e13] text-[#efe6d2]">
      <ChessDefs />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1c2530_0%,_#0b0e13_55%,_#050608_100%)]"
      />

      <div className="relative z-10 mx-auto grid h-dvh min-h-[520px] w-full max-w-3xl grid-rows-[auto_4.25rem_minmax(0,1fr)_4.25rem] gap-3 px-3 py-3 sm:px-6 sm:py-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#c9a860]/65">CHESS</p>
            <h1 className="flex items-baseline gap-3 font-[family-name:var(--font-display)] text-2xl tracking-widest">
              チェス
              <span className="border border-[#c9a860]/35 px-2 py-0.5 font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] text-[#e6cf94]">
                {LEVELS[state.level].label}
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="max-w-[14rem] text-right text-xs text-[#c9a860]/75 sm:max-w-none">
              {state.message}
            </p>
            <div className="flex shrink-0 border border-[#c9a860]/25" role="radiogroup" aria-label="表示モード">
              {(Object.keys(VIEW_LABEL) as ViewMode[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={view === key}
                  onClick={() => onViewChange(key)}
                  className={[
                    "px-3 py-1 text-xs tracking-widest transition",
                    view === key
                      ? "bg-[#c9a860]/25 text-[#f3e3b8]"
                      : "text-[#c9a860]/60 hover:text-[#efe6d2]",
                  ].join(" ")}
                >
                  {VIEW_LABEL[key].label}
                </button>
              ))}
            </div>
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
                  ? "border-[#c9a860]/25 hover:border-[#c9a860]/50"
                  : "border-[#c9a860]/15 text-[#c9a860]/45 hover:text-[#efe6d2]",
              ].join(" ")}
            >
              {soundOn ? "音 あり" : "音 なし"}
            </button>
            <button
              type="button"
              onClick={onExit}
              className="shrink-0 border border-[#c9a860]/25 px-3 py-1 text-xs tracking-widest hover:border-[#c9a860]/50"
            >
              タイトル
            </button>
          </div>
        </header>

        <CapturedTray
          label="あいてが取った駒"
          pieces={state.captured.b}
          capturedColor="w"
          advantage={blackMaterial - whiteMaterial}
        />

        <div
          className="flex min-h-0 items-center justify-center [container-type:size]"
          onPointerDown={() => soundOn && primeAudio()}
        >
          {view === "3d" ? (
            <div className="relative h-full w-full max-w-[720px] overflow-hidden rounded-md bg-[radial-gradient(ellipse_at_50%_40%,_#243140_0%,_#10151c_60%,_#07090c_100%)] shadow-[inset_0_0_60px_rgba(0,0,0,0.6)]">
              <Chess3DBoard
                board={board}
                selected={state.selected}
                targets={state.targets}
                lastMove={state.lastMove}
                checkedKing={checkedKing}
                onSquareClick={(coord) => setState((s) => selectSquare(s, coord))}
              />
            </div>
          ) : (
          <div className="chess-frame w-[min(100cqw,100cqh,560px)] p-[18px] sm:p-6">
            <div className="relative">
              <div className="chess-board grid aspect-square w-full grid-cols-8 grid-rows-8 overflow-hidden">
                {board.map((row, r) =>
                  row.map((piece, c) => (
                    <BoardSquare
                      key={`${r}-${c}`}
                      piece={piece}
                      coord={{ r, c }}
                      selected={is(state.selected, r, c)}
                      target={state.targets.some((t) => t.r === r && t.c === c)}
                      lastFrom={is(state.lastMove?.from, r, c)}
                      lastTo={is(state.lastMove?.to, r, c)}
                      opponentMove={opponentMove}
                      checked={is(checkedKing, r, c)}
                      onClick={() => setState((s) => selectSquare(s, { r, c }))}
                    />
                  )),
                )}
              </div>

              <div className="pointer-events-none absolute -bottom-[16px] left-0 right-0 grid grid-cols-8 sm:-bottom-[21px]">
                {FILES.map((f) => (
                  <span
                    key={f}
                    className="text-center font-[family-name:var(--font-display)] text-[10px] text-[#c9a860]/80 sm:text-xs"
                  >
                    {f}
                  </span>
                ))}
              </div>
              <div className="pointer-events-none absolute -left-[13px] bottom-0 top-0 grid grid-rows-8 sm:-left-[17px]">
                {Array.from({ length: 8 }, (_, i) => (
                  <span
                    key={i}
                    className="flex items-center font-[family-name:var(--font-display)] text-[10px] text-[#c9a860]/80 sm:text-xs"
                  >
                    {8 - i}
                  </span>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>

        <CapturedTray
          label="あなたが取った駒"
          pieces={state.captured.w}
          capturedColor="b"
          advantage={whiteMaterial - blackMaterial}
        />

        {state.phase === "promote" && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-sm border border-[#c9a860]/35 bg-[#121821] p-6 text-center shadow-2xl">
              <p className="text-xs tracking-[0.35em] text-[#c9a860]/75">PROMOTION</p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
                昇格する駒
              </h3>
              <div className="mt-6 grid grid-cols-4 gap-2">
                {(["q", "r", "b", "n"] as PieceType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setState((s) => choosePromotion(s, type))}
                    className="flex flex-col items-center gap-1 border border-[#c9a860]/25 bg-[#c9a860]/5 px-1 py-2 transition hover:border-[#c9a860]/60 hover:bg-[#c9a860]/15"
                  >
                    <div className="h-12 w-12">
                      <ChessPiece type={type} color="w" />
                    </div>
                    <span className="text-[10px] tracking-wider text-[#c9a860]/80">
                      {PIECE_NAME[type]}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setState((s) => cancelPromotion(s))}
                className="mt-5 text-xs tracking-widest text-[#c9a860]/55 hover:text-[#efe6d2]"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {state.phase === "ended" && state.result && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-sm border border-[#c9a860]/35 bg-[#121821] p-6 text-center shadow-2xl">
              <p className="text-xs tracking-[0.35em] text-[#c9a860]/75">RESULT</p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
                {state.result.winner === null
                  ? "引き分け"
                  : state.result.winner === "w"
                    ? "あなたの勝ち"
                    : "相手の勝ち"}
              </h3>
              <p className="mt-3 text-sm text-[#c9a860]/70">{state.result.reason}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  className="border border-[#c9a860]/55 bg-[#c9a860]/15 px-6 py-3 tracking-[0.3em]"
                  onClick={() => setState((s) => startGame(s.level))}
                >
                  もう一度
                </button>
                <button
                  type="button"
                  className="border border-[#efe6d2]/35 px-6 py-3 tracking-[0.3em]"
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

export function ChessApp() {
  const [state, setState] = useState<ChessState>(() => createTitleState());
  const [view, setView] = useState<ViewMode>("2d");

  if (state.phase === "title") {
    return (
      <TitleScreen
        level={state.level}
        onLevelChange={(level) => setState((s) => ({ ...s, level }))}
        view={view}
        onViewChange={setView}
        onStart={() => setState((s) => startGame(s.level))}
      />
    );
  }

  return (
    <GameScreen
      state={state}
      setState={setState}
      view={view}
      onViewChange={setView}
      onExit={() => setState((s) => createTitleState(s.level))}
    />
  );
}
