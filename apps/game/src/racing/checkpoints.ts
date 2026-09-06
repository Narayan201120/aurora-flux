import {
  AdditiveBlending,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  TorusGeometry,
  Vector3,
} from "three";
import type { TrackSystem } from "./track.js";

export const CHECKPOINT_PROGRESS = [
  0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88,
] as const;
export const FINISH_PROGRESS = 0;
const GATE_RADIUS = 5.5;
const ACTIVE_COLOR = new Color("#e6fffb");
const INACTIVE_COLOR = new Color("#3d6bff");
const FINISH_COLOR = new Color("#ff79dc");

export interface CheckpointState {
  nextIndex: number;
  passed: number;
  lapsCompleted: number;
  routeProgress: number;
  distanceFromRoute: number;
  routeTangent: Vector3;
  lastPass: CheckpointPass | null;
  eventVersion: number;
}

export type CheckpointPass =
  | { kind: "checkpoint"; index: number; lap: number }
  | { kind: "finish"; lap: number };

export interface CheckpointSystem {
  group: Group;
  state: CheckpointState;
  update: (playerPosition: Vector3, time: number) => void;
  reset: () => void;
}

interface CheckpointGate {
  group: Group;
  ring: Mesh;
  material: MeshBasicMaterial;
  isFinish: boolean;
}

function createGate(
  track: TrackSystem,
  progress: number,
  isFinish = false,
): CheckpointGate {
  const sample = track.sample(progress);
  const group = new Group();
  group.name = isFinish
    ? "FinishGate"
    : `Checkpoint-${Math.round(progress * 100)}`;
  group.position.copy(sample.position);
  group.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);

  const material = new MeshBasicMaterial({
    color: isFinish ? FINISH_COLOR : INACTIVE_COLOR,
    transparent: true,
    opacity: 0.62,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const ring = new Mesh(
    new TorusGeometry(isFinish ? 4.3 : 3.5, isFinish ? 0.18 : 0.12, 10, 28),
    material,
  );
  ring.position.y = 3.5;
  group.add(ring);

  return { group, ring, material, isFinish };
}

export function createCheckpointSystem(track: TrackSystem): CheckpointSystem {
  const group = new Group();
  group.name = "CheckpointSystem";
  const gates = [
    ...CHECKPOINT_PROGRESS.map((progress) => createGate(track, progress)),
    createGate(track, FINISH_PROGRESS, true),
  ];
  for (const gate of gates) group.add(gate.group);

  const state: CheckpointState = {
    nextIndex: 0,
    passed: 0,
    lapsCompleted: 0,
    routeProgress: 0,
    distanceFromRoute: 0,
    routeTangent: new Vector3(0, 0, 1),
    lastPass: null,
    eventVersion: 0,
  };

  const updateGateColors = (): void => {
    for (let index = 0; index < gates.length; index += 1) {
      const gate = gates[index]!;
      gate.material.color.copy(
        index === state.nextIndex
          ? gate.isFinish
            ? FINISH_COLOR
            : ACTIVE_COLOR
          : INACTIVE_COLOR,
      );
      gate.material.opacity = index === state.nextIndex ? 0.95 : 0.35;
    }
  };
  updateGateColors();

  return {
    group,
    state,
    update(playerPosition: Vector3, time: number) {
      const nearest = track.nearest(playerPosition);
      state.routeProgress = nearest.progress;
      state.distanceFromRoute = nearest.distance;
      state.routeTangent.copy(nearest.tangent);

      const activeGate = gates[state.nextIndex]!;
      const dx = playerPosition.x - activeGate.group.position.x;
      const dz = playerPosition.z - activeGate.group.position.z;
      if (dx * dx + dz * dz <= GATE_RADIUS * GATE_RADIUS) {
        state.passed += 1;
        if (activeGate.isFinish) {
          state.lapsCompleted += 1;
          state.lastPass = { kind: "finish", lap: state.lapsCompleted };
          state.nextIndex = 0;
        } else {
          state.lastPass = {
            kind: "checkpoint",
            index: state.nextIndex,
            lap: state.lapsCompleted + 1,
          };
          state.nextIndex += 1;
        }
        state.eventVersion += 1;
        updateGateColors();
      }

      for (let index = 0; index < gates.length; index += 1) {
        const gate = gates[index]!;
        const isActive = index === state.nextIndex;
        gate.ring.rotation.z =
          Math.sin(time * 2.2 + index) * (isActive ? 0.08 : 0.025);
        gate.ring.scale.setScalar(
          isActive ? 1 + Math.sin(time * 4 + index) * 0.04 : 1,
        );
      }
    },
    reset() {
      state.nextIndex = 0;
      state.passed = 0;
      state.lapsCompleted = 0;
      state.routeProgress = 0;
      state.distanceFromRoute = 0;
      state.routeTangent.set(0, 0, 1);
      state.lastPass = null;
      state.eventVersion = 0;
      updateGateColors();
    },
  };
}
