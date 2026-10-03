"use client";

import { useEffect, useRef, useState } from "react";
import { domainSeat, EDO_ID, HANS, hanShapes, isOpen } from "@/lib/hanafuda/domains";
import type { HanafudaStory } from "@/lib/hanafuda/story";
import { DebtLine, MoneyActions } from "./MoneyActions";

const MAP_W = 640;
const MAP_H = 780;

function fittedBase(frame: { w: number; h: number }) {
  const aspect = frame.w / Math.max(1, frame.h);
  if (aspect >= MAP_W / MAP_H) {
    const h = MAP_H;
    const w = h * aspect;
    return { x: (MAP_W - w) / 2, y: 0, w, h };
  }
  const w = MAP_W;
  const h = w / aspect;
  return { x: 0, y: (MAP_H - h) / 2, w, h };
}

function fittedView(frame: { w: number; h: number }, view: { x: number; y: number; scale: number }) {
  const base = fittedBase(frame);
  const scale = Math.min(7, Math.max(1, view.scale));
  const w = base.w / scale;
  const h = base.h / scale;
  const x = Math.min(base.x + base.w - w, Math.max(base.x, view.x));
  const y = Math.min(base.y + base.h - h, Math.max(base.y, view.y));
  return { x, y, w, h };
}

export function JapanMap({
  story,
  onEdo,
  onTown,
  onBorrow,
  onRepay,
  onReset,
  onExit,
}: {
  story: HanafudaStory;
  onEdo: () => void;
  onTown: (prefId: number) => void;
  onBorrow: () => void;
  onRepay: () => void;
  onReset: () => void;
  onExit: () => void;
}) {
  const [hot, setHot] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [frame, setFrame] = useState({ w: MAP_W, h: MAP_H });
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef(frame);
  const viewRef = useRef(view);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; units: number; captured: boolean } | null>(null);
  const moved = useRef(false);
  frameRef.current = frame;
  viewRef.current = view;
  const box = fittedView(frame, view);
  const shownId = hot ?? pinned;
  const shown = HANS.find((han) => han.id === shownId) ?? null;
  const hotHan = HANS.find((han) => han.id === hot) ?? null;
  const open = shown ? isOpen(story.conquered, shown.id) : false;
  const conquered = shown ? story.conquered.includes(shown.id) : false;
  const seat = shown ? domainSeat(shown.id) : null;
  const edoWon = story.conquered.includes(EDO_ID);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setFrame((prev) =>
        Math.abs(prev.w - rect.width) < 1 && Math.abs(prev.h - rect.height) < 1 ? prev : { w: rect.width, h: rect.height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = mapRef.current;
    const svg = svgRef.current;
    if (!el || !svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const cursor = point.matrixTransform(matrix.inverse());
      const current = viewRef.current;
      const currentBox = fittedView(frameRef.current, current);
      const nextScale = Math.min(7, Math.max(1, current.scale * (event.deltaY < 0 ? 1.14 : 1 / 1.14)));
      if (nextScale === current.scale) return;
      if (nextScale === 1) {
        setView({ x: 0, y: 0, scale: 1 });
        return;
      }
      const next = fittedView(frameRef.current, { x: 0, y: 0, scale: nextScale });
      const ratio = next.w / currentBox.w;
      setView({
        x: cursor.x - (cursor.x - currentBox.x) * ratio,
        y: cursor.y - (cursor.y - currentBox.y) * ratio,
        scale: nextScale,
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#10241a] text-[#f3e7c8]">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#d4c08a]/15 px-3 py-2 sm:px-5">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.35em] text-[#d4c08a]/70">JAPAN</p>
          <h1 className="truncate font-[family-name:var(--font-display)] text-xl tracking-[0.2em] sm:text-2xl">日本</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <p className="text-right text-[11px] leading-tight tracking-widest text-[#e6c887]">
            所持 {story.purse}文
            <span className="mt-0.5 block text-[10px] text-[#d8e0d0]/55">制覇 {story.conquered.length}/{HANS.length}</span>
            <DebtLine story={story} />
          </p>
          <button
            type="button"
            onClick={onExit}
            className="border border-[#d8e0d0]/25 px-2 py-1 text-[11px] tracking-widest hover:border-[#d4c08a]/50 sm:px-3"
          >
            タイトル
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_18rem] sm:grid-rows-1">
        <div
          ref={mapRef}
          className={`relative min-h-0 overflow-hidden bg-[#14343c] ${view.scale > 1 ? "cursor-grab" : ""}`}
          onMouseLeave={() => setHot(null)}
          onPointerDown={(event) => {
            moved.current = false;
            if (view.scale <= 1) {
              drag.current = null;
              return;
            }
            if (event.target instanceof Element && event.target.closest("button")) return;
            const rect = svgRef.current?.getBoundingClientRect();
            const units = rect && rect.width > 0 ? box.w / rect.width : 1;
            drag.current = { x: event.clientX, y: event.clientY, ox: box.x, oy: box.y, units, captured: false };
          }}
          onPointerMove={(event) => {
            const current = drag.current;
            if (!current || view.scale <= 1) return;
            const dx = event.clientX - current.x;
            const dy = event.clientY - current.y;
            if (Math.hypot(dx, dy) > 5) moved.current = true;
            if (!moved.current) return;
            if (!current.captured) {
              current.captured = true;
              event.currentTarget.setPointerCapture(event.pointerId);
            }
            setView((value) => ({ ...value, x: current.ox - dx * current.units, y: current.oy - dy * current.units }));
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          {view.scale !== 1 && (
            <button
              type="button"
              onClick={() => setView({ x: 0, y: 0, scale: 1 })}
              className="absolute right-2 top-2 z-10 border border-[#d4c08a]/40 bg-[#10241a]/80 px-2 py-1 text-[10px] tracking-widest"
            >
              全体
            </button>
          )}
          <svg
            ref={svgRef}
            className="absolute inset-0 h-full w-full"
            viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="han-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="1.6" floodColor="#f6ecd2" floodOpacity="0.95" />
              </filter>
            </defs>
            <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="#14343c" />
            <rect x="24" y="668" width="150" height="96" fill="#10241a" stroke="#d4c08a" strokeOpacity="0.35" />
            <text x="32" y="686" fill="#d4c08a" fontSize="11" opacity="0.7">
              琉球
            </text>
            {HANS.map((han) => {
              const parts = hanShapes(han.id);
              const canEnter = isOpen(story.conquered, han.id);
              const held = story.conquered.includes(han.id);
              const fill = held ? "#3d6a52" : canEnter ? "#24503c" : "#1c332b";
              const stroke = held ? "#e6c887" : "#cbb98a";
              return (
                <g key={han.id}>
                  {parts.map((part, index) => (
                    <path
                      key={part.id}
                      d={part.d}
                      role={index === 0 ? "button" : undefined}
                      aria-label={index === 0 ? han.name : undefined}
                      aria-disabled={!canEnter}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={1.8}
                      strokeLinejoin="round"
                      style={{ cursor: canEnter ? "pointer" : "default" }}
                      onMouseEnter={() => setHot(han.id)}
                      onClick={() => {
                        if (moved.current) return;
                        setHot(han.id);
                        setPinned(han.id);
                        if (canEnter && han.id === EDO_ID) onEdo();
                      }}
                    />
                  ))}
                  {parts.map((part) => (
                    <path key={`cover-${part.id}`} d={part.d} fill={fill} stroke="none" pointerEvents="none" />
                  ))}
                </g>
              );
            })}
            {hotHan && (
              <g pointerEvents="none">
                {hanShapes(hotHan.id).map((part) => (
                  <path
                    key={`glow-${part.id}`}
                    d={part.d}
                    fill="none"
                    stroke="#f6ecd2"
                    strokeWidth={2.8}
                    strokeLinejoin="round"
                    filter="url(#han-glow)"
                  />
                ))}
                {hanShapes(hotHan.id).map((part) => (
                  <path
                    key={`glow-cover-${part.id}`}
                    d={part.d}
                    fill={
                      story.conquered.includes(hotHan.id)
                        ? "#3d6a52"
                        : isOpen(story.conquered, hotHan.id)
                          ? "#24503c"
                          : "#1c332b"
                    }
                    stroke="none"
                  />
                ))}
              </g>
            )}
          </svg>
        </div>

        <aside className="max-h-[42%] overflow-y-auto border-t border-[#d4c08a]/15 bg-[#10241a] px-4 py-3 sm:max-h-none sm:border-l sm:border-t-0">
          {shown && seat ? (
            <>
              <p className="text-[10px] tracking-[0.28em] text-[#d4c08a]/70">
                {conquered ? "制覇" : "花札師"}
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-[0.16em]">
                {shown.name}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#d8e0d0]/75">{seat.place}</p>
              <p className="mt-3 text-sm leading-relaxed">
                <span className="text-[#e6c887]">{seat.opponent}</span>
                <span className="mt-1 block text-[#d8e0d0]/75">{seat.boss}</span>
              </p>
              {open && shown.id === EDO_ID && (
                <>
                  <p className="mt-3 text-[11px] leading-relaxed text-[#d8e0d0]/50">
                    {edoWon ? "札場は、まだ開いている。" : "吉蔵に勝てば、隣の藩が開く。"}
                  </p>
                  <button
                    type="button"
                    onClick={onEdo}
                    className="mt-4 w-full border border-[#d4c08a]/60 bg-[#d4c08a]/15 py-2.5 tracking-[0.3em] hover:bg-[#d4c08a]/25"
                  >
                    入る
                  </button>
                </>
              )}
              {open && shown.id !== EDO_ID && (
                <>
                  <p className="mt-4 text-[11px] leading-relaxed text-[#d8e0d0]/55">城下に入って、建物の奥で対局する。</p>
                  <button
                    type="button"
                    onClick={() => onTown(shown.id)}
                    className="mt-3 w-full border border-[#d4c08a]/60 bg-[#d4c08a]/15 py-2.5 tracking-[0.3em] hover:bg-[#d4c08a]/25"
                  >
                    城下へ
                  </button>
                </>
              )}
            </>
          ) : (
            <p className="text-sm leading-relaxed text-[#d8e0d0]/55">藩にカーソルを合わせる。</p>
          )}
          <MoneyActions story={story} onBorrow={onBorrow} onRepay={onRepay} />
          {story.log[0] && <p className="mt-4 text-[11px] leading-relaxed text-[#d8e0d0]/45">{story.log[0].text}</p>}
          <div className="mt-4">
            {confirmReset ? (
              <div className="flex gap-2">
                <button type="button" onClick={onReset} className="border border-[#d4c08a]/40 px-2 py-1 text-[10px] tracking-widest">
                  所持を捨てる
                </button>
                <button type="button" onClick={() => setConfirmReset(false)} className="px-2 py-1 text-[10px] tracking-widest text-[#d8e0d0]/55">
                  やめる
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmReset(true)} className="text-[10px] tracking-widest text-[#d8e0d0]/35 hover:text-[#d8e0d0]/70">
                初めから
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
