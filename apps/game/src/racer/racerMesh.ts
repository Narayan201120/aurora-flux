import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { CelMaterial } from "../rendering/cel/celMaterial.js";
import {
  attachOutline,
  createOutlineMesh,
  type OutlineHandle,
} from "../rendering/cel/outlineMesh.js";

export interface RacerMeshOptions {
  viewport: Vector3;
  palette?: RacerColorSet;
}

export interface RacerColorSet {
  hull: { base: string; shadow: string; highlight: string; rim: string };
  canopy: { base: string; shadow: string; highlight: string; rim: string };
  fin: { base: string; shadow: string; highlight: string; rim: string };
  vent: { base: string; shadow: string; highlight: string; rim: string };
  thruster: { base: string; shadow: string; highlight: string; rim: string };
}

export const DEFAULT_RACER_PALETTE: RacerColorSet = {
  hull: {
    base: "#67e5ff",
    shadow: "#0c1c4a",
    highlight: "#e9faff",
    rim: "#ffe4a8",
  },
  canopy: {
    base: "#76ffd5",
    shadow: "#0a2418",
    highlight: "#dfffe8",
    rim: "#ffffff",
  },
  fin: {
    base: "#ff7bd9",
    shadow: "#3a0c2e",
    highlight: "#fff0fb",
    rim: "#fff0fb",
  },
  vent: {
    base: "#1a3060",
    shadow: "#04081c",
    highlight: "#3a5aa0",
    rim: "#a8fff0",
  },
  thruster: {
    base: "#ffd07c",
    shadow: "#3a1a06",
    highlight: "#fff5db",
    rim: "#fff7c2",
  },
};

export interface RiderAnimationInput {
  time: number;
  throttle: number;
  steerAngle: number;
  drifting: boolean;
  boostActive: boolean;
  impactActive: boolean;
  victory: boolean;
}

export interface RiderHandle {
  group: Group;
  update: (input: RiderAnimationInput) => void;
}

const OUTLINE_THICKNESS = 3.0;
const HERO_VISUAL_SCALE = 1.25;

export interface RacerMesh {
  group: Group;
  outlines: OutlineHandle[];
  rider: RiderHandle;
}

export function createRacerMesh(options: RacerMeshOptions): RacerMesh {
  const group = new Group();
  group.name = "Racer";
  const outlines: OutlineHandle[] = [];
  const palette = options.palette ?? DEFAULT_RACER_PALETTE;

  const add = (
    geometry: import("three").BufferGeometry,
    palette: RacerColorSet["hull"],
    position: [number, number, number],
    rotation?: [number, number, number],
    scale: [number, number, number] = [1, 1, 1],
  ): Mesh => {
    const material = new CelMaterial({
      baseColor: palette.base,
      shadowColor: palette.shadow,
      highlightColor: palette.highlight,
      rimColor: palette.rim,
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.scale.set(...scale);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);

    const outline = createOutlineMesh(
      mesh,
      { thickness: OUTLINE_THICKNESS, color: "#0a0c1a" },
      options.viewport,
    );
    attachOutline(mesh, outline);
    outlines.push(outline);
    return mesh;
  };

  // Main hull: elongated, low, faceted.
  add(new BoxGeometry(1.6, 0.55, 3.2), palette.hull, [0, 0, 0], [0, 0, 0]);
  // Tapered nose.
  add(
    new ConeGeometry(0.9, 1.4, 4),
    palette.hull,
    [0, -0.05, -2.3],
    [-Math.PI / 2, Math.PI / 4, 0],
  );

  // Canopy.
  add(
    new BoxGeometry(1.0, 0.45, 1.4),
    palette.canopy,
    [0, 0.42, -0.2],
    [0, 0, 0],
  );

  // Tail fin.
  add(
    new BoxGeometry(0.18, 0.85, 0.7),
    palette.fin,
    [0, 0.55, 1.25],
    [0.15, 0, 0],
  );

  // Side vents.
  add(new BoxGeometry(0.12, 0.35, 1.4), palette.vent, [0.92, -0.05, 0.2]);
  add(new BoxGeometry(0.12, 0.35, 1.4), palette.vent, [-0.92, -0.05, 0.2]);

  // Hover rings (thrusters).
  const ringLeft = add(
    new TorusGeometry(0.32, 0.07, 10, 22),
    palette.thruster,
    [0.7, -0.35, 0.9],
    [Math.PI / 2, 0, 0],
  );
  const ringRight = add(
    new TorusGeometry(0.32, 0.07, 10, 22),
    palette.thruster,
    [-0.7, -0.35, 0.9],
    [Math.PI / 2, 0, 0],
  );

  // Underglow plates (small cylinders pointing down).
  add(
    new CylinderGeometry(0.18, 0.28, 0.12, 14),
    palette.thruster,
    [0.7, -0.45, 0.4],
  );
  add(
    new CylinderGeometry(0.18, 0.28, 0.12, 14),
    palette.thruster,
    [-0.7, -0.45, 0.4],
  );

  group.userData.rings = [ringLeft, ringRight];
  const rider = createRider(options.viewport, palette, group, outlines);
  // Increase only the presentation scale. Physics and collision volumes stay
  // in world units so the racer remains predictable around obstacles.
  group.scale.setScalar(HERO_VISUAL_SCALE);
  return { group, outlines, rider };
}

function createRider(
  viewport: Vector3,
  palette: RacerColorSet,
  parent: Group,
  outlines: OutlineHandle[],
): RiderHandle {
  const group = new Group();
  group.name = "ProceduralRider";
  group.position.set(0, 0.34, -0.15);
  parent.add(group);

  const add = (
    geometry: import("three").BufferGeometry,
    colors: RacerColorSet["hull"],
    position: [number, number, number],
    scale: [number, number, number] = [1, 1, 1],
  ): Mesh => {
    const mesh = new Mesh(
      geometry,
      new CelMaterial({
        baseColor: colors.base,
        shadowColor: colors.shadow,
        highlightColor: colors.highlight,
        rimColor: colors.rim,
      }),
    );
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    group.add(mesh);
    const outline = createOutlineMesh(
      mesh,
      { thickness: 2.2, color: "#0a0c1a" },
      viewport,
    );
    attachOutline(mesh, outline);
    outlines.push(outline);
    return mesh;
  };

  const torso = add(
    new CylinderGeometry(0.2, 0.28, 0.55, 8),
    palette.fin,
    [0, 0.33, 0.02],
    [1, 1, 0.7],
  );
  const head = add(
    new SphereGeometry(0.26, 12, 8),
    palette.canopy,
    [0, 0.74, -0.02],
  );
  const visor = add(
    new BoxGeometry(0.34, 0.12, 0.08),
    palette.vent,
    [0, 0.75, -0.22],
  );
  const scarf = add(
    new BoxGeometry(0.12, 0.11, 0.52),
    palette.thruster,
    [0, 0.5, 0.17],
  );
  torso.userData.role = "rider-torso";
  head.userData.role = "rider-head";
  visor.userData.role = "rider-visor";
  scarf.userData.role = "rider-scarf";

  return {
    group,
    update(input: RiderAnimationInput) {
      if (input.victory) {
        group.rotation.z = Math.sin(input.time * 5.2) * 0.24;
        group.rotation.x = -0.18 + Math.sin(input.time * 4.2) * 0.08;
        group.position.y = 0.34 + Math.abs(Math.sin(input.time * 4.8)) * 0.12;
        scarf.rotation.y = Math.sin(input.time * 9.5) * 0.7;
        visor.position.z = -0.22;
        return;
      }
      const lean = input.steerAngle * (input.drifting ? 0.9 : 0.55);
      group.rotation.z = -lean;
      group.rotation.x =
        -input.throttle * 0.16 + (input.boostActive ? -0.14 : 0);
      group.position.y = 0.34 + Math.sin(input.time * 5.4) * 0.018;
      scarf.rotation.y =
        Math.sin(input.time * 7.5) * 0.18 + (input.boostActive ? 0.26 : 0);
      visor.position.z =
        -0.22 + (input.impactActive ? Math.sin(input.time * 36) * 0.03 : 0);
    },
  };
}
