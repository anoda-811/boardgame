"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition, type Ref } from "react";
import { inCheck } from "@/lib/shogi/board";
import { cancelEngineSearch, requestCandidateMoves, requestEngineMove, requestPositionEval } from "@/lib/shogi/engine";
import {
  describeCandidate,
  describeMove,
  compareSenteEval,
  evalAdvantage,
  evalShare,
  formatEval,
  positionKey,
  quietPosition,
  type SenteEval,
} from "@/lib/shogi/kifu";
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
  type Side,
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
    <div className="shogi-komadai flex h-full flex-col justify-center overflow-hidden rounded-sm px-2 py-1 sm:px-3 sm:py-2">
      <p className="mb-0.5 shrink-0 text-[10px] tracking-[0.3em] text-[#d4b896]/70 sm:mb-1.5">
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

type LineMark = { state: ShogiState; evaluation: SenteEval | null };
type HintMove = { notation: string; evaluation: SenteEval };

function FreeReview({
  line,
  cursor,
  pending,
  hints,
  onJump,
  onUndo,
  dock,
}: {
  line: LineMark[];
  cursor: number;
  pending: boolean;
  hints: { pending: boolean; moves: HintMove[]; opponent?: boolean } | null;
  onJump: (index: number) => void;
  onUndo: () => void;
  dock: "top" | "bottom";
}) {
  const current = line[cursor]?.evaluation ?? null;
  const share = evalShare(current);
  const towardSente = share > 0;
  const span = Math.abs(share) * 50;
  const activeRef = useRef<HTMLButtonElement>(null);
  const atTip = cursor >= line.length - 1;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [cursor, line.length]);

  const pairs: { n: number; sente: number; gote?: number }[] = [];
  for (let i = 1; i < line.length; i += 2) {
    pairs.push({ n: pairs.length + 1, sente: i, gote: i + 1 < line.length ? i + 1 : undefined });
  }

  return (
    <div
      className={[
        "pointer-events-none absolute inset-x-0 z-30 flex items-start justify-between gap-1 px-1.5 sm:top-[4.25rem] sm:bottom-auto sm:gap-3 sm:px-5",
        dock === "bottom" ? "top-auto bottom-[3.35rem]" : "top-[3.1rem]",
      ].join(" ")}
    >
      <div className="pointer-events-auto flex max-h-[5.25rem] w-[min(8.25rem,38vw)] flex-col gap-1 overflow-y-auto sm:max-h-none sm:w-[min(14.5rem,44vw)] sm:gap-2">
        <aside className="border border-[#e6cf94]/30 bg-[#140e0a]/80 px-2 py-2 shadow-[0_16px_40px_rgba(0,0,0,0.38)] backdrop-blur-md sm:px-3.5 sm:py-3">
          <p className="text-[10px] tracking-[0.42em] text-[#d4b896]/55">評価値</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl leading-none tracking-wide text-[#f6ead0] tabular-nums sm:text-[1.85rem]">
            {current ? formatEval(current) : pending || hints?.pending ? "…" : "–"}
          </p>
          <div className="relative mt-3 h-1.5 overflow-hidden bg-black/45">
            <span className="absolute top-0 left-1/2 h-full w-px bg-[#e6cf94]/55" />
            {current && (
              <span
                className="absolute top-0 h-full"
                style={{
                  left: towardSente ? "50%" : `${50 - span}%`,
                  width: `${span}%`,
                  background: towardSente
                    ? "linear-gradient(90deg, #c4a46a, #f3e3b8)"
                    : "linear-gradient(90deg, #6e3a32, #c46a58)",
                }}
              />
            )}
          </div>
          <p className="mt-2 text-[10px] tracking-[0.22em] text-[#d4b896]/70">{evalAdvantage(current)}</p>
        </aside>
        {hints && (
          <aside className="border border-[#e6cf94]/30 bg-[#140e0a]/80 px-2 py-2 shadow-[0_16px_40px_rgba(0,0,0,0.38)] backdrop-blur-md sm:px-3.5 sm:py-3">
            <p className="text-[10px] tracking-[0.42em] text-[#d4b896]/55">{hints.opponent ? "相手の最善手" : "最善手"}</p>
            {hints.pending && hints.moves.length === 0 ? (
              <p className="mt-2 text-[12px] tracking-[0.14em] text-[#d4b896]/70">考えています…</p>
            ) : (
              <ol className="mt-1.5 flex flex-col gap-1">
                {hints.moves.map((hint, index) => (
                  <li key={`${hint.notation}-${index}`} className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] tracking-wider text-[#f6ead0]">
                      <span className={index === 0 ? "mr-1.5 text-[#e6cf94]" : "mr-1.5 text-[#d4b896]/45"}>
                        {index + 1}
                      </span>
                      {hint.notation}
                    </span>
                    <span className="shrink-0 text-[11px] text-[#e6cf94]/80 tabular-nums">{formatEval(hint.evaluation)}</span>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        )}
      </div>

      <aside className="pointer-events-auto flex max-h-[5.25rem] w-[min(9rem,42vw)] flex-col border border-[#e6cf94]/30 bg-[#140e0a]/80 shadow-[0_16px_40px_rgba(0,0,0,0.38)] backdrop-blur-md sm:max-h-[min(22rem,46vh)] sm:w-[min(19rem,48vw)]">
        <div className="flex items-baseline justify-between px-3 pt-2.5 pb-1.5">
          <p className="text-[10px] tracking-[0.42em] text-[#d4b896]/55">棋譜</p>
          <p className="text-[10px] tracking-[0.18em] text-[#e6cf94]/70 tabular-nums">
            {cursor === 0 ? "開始" : `${cursor}手目`}
          </p>
        </div>
        <div className="grid grid-cols-[1.4rem_1fr_1fr] gap-x-1 px-2 pb-1 text-[9px] tracking-[0.2em] text-[#d4b896]/40">
          <span />
          <span>先手</span>
          <span>後手</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 [scrollbar-width:thin]">
          <button
            type="button"
            ref={cursor === 0 ? activeRef : undefined}
            onClick={() => onJump(0)}
            className={[
              "mb-0.5 w-full px-2 py-1 text-left text-[11px] tracking-[0.18em]",
              cursor === 0 ? "bg-[#e6cf94]/15 text-[#f6ead0]" : "text-[#d4b896]/55 hover:bg-white/5",
            ].join(" ")}
          >
            開始局面
            <span className="ml-2 tabular-nums text-[#e6cf94]/80">{formatEval(line[0]?.evaluation ?? null)}</span>
          </button>
          {pairs.map((pair) => (
            <div key={pair.n} className="grid grid-cols-[1.4rem_1fr_1fr] gap-x-1">
              <span className="self-center text-center text-[10px] text-[#d4b896]/35 tabular-nums">{pair.n}</span>
              <KifuCell
                mark={line[pair.sente]}
                before={line[pair.sente - 1].state}
                active={cursor === pair.sente}
                buttonRef={cursor === pair.sente ? activeRef : undefined}
                onClick={() => onJump(pair.sente)}
              />
              {pair.gote != null ? (
                <KifuCell
                  mark={line[pair.gote]}
                  before={line[pair.gote - 1].state}
                  active={cursor === pair.gote}
                  buttonRef={cursor === pair.gote ? activeRef : undefined}
                  onClick={() => onJump(pair.gote!)}
                />
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 border-t border-[#e6cf94]/15">
          <button
            type="button"
            disabled={cursor === 0}
            onClick={onUndo}
            className="px-2 py-2 text-[11px] tracking-[0.28em] text-[#f0e2c8] transition hover:bg-[#e6cf94]/10 disabled:text-[#d4b896]/25"
          >
            戻す
          </button>
          <button
            type="button"
            disabled={atTip}
            onClick={() => onJump(cursor + 1)}
            className="border-l border-[#e6cf94]/15 px-2 py-2 text-[11px] tracking-[0.28em] text-[#f0e2c8] transition hover:bg-[#e6cf94]/10 disabled:text-[#d4b896]/25"
          >
            進む
          </button>
        </div>
      </aside>
    </div>
  );
}

function KifuCell({
  mark,
  before,
  active,
  buttonRef,
  onClick,
}: {
  mark: LineMark;
  before: ShogiState;
  active: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={onClick}
      className={[
        "my-0.5 flex items-baseline justify-between gap-1 px-1.5 py-1 text-left",
        active ? "bg-[#e6cf94]/15 text-[#f6ead0]" : "text-[#f0e2c8]/85 hover:bg-white/5",
      ].join(" ")}
    >
      <span className="text-[12px] tracking-wider">{describeMove(before, mark.state)}</span>
      <span className="shrink-0 text-[10px] text-[#e6cf94]/75 tabular-nums">{formatEval(mark.evaluation)}</span>
    </button>
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
  const free = !story;
  const [line, setLine] = useState<LineMark[]>(() => [{ state: quietPosition(state), evaluation: null }]);
  const [cursor, setCursor] = useState(0);
  const keyRef = useRef(positionKey(quietPosition(state)));
  const atTipRef = useRef(true);
  const lineRef = useRef(line);
  lineRef.current = line;
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const evalBusy = useRef(new Set<number>());
  const directEval = useRef(new Map<string, { epoch: number; evaluation: SenteEval }>());
  const [evalPending, setEvalPending] = useState(false);
  const [draft, setDraft] = useState<ShogiState | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const viewing = free && cursor < line.length - 1;
  const shown = draft ?? (viewing ? line[Math.min(cursor, line.length - 1)].state : state);
  const studyState =
    shown.phase === "playing" && (shown.turn === "sente" || (viewing && shown.turn === "gote"))
      ? quietPosition(shown)
      : null;
  const studyKey = studyState ? positionKey(studyState) : "";
  const [hints, setHints] = useState<HintMove[] | null>(null);
  const [hintsPending, setHintsPending] = useState(false);

  useEffect(() => {
    atTipRef.current = !free || cursor >= line.length - 1;
  }, [free, cursor, line.length]);

  useEffect(() => {
    if (!free || state.phase === "promote" || state.phase === "title") return;
    const key = positionKey(state);
    if (!key || key === keyRef.current) return;
    const tip = lineRef.current[lineRef.current.length - 1];
    if (tip && positionKey(tip.state) === key) {
      keyRef.current = key;
      return;
    }
    keyRef.current = key;
    const follow = atTipRef.current;
    setLine((prev) => {
      const last = prev[prev.length - 1];
      if (last && positionKey(last.state) === key) return prev;
      return [...prev, { state: quietPosition(state), evaluation: directEval.current.get(key)?.epoch === 2 ? directEval.current.get(key)!.evaluation : null }];
    });
    if (follow) setCursor((c) => c + 1);
  }, [free, state]);

  const jump = (index: number) => {
    const max = lineRef.current.length - 1;
    const next = Math.max(0, Math.min(max, index));
    atTipRef.current = next === max;
    if (!atTipRef.current) cancelEngineSearch();
    setDraft(null);
    setCursor(next);
  };

  const undo = () => {
    const marks = lineRef.current;
    const from = atTipRef.current ? marks.length - 1 : cursor;
    if (from <= 0) return;
    const ended = marks[from]?.state.phase === "ended" && from === marks.length - 1;
    if (!ended) {
      jump(from - 1);
      return;
    }
    let index = from - 1;
    while (index > 0 && !(marks[index].state.turn === "sente" && marks[index].state.phase === "playing")) {
      index -= 1;
    }
    jump(index);
  };

  useEffect(() => {
    if (!free) return;
    const onKey = (event: KeyboardEvent) => {
      if (draftRef.current?.phase === "promote" || stateRef.current.phase === "promote") return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      const current = lineRef.current;
      const max = current.length - 1;
      const from = atTipRef.current ? max : cursor;
      if (event.key === "ArrowLeft") undo();
      else jump(from + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [free, cursor]);

  useEffect(() => {
    if (!free) return;
    const marks = lineRef.current;
    const index = Math.min(cursor, marks.length - 1);
    const liveThinking =
      !viewing &&
      marks[marks.length - 1]?.state.phase === "playing" &&
      marks[marks.length - 1]?.state.turn === "gote";
    const targets = (liveThinking ? [index] : [index, index - 1]).filter((i) => i >= 0);
    const requestCursor = cursor;
    for (const i of targets) {
      const mark = marks[i];
      if (!mark || evalBusy.current.has(i)) continue;
      const pos = mark.state;
      if (pos.phase === "promote" || pos.phase === "title") continue;
      if (liveThinking && i === marks.length - 1) {
        if (i === index) setEvalPending(true);
        continue;
      }
      const key = positionKey(pos);
      if (!key) continue;
      const saved = directEval.current.get(key);
      const locked = saved?.epoch === 2 ? saved.evaluation : null;
      if (locked) {
        if (mark.evaluation !== locked) {
          setLine((prev) => {
            const current = prev[i];
            if (!current || positionKey(current.state) !== key || current.evaluation === locked) return prev;
            const next = prev.slice();
            next[i] = { ...current, evaluation: locked };
            return next;
          });
        }
        continue;
      }
      evalBusy.current.add(i);
      if (i === index) setEvalPending(true);
      void requestPositionEval(pos.board, pos.hands, pos.turn).then((evaluation) => {
        evalBusy.current.delete(i);
        if (i === requestCursor && cursorRef.current === requestCursor) setEvalPending(false);
        if (!evaluation) return;
        directEval.current.set(key, { epoch: 2, evaluation });
        setLine((prev) => {
          const current = prev[i];
          if (!current || positionKey(current.state) !== key) return prev;
          const next = prev.slice();
          next[i] = { ...current, evaluation };
          return next;
        });
      });
    }
    const shownKey = marks[index] ? positionKey(marks[index].state) : "";
    if (shownKey && directEval.current.get(shownKey)?.epoch === 2) setEvalPending(false);
  }, [free, cursor, viewing, line]);

  useEffect(() => {
    if (!free || !studyState) {
      setHints(null);
      setHintsPending(false);
      return;
    }
    const pos = studyState;
    const key = studyKey;
    let alive = true;
    setHints(null);
    setHintsPending(true);
    void requestCandidateMoves(pos.board, pos.hands, pos.turn).then((found) => {
      if (!alive) return;
      setHintsPending(false);
      if (!found) return;
      const ranked = found.moves.map((item) => ({
        notation: describeCandidate(pos, item.move),
        evaluation: item.evaluation,
      }));
      ranked.sort((a, b) =>
        pos.turn === "gote"
          ? compareSenteEval(a.evaluation, b.evaluation)
          : compareSenteEval(b.evaluation, a.evaluation),
      );
      setHints(ranked);
      const best = found.positionEval;
      if (!best || directEval.current.get(key)?.epoch === 2) return;
      setLine((prev) => {
        let index = -1;
        for (let i = prev.length - 1; i >= 0; i -= 1) {
          if (positionKey(prev[i].state) === key) {
            index = i;
            break;
          }
        }
        if (index < 0 || prev[index].evaluation) return prev;
        const next = prev.slice();
        next[index] = { ...next[index], evaluation: best };
        return next;
      });
    });
    return () => {
      alive = false;
      cancelEngineSearch();
    };
    // studyState matches studyKey; depending on the object would restart the search every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [free, studyKey]);

  const handCount = (["sente", "gote"] as const).reduce(
    (sum, side) => sum + Object.values(state.hands[side]).reduce((a, b) => a + b, 0),
    0,
  );
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
    if (viewing) return;
    if (state.phase !== "playing" || state.turn !== "gote") return;
    let alive = true;
    const timer = window.setTimeout(() => {
      const snapshot = stateRef.current;
      if (!alive || !atTipRef.current || snapshot.phase !== "playing" || snapshot.turn !== "gote") return;
      void (async () => {
        const decision = await Promise.race([
          requestEngineMove(snapshot.board, snapshot.hands, snapshot.turn, level),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 12000)),
        ]);
        if (!alive || !atTipRef.current) return;
        const move = decision?.move ?? null;
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
  }, [state.phase, state.turn, setState, level, viewing]);

  const play = (updater: (current: ShogiState) => ShogiState) => {
    if (!free) {
      setState(updater);
      return;
    }
    const offTip = cursor < lineRef.current.length - 1;
    const base =
      draft ??
      (offTip ? lineRef.current[Math.min(cursor, lineRef.current.length - 1)].state : stateRef.current);
    const next = updater(base);
    if (next === base) return;
    const nextKey = positionKey(next);
    const moved = nextKey !== "" && nextKey !== positionKey(base);
    if (!moved) {
      if (offTip || draft) setDraft(next);
      else setState(next);
      return;
    }
    if (offTip || draft) {
      const cut = Math.min(cursor, lineRef.current.length - 1);
      const kept = lineRef.current[cut];
      keyRef.current = kept ? positionKey(kept.state) : "";
      atTipRef.current = true;
      soundRef.current.hands = (["sente", "gote"] as const).reduce(
        (sum, side) => sum + Object.values(base.hands[side]).reduce((count, n) => count + n, 0),
        0,
      );
      setDraft(null);
      setLine((prev) => prev.slice(0, cut + 1));
      setCursor(cut);
      cancelEngineSearch();
    }
    setState(next);
  };

  const isLastFrom = (r: number, c: number) =>
    Boolean(
      shown.lastMove?.from &&
        shown.lastMove.from.r === r &&
        shown.lastMove.from.c === c,
    );
  const isLastTo = (r: number, c: number) =>
    Boolean(shown.lastMove && shown.lastMove.to.r === r && shown.lastMove.to.c === c);
  const opponentMove = shown.lastMove?.by === "gote";
  const actor = (current: ShogiState): Side =>
    viewing && current.turn === "gote" ? "gote" : "sente";
  const goteHandsOn = viewing && shown.phase === "playing" && shown.turn === "gote";
  const status = viewing && !draft
    ? shown.phase === "playing"
      ? shown.turn === "sente"
        ? "この局面から指せます"
        : "相手の手を指せます"
      : shown.message
    : shown.message;

  const restart = () => {
    const fresh = startGame();
    const quiet = quietPosition(fresh);
    keyRef.current = positionKey(quiet);
    atTipRef.current = true;
    evalBusy.current.clear();
    setDraft(null);
    setLine([{ state: quiet, evaluation: null }]);
    setCursor(0);
    setEvalPending(false);
    setState(fresh);
  };

  const review = free ? (
    <FreeReview
      line={line}
      cursor={cursor}
      pending={evalPending && !line[cursor]?.evaluation}
      hints={studyKey ? { pending: hintsPending, moves: hints ?? [], opponent: shown.turn === "gote" } : null}
      onJump={jump}
      onUndo={undo}
      dock={view === "2d" ? "bottom" : "top"}
    />
  ) : null;

  const header = (
    <header className="flex min-w-0 flex-nowrap items-center justify-between gap-2 overflow-x-auto overflow-y-hidden sm:overflow-x-hidden">
      <div className="shrink-0">
        <p className="hidden text-xs tracking-[0.35em] text-[#d4b896]/65 sm:block">SHOGI</p>
            <h1 className="flex items-baseline gap-2 font-[family-name:var(--font-display)] text-lg tracking-widest sm:gap-3 sm:text-2xl">
              将棋
              <span className="border border-[#d4b896]/35 px-1.5 py-0.5 font-[family-name:var(--font-body)] text-[10px] tracking-[0.16em] text-[#e6cf94] sm:px-2 sm:tracking-[0.2em]">
                {story ? story.label : AI_RANKS[level].label}
              </span>
            </h1>
        <p className="max-w-[11rem] truncate text-[10px] leading-tight text-[#d4b896]/75 sm:hidden">{status}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <p className="hidden max-w-none text-right text-xs text-[#d4b896]/75 sm:block">
          {story && <span className="mb-0.5 block text-[10px] tracking-widest text-[#e6cf94]/80">対 {story.opponent}</span>}
          {status}
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
                "px-2 py-1 text-[11px] tracking-widest transition sm:px-3 sm:text-xs",
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
            className="shrink-0 border border-[#d4b896]/25 px-2 py-1 text-[11px] tracking-widest hover:border-[#d4b896]/50 sm:px-3 sm:text-xs"
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
            "shrink-0 border px-2 py-1 text-[11px] tracking-widest transition sm:px-3 sm:text-xs",
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
          className="shrink-0 border border-[#d4b896]/25 px-2 py-1 text-[11px] tracking-widest hover:border-[#d4b896]/50 sm:px-3 sm:text-xs"
        >
          タイトル
        </button>
      </div>
    </header>
  );

  const modals = (
    <>
      {shown.phase === "promote" && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm border border-[#d4b896]/35 bg-[#1e140c] p-6 text-center shadow-2xl">
            <p className="text-xs tracking-[0.35em] text-[#d4b896]/75">PROMOTE</p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl">成りますか？</h3>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                className="border border-[#d4b896]/55 bg-[#d4b896]/15 px-6 py-3 tracking-[0.3em]"
                onClick={() => play((s) => choosePromote(s, true))}
              >
                成る
              </button>
              <button
                type="button"
                className="border border-[#f0e2c8]/35 px-6 py-3 tracking-[0.3em]"
                onClick={() => play((s) => choosePromote(s, false))}
              >
                不成
              </button>
            </div>
          </div>
        </div>
      )}

      {tableOpen && story && <JunniTable career={story.career} onClose={() => setTableOpen(false)} />}

      {state.phase === "ended" && !viewing && (
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
                    onClick={restart}
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
        className="relative h-dvh overflow-clip bg-[#120c08] text-[#f0e2c8]"
        onPointerDown={() => soundOn && primeAudio()}
      >
        <div className="relative z-10 mx-auto grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] gap-1 px-1.5 py-1.5 sm:gap-2 sm:px-6 sm:py-3">
          {header}
          <div className="relative min-h-0 overflow-hidden rounded-md shadow-[inset_0_0_60px_rgba(0,0,0,0.6)]">
            <Shogi3DBoard
              board={shown.board}
              hands={shown.hands}
              selected={shown.selected}
              selectedDrop={shown.selectedDrop}
              targets={shown.legalTargets}
              lastMove={shown.lastMove}
              canDrop={shown.phase === "playing" && shown.turn === "sente"}
              goteDrop={goteHandsOn}
              across={across}
              onSquareClick={(coord) => play((s) => selectSquare(s, coord, actor(s)))}
              onHandClick={(piece) => play((s) => selectDrop(s, piece, actor(s)))}
            />
          </div>
          {modals}
          {review}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-dvh overflow-hidden bg-[#120c08] text-[#f0e2c8]"
      onPointerDown={() => soundOn && primeAudio()}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#2e1c10_0%,_#120c08_55%,_#070504_100%)]"
      />

      <div className="relative z-10 mx-auto grid h-full min-h-0 w-full max-w-3xl grid-rows-[auto_3.15rem_minmax(0,1fr)_3.15rem] gap-1.5 px-1.5 py-1.5 sm:px-6 [@media(min-height:700px)]:grid-rows-[auto_4.75rem_minmax(0,1fr)_4.75rem] [@media(min-height:700px)]:gap-3 [@media(min-height:700px)]:py-6">
        {header}

        <div className="flex items-stretch gap-2">
          <div className="flex w-11 shrink-0 flex-col items-center justify-center sm:w-16">
            <Portrait person={across} className="h-9 w-8 sm:h-14 sm:w-12" />
            <p className="mt-0.5 max-w-full truncate text-[9px] tracking-widest text-[#d4b896]/75">{across.name}</p>
          </div>
          <div className="min-w-0 flex-1">
            <HandTray
              label="あいての持ち駒"
              hand={shown.hands.gote}
              interactive={goteHandsOn}
              selected={shown.selectedDrop}
              onSelect={(piece) => play((s) => selectDrop(s, piece, actor(s)))}
            />
          </div>
        </div>

        <div className="flex min-h-0 items-center justify-center [container-type:size]">
          <div className="shogi-table w-[min(100cqw,calc(100cqh-0.85rem),540px)] p-1.5 [@media(min-height:700px)]:w-[min(100cqw,calc(100cqh-2rem),540px)] [@media(min-height:700px)]:p-4">
            <div className="shogi-board relative aspect-square w-full overflow-hidden">
              <BoardStars />
              <div className="relative z-[2] grid h-full w-full grid-cols-9 grid-rows-9">
                {shown.board.map((row, r) =>
                  row.map((piece, c) => {
                    const selected =
                      shown.selected?.r === r && shown.selected?.c === c;
                    const legal = shown.legalTargets.some(
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
                        onClick={() => play((s) => selectSquare(s, { r, c }, actor(s)))}
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
          hand={shown.hands.sente}
          interactive={shown.phase === "playing" && shown.turn === "sente"}
          selected={shown.selectedDrop}
          onSelect={(piece) => play((s) => selectDrop(s, piece, actor(s)))}
        />

        {modals}
        {review}
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
