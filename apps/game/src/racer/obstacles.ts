import { Group, Mesh, SphereGeometry, Vector3 } from "three";
import { CelMaterial } from "../rendering/cel/celMaterial.js";
import { attachOutline, createOutlineMesh, type OutlineHandle } from "../rendering/cel/outlineMesh.js";

export interface ObstaclesOptions {
  /** Initial world-space positions ahead of the player. */
  initialPositions: ReadonlyArray<Vector3>;
  recycleAhead: number;
  recycleBehind: number;
  viewport: Vector3;
}

/**
 * Ring of obstacles at fixed world-space offsets AHEAD of the racer. When the
 * racer passes an obstacle, it recycles to a position far ahead.
 *
 * `spheres[i].position` is in world coordinates (used for collision math).
 * The visual mesh is parented to the rebase worldRoot so it appears at the
 * correct render-space position.
 */
export interface ObstacleSphere {
  position: Vector3;
  radius: number;
}

export interface ObstaclesField {
  group: Group;
  spheres: ObstacleSphere[];
  outlines: OutlineHandle[];
  meshes: Mesh[];
  update: (deltaSeconds: number, playerPosition: Vector3, worldOrigin: Vector3) => void;
}

export function createObstaclesField(options: ObstaclesOptions): ObstaclesField {
  const group = new Group();
  group.name = "Obstacles";
  const spheres: ObstacleSphere[] = [];
  const outlines: OutlineHandle[] = [];
  const meshes: Mesh[] = [];

  for (const initial of options.initialPositions) {
    const radius = 1.0;
    const geo = new SphereGeometry(radius, 14, 10);
    const mat = new CelMaterial({
      baseColor: "#67c3ff",
      shadowColor: "#0a1430",
      highlightColor: "#e1f1ff",
      rimColor: "#ffe6b8",
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.copy(initial);
    group.add(mesh);

    const outline = createOutlineMesh(
      mesh,
      { thickness: 3.0, color: "#0a0c1a" },
      options.viewport,
    );
    attachOutline(mesh, outline);
    outlines.push(outline);
    meshes.push(mesh);

    spheres.push({ position: mesh.position.clone(), radius });
  }

  return {
    group,
    spheres,
    outlines,
    meshes,
    update(deltaSeconds: number, playerPosition: Vector3, worldOrigin: Vector3) {
      const t = performance.now() * 0.001;

      // Recycle passed obstacles; respawn them ahead in world coords.
      for (let i = 0; i < spheres.length; i += 1) {
        const s = spheres[i]!;
        if (s.position.z < playerPosition.z + options.recycleBehind) {
          s.position.z = playerPosition.z + options.recycleAhead;
        }
      }

      // Sync visuals: position the mesh in render-space (world - origin)
      // and apply decorative rotation.
      for (let i = 0; i < meshes.length; i += 1) {
        const mesh = meshes[i]!;
        const s = spheres[i]!;
        mesh.position.set(
          s.position.x - worldOrigin.x,
          s.position.y,
          s.position.z - worldOrigin.z,
        );
        mesh.rotation.y += deltaSeconds * 0.3;
        mesh.rotation.x = Math.sin(t + i) * 0.1;
      }
    },
  };
}