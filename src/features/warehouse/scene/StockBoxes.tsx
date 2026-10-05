"use client";

import { useFrame } from "@react-three/fiber";
import { memo, useRef } from "react";
import { Color, type Group, type MeshStandardMaterial } from "three";
import type { Product } from "@/core/catalog/product";
import { stockStatus } from "@/core/inventory/stock";
import { boxesFor, parseBinId } from "@/core/inventory/warehouse";
import { binOrigin, boxColorFor, HEAT_COLORS, SCENE_COLORS } from "./layout";

const BOX: [number, number, number] = [0.46, 0.34, 0.58];
/** 2×2 stacking pattern inside a bay: bottom row first, then the top row. */
const SLOTS: ReadonlyArray<[number, number]> = [
  [-0.26, 0],
  [0.26, 0],
  [-0.26, 1],
  [0.26, 1],
];

/** Damped spring: drops overshoot slightly and settle, like a box landing on a shelf. */
const STIFFNESS = 140;
const DAMPING = 11;

interface FallingBoxProps {
  offset: [number, number];
  delay: number;
  color: string;
  pulse: boolean;
  selected: boolean;
  reducedMotion: boolean;
}

function FallingBox({ offset, delay, color, pulse, selected, reducedMotion }: FallingBoxProps) {
  const group = useRef<Group>(null);
  const material = useRef<MeshStandardMaterial>(null);
  // `born` is stamped on the first frame (render must stay pure).
  const motion = useRef({ y: reducedMotion ? 0 : 2.6, v: 0, born: -1 });
  const baseColor = useRef(new Color());

  useFrame(({ clock }, delta) => {
    const state = motion.current;
    const dt = Math.min(delta, 1 / 30);
    if (state.born < 0) state.born = clock.elapsedTime;
    if (clock.elapsedTime - state.born > delay) {
      state.v += (-state.y * STIFFNESS - state.v * DAMPING) * dt;
      state.y += state.v * dt;
    }
    if (group.current) group.current.position.y = state.y + (selected ? 0.06 : 0);
    if (material.current) {
      baseColor.current.set(color);
      material.current.color.copy(baseColor.current);
      material.current.emissive.set(pulse ? color : selected ? SCENE_COLORS.selected : "#000000");
      material.current.emissiveIntensity = pulse ? 0.25 + Math.sin(clock.elapsedTime * 5) * 0.2 : selected ? 0.25 : 0;
    }
  });

  const [x, layer] = offset;
  return (
    <group ref={group}>
      <mesh position={[x, BOX[1] / 2 + layer * (BOX[1] + 0.02), 0]} castShadow receiveShadow>
        <boxGeometry args={BOX} />
        <meshStandardMaterial ref={material} color={color} roughness={0.8} />
      </mesh>
      {/* Packing tape strip on top */}
      <mesh position={[x, BOX[1] + layer * (BOX[1] + 0.02) + 0.003, 0]}>
        <boxGeometry args={[0.08, 0.006, BOX[2] + 0.004]} />
        <meshStandardMaterial color={SCENE_COLORS.boxTape} roughness={0.6} />
      </mesh>
    </group>
  );
}

interface ProductStackProps {
  product: Product;
  heat: boolean;
  selected: boolean;
  hovered: boolean;
  reducedMotion: boolean;
}

/** Visual only: clicks land on the bin's hit volume, which owns selection. */
function ProductStack({ product, heat, selected, hovered, reducedMotion }: ProductStackProps) {
  const bin = parseBinId(product.stock.binId ?? "");
  if (!bin) return null;

  const status = stockStatus(product.stock.quantity, product.stock.minimum);
  const color = heat ? HEAT_COLORS[status] : boxColorFor(product.id);
  const count = boxesFor(product.stock.quantity);
  const [x, y, z] = binOrigin(bin);

  return (
    <group position={[x, y, z]}>
      {count === 0 ? (
        // Empty but still addressed: a flat red pallet marks the stock-out.
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[1, 0.06, 0.7]} />
          <meshStandardMaterial color={HEAT_COLORS.out} transparent opacity={0.75} />
        </mesh>
      ) : (
        SLOTS.slice(0, count).map((offset, index) => (
          <FallingBox
            key={index}
            offset={offset}
            delay={index * 0.08}
            color={hovered && !heat ? "#93b4f5" : color}
            pulse={heat && status !== "ok"}
            selected={selected}
            reducedMotion={reducedMotion}
          />
        ))
      )}
    </group>
  );
}

interface StockBoxesProps {
  products: readonly Product[];
  heat: boolean;
  selectedId: string | null;
  hoveredBinId: string | null;
  reducedMotion: boolean;
}

export const StockBoxes = memo(function StockBoxes({ products, heat, selectedId, hoveredBinId, reducedMotion }: StockBoxesProps) {
  return (
    <group>
      {products
        .filter((product) => product.stock.binId)
        .map((product) => (
          // Keyed by address: moving a product to another bin re-mounts it, so the boxes drop in again.
          <ProductStack
            key={`${product.id}@${product.stock.binId}`}
            product={product}
            heat={heat}
            selected={selectedId === product.id}
            hovered={hoveredBinId === product.stock.binId}
            reducedMotion={reducedMotion}
          />
        ))}
    </group>
  );
});
