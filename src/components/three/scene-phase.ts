export type ScenePhase = "idle" | "processing" | "success" | "error";

export interface PhaseTarget {
  /** Angular velocity of the core, in rad/s. */
  speed: number;
  /** Emissive intensity of the inner core and point light multiplier. */
  glow: number;
  color: string;
  /** Uniform scale of the core group. */
  scale: number;
}

export const PHASE_TARGETS: Readonly<Record<ScenePhase, PhaseTarget>> = {
  idle: { speed: 0.28, glow: 0.9, color: "#6ee7f9", scale: 1 },
  processing: { speed: 3.2, glow: 4.2, color: "#8b7cf6", scale: 1.08 },
  success: { speed: 0.45, glow: 1.8, color: "#6ee7f9", scale: 1.02 },
  error: { speed: 0.12, glow: 1.1, color: "#fb7185", scale: 0.96 },
};
