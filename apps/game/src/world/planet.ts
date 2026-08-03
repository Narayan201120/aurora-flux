import { Group, Mesh, SphereGeometry } from "three";
import { CelMaterial } from "../rendering/cel/celMaterial.js";
import { SeededRng } from "./seededRng.js";

export interface PlanetSpec {
  radius: number;
  distance: number;
  inclination: number;
  azimuth: number;
  baseColor: string;
  shadowColor: string;
  highlightColor: string;
  rimColor: string;
  rotationSpeed: number;
  seed: number;
}

const PALETTE: ReadonlyArray<{
  base: string;
  shadow: string;
  highlight: string;
  rim: string;
}> = [
  { base: "#67c3ff", shadow: "#0a1430", highlight: "#e1f1ff", rim: "#ffe6b8" },
  { base: "#ff7aa6", shadow: "#2a0c1a", highlight: "#ffd9e6", rim: "#fff0c8" },
  { base: "#9a7dff", shadow: "#1a0c30", highlight: "#dccaff", rim: "#a8fff0" },
  { base: "#7cffa6", shadow: "#0a2614", highlight: "#d9ffe5", rim: "#ffe8a3" },
  { base: "#ffd07c", shadow: "#3a1a06", highlight: "#fff5db", rim: "#ffb0c0" },
];

export interface PlanetSystemOptions {
  count: number;
  minDistance: number;
  maxDistance: number;
  seed: number;
}

export function createPlanetSystem(options: PlanetSystemOptions): {
  group: Group;
  update: (deltaSeconds: number) => void;
} {
  const group = new Group();
  const rng = new SeededRng(options.seed);
  const meshes: { mesh: Mesh; speed: number }[] = [];

  for (let i = 0; i < options.count; i += 1) {
    const palette = PALETTE[i % PALETTE.length]!;
    const distance = rng.range(options.minDistance, options.maxDistance);
    const inclination = rng.range(-0.5, 0.5);
    const azimuth = rng.range(0, Math.PI * 2);
    const radius = rng.range(40, 110);
    const rotationSpeed = rng.range(0.02, 0.08);

    const geometry = new SphereGeometry(radius, 32, 24);
    const material = new CelMaterial({
      baseColor: palette.base,
      shadowColor: palette.shadow,
      highlightColor: palette.highlight,
      rimColor: palette.rim,
      rimStrength: 1.4,
      rimPower: 1.6,
      bandCount: 3,
    });

    const mesh = new Mesh(geometry, material);
    mesh.position.set(
      Math.sin(azimuth) * distance,
      Math.sin(inclination) * distance * 0.45,
      Math.cos(azimuth) * distance,
    );
    mesh.userData.baseAzimuth = azimuth;
    mesh.userData.baseInclination = inclination;
    mesh.userData.distance = distance;
    group.add(mesh);
    meshes.push({ mesh, speed: rotationSpeed });
  }

  return {
    group,
    update(deltaSeconds: number) {
      const t = performance.now() * 0.001;
      for (const entry of meshes) {
        const mesh = entry.mesh;
        const baseAzimuth = mesh.userData.baseAzimuth as number;
        const baseInclination = mesh.userData.baseInclination as number;
        const distance = mesh.userData.distance as number;
        const azimuth = baseAzimuth + t * entry.speed * 0.05;
        mesh.position.set(
          Math.sin(azimuth) * distance,
          Math.sin(baseInclination) * distance * 0.45 + Math.sin(t * entry.speed) * 4,
          Math.cos(azimuth) * distance,
        );
        mesh.rotation.y = t * entry.speed;
      }
      void deltaSeconds;
    },
  };
}
