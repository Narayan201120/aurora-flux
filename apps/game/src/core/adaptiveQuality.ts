import { WebGLRenderer } from "three";
import { presetForTier, type QualityTier } from "../config/config.js";

const TIER_ORDER: ReadonlyArray<QualityTier> = ["low", "medium", "high"];

export class AdaptiveQuality {
  private slowFrames = 0;
  private fastFrames = 0;

  constructor(
    private readonly renderer: WebGLRenderer,
    private currentTier: QualityTier,
    private readonly onTierChanged: (tier: QualityTier) => void = () => {},
  ) {
    const quality = presetForTier(currentTier);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, quality.pixelRatioCap),
    );
    this.onTierChanged(currentTier);
  }

  get tier(): QualityTier {
    return this.currentTier;
  }

  update(frameMs: number): QualityTier {
    if (frameMs > 24) {
      this.slowFrames += 1;
      this.fastFrames = 0;
    } else if (frameMs < 15) {
      this.fastFrames += 1;
      this.slowFrames = 0;
    } else {
      this.slowFrames = Math.max(0, this.slowFrames - 1);
      this.fastFrames = Math.max(0, this.fastFrames - 1);
    }

    if (this.slowFrames >= 90) {
      this.setTier(stepTier(this.currentTier, -1));
      this.slowFrames = 0;
    } else if (this.fastFrames >= 360) {
      this.setTier(stepTier(this.currentTier, 1));
      this.fastFrames = 0;
    }
    return this.currentTier;
  }

  private setTier(tier: QualityTier): void {
    if (tier === this.currentTier) return;
    this.currentTier = tier;
    const quality = presetForTier(tier);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, quality.pixelRatioCap),
    );
    this.onTierChanged(tier);
  }
}

function stepTier(tier: QualityTier, step: number): QualityTier {
  const index = TIER_ORDER.indexOf(tier);
  const nextIndex = Math.max(0, Math.min(TIER_ORDER.length - 1, index + step));
  return TIER_ORDER[nextIndex]!;
}
