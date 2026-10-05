"use client";

import { Edges } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { forwardRef, memo, useRef } from "react";
import { Color, type Group, type Mesh, type MeshBasicMaterial } from "three";
import { listBins, type BinAddress } from "@/core/inventory/warehouse";
import { BAY_WIDTH, binOrigin, LEVEL_HEIGHT, RACK_DEPTH, SCENE_COLORS } from "./layout";

export interface BinHover {
  binId: string;
  valid: boolean;
  label: string;
}

interface BinSlotsProps {
  hover: BinHover | null;
  selectedBinId: string | null;
  flash: { binId: string; at: number } | null;
  armed: boolean;
  onBinClick: (binId: string) => void;
  onBinPointer: (binId: string | null) => void;
}

const SLOT_SIZE: [number, number, number] = [BAY_WIDTH - 0.1, LEVEL_HEIGHT - 0.14, RACK_DEPTH - 0.08];
const tmp = new Color();

interface SlotProps {
  bin: BinAddress;
  hover: BinHover | null;
  selected: boolean;
  flashAt: number | null;
  armed: boolean;
  onBinClick: (binId: string) => void;
  onBinPointer: (binId: string | null) => void;
}

/**
 * Invisible hit volume per bin. It doubles as the drop-target highlight:
 * blue while hovered, green/red while dragging depending on validity,
 * and a red shake-flash after a rejected drop.
 */
function Slot({ bin, hover, selected, flashAt, armed, onBinClick, onBinPointer }: SlotProps) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const [x, y, z] = binOrigin(bin);
  const hovered = hover?.binId === bin.id;

  useFrame(({ clock }) => {
    if (!material.current || !mesh.current) return;
    const since = flashAt ? performance.now() - flashAt : Infinity;
    if (since < 700) {
      // Rejected drop: red flash with a lateral shake.
      const decay = 1 - since / 700;
      material.current.color.set(SCENE_COLORS.invalid);
      material.current.opacity = 0.45 * decay;
      mesh.current.position.x = x + Math.sin(since / 22) * 0.06 * decay;
      return;
    }
    mesh.current.position.x = x;
    if (hovered) {
      const pulse = 0.22 + Math.sin(clock.elapsedTime * 7) * 0.06;
      material.current.color.copy(tmp.set(hover.valid ? SCENE_COLORS.valid : SCENE_COLORS.invalid));
      material.current.opacity = pulse;
    } else if (armed) {
      material.current.color.set(SCENE_COLORS.hover);
      material.current.opacity = 0.05 + (Math.sin(clock.elapsedTime * 3 + bin.position) + 1) * 0.025;
    } else {
      material.current.opacity = 0;
    }
  });

  return (
    <mesh
      ref={mesh}
      position={[x, y + SLOT_SIZE[1] / 2, z]}
      userData={{ binId: bin.id }}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onBinClick(bin.id);
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onBinPointer(bin.id);
      }}
      onPointerOut={() => onBinPointer(null)}
    >
      <boxGeometry args={SLOT_SIZE} />
      <meshBasicMaterial ref={material} transparent opacity={0} depthWrite={false} color={SCENE_COLORS.hover} />
      {selected ? <Edges color={SCENE_COLORS.selected} lineWidth={2.5} /> : null}
    </mesh>
  );
}

export const BinSlots = memo(
  forwardRef<Group, BinSlotsProps>(function BinSlots({ hover, selectedBinId, flash, armed, onBinClick, onBinPointer }, ref) {
    return (
      <group ref={ref}>
        {listBins().map((bin) => (
          <Slot
            key={bin.id}
            bin={bin}
            hover={hover}
            selected={selectedBinId === bin.id}
            flashAt={flash?.binId === bin.id ? flash.at : null}
            armed={armed}
            onBinClick={onBinClick}
            onBinPointer={onBinPointer}
          />
        ))}
      </group>
    );
  }),
);
