"use client";

import { LOAN, LOAN_OWED, MAX_DEBT, type HanafudaStory } from "@/lib/hanafuda/story";

export function DebtLine({ story }: { story: HanafudaStory }) {
  const debt = story.debt ?? 0;
  if (debt <= 0) return null;
  return <span className="mt-0.5 block text-[10px] tracking-widest text-[#e7b4a4]">借金 {debt}文</span>;
}

export function MoneyActions({
  story,
  onOddJob,
  onBorrow,
  onRepay,
}: {
  story: HanafudaStory;
  onOddJob?: () => void;
  onBorrow: () => void;
  onRepay: () => void;
}) {
  const debt = story.debt ?? 0;
  const broke = story.purse <= 0;
  return (
    <>
      {onOddJob && story.purse < 5 && (
        <button
          type="button"
          onClick={onOddJob}
          className="mt-3 w-full border border-[#d8e0d0]/25 py-2 text-xs tracking-widest hover:border-[#d4c08a]/50"
        >
          縁側の手伝い　+8文
        </button>
      )}
      {broke && debt < MAX_DEBT && (
        <>
          <button
            type="button"
            onClick={onBorrow}
            className="mt-3 w-full border border-[#e7b4a4]/50 bg-[#e7b4a4]/10 py-2 text-xs tracking-widest hover:bg-[#e7b4a4]/20"
          >
            借金する　+{LOAN}文
          </button>
          <p className="mt-1 text-[10px] leading-relaxed text-[#d8e0d0]/45">金貸しの利子で、返す額は{LOAN_OWED}文増える。勝った文から先に返る。</p>
        </>
      )}
      {broke && debt >= MAX_DEBT && <p className="mt-3 text-[11px] leading-relaxed text-[#e7b4a4]/80">金貸しは、もう貸さない。</p>}
      {debt > 0 && story.purse > 0 && (
        <button
          type="button"
          onClick={onRepay}
          className="mt-3 w-full border border-[#e7b4a4]/40 py-2 text-xs tracking-widest hover:border-[#e7b4a4]/70"
        >
          借金を返す
        </button>
      )}
    </>
  );
}
