import type { Metadata } from "next";
import { HanafudaApp } from "./components/HanafudaApp";

export const metadata: Metadata = {
  title: "花札｜ボードゲーム集",
  description: "こいこいの花札対戦",
};

export default function HanafudaPage() {
  return <HanafudaApp />;
}
