import { Euler, Group, Quaternion, Vector3 } from "three";

export interface RacerInput {
  throttle: number; // -1..1
  steer: number; // -1..1
  brake: boolean;
  handbrake: boolean;
  boost: boolean; // explicit boost trigger
}

export interface DraftingState {
  active: boolean;
  intensity: number; // 0..1, 1 = fully drafted (close behind, matching speed)
  bonusSpeed: number;
}

export interface ImpactFeedback {
  magnitude: number;
  recoverySeconds: number;
}

export interface RacerSnapshot {
  position: Vector3;
  velocity: Vector3;
  speed: number;
  heading: number;
  steerAngle: number;
  drifting: boolean;
  driftCharge: number;
  boostEnergy: number;
  boostActive: boolean;
  boostCooldown: number;
  drafting: DraftingState;
  lastImpact: ImpactFeedback | null;
}

export interface RacerConfig {
  maxForwardSpeed: number;
  maxReverseSpeed: number;
  boostMaxSpeed: number;
  thrust: number;
  reverseThrust: number;
  brakeStrength: number;
  drag: number;
  lateralGrip: number;
  driftLateralGrip: number;
  draftLateralGrip: number;
  steerSpeed: number;
  lateralSteerSpeed: number;
  maxSteerAngle: number;
  rollFromSteer: number;
  pitchFromThrottle: number;
  rideHeight: number;
  rideSpring: number;
  rideDamping: number;

  // Drift + boost.
  driftChargeRate: number; // per second while drifting
  driftChargeDecay: number; // per second when not drifting
  driftChargeMinToBoost: number;
  boostDuration: number;
  boostCooldown: number;
  boostThrustMultiplier: number;

  // Drafting.
  draftRange: number;
  draftMinCloseDistance: number;
  draftMaxBonusSpeed: number;
  draftRequiredRelativeSpeed: number;

  // Impact.
  impactBounce: number;
  impactRecoverySeconds: number;
  impactInputDamp: number;
}

export const DEFAULT_RACER_CONFIG: RacerConfig = {
  maxForwardSpeed: 90,
  maxReverseSpeed: 28,
  boostMaxSpeed: 130,
  thrust: 60,
  reverseThrust: 36,
  brakeStrength: 70,
  drag: 0.45,
  lateralGrip: 7.0,
  driftLateralGrip: 1.5,
  draftLateralGrip: 9.0,
  steerSpeed: 2.6,
  lateralSteerSpeed: 18,
  maxSteerAngle: 0.55,
  rollFromSteer: 0.32,
  pitchFromThrottle: 0.12,
  rideHeight: 0.6,
  rideSpring: 32,
  rideDamping: 8,

  driftChargeRate: 0.7,
  driftChargeDecay: 0.55,
  driftChargeMinToBoost: 0.4,
  boostDuration: 1.4,
  boostCooldown: 0.6,
  boostThrustMultiplier: 2.4,

  draftRange: 12,
  draftMinCloseDistance: 3,
  draftMaxBonusSpeed: 18,
  draftRequiredRelativeSpeed: -8,

  impactBounce: 14,
  impactRecoverySeconds: 0.6,
  impactInputDamp: 0.4,
};

export interface ObstacleSphere {
  position: Vector3;
  radius: number;
}

export class Racer {
  readonly position: Vector3 = new Vector3();
  readonly velocity: Vector3 = new Vector3();
  heading: number = 0;
  steerAngle: number = 0;
  rideOffset: number = 0;
  rideVelocity: number = 0;
  speed: number = 0;

  drifting = false;
  driftCharge = 0;
  boostEnergy = 0;
  boostActive = false;
  boostTimer = 0;
  boostCooldownTimer = 0;
  recoveryTimer = 0;
  inputDampTimer = 0;
  lastImpact: ImpactFeedback | null = null;

  readonly drafting: DraftingState = {
    active: false,
    intensity: 0,
    bonusSpeed: 0,
  };

  constructor(
    readonly root: Group,
    private readonly config: RacerConfig = DEFAULT_RACER_CONFIG,
  ) {}

  reset(position = new Vector3(), heading = 0): void {
    this.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.heading = heading;
    this.steerAngle = 0;
    this.rideOffset = 0;
    this.rideVelocity = 0;
    this.speed = 0;
    this.drifting = false;
    this.driftCharge = 0;
    this.boostEnergy = 0;
    this.boostActive = false;
    this.boostTimer = 0;
    this.boostCooldownTimer = 0;
    this.recoveryTimer = 0;
    this.inputDampTimer = 0;
    this.lastImpact = null;
    this.drafting.active = false;
    this.drafting.intensity = 0;
    this.drafting.bonusSpeed = 0;
    this.root.position.copy(this.position);
    this.root.rotation.set(0, heading, 0);
  }

  snapshot(): RacerSnapshot {
    return {
      position: this.position,
      velocity: this.velocity,
      speed: this.speed,
      heading: this.heading,
      steerAngle: this.steerAngle,
      drifting: this.drifting,
      driftCharge: this.driftCharge,
      boostEnergy: this.boostEnergy,
      boostActive: this.boostActive,
      boostCooldown: this.boostCooldownTimer,
      drafting: this.drafting,
      lastImpact: this.lastImpact,
    };
  }

  applyImpact(obstacle: ObstacleSphere): void {
    const cfg = this.config;
    const dx = this.position.x - obstacle.position.x;
    const dz = this.position.z - obstacle.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist >= obstacle.radius) return;

    const nx = dist > 1e-4 ? dx / dist : 1;
    const nz = dist > 1e-4 ? dz / dist : 0;

    // Push racer out of obstacle.
    const overlap = obstacle.radius - dist;
    this.position.x += nx * overlap;
    this.position.z += nz * overlap;

    const vDotN = this.velocity.x * nx + this.velocity.z * nz;
    const restitution = 0.35;
    if (vDotN < 0) {
      this.velocity.x -= (1 + restitution) * vDotN * nx;
      this.velocity.z -= (1 + restitution) * vDotN * nz;
    }

    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);
    this.velocity.x += forwardX * cfg.impactBounce * 0.4;
    this.velocity.z += forwardZ * cfg.impactBounce * 0.4;

    if (this.boostActive) {
      this.boostActive = false;
      this.boostTimer = 0;
    }

    this.recoveryTimer = cfg.impactRecoverySeconds;
    this.inputDampTimer = cfg.impactRecoverySeconds;
    this.lastImpact = {
      magnitude: cfg.impactBounce,
      recoverySeconds: cfg.impactRecoverySeconds,
    };
  }

  applyInput(
    input: RacerInput,
    deltaSeconds: number,
    draftTarget?: { position: Vector3; velocity: Vector3 },
  ): void {
    const cfg = this.config;

    // Recovery tick.
    if (this.recoveryTimer > 0) {
      this.recoveryTimer = Math.max(0, this.recoveryTimer - deltaSeconds);
    }
    if (this.inputDampTimer > 0) {
      this.inputDampTimer = Math.max(0, this.inputDampTimer - deltaSeconds);
    }
    if (this.recoveryTimer === 0 && this.inputDampTimer === 0) {
      this.lastImpact = null;
    }

    // Apply input damping while recovering from impact.
    const inputDamp = this.inputDampTimer > 0 ? cfg.impactInputDamp : 1;
    const dampedThrottle = clamp(input.throttle * inputDamp, -1, 1);
    const dampedSteer = clamp(input.steer * inputDamp, -1, 1);

    // Steering.
    const speedFactor = Math.min(
      1,
      Math.abs(this.speed) / cfg.maxForwardSpeed + 0.25,
    );
    const targetSteer = dampedSteer * cfg.maxSteerAngle;
    this.steerAngle +=
      (targetSteer - this.steerAngle) *
      Math.min(1, cfg.steerSpeed * deltaSeconds * speedFactor);
    this.heading +=
      this.steerAngle * deltaSeconds * (this.speed > 0.1 ? 2.6 : 1.6);

    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    // Drift detection: handbrake held while steering AND moving fast enough.
    const wasDrifting = this.drifting;
    const wantsDrift =
      input.handbrake &&
      Math.abs(dampedSteer) > 0.2 &&
      Math.abs(this.speed) > 8;
    this.drifting = wantsDrift;
    const driftReleased = wasDrifting && !this.drifting;
    const driftChargeAtRelease = this.driftCharge;

    // Drift charge.
    if (this.drifting) {
      this.driftCharge = clamp(
        this.driftCharge + cfg.driftChargeRate * deltaSeconds,
        0,
        1,
      );
    } else {
      this.driftCharge = clamp(
        this.driftCharge - cfg.driftChargeDecay * deltaSeconds,
        0,
        1,
      );
    }

    // Boost trigger.
    if (this.boostCooldownTimer > 0) {
      this.boostCooldownTimer = Math.max(
        0,
        this.boostCooldownTimer - deltaSeconds,
      );
    }

    // Releasing a charged drift also fires the boost. R/E remain available
    // for manual activation, including when the keyboard drops a chorded key.
    if (
      (input.boost ||
        (driftReleased && driftChargeAtRelease >= cfg.driftChargeMinToBoost)) &&
      !this.boostActive &&
      this.boostCooldownTimer === 0 &&
      this.driftCharge >= cfg.driftChargeMinToBoost
    ) {
      this.boostActive = true;
      this.boostTimer = cfg.boostDuration;
      this.boostEnergy = Math.max(this.driftCharge, driftChargeAtRelease);
      this.driftCharge = 0;
      this.boostCooldownTimer = cfg.boostCooldown;
    }

    if (this.boostActive) {
      this.boostTimer = Math.max(0, this.boostTimer - deltaSeconds);
      if (this.boostTimer === 0) {
        this.boostActive = false;
      }
    }

    // Drafting.
    if (draftTarget) {
      this.updateDrafting(draftTarget, deltaSeconds);
    } else {
      this.drafting.active = false;
      this.drafting.intensity = 0;
      this.drafting.bonusSpeed = 0;
    }

    // Thrust / brake.
    if (input.brake) {
      this.speed = approachZero(this.speed, cfg.brakeStrength * deltaSeconds);
    } else if (this.boostActive) {
      this.speed +=
        cfg.thrust *
        cfg.boostThrustMultiplier *
        Math.max(0, dampedThrottle) *
        deltaSeconds;
    } else if (dampedThrottle > 0) {
      this.speed += cfg.thrust * dampedThrottle * deltaSeconds;
    } else if (dampedThrottle < 0) {
      this.speed += cfg.reverseThrust * dampedThrottle * deltaSeconds;
    } else {
      // No throttle input: idle drag with extra drafting drag so the racer
      // settles to 0 instead of cruising on drafting bonus alone.
      const idleDrag = cfg.drag * deltaSeconds * 6;
      this.speed = approachZero(this.speed, idleDrag);
    }

    // Drafting amplifies existing forward thrust; it does NOT add speed on
    // its own. Only applies while the racer is actively throttling forward.
    if (this.drafting.active && dampedThrottle > 0) {
      this.speed +=
        cfg.draftMaxBonusSpeed *
        this.drafting.intensity *
        dampedThrottle *
        deltaSeconds;
    }

    const topSpeed = this.boostActive ? cfg.boostMaxSpeed : cfg.maxForwardSpeed;
    this.speed = clamp(this.speed, -cfg.maxReverseSpeed, topSpeed);

    // Drag.
    const dragMag = cfg.drag * Math.abs(this.speed) * deltaSeconds;
    this.speed -=
      Math.sign(this.speed) * Math.min(dragMag, Math.abs(this.speed));

    // Velocity vector.
    // Add a direct lateral component so A/D produces readable arcade movement
    // instead of relying only on yaw, which the chase camera visually masks.
    const rightX = forwardZ;
    const rightZ = -forwardX;
    const lateralSpeed =
      dampedSteer *
      cfg.lateralSteerSpeed *
      Math.min(1, Math.abs(this.speed) / 12);
    const targetVx = forwardX * this.speed + rightX * lateralSpeed;
    const targetVz = forwardZ * this.speed + rightZ * lateralSpeed;

    // Lateral grip changes based on state.
    let grip = cfg.lateralGrip;
    if (this.drifting) grip = cfg.driftLateralGrip;
    if (this.drafting.active) grip = Math.max(grip, cfg.draftLateralGrip);

    const gripFactor = Math.min(1, grip * deltaSeconds);
    this.velocity.x += (targetVx - this.velocity.x) * gripFactor;
    this.velocity.z += (targetVz - this.velocity.z) * gripFactor;

    // Ride height spring.
    const rideError = cfg.rideHeight + this.rideOffset - this.position.y;
    const rideAccel =
      rideError * cfg.rideSpring - this.rideVelocity * cfg.rideDamping;
    this.rideVelocity += rideAccel * deltaSeconds;
    this.position.y += this.rideVelocity * deltaSeconds;
    this.rideOffset *= Math.exp(-1.6 * deltaSeconds);

    this.position.x += this.velocity.x * deltaSeconds;
    this.position.z += this.velocity.z * deltaSeconds;

    // Apply transform.
    const roll =
      -this.steerAngle * cfg.rollFromSteer * (this.drifting ? 1.4 : 1);
    const pitch = dampedThrottle * cfg.pitchFromThrottle;
    const q = new Quaternion().setFromEuler(
      new Euler(pitch, this.heading, roll),
    );
    this.root.position.copy(this.position);
    this.root.quaternion.copy(q);
    void forwardX;
    void forwardZ;
  }

  private updateDrafting(
    target: { position: Vector3; velocity: Vector3 },
    deltaSeconds: number,
  ): void {
    const cfg = this.config;
    const dx = this.position.x - target.position.x;
    const dz = this.position.z - target.position.z;
    const dist = Math.hypot(dx, dz);
    const fwdX = Math.sin(this.heading);
    const fwdZ = Math.cos(this.heading);
    const aheadOfTarget = dx * fwdX + dz * fwdZ;

    // Drafting: target is ahead, racer is within range AND the racer is
    // moving forward (positive speed). Standing still while close to a
    // ghost target should NOT grant drafting.
    const inRange =
      dist < cfg.draftRange &&
      aheadOfTarget < cfg.draftMinCloseDistance &&
      this.speed > 1;
    const relSpeed =
      target.velocity.z * fwdZ + target.velocity.x * fwdX - this.speed;
    const eligible = inRange && relSpeed > cfg.draftRequiredRelativeSpeed;

    if (eligible) {
      const closeness = 1 - clamp(dist / cfg.draftRange, 0, 1);
      // Ramp up over ~0.6s so drafting does not snap to max immediately.
      this.drafting.intensity = Math.min(
        closeness,
        this.drafting.intensity + deltaSeconds * 1.6,
      );
      this.drafting.bonusSpeed =
        cfg.draftMaxBonusSpeed * this.drafting.intensity;
      this.drafting.active = this.drafting.intensity > 0.05;
    } else {
      this.drafting.intensity = Math.max(
        0,
        this.drafting.intensity - deltaSeconds * 2,
      );
      this.drafting.bonusSpeed =
        cfg.draftMaxBonusSpeed * this.drafting.intensity;
      this.drafting.active = this.drafting.intensity > 0.05;
    }
    void aheadOfTarget;
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function approachZero(v: number, maxStep: number): number {
  if (Math.abs(v) <= maxStep) return 0;
  return v - Math.sign(v) * maxStep;
}
