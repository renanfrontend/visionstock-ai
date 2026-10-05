"use client";

import { OrbitControls, useCursor } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, type ComponentRef, type MutableRefObject } from "react";
import { Raycaster, Vector2, type Group } from "three";
import type { Product } from "@/core/catalog/product";
import { BinSlots, type BinHover } from "./BinSlots";
import { SCENE_COLORS } from "./layout";
import { Racks } from "./Racks";
import { StockBoxes } from "./StockBoxes";

/** Maps a screen point (e.g. an HTML5 drop) to the bin under it, or null. */
export type BinPicker = (clientX: number, clientY: number) => string | null;

function DropPicker({ binsRef, pickerRef }: { binsRef: MutableRefObject<Group | null>; pickerRef: MutableRefObject<BinPicker | null> }) {
  const { camera, gl } = useThree();
  useEffect(() => {
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    pickerRef.current = (clientX, clientY) => {
      const bins = binsRef.current;
      if (!bins) return null;
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(bins.children, false).find((h) => typeof h.object.userData.binId === "string");
      return (hit?.object.userData.binId as string | undefined) ?? null;
    };
    return () => {
      pickerRef.current = null;
    };
  }, [camera, gl, binsRef, pickerRef]);
  return null;
}

function Controls({ resetSignal }: { resetSignal: number }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  useEffect(() => {
    if (resetSignal > 0) controls.current?.reset();
  }, [resetSignal]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[0, 1, 0]}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={7}
      maxDistance={24}
      minPolarAngle={0.35}
      maxPolarAngle={1.3}
    />
  );
}

function CursorFeedback({ active }: { active: boolean }) {
  useCursor(active);
  return null;
}

export interface WarehouseSceneProps {
  products: readonly Product[];
  heat: boolean;
  selectedId: string | null;
  selectedBinId: string | null;
  armed: boolean;
  hover: BinHover | null;
  pointerBinId: string | null;
  flash: { binId: string; at: number } | null;
  resetSignal: number;
  reducedMotion: boolean;
  pickerRef: MutableRefObject<BinPicker | null>;
  onBinClick: (binId: string) => void;
  onBinPointer: (binId: string | null) => void;
}

export function WarehouseScene(props: WarehouseSceneProps) {
  const binsRef = useRef<Group>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  // Narrow (portrait) viewports need the camera further back to fit all three aisles.
  const [cameraPosition] = useState<[number, number, number]>(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? [11.5, 10.5, 14] : [7.8, 7.2, 9.6],
  );

  // Pause rendering while the scene is scrolled out of view.
  useEffect(() => {
    const node = wrapper.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? true));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapper} className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: cameraPosition, fov: 36 }}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        fallback={
          <div className="grid size-full place-items-center p-6 text-center text-sm text-[#526d8e]">
            Seu navegador não abriu a cena 3D. Use a lista de endereços no painel do produto para endereçar.
          </div>
        }
        aria-label="Maquete 3D do armazém"
      >
        <color attach="background" args={[SCENE_COLORS.background]} />
        <fog attach="fog" args={[SCENE_COLORS.background, 22, 38]} />
        <hemisphereLight args={["#ffffff", "#c7d3e3", 1.4]} />
        <directionalLight
          position={[6, 11, 7]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-9}
          shadow-camera-right={9}
          shadow-camera-top={9}
          shadow-camera-bottom={-9}
          shadow-bias={-0.0004}
        />
        <Racks />
        <StockBoxes
          products={props.products}
          heat={props.heat}
          selectedId={props.selectedId}
          hoveredBinId={props.pointerBinId}
          reducedMotion={props.reducedMotion}
        />
        <BinSlots
          ref={binsRef}
          hover={props.hover}
          selectedBinId={props.selectedBinId}
          flash={props.flash}
          armed={props.armed}
          onBinClick={props.onBinClick}
          onBinPointer={props.onBinPointer}
        />
        <DropPicker binsRef={binsRef} pickerRef={props.pickerRef} />
        <CursorFeedback active={props.pointerBinId !== null} />
        <Controls resetSignal={props.resetSignal} />
      </Canvas>
    </div>
  );
}
