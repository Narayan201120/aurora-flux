import { Euler, Group, Quaternion, Vector3 } from "three";

export interface RacerInput {
  throttle: number; // -1..1 (forward/backward)
  steer: number; // -1..1 (left/right)
  brake: boolean;
}

export interface RacerConfig {
  maxForwardSpeed: number;
  maxReverseSpeed: number;
  thrust: number;
  reverseThrust: number;
  brakeStrength: number;
  drag: number;
  lateralGrip: number;
  steerSpeed: number; // radians/sec at full input
  maxSteerAngle: number;
  rollFromSteer: number;
  pitchFromThrottle: number;
  rideHeight: number;
  rideSpring: number;
  rideDamping: number;
}

export const DEFAULT_RACER_CONFIG: RacerConfig = {
  maxForwardSpeed: 90,
  maxReverseSpeed: 28,
  thrust: 60,
  reverseThrust: 36,
  brakeStrength: 70,
  drag: 0.45,
  lateralGrip: 7.0,
  steerSpeed: 2.6,
  maxSteerAngle: 0.55,
  rollFromSteer: 0.32,
  pitchFromThrottle: 0.12,
  rideHeight: 0.6,
  rideSpring: 32,
  rideDamping: 8,
};

export class Racer {
  readonly position: Vector3 = new Vector3();
  readonly velocity: Vector3 = new Vector3();
  heading: number = 0; // radians around Y
  steerAngle: number = 0;
  rideOffset: number = 0;
  rideVelocity: number = 0;
  speed: number = 0;

  constructor(
    readonly root: Group,
    private readonly config: RacerConfig = DEFAULT_RACER_CONFIG,
  ) {}

  applyInput(input: RacerInput, deltaSeconds: number): void {
    const cfg = this.config;

    // Steering rate proportional to speed (more responsive at speed, gentler at low speed).
    const speedFactor = Math.min(1, Math.abs(this.speed) / cfg.maxForwardSpeed + 0.25);
    const targetSteer = input.steer * cfg.maxSteerAngle;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1, cfg.steerSpeed * deltaSeconds * speedFactor);

    // Heading yaw.
    this.heading += this.steerAngle * deltaSeconds * (this.speed > 0.1 ? 2.6 : 1.6);

    // Forward vector (X-Z plane).
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    // Thrust / brake along forward.
    if (input.brake) {
      this.speed = approachZero(this.speed, cfg.brakeStrength * deltaSeconds);
    } else if (input.throttle > 0) {
      this.speed += cfg.thrust * input.throttle * deltaSeconds;
    } else if (input.throttle < 0) {
      this.speed += cfg.reverseThrust * input.throttle * deltaSeconds;
    } else {
      this.speed = approachZero(this.speed, cfg.drag * deltaSeconds * 4);
    }

    this.speed = clamp(this.speed, -cfg.maxReverseSpeed, cfg.maxForwardSpeed);

    // Drag.
    const dragMag = cfg.drag * Math.abs(this.speed) * deltaSeconds;
    this.speed -= Math.sign(this.speed) * Math.min(dragMag, Math.abs(this.speed));

    // Velocity vector (forward component).
    const targetVx = forwardX * this.speed;
    const targetVz = forwardZ * this.speed;

    // Lateral grip: lerp current velocity toward forward projection.
    const grip = Math.min(1, cfg.lateralGrip * deltaSeconds);
    this.velocity.x += (targetVx - this.velocity.x) * grip;
    this.velocity.z += (targetVz - this.velocity.z) * grip;

    // Ride height spring (vertical).
    const rideError = cfg.rideHeight + this.rideOffset - this.position.y;
    const rideAccel = rideError * cfg.rideSpring - this.rideVelocity * cfg.rideDamping;
    this.rideVelocity += rideAccel * deltaSeconds;
    this.position.y += this.rideVelocity * deltaSeconds;
    this.rideOffset *= Math.exp(-1.6 * deltaSeconds);

    // Position integration (XZ from velocity; Y from spring).
    this.position.x += this.velocity.x * deltaSeconds;
    this.position.z += this.velocity.z * deltaSeconds;

    // Apply transform to mesh.
    const roll = -this.steerAngle * cfg.rollFromSteer;
    const pitch = clamp(input.throttle, -1, 1) * cfg.pitchFromThrottle;
    const q = new Quaternion().setFromEuler(new Euler(pitch, this.heading, roll));
    this.root.position.copy(this.position);
    this.root.quaternion.copy(q);
    void forwardX;
    void forwardZ;
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function approachZero(v: number, maxStep: number): number {
  if (Math.abs(v) <= maxStep) return 0;
  return v - Math.sign(v) * maxStep;
}
