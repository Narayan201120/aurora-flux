import { Vector3 } from "three";

export interface FlowSample {
  direction: Vector3;
  speed: number;
  energy: number;
}

const TAU = Math.PI * 2;

export class FlowField {
  private readonly scale: number;
  private readonly time: { value: number };

  constructor(scale = 0.012) {
    this.scale = scale;
    this.time = { value: 0 };
  }

  setTime(seconds: number): void {
    this.time.value = seconds;
  }

  sample(x: number, y: number, z: number): FlowSample {
    const s = this.scale;
    const t = this.time.value * 0.18;
    const dx = Math.sin(z * s * 1.7 + t * 0.9 + y * s * 0.4) +
               Math.cos(x * s * 0.9 - t * 0.6);
    const dz = Math.cos(x * s * 1.4 - t * 0.7 + y * s * 0.3) +
               Math.sin(z * s * 1.1 + t * 0.5);
    const dy = Math.sin((x + z) * s * 0.6 + t * 0.4) * 0.35;

    const dir = new Vector3(dx, dy, dz);
    const lengthSq = dir.lengthSq();
    if (lengthSq > 1e-6) dir.multiplyScalar(1 / Math.sqrt(lengthSq));

    const energy = 0.5 + 0.5 * Math.sin((x + z) * s * 0.5 + t * 0.3);
    const speed = 0.6 + 0.4 * energy;

    return { direction: dir, speed, energy };
  }

  sampleBatch(
    positions: Float32Array,
    outDirections: Float32Array,
    outEnergy: Float32Array,
    stride = 3,
  ): void {
    for (let i = 0; i < positions.length; i += stride) {
      const sample = this.sample(positions[i]!, positions[i + 1]!, positions[i + 2]!);
      outDirections[i] = sample.direction.x;
      outDirections[i + 1] = sample.direction.y;
      outDirections[i + 2] = sample.direction.z;
      outEnergy[i / stride] = sample.energy;
    }
  }
}

export function angleAroundY(v: Vector3): number {
  return Math.atan2(v.x, v.z) * (180 / Math.PI);
}

export function wrapTau(angle: number): number {
  let a = angle % TAU;
  if (a < 0) a += TAU;
  return a;
}
