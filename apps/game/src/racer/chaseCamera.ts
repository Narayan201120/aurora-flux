import { PerspectiveCamera, Vector3 } from "three";

export interface ChaseCameraOptions {
  followDistance: number;
  followHeight: number;
  lookAheadDistance: number;
  springStiffness: number;
  springDamping: number;
  fovBase: number;
  fovSpeedBoost: number;
  maxSpeed: number;
}

export const DEFAULT_CHASE: ChaseCameraOptions = {
  followDistance: 6.5,
  followHeight: 2.6,
  lookAheadDistance: 4.0,
  springStiffness: 7.5,
  springDamping: 4.0,
  fovBase: 60,
  fovSpeedBoost: 14,
  maxSpeed: 90,
};

const LOOK_TARGET = new Vector3();
const DESIRED_POS = new Vector3();
const DELTA = new Vector3();
const ACCEL = new Vector3();

export class ChaseCamera {
  private readonly currentLookAt: Vector3 = new Vector3();
  private readonly velocity: Vector3 = new Vector3();
  private currentFov: number;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly options: ChaseCameraOptions = DEFAULT_CHASE,
  ) {
    this.currentFov = options.fovBase;
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();
    this.currentLookAt.copy(this.camera.position).add(new Vector3(0, 0, -1));
  }

  update(
    playerPosition: Vector3,
    playerHeading: number,
    playerSpeed: number,
    deltaSeconds: number,
  ): void {
    const opts = this.options;

    const forwardX = Math.sin(playerHeading);
    const forwardZ = Math.cos(playerHeading);

    DESIRED_POS.set(
      playerPosition.x - forwardX * opts.followDistance,
      playerPosition.y + opts.followHeight,
      playerPosition.z - forwardZ * opts.followDistance,
    );

    // Semi-implicit spring toward desired position.
    DELTA.copy(DESIRED_POS).sub(this.camera.position);
    ACCEL.copy(DELTA).multiplyScalar(opts.springStiffness);
    ACCEL.addScaledVector(this.velocity, -opts.springDamping);
    this.velocity.addScaledVector(ACCEL, deltaSeconds);
    this.camera.position.addScaledVector(this.velocity, deltaSeconds);

    // Look-ahead.
    LOOK_TARGET.set(
      playerPosition.x + forwardX * opts.lookAheadDistance,
      playerPosition.y + 1.1,
      playerPosition.z + forwardZ * opts.lookAheadDistance,
    );
    this.currentLookAt.lerp(LOOK_TARGET, Math.min(1, 6 * deltaSeconds));
    this.camera.lookAt(this.currentLookAt);

    // FOV expands with speed.
    const speedRatio = Math.min(1, Math.max(0, playerSpeed / opts.maxSpeed));
    const targetFov = opts.fovBase + opts.fovSpeedBoost * speedRatio;
    this.currentFov += (targetFov - this.currentFov) * Math.min(1, 4 * deltaSeconds);
    if (Math.abs(this.currentFov - this.camera.fov) > 0.001) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
