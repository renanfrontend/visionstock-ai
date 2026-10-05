"use client";

import { Environment, Float, Lightformer, Sparkles } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { VisionCore } from "./VisionCore";
import { PHASE_TARGETS, type ScenePhase } from "./scene-phase";

interface VisionSceneProps {
  phase: ScenePhase;
  reducedMotion: boolean;
}

function usePointerRef() {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return pointer;
}

/** Stops the render loop while the stage is scrolled out of view. */
function useInViewport<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? true));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

export function VisionScene({ phase, reducedMotion }: VisionSceneProps) {
  const pointer = usePointerRef();
  const { ref, visible } = useInViewport<HTMLDivElement>();
  const accent = PHASE_TARGETS[phase].color;

  return (
    <div ref={ref} className="absolute inset-0" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 6.2], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={visible ? "always" : "never"}
        fallback={<div className="size-full" />}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 5]} intensity={0.8} />

        <Float speed={reducedMotion ? 0 : 1.3} rotationIntensity={0.2} floatIntensity={0.7}>
          <VisionCore phase={phase} reducedMotion={reducedMotion} pointer={pointer} />
        </Float>

        <Sparkles
          count={phase === "processing" ? 90 : 45}
          scale={[7, 4.5, 3]}
          size={phase === "processing" ? 3 : 1.8}
          speed={reducedMotion ? 0 : phase === "processing" ? 1.4 : 0.3}
          color={accent}
          opacity={0.7}
        />

        {/* Studio lightformers instead of an HDR download: crisp reflections, zero network cost. */}
        <Environment resolution={128}>
          <Lightformer form="rect" intensity={2.4} color="#6ee7f9" position={[0, 3, -3]} scale={[8, 1.2, 1]} />
          <Lightformer form="rect" intensity={1.6} color="#8b7cf6" position={[-4, -1, 1]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
          <Lightformer form="ring" intensity={1.2} color="#ffffff" position={[3, 1, 3]} scale={2} />
        </Environment>
      </Canvas>
    </div>
  );
}

export default VisionScene;
