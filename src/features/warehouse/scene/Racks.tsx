"use client";

import { memo } from "react";
import { AISLES, LEVELS, POSITIONS } from "@/core/inventory/warehouse";
import { LabelSprite } from "./LabelSprite";
import { aisleZ, BASE_HEIGHT, BAY_WIDTH, LEVEL_HEIGHT, RACK_DEPTH, RACK_HEIGHT, RACK_LENGTH, SCENE_COLORS } from "./layout";

function Box({ p, s, c }: { p: [number, number, number]; s: [number, number, number]; c: string }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.75} />
    </mesh>
  );
}

/** One pallet rack: uprights at every bay boundary, orange beams and decks at each level. */
function Rack({ z }: { z: number }) {
  const uprightXs = Array.from({ length: POSITIONS + 1 }, (_, i) => (i - POSITIONS / 2) * BAY_WIDTH);
  return (
    <group position={[0, 0, z]}>
      {uprightXs.flatMap((x) =>
        [-RACK_DEPTH / 2, RACK_DEPTH / 2].map((dz) => <Box key={`${x}:${dz}`} p={[x, RACK_HEIGHT / 2, dz]} s={[0.07, RACK_HEIGHT, 0.07]} c={SCENE_COLORS.upright} />),
      )}
      {Array.from({ length: LEVELS }, (_, level) => {
        const y = BASE_HEIGHT + level * LEVEL_HEIGHT;
        return (
          <group key={level}>
            <Box p={[0, y, -RACK_DEPTH / 2]} s={[RACK_LENGTH + 0.07, 0.08, 0.06]} c={SCENE_COLORS.beam} />
            <Box p={[0, y, RACK_DEPTH / 2]} s={[RACK_LENGTH + 0.07, 0.08, 0.06]} c={SCENE_COLORS.beam} />
            <Box p={[0, y - 0.02, 0]} s={[RACK_LENGTH, 0.03, RACK_DEPTH - 0.06]} c={SCENE_COLORS.deck} />
          </group>
        );
      })}
    </group>
  );
}

export const Racks = memo(function Racks() {
  return (
    <group>
      {/* Floor slab with aisle lane markings */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[RACK_LENGTH + 4, 0.12, 11]} />
        <meshStandardMaterial color={SCENE_COLORS.floor} roughness={0.95} />
      </mesh>
      {[-1.55, 1.55].map((z) => (
        <mesh key={z} position={[0, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[RACK_LENGTH + 2.6, 0.05]} />
          <meshBasicMaterial color={SCENE_COLORS.laneMark} />
        </mesh>
      ))}
      {AISLES.map((aisle) => (
        <group key={aisle}>
          <Rack z={aisleZ(aisle)} />
          <LabelSprite text={`Rua ${aisle}`} position={[-RACK_LENGTH / 2 - 0.85, 0.32, aisleZ(aisle)]} />
        </group>
      ))}
    </group>
  );
});
