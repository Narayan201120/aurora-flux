import { Group, Vector3 } from "three";
import type { RacePhase } from "./raceState.js";
import type { TrackSystem } from "./track.js";
import { Racer } from "../racer/racer.js";
import type { ObstacleSphere } from "../racer/obstacles.js";
import {
  createRacerMesh,
  type RacerColorSet,
  type RacerMesh,
} from "../racer/racerMesh.js";
import { HAZARD_DEFINITIONS, type HazardSnapshot } from "../world/hazards.js";

export type AIPersonality = "aggressive" | "technical" | "wild";
export type AIBehavior =
  | "racing-line"
  | "drafting"
  | "overtaking"
  | "avoiding-obstacle"
  | "avoiding-hazard"
  | "recovering";

export interface OpponentSnapshot {
  id: string;
  name: string;
  personality: AIPersonality;
  lap: number;
  progress: number;
  speed: number;
  drifting: boolean;
  drafting: boolean;
  behavior: AIBehavior;
  position: Vector3;
  velocity: Vector3;
  heading: number;
}

export interface OpponentSystemOptions {
  viewport: Vector3;
  track: TrackSystem;
}

export interface OpponentSystem {
  group: Group;
  update: (
    deltaSeconds: number,
    time: number,
    phase: RacePhase,
    playerDistance: number,
    playerPosition: Vector3,
    hazards: HazardSnapshot,
    obstacles: ReadonlyArray<ObstacleSphere>,
  ) => void;
  snapshots: () => ReadonlyArray<OpponentSnapshot>;
  draftTarget: (
    playerPosition: Vector3,
    playerHeading: number,
  ) => { position: Vector3; velocity: Vector3 } | undefined;
  reset: () => void;
}

interface OpponentProfile {
  id: string;
  name: string;
  personality: AIPersonality;
  pace: number;
  lane: number;
  wobble: number;
  palette: RacerColorSet;
}

interface AIOpponent {
  profile: OpponentProfile;
  racer: Racer;
  mesh: RacerMesh;
  progress: number;
  lap: number;
  speed: number;
  drifting: boolean;
  drafting: boolean;
  behavior: AIBehavior;
  laneOffset: number;
  blockedSeconds: number;
  recoveryTimer: number;
  snapshot: OpponentSnapshot;
}

const PROFILES: ReadonlyArray<OpponentProfile> = [
  {
    id: "nova",
    name: "Nova",
    personality: "aggressive",
    pace: 78,
    lane: -1.7,
    wobble: 0.16,
    palette: {
      hull: {
        base: "#ff6d8f",
        shadow: "#3b0b2d",
        highlight: "#ffe5ef",
        rim: "#ffd17c",
      },
      canopy: {
        base: "#ffb36d",
        shadow: "#4a1d0b",
        highlight: "#fff2d7",
        rim: "#ffffff",
      },
      fin: {
        base: "#a978ff",
        shadow: "#21104e",
        highlight: "#f2e9ff",
        rim: "#ffb1f1",
      },
      vent: {
        base: "#2b1c62",
        shadow: "#10071f",
        highlight: "#7766d5",
        rim: "#ffd0ef",
      },
      thruster: {
        base: "#ffdc78",
        shadow: "#54210a",
        highlight: "#fff8cf",
        rim: "#ffffff",
      },
    },
  },
  {
    id: "kestrel",
    name: "Kestrel",
    personality: "technical",
    pace: 72,
    lane: 1.5,
    wobble: 0.04,
    palette: {
      hull: {
        base: "#8b8cff",
        shadow: "#121848",
        highlight: "#e7e8ff",
        rim: "#9affe0",
      },
      canopy: {
        base: "#67d6ff",
        shadow: "#092b4b",
        highlight: "#e3fbff",
        rim: "#ffffff",
      },
      fin: {
        base: "#e2f46e",
        shadow: "#354008",
        highlight: "#f7ffcd",
        rim: "#ffffff",
      },
      vent: {
        base: "#172c68",
        shadow: "#060a24",
        highlight: "#6e91dd",
        rim: "#b5ffff",
      },
      thruster: {
        base: "#7bffdd",
        shadow: "#0a3d32",
        highlight: "#e6fff8",
        rim: "#ffffff",
      },
    },
  },
  {
    id: "rook",
    name: "Rook",
    personality: "wild",
    pace: 69,
    lane: 0,
    wobble: 0.38,
    palette: {
      hull: {
        base: "#d87cff",
        shadow: "#3a114d",
        highlight: "#f9e9ff",
        rim: "#ffdb7c",
      },
      canopy: {
        base: "#65ffb2",
        shadow: "#0a3c29",
        highlight: "#e4fff1",
        rim: "#ffffff",
      },
      fin: {
        base: "#ff8b53",
        shadow: "#51200f",
        highlight: "#fff0e5",
        rim: "#ffe9a5",
      },
      vent: {
        base: "#31205e",
        shadow: "#120a2c",
        highlight: "#866fd2",
        rim: "#ffb5f0",
      },
      thruster: {
        base: "#fff078",
        shadow: "#51430a",
        highlight: "#fffbdc",
        rim: "#ffffff",
      },
    },
  },
];

const UP = new Vector3(0, 1, 0);
const SIDE = new Vector3();
const POSITION = new Vector3();
const VELOCITY = new Vector3();

export function createOpponentSystem(
  options: OpponentSystemOptions,
): OpponentSystem {
  const group = new Group();
  group.name = "AIOpponents";
  const opponents: AIOpponent[] = PROFILES.map((profile, index) => {
    const mesh = createRacerMesh({
      viewport: options.viewport,
      palette: profile.palette,
    });
    mesh.group.name = `Racer-${profile.id}`;
    const racer = new Racer(mesh.group);
    const progress = 0.012 + index * 0.026;
    const snapshot: OpponentSnapshot = {
      id: profile.id,
      name: profile.name,
      personality: profile.personality,
      lap: 0,
      progress,
      speed: 0,
      drifting: false,
      drafting: false,
      behavior: "racing-line",
      position: new Vector3(),
      velocity: new Vector3(),
      heading: 0,
    };
    group.add(mesh.group);
    const opponent: AIOpponent = {
      profile,
      racer,
      mesh,
      progress,
      lap: 0,
      speed: 0,
      drifting: false,
      drafting: false,
      behavior: "racing-line",
      laneOffset: profile.lane,
      blockedSeconds: 0,
      recoveryTimer: 0,
      snapshot,
    };
    placeOpponent(opponent, options.track, 0);
    return opponent;
  });

  return {
    group,
    update(
      deltaSeconds: number,
      time: number,
      phase: RacePhase,
      playerDistance: number,
      playerPosition: Vector3,
      hazards: HazardSnapshot,
      obstacles: ReadonlyArray<ObstacleSphere>,
    ) {
      if (phase !== "racing") {
        for (const opponent of opponents) {
          opponent.mesh.rider.update({
            time,
            throttle: 0,
            steerAngle: 0,
            drifting: false,
            boostActive: false,
            impactActive: false,
            victory: false,
          });
          opponent.snapshot.behavior = "racing-line";
          opponent.snapshot.drafting = false;
        }
        return;
      }

      for (const opponent of opponents) {
        const distance = opponent.lap + opponent.progress;
        const rubberBandGap = clamp(playerDistance - distance, -0.24, 0.24);
        const wobble =
          Math.sin(
            time * (1.2 + opponent.profile.wobble) + opponent.progress * 20,
          ) * opponent.profile.wobble;
        const sample = options.track.sample(opponent.progress);
        SIDE.crossVectors(sample.tangent, UP).normalize();
        const blocker = findBlocker(
          opponent,
          opponents,
          playerPosition,
          sample.tangent,
          SIDE,
        );
        const obstacle = findObstacle(
          opponent.racer.position,
          sample.tangent,
          SIDE,
          obstacles,
        );
        const hazard = findUpcomingHazard(
          opponent.progress,
          options.track.length,
        );

        opponent.recoveryTimer = Math.max(
          0,
          opponent.recoveryTimer - deltaSeconds,
        );
        if (obstacle && obstacle.distance < 8) {
          opponent.blockedSeconds += deltaSeconds;
        } else {
          opponent.blockedSeconds = Math.max(
            0,
            opponent.blockedSeconds - deltaSeconds * 2,
          );
        }
        if (opponent.blockedSeconds > 0.45) {
          opponent.recoveryTimer = 0.8;
          opponent.blockedSeconds = 0;
        }

        let desiredLane = opponent.profile.lane + wobble;
        let behavior: AIBehavior = "racing-line";
        let drafting = false;
        let decisionPenalty = 0;
        if (opponent.recoveryTimer > 0) {
          behavior = "recovering";
          desiredLane = opponent.profile.lane;
        } else if (obstacle) {
          behavior = "avoiding-obstacle";
          desiredLane = chooseAvoidanceLane(
            opponent.profile.lane,
            obstacle.lateral,
            obstacles,
          );
          decisionPenalty = 5;
        } else if (hazard && hazard.distance < 72) {
          behavior = "avoiding-hazard";
          desiredLane = chooseAvoidanceLane(
            opponent.profile.lane,
            hazard.offset,
            [],
          );
          decisionPenalty = hazard.distance < 12 ? 10 : 3;
        } else if (blocker) {
          if (blocker.distance > 9 && blocker.distance < 18) {
            behavior = "drafting";
            drafting = true;
            decisionPenalty = -6;
          } else {
            behavior = "overtaking";
            desiredLane = chooseOvertakeLane(
              opponent.profile.lane,
              blocker.lateral,
              opponent.profile.personality,
            );
            decisionPenalty = -2;
          }
        }

        opponent.laneOffset +=
          (clamp(desiredLane, -6.2, 6.2) - opponent.laneOffset) *
          Math.min(1, deltaSeconds * 5.5);
        const riskPulse =
          opponent.profile.personality === "aggressive"
            ? Math.sin(time * 2.7) * 3.5
            : opponent.profile.personality === "wild"
              ? Math.sin(time * 5.2) * 7
              : 0;
        const rubberBandStrength =
          opponent.profile.personality === "aggressive"
            ? 48
            : opponent.profile.personality === "technical"
              ? 36
              : 42;
        const draftBonus = drafting ? 8 : 0;
        const recoveryBonus = opponent.recoveryTimer > 0 ? 7 : 0;
        const hazardPenalty = hazards.effect.active ? 3 : 0;
        opponent.speed = clamp(
          opponent.profile.pace +
            rubberBandGap * rubberBandStrength +
            riskPulse +
            draftBonus +
            recoveryBonus -
            decisionPenalty -
            hazardPenalty,
          48,
          94,
        );
        opponent.progress +=
          (opponent.speed / options.track.length) * deltaSeconds;
        if (opponent.progress >= 1) {
          opponent.progress -= 1;
          opponent.lap += 1;
        }

        const updatedSample = options.track.sample(opponent.progress);
        SIDE.crossVectors(updatedSample.tangent, UP).normalize();
        POSITION.copy(updatedSample.position).addScaledVector(
          SIDE,
          opponent.laneOffset,
        );
        POSITION.y += Math.sin(time * 4 + opponent.progress * 30) * 0.05;
        VELOCITY.copy(updatedSample.tangent).multiplyScalar(opponent.speed);
        opponent.racer.position.copy(POSITION);
        opponent.racer.velocity.copy(VELOCITY);
        opponent.racer.heading = Math.atan2(
          updatedSample.tangent.x,
          updatedSample.tangent.z,
        );
        opponent.racer.speed = opponent.speed;
        opponent.racer.steerAngle =
          clamp(opponent.laneOffset - opponent.profile.lane, -4, 4) * 0.05;
        opponent.drifting =
          opponent.profile.personality !== "technical" &&
          Math.abs(wobble) > opponent.profile.wobble * 0.65;
        opponent.racer.drifting = opponent.drifting;
        opponent.mesh.group.position.copy(POSITION);
        opponent.mesh.group.rotation.y = opponent.racer.heading;
        opponent.mesh.rider.update({
          time,
          throttle: 1,
          steerAngle: opponent.racer.steerAngle,
          drifting: opponent.drifting,
          boostActive: riskPulse > 5,
          impactActive: false,
          victory: false,
        });
        opponent.snapshot.lap = opponent.lap;
        opponent.snapshot.progress = opponent.progress;
        opponent.snapshot.speed = opponent.speed;
        opponent.snapshot.drifting = opponent.drifting;
        opponent.snapshot.position.copy(opponent.racer.position);
        opponent.snapshot.velocity.copy(opponent.racer.velocity);
        opponent.snapshot.heading = opponent.racer.heading;
        opponent.drafting = drafting;
        opponent.behavior = behavior;
        opponent.snapshot.drafting = drafting;
        opponent.snapshot.behavior = behavior;
      }
    },
    snapshots() {
      return opponents.map((opponent) => ({ ...opponent.snapshot }));
    },
    draftTarget(playerPosition: Vector3, playerHeading: number) {
      const forwardX = Math.sin(playerHeading);
      const forwardZ = Math.cos(playerHeading);
      let selected: AIOpponent | undefined;
      let selectedDistance = Infinity;
      for (const opponent of opponents) {
        const dx = opponent.racer.position.x - playerPosition.x;
        const dz = opponent.racer.position.z - playerPosition.z;
        const ahead = dx * forwardX + dz * forwardZ;
        const distance = Math.hypot(dx, dz);
        if (ahead > 0 && distance < 14 && distance < selectedDistance) {
          selected = opponent;
          selectedDistance = distance;
        }
      }
      return selected
        ? {
            position: selected.racer.position,
            velocity: selected.racer.velocity,
          }
        : undefined;
    },
    reset() {
      opponents.forEach((opponent, index) => {
        opponent.progress = 0.012 + index * 0.026;
        opponent.lap = 0;
        opponent.speed = 0;
        opponent.drafting = false;
        opponent.behavior = "racing-line";
        opponent.laneOffset = opponent.profile.lane;
        opponent.blockedSeconds = 0;
        opponent.recoveryTimer = 0;
        opponent.snapshot.lap = 0;
        opponent.snapshot.progress = opponent.progress;
        opponent.snapshot.speed = 0;
        opponent.snapshot.drifting = false;
        opponent.snapshot.position.copy(opponent.racer.position);
        opponent.snapshot.velocity.copy(opponent.racer.velocity);
        opponent.snapshot.heading = opponent.racer.heading;
        placeOpponent(opponent, options.track, index);
      });
    },
  };
}

function placeOpponent(
  opponent: AIOpponent,
  track: TrackSystem,
  index: number,
): void {
  const sample = track.sample(opponent.progress);
  SIDE.crossVectors(sample.tangent, UP).normalize();
  const position = sample.position
    .clone()
    .addScaledVector(SIDE, opponent.profile.lane);
  opponent.racer.position.copy(position);
  opponent.racer.velocity.set(0, 0, 0);
  opponent.racer.heading = Math.atan2(sample.tangent.x, sample.tangent.z);
  opponent.snapshot.position.copy(opponent.racer.position);
  opponent.snapshot.velocity.copy(opponent.racer.velocity);
  opponent.snapshot.heading = opponent.racer.heading;
  opponent.mesh.group.position.copy(position);
  opponent.mesh.group.rotation.y = opponent.racer.heading;
  opponent.mesh.rider.update({
    time: index * 0.2,
    throttle: 0,
    steerAngle: 0,
    drifting: false,
    boostActive: false,
    impactActive: false,
    victory: false,
  });
  opponent.laneOffset = opponent.profile.lane;
}

interface Blocker {
  distance: number;
  lateral: number;
}

interface UpcomingHazard {
  distance: number;
  offset: number;
}

function findBlocker(
  opponent: AIOpponent,
  opponents: ReadonlyArray<AIOpponent>,
  playerPosition: Vector3,
  tangent: Vector3,
  side: Vector3,
): Blocker | undefined {
  let nearest: Blocker | undefined;
  const consider = (position: Vector3): void => {
    const dx = position.x - opponent.racer.position.x;
    const dz = position.z - opponent.racer.position.z;
    const distance = Math.hypot(dx, dz);
    const ahead = dx * tangent.x + dz * tangent.z;
    const lateral = dx * side.x + dz * side.z;
    if (
      ahead > 1.5 &&
      ahead < 20 &&
      Math.abs(lateral) < 3.4 &&
      (!nearest || distance < nearest.distance)
    ) {
      nearest = { distance, lateral };
    }
  };

  consider(playerPosition);
  for (const candidate of opponents) {
    if (candidate === opponent) continue;
    consider(candidate.racer.position);
  }
  return nearest;
}

function findObstacle(
  position: Vector3,
  tangent: Vector3,
  side: Vector3,
  obstacles: ReadonlyArray<ObstacleSphere>,
): (Blocker & { radius: number }) | undefined {
  let nearest: (Blocker & { radius: number }) | undefined;
  for (const obstacle of obstacles) {
    const dx = obstacle.position.x - position.x;
    const dz = obstacle.position.z - position.z;
    const ahead = dx * tangent.x + dz * tangent.z;
    const lateral = dx * side.x + dz * side.z;
    const distance = Math.hypot(dx, dz);
    if (
      ahead > 0 &&
      ahead < 25 &&
      Math.abs(lateral) < obstacle.radius + 3 &&
      (!nearest || distance < nearest.distance)
    ) {
      nearest = { distance, lateral, radius: obstacle.radius };
    }
  }
  return nearest;
}

function findUpcomingHazard(
  progress: number,
  trackLength: number,
): (UpcomingHazard & { kind: string }) | undefined {
  let nearest: (UpcomingHazard & { kind: string }) | undefined;
  for (const hazard of HAZARD_DEFINITIONS) {
    const distance =
      forwardProgressDistance(progress, hazard.progress) * trackLength;
    if (!nearest || distance < nearest.distance) {
      nearest = { distance, offset: hazard.offset, kind: hazard.kind };
    }
  }
  return nearest;
}

function chooseAvoidanceLane(
  baseLane: number,
  blockingLateral: number,
  obstacles: ReadonlyArray<ObstacleSphere>,
): number {
  const direction = blockingLateral >= 0 ? -1 : 1;
  const candidate = clamp(baseLane + direction * 3.8, -6.2, 6.2);
  const crowded = obstacles.some(
    (obstacle) => Math.abs(obstacle.position.x) < 0,
  );
  return crowded ? clamp(candidate + direction * 1.2, -6.2, 6.2) : candidate;
}

function chooseOvertakeLane(
  baseLane: number,
  blockerLateral: number,
  personality: AIPersonality,
): number {
  const preferredDirection =
    personality === "aggressive" ? 1 : blockerLateral >= 0 ? -1 : 1;
  return clamp(baseLane + preferredDirection * 3.5, -6.2, 6.2);
}

function forwardProgressDistance(left: number, right: number): number {
  return (right - left + 1) % 1;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
