import { PerspectiveCamera, Vector3 } from "three";

export interface ChaseCameraOptions {
  followDistance: number;
  followHeight: number;
  lookAheadDistance: number;
  driftCameraBias: number;
  springStiffness: number;
  springDamping: number;
  fovBase: number;
  fovSpeedBoost: number;
  fovDriftBoost: number;
  shakeDecay: number;
  maxShake: number;
  maxSpeed: number;
}

export const DEFAULT_CHASE: ChaseCameraOptions = {
  followDistance: 8.4,
  followHeight: 3.45,
  lookAheadDistance: 6.2,
  driftCameraBias: 0.35,
  springStiffness: 7.5,
  springDamping: 4.0,
  fovBase: 60,
  fovSpeedBoost: 5,
  fovDriftBoost: 2.5,
  shakeDecay: 5.0,
  maxShake: 0.35,
  maxSpeed: 90,
};

const LOOK_TARGET = new Vector3();
const DESIRED_POS = new Vector3();
const DELTA = new Vector3();
const ACCEL = new Vector3();

export interface ChaseFeedback {
  shake: number;
  fovPulse: number;
}

export class ChaseCamera {
  private readonly currentLookAt: Vector3 = new Vector3();
  private readonly velocity: Vector3 = new Vector3();
  private currentFov: number;
  private shakeOffset: Vector3 = new Vector3();
  private shakeTimer = 0;
  private shakeMagnitude = 0;
  private boostPulseTimer = 0;
  private boostPulseStrength = 0;
  private initialized = false;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly options: ChaseCameraOptions = DEFAULT_CHASE,
  ) {
    this.currentFov = options.fovBase;
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();
    this.currentLookAt.copy(this.camera.position).add(new Vector3(0, 0, -1));
  }

  triggerShake(magnitude: number, durationSeconds = 0.35): void {
    this.shakeMagnitude = Math.min(
      this.options.maxShake,
      this.shakeMagnitude + magnitude,
    );
    this.shakeTimer = Math.max(this.shakeTimer, durationSeconds);
  }

  triggerFovPulse(magnitude: number, durationSeconds = 0.6): void {
    this.boostPulseStrength = Math.max(this.boostPulseStrength, magnitude);
    this.boostPulseTimer = Math.max(this.boostPulseTimer, durationSeconds);
  }

  /** Preserve the view when the floating origin snaps to a new chunk. */
  shiftRenderOrigin(originDelta: Vector3): void {
    this.camera.position.sub(originDelta);
    this.currentLookAt.sub(originDelta);
  }

  getFeedback(): ChaseFeedback {
    return { shake: this.shakeMagnitude, fovPulse: this.boostPulseStrength };
  }

  /**
   * @param playerPosition player position in render-space (caller has applied
   *                       the rebase delta so render coords stay near origin).
   * @param playerHeading world-space heading angle (relative to look-ahead dir).
   * @param playerSpeed forward speed magnitude.
   * @param drifting whether the racer is currently drifting.
   * @param steerAngle current steering angle used for drift framing.
   * @param deltaSeconds frame delta.
   */
  update(
    playerPosition: Vector3,
    playerHeading: number,
    playerSpeed: number,
    drifting: boolean,
    steerAngle: number,
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

    // Bias the chase position outward during a drift so the racer silhouette
    // and the corner direction remain readable at speed.
    if (drifting) {
      const rightX = forwardZ;
      const rightZ = -forwardX;
      const bias = steerAngle * opts.driftCameraBias;
      DESIRED_POS.x += rightX * bias;
      DESIRED_POS.z += rightZ * bias;
    }

    // Snap to the desired position on the first frame (skip spring-in).
    if (!this.initialized) {
      this.camera.position.copy(DESIRED_POS);
      this.initialized = true;
    }

    DELTA.copy(DESIRED_POS).sub(this.camera.position);
    ACCEL.copy(DELTA).multiplyScalar(opts.springStiffness);
    ACCEL.addScaledVector(this.velocity, -opts.springDamping);
    this.velocity.addScaledVector(ACCEL, deltaSeconds);
    this.camera.position.addScaledVector(this.velocity, deltaSeconds);

    LOOK_TARGET.set(
      playerPosition.x + forwardX * opts.lookAheadDistance,
      playerPosition.y + 1.1,
      playerPosition.z + forwardZ * opts.lookAheadDistance,
    );
    this.currentLookAt.lerp(LOOK_TARGET, Math.min(1, 6 * deltaSeconds));
    this.camera.lookAt(this.currentLookAt);

    // FOV.
    const speedRatio = Math.min(1, Math.max(0, playerSpeed / opts.maxSpeed));
    const driftFov = drifting ? opts.fovDriftBoost : 0;
    let targetFov = opts.fovBase + opts.fovSpeedBoost * speedRatio + driftFov;
    if (this.boostPulseTimer > 0) {
      const pulse = this.boostPulseStrength * (this.boostPulseTimer / 0.6);
      targetFov += pulse;
      this.boostPulseTimer = Math.max(0, this.boostPulseTimer - deltaSeconds);
    }
    this.currentFov +=
      (targetFov - this.currentFov) * Math.min(1, 4 * deltaSeconds);
    if (Math.abs(this.currentFov - this.camera.fov) > 0.001) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    // Camera shake (additive offset). Subtract the previous frame's offset
    // before adding the new one so shake does not accumulate.
    if (this.shakeTimer > 0) {
      this.camera.position.sub(this.shakeOffset);
      this.shakeOffset.set(
        (Math.random() - 0.5) * this.shakeMagnitude,
        (Math.random() - 0.5) * this.shakeMagnitude * 0.5,
        (Math.random() - 0.5) * this.shakeMagnitude * 0.3,
      );
      this.camera.position.add(this.shakeOffset);
      this.shakeTimer = Math.max(0, this.shakeTimer - deltaSeconds);
      const decayFactor = Math.max(0, 1 - opts.shakeDecay * deltaSeconds);
      this.shakeMagnitude *= decayFactor;
      if (this.shakeTimer === 0) {
        this.shakeMagnitude = 0;
        this.shakeOffset.set(0, 0, 0);
      }
    } else if (this.shakeOffset.lengthSq() > 0) {
      // Cleanup any residual offset from a previous shake.
      this.camera.position.sub(this.shakeOffset);
      this.shakeOffset.set(0, 0, 0);
    }
  }
}
