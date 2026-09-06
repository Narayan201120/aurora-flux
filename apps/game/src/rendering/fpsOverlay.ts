export interface FpsOverlayModel {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  quality: string;
  renderer: string;
  speed: number;
  driftCharge: number;
  boostActive: boolean;
  boostCooldown: number;
  drafting: number;
  lap: number;
  totalLaps: number;
  wrongWay: boolean;
}

const formatNumber = (value: number, digits = 0): string => {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(digits);
};

const fpsClass = (fps: number): string => {
  if (fps >= 55) return "value";
  if (fps >= 30) return "value warn";
  return "value bad";
};

const bar = (fill: number, segments = 12): string => {
  const f = Math.max(0, Math.min(1, fill));
  const filled = Math.round(f * segments);
  return "█".repeat(filled) + "·".repeat(segments - filled);
};

export class FpsOverlay {
  constructor(private readonly root: HTMLElement) {}

  render(model: FpsOverlayModel): void {
    const boostLabel = model.boostActive
      ? "ACTIVE"
      : model.boostCooldown > 0
        ? `CD ${model.boostCooldown.toFixed(1)}s`
        : model.driftCharge >= 0.4
          ? "READY"
          : "—";

    const boostColor = model.boostActive
      ? "#b6f2c8"
      : model.boostCooldown > 0
        ? "#ffd28a"
        : model.driftCharge >= 0.4
          ? "#9affe0"
          : "#7a8aa0";

    this.root.innerHTML = [
      '<div class="row"><span class="label">FPS</span>',
      `<span class="${fpsClass(model.fps)}">${formatNumber(model.fps, 1)}</span></div>`,
      '<div class="row"><span class="label">Frame</span>',
      `<span class="value">${formatNumber(model.frameMs, 2)} ms</span></div>`,
      '<div class="row"><span class="label">Draws</span>',
      `<span class="value">${formatNumber(model.drawCalls)}</span></div>`,
      '<div class="row"><span class="label">Tris</span>',
      `<span class="value">${formatNumber(model.triangles)}</span></div>`,
      '<div class="row"><span class="label">Quality</span>',
      `<span class="value">${model.quality}</span></div>`,
      '<div class="row"><span class="label">GPU</span>',
      `<span class="value">${model.renderer}</span></div>`,
      '<div class="row"><span class="label">Speed</span>',
      `<span class="value">${formatNumber(model.speed, 1)} m/s</span></div>`,
      '<div class="row"><span class="label">Lap</span>',
      `<span class="value">${model.lap}/${model.totalLaps}</span></div>`,
      '<div class="row"><span class="label">Route</span>',
      `<span class="value" style="color:${model.wrongWay ? "#ff8a8a" : "#b6f2c8"}">${model.wrongWay ? "WRONG WAY" : "CLEAR"}</span></div>`,
      '<div class="row"><span class="label">Drift</span>',
      `<span class="value">${bar(model.driftCharge)} ${formatNumber(model.driftCharge, 2)}</span></div>`,
      '<div class="row"><span class="label">Boost</span>',
      `<span class="value" style="color:${boostColor}">${boostLabel}</span></div>`,
      '<div class="row"><span class="label">Draft</span>',
      `<span class="value">${formatNumber(model.drafting, 2)}</span></div>`,
    ].join("");
  }

  hide(): void {
    this.root.style.display = "none";
  }
}
