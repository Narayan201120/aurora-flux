import {
  AdditiveBlending,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  TorusGeometry,
  Vector3,
} from "three";
import type { TrackSystem } from "../racing/track.js";

export type HazardKind =
  "meteor" | "lightning" | "gravity" | "fracture" | "comet";

export interface HazardWarning {
  kind: HazardKind;
  label: string;
  distance: number;
  progress: number;
}

export interface HazardEffect {
  speedMultiplier: number;
  steeringMultiplier: number;
  active: boolean;
}

export interface HazardSnapshot {
  warnings: ReadonlyArray<HazardWarning>;
  effect: HazardEffect;
  activeLabel: string;
}

export interface HazardSystem {
  group: Group;
  update: (
    deltaSeconds: number,
    time: number,
    playerPosition: Vector3,
  ) => HazardSnapshot;
  reset: () => void;
}

interface HazardEntity {
  kind: HazardKind;
  label: string;
  progress: number;
  offset: number;
  radius: number;
  pulse: number;
  mesh: Group;
}

const UP = new Vector3(0, 1, 0);
const SIDE = new Vector3();
const POSITION = new Vector3();
const HAZARD_DEFINITIONS: ReadonlyArray<
  Pick<
    HazardEntity,
    "kind" | "label" | "progress" | "offset" | "radius" | "pulse"
  >
> = [
  {
    kind: "meteor",
    label: "METEOR CROSSING",
    progress: 0.18,
    offset: -4,
    radius: 4.6,
    pulse: 0.3,
  },
  {
    kind: "lightning",
    label: "ARC DISCHARGE",
    progress: 0.34,
    offset: 4,
    radius: 3.8,
    pulse: 1.7,
  },
  {
    kind: "gravity",
    label: "GRAVITY WELL",
    progress: 0.52,
    offset: -1,
    radius: 6.5,
    pulse: 0.8,
  },
  {
    kind: "comet",
    label: "COMET CROSSING",
    progress: 0.68,
    offset: 3.5,
    radius: 4.2,
    pulse: 2.4,
  },
  {
    kind: "fracture",
    label: "SPATIAL FRACTURE",
    progress: 0.84,
    offset: -3,
    radius: 5.2,
    pulse: 1.2,
  },
];

export function createHazardSystem(track: TrackSystem): HazardSystem {
  const group = new Group();
  group.name = "CourseHazards";
  const hazards = HAZARD_DEFINITIONS.map((definition) => {
    const mesh = createHazardMesh(definition.kind);
    mesh.name = `${definition.kind}-hazard`;
    group.add(mesh);
    return { ...definition, mesh };
  });
  const warnings: HazardWarning[] = [];
  const effect: HazardEffect = {
    speedMultiplier: 1,
    steeringMultiplier: 1,
    active: false,
  };

  return {
    group,
    update(
      _deltaSeconds: number,
      time: number,
      playerPosition: Vector3,
    ): HazardSnapshot {
      const player = track.nearest(playerPosition);
      warnings.length = 0;
      effect.speedMultiplier = 1;
      effect.steeringMultiplier = 1;
      effect.active = false;
      let activeLabel = "";

      for (const hazard of hazards) {
        const sample = track.sample(hazard.progress);
        SIDE.crossVectors(sample.tangent, UP).normalize();
        POSITION.copy(sample.position).addScaledVector(SIDE, hazard.offset);
        POSITION.y += 1.2 + Math.sin(time * 2 + hazard.pulse) * 0.35;
        animateHazard(hazard, POSITION, time);

        const progressGap = circularProgressDistance(
          player.progress,
          hazard.progress,
        );
        const routeDistance = progressGap * track.length;
        if (routeDistance < 78) {
          warnings.push({
            kind: hazard.kind,
            label: hazard.label,
            distance: routeDistance,
            progress: hazard.progress,
          });
        }

        const playerDistance = Math.hypot(
          playerPosition.x - hazard.mesh.position.x,
          playerPosition.z - hazard.mesh.position.z,
        );
        if (playerDistance < hazard.radius) {
          effect.active = true;
          activeLabel = hazard.label;
          if (hazard.kind === "gravity") {
            effect.speedMultiplier = 0.86;
            effect.steeringMultiplier = 0.62;
          } else if (hazard.kind === "lightning") {
            effect.speedMultiplier = 0.72;
            effect.steeringMultiplier = 0.8;
          } else {
            effect.speedMultiplier = 0.78;
          }
        }
      }

      warnings.sort((left, right) => left.distance - right.distance);
      return { warnings, effect, activeLabel };
    },
    reset() {
      warnings.length = 0;
      effect.speedMultiplier = 1;
      effect.steeringMultiplier = 1;
      effect.active = false;
    },
  };
}

function createHazardMesh(kind: HazardKind): Group {
  const group = new Group();
  const color =
    kind === "gravity"
      ? "#a37cff"
      : kind === "lightning"
        ? "#d8fbff"
        : kind === "fracture"
          ? "#ff67d8"
          : "#ffb169";
  const material = new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.82,
    blending: AdditiveBlending,
    depthWrite: false,
  });

  if (kind === "meteor") {
    const core = new Mesh(new IcosahedronGeometry(1.4, 1), material);
    group.add(core);
    const tail = new Mesh(new ConeGeometry(0.8, 4.5, 6), material.clone());
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = 2.3;
    group.add(tail);
  } else if (kind === "lightning") {
    const arc = new Mesh(new CylinderGeometry(0.16, 0.16, 9, 6), material);
    arc.rotation.z = Math.PI / 2;
    group.add(arc);
    const ring = new Mesh(new TorusGeometry(2.1, 0.1, 8, 24), material.clone());
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  } else if (kind === "gravity") {
    const well = new Mesh(new TorusGeometry(4.8, 0.14, 12, 32), material);
    well.rotation.x = Math.PI / 2;
    group.add(well);
    const core = new Mesh(new IcosahedronGeometry(1.3, 1), material.clone());
    group.add(core);
  } else if (kind === "comet") {
    const head = new Mesh(new IcosahedronGeometry(1.1, 1), material);
    group.add(head);
    const trail = new Mesh(new ConeGeometry(0.7, 5.2, 6), material.clone());
    trail.rotation.x = -Math.PI / 2;
    trail.position.z = 2.6;
    group.add(trail);
  } else {
    const fracture = new Mesh(new TorusGeometry(3.8, 0.16, 8, 8), material);
    fracture.rotation.set(0.5, 0.2, 0.3);
    group.add(fracture);
    const slash = new Mesh(new BoxGeometry(0.12, 5.5, 0.12), material.clone());
    slash.rotation.z = 0.7;
    group.add(slash);
  }
  return group;
}

function animateHazard(
  hazard: HazardEntity,
  position: Vector3,
  time: number,
): void {
  hazard.mesh.position.copy(position);
  hazard.mesh.rotation.y = time * (hazard.kind === "gravity" ? 0.5 : 1.4);
  hazard.mesh.rotation.z = Math.sin(time * 1.4 + hazard.pulse) * 0.18;
  const pulse = 1 + Math.sin(time * 4.2 + hazard.pulse) * 0.08;
  hazard.mesh.scale.setScalar(pulse);
  if (hazard.kind === "meteor" || hazard.kind === "comet") {
    hazard.mesh.position.x +=
      Math.sin(time * (hazard.kind === "meteor" ? 1.8 : 1.1) + hazard.pulse) *
      9;
  }
}

function circularProgressDistance(left: number, right: number): number {
  const gap = Math.abs(left - right);
  return Math.min(gap, 1 - gap);
}
