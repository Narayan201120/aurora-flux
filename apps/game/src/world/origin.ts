import { Vector3 } from "three";

export interface WorldRebaseOptions {
  chunkSize: number;
}

/**
 * Floating-origin helper. Returns the camera translation needed this frame to
 * keep the camera near (0,0,0) when the player crosses a chunk boundary.
 *
 * Usage:
 *   const delta = rebase.update(player.position);
 *   // 1. Apply to camera so the view stays centered near origin.
 *   camera.position.sub(delta);
 *   // 2. Apply to large-distance world content (stars, nebula) so their
 *   //    absolute coords stay bounded and float precision is preserved.
 *   worldRoot.position.sub(delta);
 *
 * The racer is left in absolute world coords (no shifting needed because the
 * camera shift visually cancels the player's chunk crossing).
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
   * @returns translation delta to subtract from the camera and large-distance
   *          world content to keep them near origin.
   */
  update(playerPosition: Vector3): Vector3 {
    this.worldPosition.copy(playerPosition);

    const snappedX = Math.round(playerPosition.x / this.chunkSize) * this.chunkSize;
    const snappedY = Math.round(playerPosition.y / this.chunkSize) * this.chunkSize;
    const snappedZ = Math.round(playerPosition.z / this.chunkSize) * this.chunkSize;

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
