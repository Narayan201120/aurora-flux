export interface LoopCallbacks {
  onUpdate: (deltaSeconds: number) => void;
  onRender: (alphaSeconds: number) => void;
}

export class GameLoop {
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private running = false;
  private accumulator = 0;
  private readonly fixedStepSeconds = 1 / 60;

  constructor(private readonly callbacks: LoopCallbacks) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.running = false;
  }

  get isRunning(): boolean {
    return this.running;
  }

  private tick = (timestamp: number): void => {
    if (!this.running) return;

    const deltaMs = Math.min(timestamp - this.lastTimestamp, 250);
    this.lastTimestamp = timestamp;
    const deltaSeconds = deltaMs / 1000;

    this.accumulator += deltaSeconds;
    while (this.accumulator >= this.fixedStepSeconds) {
      this.callbacks.onUpdate(this.fixedStepSeconds);
      this.accumulator -= this.fixedStepSeconds;
    }

    const alpha = this.accumulator / this.fixedStepSeconds;
    this.callbacks.onRender(alpha);

    this.rafId = requestAnimationFrame(this.tick);
  };
}
