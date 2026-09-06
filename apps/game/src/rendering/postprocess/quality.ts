export type PostProcessQuality = "low" | "medium" | "high";

export interface PostProcessQualityProfile {
  readonly level: number;
  readonly speedLineDensity: number;
  readonly speedLineOpacity: number;
  readonly speedLineFlow: number;
  readonly chromaticOffset: number;
}

export const POST_PROCESS_QUALITY_PROFILES = {
  low: {
    level: 0,
    speedLineDensity: 8,
    speedLineOpacity: 0.07,
    speedLineFlow: 0.8,
    chromaticOffset: 0.0018,
  },
  medium: {
    level: 0.5,
    speedLineDensity: 13,
    speedLineOpacity: 0.1,
    speedLineFlow: 1,
    chromaticOffset: 0.0032,
  },
  high: {
    level: 1,
    speedLineDensity: 20,
    speedLineOpacity: 0.13,
    speedLineFlow: 1.15,
    chromaticOffset: 0.005,
  },
} satisfies Record<PostProcessQuality, PostProcessQualityProfile>;

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
