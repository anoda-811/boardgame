import type { Metadata } from "next";
import { ChessApp } from "./components/ChessApp";

export const metadata: Metadata = {
  title: "チェス｜ボードゲーム集",
  description: "CPU対戦のチェス",
};

export default function ChessPage() {
  return <ChessApp />;
}
