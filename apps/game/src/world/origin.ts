import { Vector3 } from "three";

export interface WorldRebaseOptions {
  chunkSize: number;
}

/**
 * Floating-origin helper. The current origin is snapped to a chunk boundary;
 * callers render world-space objects beneath a root translated by
 * `-currentOrigin`, while gameplay state remains in absolute coordinates.
 *
 */
export class WorldRebase {
  private readonly chunkSize: number;
  private readonly origin: Vector3 = new Vector3();
  private readonly worldPosition: Vector3 = new Vector3();
  private initialised = false;

  constructor(options: WorldRebaseOptions) {
    this.chunkSize = Math.max(1, options.chunkSize);
  }

  get currentOrigin(): Vector3 {
    return this.origin.clone();
  }

  get currentWorldPosition(): Vector3 {
    return this.worldPosition.clone();
  }

  /**
   * @returns translation delta since the previous snapped origin.
   */
  update(playerPosition: Vector3): Vector3 {
    this.worldPosition.copy(playerPosition);

    const snappedX =
      Math.round(playerPosition.x / this.chunkSize) * this.chunkSize;
    const snappedY =
      Math.round(playerPosition.y / this.chunkSize) * this.chunkSize;
    const snappedZ =
      Math.round(playerPosition.z / this.chunkSize) * this.chunkSize;

    if (!this.initialised) {
      this.origin.set(snappedX, snappedY, snappedZ);
      this.initialised = true;
      return new Vector3(0, 0, 0);
    }

    const delta = new Vector3(
      snappedX - this.origin.x,
      snappedY - this.origin.y,
      snappedZ - this.origin.z,
    );
    this.origin.set(snappedX, snappedY, snappedZ);
    return delta;
  }
}
