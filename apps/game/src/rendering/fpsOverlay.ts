export interface FpsOverlayModel {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  quality: string;
  renderer: string;
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

export class FpsOverlay {
  constructor(private readonly root: HTMLElement) {}

  render(model: FpsOverlayModel): void {
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
    ].join("");
  }

  hide(): void {
    this.root.style.display = "none";
  }
}
