import { Group, Vector3 } from "three";
import type { RacePhase } from "./raceState.js";
import type { TrackSystem } from "./track.js";
import { Racer } from "../racer/racer.js";
import {
  createRacerMesh,
  type RacerColorSet,
  type RacerMesh,
} from "../racer/racerMesh.js";

export type AIPersonality = "aggressive" | "technical" | "wild";

export interface OpponentSnapshot {
  id: string;
  name: string;
  personality: AIPersonality;
  lap: number;
  progress: number;
  speed: number;
  drifting: boolean;
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
    };
    group.add(mesh.group);
    const opponent = {
      profile,
      racer,
      mesh,
      progress,
      lap: 0,
      speed: 0,
      drifting: false,
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
          });
        }
        return;
      }

      for (const opponent of opponents) {
        const distance = opponent.lap + opponent.progress;
        const catchup = clamp(playerDistance - distance, -0.18, 0.18);
        const wobble =
          Math.sin(
            time * (1.2 + opponent.profile.wobble) + opponent.progress * 20,
          ) * opponent.profile.wobble;
        const riskPulse =
          opponent.profile.personality === "aggressive"
            ? Math.sin(time * 2.7) * 3.5
            : opponent.profile.personality === "wild"
              ? Math.sin(time * 5.2) * 7
              : 0;
        opponent.speed = clamp(
          opponent.profile.pace + catchup * 42 + riskPulse,
          52,
          88,
        );
        opponent.progress +=
          (opponent.speed / options.track.length) * deltaSeconds;
        if (opponent.progress >= 1) {
          opponent.progress -= 1;
          opponent.lap += 1;
        }

        const sample = options.track.sample(opponent.progress);
        SIDE.crossVectors(sample.tangent, UP).normalize();
        const lane = opponent.profile.lane + wobble;
        POSITION.copy(sample.position).addScaledVector(SIDE, lane);
        POSITION.y += Math.sin(time * 4 + opponent.progress * 30) * 0.05;
        VELOCITY.copy(sample.tangent).multiplyScalar(opponent.speed);
        opponent.racer.position.copy(POSITION);
        opponent.racer.velocity.copy(VELOCITY);
        opponent.racer.heading = Math.atan2(sample.tangent.x, sample.tangent.z);
        opponent.racer.speed = opponent.speed;
        opponent.racer.steerAngle = -wobble * 0.3;
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
        });
        opponent.snapshot.lap = opponent.lap;
        opponent.snapshot.progress = opponent.progress;
        opponent.snapshot.speed = opponent.speed;
        opponent.snapshot.drifting = opponent.drifting;
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
        opponent.snapshot.lap = 0;
        opponent.snapshot.progress = opponent.progress;
        opponent.snapshot.speed = 0;
        opponent.snapshot.drifting = false;
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
  opponent.mesh.group.position.copy(position);
  opponent.mesh.group.rotation.y = opponent.racer.heading;
  opponent.mesh.rider.update({
    time: index * 0.2,
    throttle: 0,
    steerAngle: 0,
    drifting: false,
    boostActive: false,
    impactActive: false,
  });
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
