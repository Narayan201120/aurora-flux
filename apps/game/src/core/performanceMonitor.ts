export interface PerformanceSnapshot {
  cpuMs: number;
  renderMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

interface RendererInfoSnapshot {
  render: { calls: number; triangles: number };
  memory: { geometries: number; textures: number };
}

/** Smooths runtime telemetry without allocating during the frame loop. */
export class PerformanceMonitor {
  private cpuMs = 0;
  private renderMs = 0;
  private drawCalls = 0;
  private triangles = 0;
  private geometries = 0;
  private textures = 0;

  recordCpu(elapsedMs: number): void {
    this.cpuMs = smooth(this.cpuMs, elapsedMs);
  }

  recordRender(elapsedMs: number, info: RendererInfoSnapshot): void {
    this.renderMs = smooth(this.renderMs, elapsedMs);
    this.drawCalls = info.render.calls;
    this.triangles = info.render.triangles;
    this.geometries = info.memory.geometries;
    this.textures = info.memory.textures;
  }

  snapshot(): PerformanceSnapshot {
    return {
      cpuMs: this.cpuMs,
      renderMs: this.renderMs,
      drawCalls: this.drawCalls,
      triangles: this.triangles,
      geometries: this.geometries,
      textures: this.textures,
    };
  }
}

function smooth(previous: number, next: number): number {
  return previous === 0 ? next : previous * 0.88 + next * 0.12;
}
