export type QualityTier = "low" | "medium" | "high";

export interface QualityConfig {
  pixelRatioCap: number;
  shadowMapSize: number;
  antialias: boolean;
  postProcessing: boolean;
}

export interface AppConfig {
  quality: QualityConfig;
  cameraFov: number;
  cameraNear: number;
  cameraFar: number;
  startingTier: QualityTier;
}

export const DEFAULT_CONFIG: AppConfig = {
  cameraFov: 60,
  cameraNear: 0.1,
  cameraFar: 2000,
  startingTier: "high",
  quality: {
    pixelRatioCap: 2,
    shadowMapSize: 1024,
    antialias: true,
    postProcessing: false,
  },
};

const TIER_PRESETS: Record<QualityTier, QualityConfig> = {
  low: {
    pixelRatioCap: 1,
    shadowMapSize: 512,
    antialias: false,
    postProcessing: false,
  },
  medium: {
    pixelRatioCap: 1.5,
    shadowMapSize: 1024,
    antialias: true,
    postProcessing: false,
  },
  high: {
    pixelRatioCap: 2,
    shadowMapSize: 2048,
    antialias: true,
    postProcessing: false,
  },
};

export function presetForTier(tier: QualityTier): QualityConfig {
  return TIER_PRESETS[tier];
}
