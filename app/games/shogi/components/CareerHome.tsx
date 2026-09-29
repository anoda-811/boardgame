"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  currentEvent,
  danName,
  dismissCeremony,
  junniStandings,
  placeName,
  playerTitle,
  seasonMonths,
  titlesOf,
  chooseStory,
  type Career,
  type CareerEvent,
} from "@/lib/shogi/career";
import { Portrait } from "./Portrait";

const KIND_MARK: Record<CareerEvent["kind"], string> = {
  practice: "練",
  exam: "試",
  teacher: "師",
  shorei: "奨",
  shoreiExam: "試",
  proExam: "四",
  festival: "町",
  danExam: "段",
  amateurTitle: "名",
  junni: "順",
  ryuo: "竜",
  promotion: "昇",
  meijin: "名",
  ryuoTitle: "竜",
};

export function CareerHome({
  career,
  onPlay,
  onChange,
  onExit,
  onReset,
}: {
  career: Career;
  onPlay: () => void;
  onChange: (career: Career) => void;
  onExit: () => void;
  onReset: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const event = currentEvent(career);
  const titles = titlesOf(career);
  const last = [...career.events].reverse().find((e) => e.result);
  const term = career.month >= 4 ? career.year : career.year - 1;
  const pro = career.path === "pro";

  return (
    <div className="relative h-dvh overflow-y-auto bg-[#120c08] text-[#f0e2c8]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#3a2414_0%,_#120c08_55%,_#070504_100%)]"
      />
      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#d4b896]/65">STORY</p>
            <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-widest">
              {career.year}年{career.month}月
            </h1>
            <p className="mt-1 text-xs tracking-widest text-[#d4b896]/70">
              {career.age}歳　{playerTitle(career)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs tabular-nums text-[#d4b896]/70">
              {career.wins}勝 {career.losses}敗
            </p>
            <button
              type="button"
              onClick={onExit}
              className="border border-[#d4b896]/25 px-3 py-1 text-xs tracking-widest hover:border-[#d4b896]/50"
            >
              タイトル
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {pro ? (
            <>
              <Stat label="段位" value={danName(career.dan)} />
              <Stat label="順位戦" value={career.meijin ? "名人" : placeName(career)} />
              <Stat label="竜王戦" value={career.ryuo ? "竜王" : `${career.ryuoGroup}組`} />
              <Stat label="タイトル" value={titles.length > 0 ? titles.join("・") : "まだない"} />
            </>
          ) : (
            <>
              <Stat label="いま" value={playerTitle(career)} />
              <Stat label="年齢" value={`${career.age}歳`} />
              <Stat label="所属" value={placeName(career)} />
              <Stat label="道" value={career.path === "shoreikai" ? "奨励会" : career.path === "amateur" ? "アマ" : "教室"} />
            </>
          )}
        </div>

        <div>
          <p className="mb-2 text-[10px] tracking-[0.35em] text-[#d4b896]/65">暦</p>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {seasonMonths().map((month) => {
              const matches = career.events.filter((e) => e.month === month && e.term === term);
              const current = event?.month === month && event.term === term && matches.some((m) => m === event);
              const done = matches.length > 0 && matches.every((m) => m.result);
              return (
                <div
                  key={month}
                  className={[
                    "flex flex-col items-center rounded-sm border px-1 py-1.5 text-center",
                    current
                      ? "border-[#e6cf94]/80 bg-[#d4b896]/20"
                      : done
                        ? "border-[#d4b896]/15 bg-black/20"
                        : "border-[#d4b896]/10 bg-black/10",
                  ].join(" ")}
                >
                  <span className="text-[10px] text-[#d4b896]/70">{month}月</span>
                  <span className="mt-0.5 text-[10px] tracking-wider">
                    {matches.length === 0
                      ? "·"
                      : matches
                          .map((m) => (m.result === "win" ? "勝" : m.result === "loss" ? "敗" : KIND_MARK[m.kind]))
                          .join("")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setTableOpen(true)}
            className="border border-[#d4b896]/40 px-4 py-1.5 text-xs tracking-[0.25em] hover:border-[#d4b896]/70"
          >
            {pro ? "順位表を見る" : "席次を見る"}
          </button>
        </div>

        {career.ceremony ? (
          <section className="border border-[#d4b896]/35 bg-[#1e140c]/80 p-5">
            <p className="text-[10px] tracking-[0.35em] text-[#d4b896]/70">暦がめくれた</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed">
              {career.ceremony.map((line, index) => (
                <li key={`${index}-${line}`}>{line}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onChange(dismissCeremony(career))}
              className="mt-5 border border-[#d4b896]/55 bg-[#d4b896]/15 px-6 py-2.5 tracking-[0.3em]"
            >
              わかった
            </button>
          </section>
        ) : career.pending && career.pending.length > 0 ? (
          <section className="border border-[#d4b896]/30 bg-[#1e140c]/70 p-4 sm:p-6">
            <p className="text-[10px] tracking-[0.35em] text-[#d4b896]/70">次にすること</p>
            <div className="mt-4 flex flex-col gap-2">
              {career.pending.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onChange(chooseStory(career, choice.id))}
                  className="border border-[#d4b896]/30 px-4 py-3 text-left transition hover:border-[#d4b896]/70 hover:bg-[#d4b896]/10"
                >
                  <span className="block font-[family-name:var(--font-display)] text-lg tracking-widest">{choice.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#d4b896]/75">{choice.detail}</span>
                </button>
              ))}
            </div>
          </section>
        ) : event ? (
          <section className="flex flex-1 flex-col justify-center border border-[#d4b896]/30 bg-[#1e140c]/70 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
            <Portrait person={event.opponent} className="mx-auto h-40 w-32 shrink-0 sm:h-52 sm:w-40" />
            <div className="mt-4 flex-1 text-center sm:mt-0 sm:text-left">
              <p className="text-[10px] tracking-[0.35em] text-[#d4b896]/70">
                {event.month}月　{event.label}
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-widest">
                {event.opponent.name}
              </h2>
              <p className="mt-2 text-sm text-[#d4b896]/80">
                {event.opponent.era}　{event.opponent.age}歳　{event.opponent.rankLabel}
              </p>
              <p className="mt-1 text-sm text-[#f0e2c8]/80">「{event.opponent.trait}」</p>
              {last && (
                <p className="mt-3 text-xs text-[#d4b896]/60">
                  前回は{last.label}で{last.result === "win" ? "勝ち" : "負け"}。
                </p>
              )}
              <button
                type="button"
                onClick={onPlay}
                className="mt-5 border border-[#d4b896]/55 bg-[#d4b896]/15 px-8 py-3 font-[family-name:var(--font-display)] text-lg tracking-[0.35em] transition hover:bg-[#d4b896]/25"
              >
                対局する
              </button>
            </div>
          </section>
        ) : null}

        {career.history.length > 0 && !career.ceremony && (
          <section className="border border-[#d4b896]/15 bg-black/20 px-4 py-3">
            <p className="text-[10px] tracking-[0.35em] text-[#d4b896]/55">これまでのこと</p>
            <ul className="mt-2 flex flex-col gap-1 text-xs leading-relaxed text-[#d4b896]/80">
              {career.history.slice(0, 6).map((line, index) => (
                <li key={`${index}-${line}`}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="pb-2 text-center">
          {confirmReset ? (
            <span className="text-xs text-[#d4b896]/70">
              成績を消しますか
              <button type="button" className="ml-3 underline" onClick={onReset}>
                消す
              </button>
              <button type="button" className="ml-3 underline" onClick={() => setConfirmReset(false)}>
                やめる
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="text-xs tracking-widest text-[#d4b896]/40 hover:text-[#f0e2c8]"
            >
              最初からやり直す
            </button>
          )}
        </div>
      </div>
      {tableOpen && <JunniTable career={career} onClose={() => setTableOpen(false)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#d4b896]/20 bg-black/25 px-3 py-2">
      <p className="text-[10px] tracking-[0.25em] text-[#d4b896]/55">{label}</p>
      <p className="mt-0.5 font-[family-name:var(--font-display)] text-base leading-snug tracking-widest">{value}</p>
    </div>
  );
}

export function JunniTable({ career, onClose }: { career: Career; onClose: () => void }) {
  const table = junniStandings(career);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-full w-full max-w-md overflow-y-auto border border-[#d4b896]/40 bg-[#1a120c] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="順位表"
      >
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.35em] text-[#d4b896]/65">STANDINGS</p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-widest">{table.title}</h2>
          </div>
          {!table.resting && (
            <p className="text-right font-[family-name:var(--font-display)] text-xl tracking-widest text-[#f3e3b8]">
              {table.place}位
            </p>
          )}
        </div>
        {table.resting ? (
          <p className="mt-4 text-sm leading-relaxed text-[#d4b896]/80">{table.note}</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-[10px] tracking-[0.2em] text-[#d4b896]/55">
                <th className="pb-2 text-left font-normal">順位</th>
                <th className="pb-2 text-left font-normal">棋士</th>
                <th className="pb-2 text-right font-normal">勝敗</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr
                  key={row.name}
                  className={row.you ? "bg-[#d4b896]/15 text-[#f3e3b8]" : "text-[#f0e2c8]/85"}
                >
                  <td className="px-1 py-1.5 tabular-nums">{row.rank}</td>
                  <td className="px-1 py-1.5">
                    {row.name}
                    <span className="ml-2 text-[10px] text-[#d4b896]/55">{row.dan}</span>
                    {row.zone === "up" && (
                      <span className="ml-2 text-[10px] text-[#8fe0a8]">{career.junni === 4 ? "挑戦" : "昇級圏"}</span>
                    )}
                    {row.zone === "down" && <span className="ml-2 text-[10px] text-[#ffb0a0]">降級圏</span>}
                  </td>
                  <td className="px-1 py-1.5 text-right tabular-nums">
                    {row.wins}勝{row.losses}敗
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!table.resting && <p className="mt-4 text-xs leading-relaxed text-[#d4b896]/70">{table.note}</p>}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 border border-[#d4b896]/40 px-5 py-2 text-xs tracking-[0.25em]"
        >
          閉じる
        </button>
      </div>
    </div>,
    document.body,
  );
}
