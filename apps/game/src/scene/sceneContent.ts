import {
  BoxGeometry,
  CapsuleGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  PlaneGeometry,
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

export interface SceneContent {
  group: Group;
  outlines: OutlineHandle[];
  update: (deltaSeconds: number) => void;
}

export interface CreateSceneOptions {
  viewport: Vector3;
}

const PALETTE = {
  heroBody: { base: "#67e5ff", shadow: "#0c1c4a", highlight: "#e9faff", rim: "#ffe4a8" },
  heroAccent: { base: "#ff7bd9", shadow: "#3a0c2e", highlight: "#fff0fb", rim: "#fff0fb" },
  capsule: { base: "#a8ff7a", shadow: "#0c2a14", highlight: "#eaffe0", rim: "#fff7c2" },
  torus: { base: "#7c9dff", shadow: "#0a1240", highlight: "#dde6ff", rim: "#ffd0f5" },
  sphere: { base: "#ffd07c", shadow: "#3a1a06", highlight: "#fff5db", rim: "#ffffff" },
  ground: { base: "#0e1734", shadow: "#04060f", highlight: "#1d2c66", rim: "#76a8ff" },
};

export function createSceneContent(options: CreateSceneOptions): SceneContent {
  const group = new Group();
  const outlines: OutlineHandle[] = [];

  const outlineThickness = 3.0;

  const build = (
    geometry: import("three").BufferGeometry,
    palette: typeof PALETTE.heroBody,
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
    group.add(mesh);

    const outline = createOutlineMesh(
      mesh,
      { thickness: outlineThickness, color: "#0a0c1a" },
      options.viewport,
    );
    attachOutline(mesh, outline);
    outlines.push(outline);

    return mesh;
  };

  // Hero: faceted icosahedron body with accent stripe box on top.
  build(
    new IcosahedronGeometry(1.1, 1),
    PALETTE.heroBody,
    [0, 1.1, 0],
    [0.2, 0.4, 0],
  );
  build(
    new BoxGeometry(0.4, 0.45, 1.6),
    PALETTE.heroAccent,
    [0, 2.0, 0],
    [0.0, 0.3, 0],
  );

  // Companion objects.
  const capsule = build(
    new CapsuleGeometry(0.55, 1.2, 4, 12),
    PALETTE.capsule,
    [-2.6, 0.9, 0.4],
    [0, 0.4, 0.2],
  );
  const torus = build(
    new TorusGeometry(0.8, 0.22, 12, 24),
    PALETTE.torus,
    [2.4, 0.9, -0.6],
    [Math.PI / 2.4, 0.4, 0],
  );
  const sphere = build(
    new SphereGeometry(0.7, 18, 14),
    PALETTE.sphere,
    [0.9, 0.7, 2.2],
  );

  // Ground plane, no outline.
  const ground = new Mesh(
    (() => {
      const g = new PlaneGeometry(40, 40, 1, 1);
      g.rotateX(-Math.PI / 2);
      return g;
    })(),
    new CelMaterial({
      baseColor: PALETTE.ground.base,
      shadowColor: PALETTE.ground.shadow,
      highlightColor: PALETTE.ground.highlight,
      rimColor: PALETTE.ground.rim,
      rimStrength: 0.0,
      bandCount: 3,
    }),
  );
  ground.position.y = 0;
  group.add(ground);

  // Apply outline viewport update hook for resize.
  for (const handle of outlines) {
    handle.mesh.userData.viewport = options.viewport;
  }

  return {
    group,
    outlines,
    update(deltaSeconds: number) {
      const t = performance.now() * 0.001;
      capsule.rotation.y += deltaSeconds * 0.6;
      torus.rotation.x += deltaSeconds * 0.4;
      torus.rotation.y += deltaSeconds * 0.25;
      sphere.position.y = 0.7 + Math.sin(t * 1.4) * 0.12;
      // Subtle key-light "drift" to show banding moving.
      const drift = Math.sin(t * 0.5) * 0.25;
      const lx = 0.4 + drift;
      const lz = 0.5 + Math.cos(t * 0.3) * 0.2;
      for (const child of group.children) {
        const mat = (child as Mesh).material;
        if (mat instanceof CelMaterial) {
          const dir = mat.uniforms.uKeyLightDir?.value as Vector3 | undefined;
          if (dir) dir.set(lx, 0.8, lz).normalize();
        }
      }
    },
  };
}

export function outlineViewport(outlines: OutlineHandle[]): Vector3 {
  const first = outlines[0];
  return (first?.mesh.userData.viewport as Vector3 | undefined) ?? new Vector3(1, 1, 1);
}
