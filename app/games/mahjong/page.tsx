import type { Metadata } from "next";
import { MahjongApp } from "./components/MahjongApp";

export const metadata: Metadata = {
  title: "麻雀｜ボードゲーム集",
  description: "立体卓でCPU三人と打つ東風戦の麻雀",
};

export default function MahjongPage() {
  return <MahjongApp />;
}
