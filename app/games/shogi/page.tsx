import type { Metadata } from "next";
import { ShogiApp } from "./components/ShogiApp";

export const metadata: Metadata = {
  title: "将棋｜ボードゲーム集",
  description: "CPU対戦の将棋",
};

export default function ShogiPage() {
  return <ShogiApp />;
}
