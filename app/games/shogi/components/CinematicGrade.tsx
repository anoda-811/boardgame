"use client";

import { EffectComposer, SMAA, SSAO } from "@react-three/postprocessing";

/** Contact shading only. Depth of field and bloom stay off so every piece stays sharp. */
export function CinematicGrade() {
  return (
    <EffectComposer multisampling={0} enableNormalPass>
      <SMAA />
      <SSAO intensity={1.05} radius={0.07} bias={0.035} luminanceInfluence={0.5} samples={16} rings={4} />
    </EffectComposer>
  );
}
