"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { TownWorld } from "./TownWorld";

export type BuildingKind = "nagaya" | "tea" | "boat" | "fire" | "shop" | "shrine" | "market" | "gate" | "mansion" | "bridge" | "dojo" | "tavern";

export type TownPin = {
  id: string;
  label: string;
  kind: BuildingKind;
  x: number;
  y: number;
  done?: boolean;
  dim?: boolean;
};

export function TownScene({
  kicker,
  title,
  pins,
  scenery,
  selectedId,
  playIntro,
  onIntroDone,
  onSelect,
}: {
  kicker: string;
  title: string;
  pins: TownPin[];
  scenery: "river" | "bridge" | "castle";
  selectedId: string | null;
  playIntro: boolean;
  onIntroDone: () => void;
  onSelect: (id: string) => void;
}) {
  const [intro, setIntro] = useState(playIntro);

  useEffect(() => {
    if (!playIntro) return;
    setIntro(true);
    const timer = window.setTimeout(() => {
      setIntro(false);
      onIntroDone();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [playIntro, title]);

  return (
    <div className="relative min-h-0 overflow-hidden bg-[#10241a]">
      <div className={["absolute inset-0 transition-opacity duration-700", intro ? "opacity-0" : "opacity-100"].join(" ")}>
        <Canvas
          className="h-full w-full"
          shadows
          camera={{ position: [2.2, 4.3, 7.4], fov: 46, near: 0.1, far: 50 }}
          dpr={[1, 1.6]}
          gl={{ antialias: true, alpha: false }}
        >
          <TownWorld
            pins={pins}
            scenery={scenery}
            selectedId={selectedId}
            reveal={!intro}
            title={title}
            onSelect={onSelect}
          />
        </Canvas>
      </div>
      <div
        className={[
          "absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#10241a] transition-opacity duration-700",
          intro ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <p className="text-xs tracking-[0.55em] text-[#d4c08a]" style={{ animation: "town-title-in 0.6s ease both" }}>
          {kicker}
        </p>
        <h2
          className="mt-3 font-[family-name:var(--font-display)] text-5xl tracking-[0.28em] sm:text-6xl"
          style={{ animation: "town-title-in 0.7s 0.12s ease both" }}
        >
          {title}
        </h2>
      </div>
    </div>
  );
}
