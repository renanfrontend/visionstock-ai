"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import { Color, MathUtils, type Group, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial, type PointLight } from "three";
import { PHASE_TARGETS, type ScenePhase } from "./scene-phase";

interface VisionCoreProps {
  phase: ScenePhase;
  reducedMotion: boolean;
  /** Normalized pointer position (-1..1) shared with the DOM layer. */
  pointer: RefObject<{ x: number; y: number }>;
}

const DAMPING = 3.2;

/**
 * Faceted glass shell + wireframe lattice + emissive core + two orbital rings.
 * Every transition is damped per frame, so phase changes ease in regardless of frame rate.
 */
export function VisionCore({ phase, reducedMotion, pointer }: VisionCoreProps) {
  const tilt = useRef<Group>(null);
  const spin = useRef<Group>(null);
  const ringA = useRef<Mesh>(null);
  const ringB = useRef<Mesh>(null);
  const coreMaterial = useRef<MeshStandardMaterial>(null);
  const latticeMaterial = useRef<MeshBasicMaterial>(null);
  const ringMaterialA = useRef<MeshBasicMaterial>(null);
  const ringMaterialB = useRef<MeshBasicMaterial>(null);
  const light = useRef<PointLight>(null);

  // Mutable animation state lives in refs: it changes every frame and must never trigger a render.
  const liveRef = useRef({
    speed: PHASE_TARGETS.idle.speed,
    glow: PHASE_TARGETS.idle.glow,
    scale: 1,
    color: new Color(PHASE_TARGETS.idle.color),
  });
  const targetColorRef = useRef(new Color());

  useFrame(({ clock }, delta) => {
    const live = liveRef.current;
    const target = PHASE_TARGETS[phase];
    const motion = reducedMotion ? 0.15 : 1;

    live.speed = MathUtils.damp(live.speed, target.speed * motion, DAMPING, delta);
    live.glow = MathUtils.damp(live.glow, target.glow, DAMPING, delta);
    live.scale = MathUtils.damp(live.scale, target.scale, DAMPING, delta);
    live.color.lerp(targetColorRef.current.set(target.color), 1 - Math.exp(-DAMPING * delta));

    const pulse = phase === "processing" && !reducedMotion ? 1 + 0.35 * Math.sin(clock.elapsedTime * 9) : 1;
    const glow = live.glow * pulse;

    if (spin.current) {
      spin.current.rotation.y += delta * live.speed;
      spin.current.rotation.x += delta * live.speed * 0.38;
      spin.current.scale.setScalar(live.scale);
    }
    if (tilt.current && pointer.current) {
      tilt.current.rotation.x = MathUtils.damp(tilt.current.rotation.x, -pointer.current.y * 0.35, 2, delta);
      tilt.current.rotation.y = MathUtils.damp(tilt.current.rotation.y, pointer.current.x * 0.45, 2, delta);
    }
    if (ringA.current) ringA.current.rotation.z += delta * live.speed * 1.4;
    if (ringB.current) ringB.current.rotation.z -= delta * live.speed * 0.9;

    if (coreMaterial.current) {
      coreMaterial.current.emissive.copy(live.color);
      coreMaterial.current.emissiveIntensity = glow;
    }
    if (latticeMaterial.current) {
      latticeMaterial.current.color.copy(live.color);
      latticeMaterial.current.opacity = 0.22 + Math.min(glow, 5) * 0.06;
    }
    for (const material of [ringMaterialA.current, ringMaterialB.current]) {
      if (!material) continue;
      material.color.copy(live.color);
      material.opacity = 0.35 + Math.min(glow, 5) * 0.1;
    }
    if (light.current) {
      light.current.color.copy(live.color);
      light.current.intensity = glow * 7;
    }
  });

  return (
    <group ref={tilt}>
      <group ref={spin}>
        <mesh>
          <icosahedronGeometry args={[1.15, 0]} />
          <meshPhysicalMaterial
            color="#121735"
            metalness={0.15}
            roughness={0.08}
            transmission={0.55}
            thickness={1.2}
            ior={1.6}
            clearcoat={1}
            clearcoatRoughness={0.05}
            flatShading
            transparent
            opacity={0.92}
          />
        </mesh>

        <mesh scale={1.18}>
          <icosahedronGeometry args={[1.15, 1]} />
          <meshBasicMaterial ref={latticeMaterial} wireframe transparent toneMapped={false} />
        </mesh>

        <mesh>
          <octahedronGeometry args={[0.42, 0]} />
          <meshStandardMaterial ref={coreMaterial} color="#05060d" roughness={0.3} toneMapped={false} />
        </mesh>
        <pointLight ref={light} distance={6} decay={2} />
      </group>

      <mesh ref={ringA} rotation={[Math.PI / 2.3, 0.2, 0]}>
        <torusGeometry args={[1.95, 0.008, 8, 160]} />
        <meshBasicMaterial ref={ringMaterialA} transparent toneMapped={false} />
      </mesh>
      <mesh ref={ringB} rotation={[Math.PI / 1.7, -0.5, 0]}>
        <torusGeometry args={[2.3, 0.005, 8, 160]} />
        <meshBasicMaterial ref={ringMaterialB} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}
