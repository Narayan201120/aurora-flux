export interface FpsSample {
  fps: number;
  frameMs: number;
  frames: number;
  elapsedMs: number;
}

export class FpsMeter {
  private frames = 0;
  private elapsedMs = 0;
  private lastSampleAt = 0;
  private lastFps = 0;
  private lastFrameMs = 0;

  constructor(private readonly windowMs = 500) {}

  update(deltaMs: number): FpsSample | null {
    this.frames += 1;
    this.elapsedMs += deltaMs;
    this.lastFrameMs = deltaMs;

    if (this.elapsedMs - this.lastSampleAt >= this.windowMs) {
      const fps = (this.frames * 1000) / this.elapsedMs;
      this.lastFps = fps;
      this.lastSampleAt = this.elapsedMs;
      this.frames = 0;
      this.elapsedMs = 0;

      return {
        fps: this.lastFps,
        frameMs: this.lastFrameMs,
        frames: this.frames,
        elapsedMs: this.elapsedMs,
      };
    }

    return null;
  }

  get current(): { fps: number; frameMs: number } {
    return { fps: this.lastFps, frameMs: this.lastFrameMs };
  }
}
