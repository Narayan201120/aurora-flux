import { Group, Mesh, SphereGeometry, Vector3 } from "three";
import { CelMaterial } from "../rendering/cel/celMaterial.js";
import { attachOutline, createOutlineMesh, type OutlineHandle } from "../rendering/cel/outlineMesh.js";
import type { ObstacleSphere } from "./racer.js";

export interface ObstaclesOptions {
  positions: ReadonlyArray<{ position: Vector3; radius: number }>;
  viewport: Vector3;
}

export interface ObstaclesField {
  group: Group;
  spheres: ObstacleSphere[];
  outlines: OutlineHandle[];
  update: (deltaSeconds: number) => void;
}

export function createObstaclesField(options: ObstaclesOptions): ObstaclesField {
  const group = new Group();
  group.name = "Obstacles";
  const spheres: ObstacleSphere[] = [];
  const outlines: OutlineHandle[] = [];

  for (const entry of options.positions) {
    const geo = new SphereGeometry(entry.radius, 14, 10);
    const mat = new CelMaterial({
      baseColor: "#67c3ff",
      shadowColor: "#0a1430",
      highlightColor: "#e1f1ff",
      rimColor: "#ffe6b8",
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.copy(entry.position);
    group.add(mesh);

    const outline = createOutlineMesh(
      mesh,
      { thickness: 3.0, color: "#0a0c1a" },
      options.viewport,
    );
    attachOutline(mesh, outline);
    outlines.push(outline);

    spheres.push({ position: mesh.position, radius: entry.radius });
  }

  return {
    group,
    spheres,
    outlines,
    update(deltaSeconds: number) {
      const t = performance.now() * 0.001;
      // Slow rotation gives life without distracting.
      for (let i = 0; i < group.children.length; i += 1) {
        const child = group.children[i] as Mesh;
        if (child && child.isMesh) {
          child.rotation.y += deltaSeconds * 0.3;
          child.rotation.x = Math.sin(t + i) * 0.1;
        }
      }
    },
  };
}