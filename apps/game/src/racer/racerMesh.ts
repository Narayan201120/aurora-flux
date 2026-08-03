import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
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
}

const PALETTE = {
  hull: { base: "#67e5ff", shadow: "#0c1c4a", highlight: "#e9faff", rim: "#ffe4a8" },
  canopy: { base: "#76ffd5", shadow: "#0a2418", highlight: "#dfffe8", rim: "#ffffff" },
  fin: { base: "#ff7bd9", shadow: "#3a0c2e", highlight: "#fff0fb", rim: "#fff0fb" },
  vent: { base: "#1a3060", shadow: "#04081c", highlight: "#3a5aa0", rim: "#a8fff0" },
  thruster: { base: "#ffd07c", shadow: "#3a1a06", highlight: "#fff5db", rim: "#fff7c2" },
};

const OUTLINE_THICKNESS = 3.0;

export interface RacerMesh {
  group: Group;
  outlines: OutlineHandle[];
}

export function createRacerMesh(options: RacerMeshOptions): RacerMesh {
  const group = new Group();
  group.name = "Racer";
  const outlines: OutlineHandle[] = [];

  const add = (
    geometry: import("three").BufferGeometry,
    palette: typeof PALETTE.hull,
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
  add(
    new BoxGeometry(1.6, 0.55, 3.2),
    PALETTE.hull,
    [0, 0, 0],
    [0, 0, 0],
  );
  // Tapered nose.
  add(
    new ConeGeometry(0.9, 1.4, 4),
    PALETTE.hull,
    [0, -0.05, -2.3],
    [-Math.PI / 2, Math.PI / 4, 0],
  );

  // Canopy.
  add(
    new BoxGeometry(1.0, 0.45, 1.4),
    PALETTE.canopy,
    [0, 0.42, -0.2],
    [0, 0, 0],
  );

  // Tail fin.
  add(
    new BoxGeometry(0.18, 0.85, 0.7),
    PALETTE.fin,
    [0, 0.55, 1.25],
    [0.15, 0, 0],
  );

  // Side vents.
  add(
    new BoxGeometry(0.12, 0.35, 1.4),
    PALETTE.vent,
    [0.92, -0.05, 0.2],
  );
  add(
    new BoxGeometry(0.12, 0.35, 1.4),
    PALETTE.vent,
    [-0.92, -0.05, 0.2],
  );

  // Hover rings (thrusters).
  const ringLeft = add(
    new TorusGeometry(0.32, 0.07, 10, 22),
    PALETTE.thruster,
    [0.7, -0.35, 0.9],
    [Math.PI / 2, 0, 0],
  );
  const ringRight = add(
    new TorusGeometry(0.32, 0.07, 10, 22),
    PALETTE.thruster,
    [-0.7, -0.35, 0.9],
    [Math.PI / 2, 0, 0],
  );

  // Underglow plates (small cylinders pointing down).
  add(
    new CylinderGeometry(0.18, 0.28, 0.12, 14),
    PALETTE.thruster,
    [0.7, -0.45, 0.4],
  );
  add(
    new CylinderGeometry(0.18, 0.28, 0.12, 14),
    PALETTE.thruster,
    [-0.7, -0.45, 0.4],
  );

  group.userData.rings = [ringLeft, ringRight];
  return { group, outlines };
}
