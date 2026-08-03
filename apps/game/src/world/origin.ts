import { Group, Vector3 } from "three";

export interface WorldRebaseOptions {
  chunkSize: number;
}

export class WorldRebase {
  private readonly chunkSize: number;
  private readonly worldRoot: Group;
  private readonly origin: Vector3 = new Vector3();
  private readonly worldPosition: Vector3 = new Vector3();

  constructor(options: WorldRebaseOptions) {
    this.chunkSize = Math.max(1, options.chunkSize);
    this.worldRoot = new Group();
    this.worldRoot.name = "WorldRoot";
  }

  get root(): Group {
    return this.worldRoot;
  }

  get currentOrigin(): Vector3 {
    return this.origin.clone();
  }

  get currentWorldPosition(): Vector3 {
    return this.worldPosition.clone();
  }

  update(playerPosition: Vector3): Vector3 {
    this.worldPosition.copy(playerPosition);

    const snappedX = Math.round(playerPosition.x / this.chunkSize) * this.chunkSize;
    const snappedZ = Math.round(playerPosition.z / this.chunkSize) * this.chunkSize;
    const snappedY = Math.round(playerPosition.y / this.chunkSize) * this.chunkSize;

    this.origin.set(snappedX, snappedY, snappedZ);
    this.worldRoot.position.set(-snappedX, -snappedY, -snappedZ);
    return this.origin;
  }
}
