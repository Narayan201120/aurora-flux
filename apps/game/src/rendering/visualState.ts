import type { AudioReactiveState } from "../audio/audioSystem.js";
import type { RacerSnapshot } from "../racer/racer.js";
import type { QualityTier } from "../config/config.js";
import type { HazardSnapshot } from "../world/hazards.js";

export interface VisualState {
  time: number;
  progress: number;
  speed01: number;
  drift01: number;
  boost01: number;
  draft01: number;
  impact01: number;
  hazard01: number;
  audioLow: number;
  audioMid: number;
  audioHigh: number;
  audioPulse: number;
  quality: QualityTier;
}

export interface VisualStateInput {
  time: number;
  progress: number;
  racer: RacerSnapshot;
  hazards: HazardSnapshot;
  audio: AudioReactiveState;
  quality: QualityTier;
}

export function createVisualState(): VisualState {
  return {
    time: 0,
    progress: 0,
    speed01: 0,
    drift01: 0,
    boost01: 0,
    draft01: 0,
    impact01: 0,
    hazard01: 0,
    audioLow: 0,
    audioMid: 0,
    audioHigh: 0,
    audioPulse: 0,
    quality: "high",
  };
}

export function updateVisualState(
  state: VisualState,
  input: VisualStateInput,
): void {
  state.time = input.time;
  state.progress = wrap01(input.progress);
  state.speed01 = clamp(Math.abs(input.racer.speed) / 130, 0, 1);
  state.drift01 = input.racer.drifting
    ? clamp(0.45 + input.racer.driftCharge * 0.55, 0, 1)
    : 0;
  state.boost01 = input.racer.boostActive
    ? clamp(input.racer.boostEnergy, 0.25, 1)
    : 0;
  state.draft01 = input.racer.drafting.active
    ? clamp(input.racer.drafting.intensity, 0, 1)
    : 0;
  state.impact01 = input.racer.lastImpact
    ? clamp(input.racer.lastImpact.recoverySeconds / 0.6, 0, 1)
    : 0;
  state.hazard01 = input.hazards.effect.active
    ? 1 - clamp(input.hazards.effect.visibilityMultiplier, 0, 1)
    : 0;
  state.audioLow = clamp(input.audio.low, 0, 1);
  state.audioMid = clamp(input.audio.mid, 0, 1);
  state.audioHigh = clamp(input.audio.high, 0, 1);
  state.audioPulse = clamp(input.audio.pulse, 0, 1);
  state.quality = input.quality;
}

function wrap01(value: number): number {
  return ((value % 1) + 1) % 1;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

