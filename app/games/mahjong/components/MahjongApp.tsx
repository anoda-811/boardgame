"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import {
  HUMAN,
  PLAYER_NAMES,
  answerCall,
  autoRiichiDiscard,
  canTsumo,
  cpuAct,
  createTitleState,
  declareTsumo,
  discardTile,
  doraIndicators,
  drawTile,
  nextRound,
  ranking,
  riichiDiscards,
  roundLabel,
  seatWind,
  windName,
  type CallOption,
  type MahjongState,
  type Meld,
  startGame,
} from "@/lib/mahjong/game";
import { sortTiles, type Tile } from "@/lib/mahjong/tiles";
import { tileFaceUrl } from "./tileFaces";
import { playTileSound, primeTileAudio } from "./tileSound";

const Mahjong3D = dynamic(() => import("./Mahjong3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs tracking-[0.3em] text-[#c9a860]/60">
      卓を準備中…
    </div>
  ),
});

const subscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

function TileImage({ tile, size = 34, sideways = false }: { tile: Pick<Tile, "kind" | "red">; size?: number; sideways?: boolean }) {
  const client = useIsClient();
  const w = size;
  const h = Math.round(size * 1.375);
  return (
    <span
      className="inline-block shrink-0 overflow-hidden rounded-[3px] border-b-[3px] border-[#2b62b0] bg-[#f4efe2] shadow-[0_2px_4px_rgba(0,0,0,0.45)]"
      style={{
        width: w,
        height: h,
        transform: sideways ? "rotate(90deg)" : undefined,
        margin: sideways ? `0 ${(h - w) / 2}px` : undefined,
      }}
    >
      {client && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tileFaceUrl(tile.kind, tile.red)} alt="" className="h-full w-full" draggable={false} />
      )}
    </span>
  );
}

function MeldImages({ meld, size }: { meld: Meld; size: number }) {
  return (
    <span className="inline-flex items-end gap-px">
      {meld.tiles.map((t) => (
        <TileImage key={t.id} tile={t} size={size} sideways={t.id === meld.calledId} />
      ))}
    </span>
  );
}

/* ---------- title ---------- */

function TitleScreen({ onStart }: { onStart: () => void }) {
  const preview = [27, 31, 32, 33, 4, 13, 22];
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#07100b] text-[#efe6d2]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1c4a30_0%,_#0b1a12_55%,_#040806_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(ellipse_at_top,_rgba(255,214,140,0.14),transparent_60%)]"
      />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="animate-fade-up mb-6 text-xs tracking-[0.45em] text-[#c9a860]/75">MAHJONG</p>
        <h1 className="animate-fade-up animate-title-glow font-[family-name:var(--font-display)] text-7xl tracking-[0.3em] sm:text-8xl">
          麻雀
        </h1>
        <p className="animate-fade-up mt-5 max-w-sm text-sm leading-relaxed tracking-wide text-[#c9a860]/70 sm:text-base">
          緑の卓に、牌の音。
          <br />
          CPU三人を相手に東風戦で打ちます。
        </p>
        <div className="animate-fade-up mt-10 flex gap-1.5" style={{ animationDelay: "150ms" }}>
          {preview.map((kind, i) => (
            <span
              key={kind}
              className="animate-drift"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              <TileImage tile={{ kind, red: kind === 4 }} size={40} />
            </span>
          ))}
        </div>
        <div className="animate-fade-up mt-12 flex flex-col items-center gap-4" style={{ animationDelay: "250ms" }}>
          <button
            type="button"
            onClick={onStart}
            className="min-w-48 border border-[#c9a860]/55 bg-[#c9a860]/12 px-8 py-3 font-[family-name:var(--font-display)] text-lg tracking-[0.35em] transition hover:bg-[#c9a860]/22"
          >
            はじめる
          </button>
          <p className="text-xs leading-relaxed tracking-widest text-[#c9a860]/45">
            立体卓・赤ドラあり・喰いタンあり・カンなし
          </p>
        </div>
      </div>
      <footer className="relative z-10 pb-8 text-center">
        <Link href="/" className="text-sm tracking-widest text-[#c9a860]/50 transition hover:text-[#efe6d2]">
          ← ボードゲーム集にもどる
        </Link>
      </footer>
    </div>
  );
}

/* ---------- action bar ---------- */

function ActionButton({
  children,
  onClick,
  tone = "gold",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "gold" | "red" | "plain";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "animate-fade-up flex items-center gap-1.5 border px-3 py-1.5 font-[family-name:var(--font-display)] text-base tracking-[0.2em] shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm transition sm:gap-2 sm:px-5 sm:py-2.5 sm:text-lg sm:tracking-[0.25em]",
        tone === "red"
          ? "border-[#ff9a7a]/70 bg-[#b3261e]/80 text-white hover:bg-[#c9352b]"
          : tone === "gold"
            ? "border-[#e6cf94]/70 bg-[#8a6a28]/80 text-[#fff6dc] hover:bg-[#a07d33]"
            : "border-[#efe6d2]/35 bg-black/55 text-[#efe6d2] hover:bg-black/70",
      ].join(" ")}
      style={{ animationDuration: "0.25s" }}
    >
      {children}
    </button>
  );
}

/* ---------- result modals ---------- */

function Delta({ value }: { value: number }) {
  if (value === 0) return <span className="text-[#c9a860]/50">±0</span>;
  return (
    <span className={value > 0 ? "text-[#8fe0a8]" : "text-[#ff9a8a]"}>
      {value > 0 ? "+" : ""}
      {value.toLocaleString()}
    </span>
  );
}

function ScoreTable({ state, deltas }: { state: MahjongState; deltas: number[] }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-2 text-left text-sm">
      {state.players.map((p, seat) => (
        <div key={seat} className="flex items-center justify-between border border-[#c9a860]/15 bg-black/25 px-3 py-2">
          <span className="text-[#c9a860]/80">
            {windName(seatWind(state, seat))}　{PLAYER_NAMES[seat]}
          </span>
          <span className="text-right tabular-nums">
            {p.score.toLocaleString()}
            <span className="ml-2 text-xs">
              <Delta value={deltas[seat]} />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function RoundResultModal({ state, onNext }: { state: MahjongState; onNext: () => void }) {
  const r = state.result!;
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 p-4">
      <div
        className="animate-fade-up max-h-full w-full max-w-2xl overflow-y-auto border border-[#c9a860]/40 bg-[#0d1712]/95 p-6 text-center shadow-2xl"
        style={{ animationDelay: "1.1s" }}
      >
        {r.kind === "ryuukyoku" ? (
          <>
            <p className="text-xs tracking-[0.35em] text-[#c9a860]/75">DRAW</p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-[0.3em]">流局</h3>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
              {r.tenpai.map((t, seat) => (
                <span
                  key={seat}
                  className={[
                    "border px-3 py-1",
                    t ? "border-[#8fe0a8]/50 text-[#bff0cc]" : "border-[#efe6d2]/15 text-[#efe6d2]/50",
                  ].join(" ")}
                >
                  {PLAYER_NAMES[seat]}　{t ? "聴牌" : "不聴"}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-xs tracking-[0.35em] text-[#c9a860]/75">{r.kind === "tsumo" ? "TSUMO" : "RON"}</p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-[0.2em]">
              {PLAYER_NAMES[r.winner]}の{r.kind === "tsumo" ? "ツモ" : "ロン"}
            </h3>
            {r.loser !== null && (
              <p className="mt-1 text-sm text-[#c9a860]/70">放銃：{PLAYER_NAMES[r.loser]}</p>
            )}
            <div className="mt-5 flex flex-wrap items-end justify-center gap-3">
              <span className="inline-flex gap-px">
                {sortTiles(r.hand.filter((t) => t.id !== r.winTile.id)).map((t) => (
                  <TileImage key={t.id} tile={t} size={30} />
                ))}
              </span>
              <span className="rounded-sm ring-2 ring-[#ffd36a]">
                <TileImage tile={r.winTile} size={30} />
              </span>
              {r.melds.map((m, i) => (
                <MeldImages key={i} meld={m} size={26} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-[#c9a860]/75">
              <span className="flex items-center gap-1.5">
                ドラ表示
                {doraIndicators(state).map((t) => (
                  <TileImage key={t.id} tile={t} size={22} />
                ))}
              </span>
              {r.uraIndicators.length > 0 && (
                <span className="flex items-center gap-1.5">
                  裏ドラ表示
                  {r.uraIndicators.map((k) => (
                    <TileImage key={k} tile={{ kind: k, red: false }} size={22} />
                  ))}
                </span>
              )}
            </div>
            <ul className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-x-6 gap-y-1 text-left text-sm">
              {r.score.yaku.map((y) => (
                <li key={y.name} className="flex justify-between border-b border-[#c9a860]/10 py-1">
                  <span>{y.name}</span>
                  <span className="text-[#c9a860]/80">{r.score.yakuman ? "役満" : `${y.han}翻`}</span>
                </li>
              ))}
              {r.score.dora > 0 && (
                <li className="flex justify-between border-b border-[#c9a860]/10 py-1">
                  <span>ドラ</span>
                  <span className="text-[#c9a860]/80">{r.score.dora}翻</span>
                </li>
              )}
            </ul>
            <p className="mt-4 font-[family-name:var(--font-display)] text-2xl tracking-widest text-[#f3e3b8]">
              {r.score.yakuman
                ? r.score.label
                : `${r.score.fu}符 ${r.score.han}翻${r.score.label ? `　${r.score.label}` : ""}`}
              <span className="ml-3">{r.deltas[r.winner].toLocaleString()}点</span>
            </p>
          </>
        )}
        <ScoreTable state={state} deltas={r.deltas} />
        <button
          type="button"
          onClick={onNext}
          className="mt-6 border border-[#c9a860]/55 bg-[#c9a860]/15 px-8 py-3 tracking-[0.3em] transition hover:bg-[#c9a860]/25"
        >
          次へ
        </button>
      </div>
    </div>
  );
}

function GameEndModal({ state, onRestart, onExit }: { state: MahjongState; onRestart: () => void; onExit: () => void }) {
  const order = ranking(state);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
      <div className="animate-fade-up w-full max-w-md border border-[#c9a860]/40 bg-[#0d1712]/95 p-6 text-center shadow-2xl">
        <p className="text-xs tracking-[0.35em] text-[#c9a860]/75">FINAL</p>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-[0.2em]">
          {order[0] === HUMAN ? "トップ！" : `${order.indexOf(HUMAN) + 1}位`}
        </h3>
        <ol className="mt-6 flex flex-col gap-2 text-left">
          {order.map((seat, i) => (
            <li
              key={seat}
              className={[
                "flex items-center justify-between border px-4 py-2.5",
                seat === HUMAN ? "border-[#e6cf94]/60 bg-[#c9a860]/15" : "border-[#c9a860]/15 bg-black/25",
              ].join(" ")}
            >
              <span className="font-[family-name:var(--font-display)] text-lg tracking-widest">
                {i + 1}位　{PLAYER_NAMES[seat]}
              </span>
              <span className="tabular-nums">{state.players[seat].score.toLocaleString()}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="border border-[#c9a860]/55 bg-[#c9a860]/15 px-6 py-3 tracking-[0.3em]"
            onClick={onRestart}
          >
            もう一局
          </button>
          <button type="button" className="border border-[#efe6d2]/35 px-6 py-3 tracking-[0.3em]" onClick={onExit}>
            タイトルへ
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- game ---------- */

function GameScreen({
  state,
  setState,
  onExit,
}: {
  state: MahjongState;
  setState: React.Dispatch<React.SetStateAction<MahjongState>>;
  onExit: () => void;
}) {
  const [, startTransition] = useTransition();
  const [soundOn, setSoundOn] = useState(true);
  const [riichiTick, setRiichiTick] = useState<number | null>(null);
  const riichiMode = riichiTick === state.tick;

  const soundRef = useRef(soundOn);
  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    const a = state.lastAction;
    if (!a || !soundRef.current) return;
    if (a.type === "draw") {
      if (a.seat === HUMAN) playTileSound("draw", 150);
    } else if (a.type === "discard") playTileSound("discard", 180);
    else if (a.type === "riichi") playTileSound("riichi", 180);
    else if (a.type === "pon" || a.type === "chi") playTileSound("call", 120);
    else if (a.type === "win") playTileSound("win", 200);
    // Each tick is one action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tick]);

  const { phase, turn } = state;
  const human = state.players[HUMAN];
  const humanRiichi = human.riichi;

  // Drive the table: draws, CPU turns and riichi auto-discards.
  useEffect(() => {
    let delay: number | null = null;
    let step: ((s: MahjongState) => MahjongState) | null = null;
    if (phase === "draw") {
      delay = turn === HUMAN ? 250 : 380;
      step = drawTile;
    } else if (phase === "discard" && turn !== HUMAN) {
      delay = 720;
      step = (s) => cpuAct(s);
    } else if (phase === "discard" && humanRiichi) {
      delay = 650;
      step = autoRiichiDiscard;
    }
    if (delay === null || !step) return;
    const run = step;
    const timer = window.setTimeout(() => startTransition(() => setState((s) => run(s))), delay);
    return () => window.clearTimeout(timer);
  }, [phase, turn, humanRiichi, state.tick, setState]);

  const myTurn = phase === "discard" && turn === HUMAN;
  const tsumo = useMemo(() => (myTurn ? canTsumo(state) : null), [myTurn, state]);
  const riichiOk = useMemo(() => (myTurn ? riichiDiscards(state) : new Set<number>()), [myTurn, state]);

  const selectable = useMemo(() => {
    if (!myTurn) return new Set<number>();
    if (humanRiichi) return tsumo && state.drawnId !== null ? new Set([state.drawnId]) : new Set<number>();
    if (riichiMode) return riichiOk;
    return new Set(human.hand.map((t) => t.id));
  }, [myTurn, humanRiichi, tsumo, state.drawnId, riichiMode, riichiOk, human.hand]);

  const revealed = useMemo(() => {
    const r = state.result;
    if (phase !== "roundEnd" || !r) return [];
    if (r.kind === "ryuukyoku") return r.tenpai.flatMap((t, i) => (t ? [i] : []));
    return [r.winner];
  }, [phase, state.result]);

  const onTileClick = (id: number) => {
    const riichi = riichiMode;
    setRiichiTick(null);
    setState((s) => discardTile(s, id, riichi));
  };

  const answer = (choice: CallOption | "pass") => setState((s) => answerCall(s, choice));

  const dora = doraIndicators(state);

  return (
    <div
      className="relative h-dvh overflow-clip bg-[#07100b] text-[#efe6d2]"
      onPointerDown={() => soundOn && primeTileAudio()}
    >
      <div className="absolute inset-0">
        <Mahjong3D state={state} selectable={selectable} revealed={revealed} onTileClick={onTileClick} />
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 overflow-x-auto bg-gradient-to-b from-black/70 to-transparent px-2 pt-2 pb-5 sm:items-start sm:gap-3 sm:px-4 sm:pt-3 sm:pb-8">
        <div className="pointer-events-auto shrink-0">
          <p className="hidden text-xs tracking-[0.35em] text-[#c9a860]/65 sm:block">MAHJONG</p>
          <h1 className="flex items-baseline gap-2 font-[family-name:var(--font-display)] text-lg tracking-widest sm:gap-3 sm:text-2xl">
            麻雀
            <span className="border border-[#c9a860]/35 px-1.5 py-0.5 font-[family-name:var(--font-body)] text-[10px] tracking-[0.16em] text-[#e6cf94] sm:px-2 sm:tracking-[0.2em]">
              {roundLabel(state)} {state.honba}本場
            </span>
          </h1>
        </div>
        <div className="pointer-events-auto flex shrink-0 flex-nowrap items-center justify-end gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1 border border-[#c9a860]/25 bg-black/40 px-1.5 py-0.5 text-[10px] tracking-widest text-[#c9a860]/80 sm:gap-2 sm:px-2 sm:py-1">
            <span className="hidden sm:inline">ドラ表示</span>
            {dora.map((t) => (
              <TileImage key={t.id} tile={t} size={20} />
            ))}
          </div>
          <button
            type="button"
            aria-pressed={soundOn}
            onClick={() => {
              if (!soundOn) {
                primeTileAudio();
                playTileSound("discard");
              }
              setSoundOn((v) => !v);
            }}
            className={[
              "border bg-black/40 px-2 py-1 text-[11px] tracking-widest transition sm:px-3 sm:text-xs",
              soundOn ? "border-[#c9a860]/35" : "border-[#c9a860]/15 text-[#c9a860]/45",
            ].join(" ")}
          >
            {soundOn ? "音 あり" : "音 なし"}
          </button>
          <button
            type="button"
            onClick={onExit}
            className="border border-[#c9a860]/35 bg-black/40 px-2 py-1 text-[11px] tracking-widest sm:px-3 sm:text-xs"
          >
            タイトル
          </button>
        </div>
      </header>

      <div className="pointer-events-none absolute inset-x-0 top-[2.7rem] z-10 flex justify-center px-2 sm:top-[5.5rem]">
        <p
          key={state.message}
          className="animate-fade-up max-w-full border border-[#c9a860]/25 bg-black/55 px-2 py-1 text-xs tracking-widest text-[#f3e3b8] backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-sm"
          style={{ animationDuration: "0.3s" }}
        >
          {riichiMode ? "リーチ宣言牌を選んでください" : state.message}
        </p>
      </div>

      <div className="absolute inset-x-0 top-[4.6rem] z-20 flex flex-wrap justify-center gap-1.5 px-2 sm:top-auto sm:bottom-[27%] sm:gap-3 sm:px-4">
        {myTurn && tsumo && <ActionButton tone="red" onClick={() => setState(declareTsumo)}>ツモ</ActionButton>}
        {myTurn && tsumo && humanRiichi && (
          <ActionButton tone="plain" onClick={() => setState((s) => discardTile(s, s.drawnId!))}>
            見送る
          </ActionButton>
        )}
        {myTurn && !humanRiichi && riichiOk.size > 0 && !riichiMode && (
          <ActionButton onClick={() => setRiichiTick(state.tick)}>リーチ</ActionButton>
        )}
        {riichiMode && (
          <ActionButton tone="plain" onClick={() => setRiichiTick(null)}>
            やめる
          </ActionButton>
        )}
        {phase === "call" && (
          <>
            {state.callOptions.map((o, i) => (
              <ActionButton key={i} tone={o.type === "ron" ? "red" : "gold"} onClick={() => answer(o)}>
                {o.type === "ron" ? "ロン" : o.type === "pon" ? "ポン" : "チー"}
                {o.type === "chi" && (
                  <span className="inline-flex gap-px">
                    {sortTiles([...o.tiles, state.lastDiscard!.tile]).map((t) => (
                      <TileImage key={t.id} tile={t} size={18} />
                    ))}
                  </span>
                )}
              </ActionButton>
            ))}
            <ActionButton tone="plain" onClick={() => answer("pass")}>
              スキップ
            </ActionButton>
          </>
        )}
      </div>

      {phase === "roundEnd" && state.result && (
        <RoundResultModal state={state} onNext={() => setState((s) => nextRound(s))} />
      )}
      {phase === "gameEnd" && (
        <GameEndModal state={state} onRestart={() => setState(() => startGame())} onExit={onExit} />
      )}
    </div>
  );
}

export function MahjongApp() {
  const [state, setState] = useState<MahjongState>(() => createTitleState());

  if (state.phase === "title") {
    return (
      <TitleScreen
        onStart={() => {
          primeTileAudio();
          setState(startGame());
        }}
      />
    );
  }
  return <GameScreen state={state} setState={setState} onExit={() => setState(createTitleState())} />;
}
