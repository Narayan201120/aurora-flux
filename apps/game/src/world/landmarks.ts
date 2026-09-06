import {
  AdditiveBlending,
  Color,
  ConeGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
} from "three";

export interface LandmarkSystem {
  group: Group;
  update: (time: number) => void;
}

const CRYSTAL_COLORS = [
  new Color("#4cf4ff"),
  new Color("#bc7cff"),
  new Color("#73ffd2"),
];

export function createLandmarkSystem(): LandmarkSystem {
  const group = new Group();
  group.name = "CelestialLandmarks";

  const crystalMaterial = new MeshBasicMaterial({
    color: "#65eaff",
    transparent: true,
    opacity: 0.78,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const crystals = new InstancedMesh(
    new OctahedronGeometry(1, 0),
    crystalMaterial,
    42,
  );
  const transform = new Object3D();
  for (let index = 0; index < crystals.count; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const lane = 18 + (index % 5) * 7;
    const z = 26 + (index % 9) * 26;
    transform.position.set(side * lane, 1.6 + (index % 4) * 2.4, z);
    transform.rotation.set(index * 0.17, index * 0.43, index * 0.11);
    const scale = 1.4 + (index % 5) * 0.55;
    transform.scale.set(0.55 * scale, 1.2 * scale, 0.55 * scale);
    transform.updateMatrix();
    crystals.setMatrixAt(index, transform.matrix);
    crystals.setColorAt(index, CRYSTAL_COLORS[index % CRYSTAL_COLORS.length]!);
  }
  crystals.instanceMatrix.needsUpdate = true;
  if (crystals.instanceColor) crystals.instanceColor.needsUpdate = true;
  crystals.name = "CrystalForestInstances";
  group.add(crystals);

  const archMaterial = new MeshBasicMaterial({
    color: "#ff72dc",
    transparent: true,
    opacity: 0.62,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const archGeometry = new TorusGeometry(13, 0.5, 12, 36);
  const archA = new Mesh(archGeometry, archMaterial);
  archA.name = "CelestialArchA";
  archA.position.set(28, 10, 84);
  group.add(archA);
  const archB = new Mesh(archGeometry, archMaterial.clone());
  archB.name = "CelestialArchB";
  archB.position.set(-42, 13, 214);
  archB.rotation.z = 0.2;
  group.add(archB);

  const moonMaterial = new MeshBasicMaterial({
    color: "#3d317a",
    transparent: true,
    opacity: 0.82,
    blending: AdditiveBlending,
  });
  const moonFragments: Mesh[] = [];
  for (let index = 0; index < 6; index += 1) {
    const moon = new Mesh(
      new IcosahedronGeometry(3.5 + index * 0.7, 1),
      moonMaterial.clone(),
    );
    moon.name = `ShatteredMoon-${index}`;
    moon.position.set(
      index % 2 === 0 ? -54 - index * 3 : 48 + index * 2,
      17 + (index % 3) * 6,
      48 + index * 41,
    );
    moon.rotation.set(index * 0.4, index * 0.2, index * 0.6);
    group.add(moon);
    moonFragments.push(moon);
  }

  const leviathan = createLeviathan();
  group.add(leviathan);

  return {
    group,
    update(time: number) {
      archA.rotation.z = Math.sin(time * 0.45) * 0.08;
      archB.rotation.z = 0.2 + Math.cos(time * 0.32) * 0.12;
      for (let index = 0; index < moonFragments.length; index += 1) {
        const moon = moonFragments[index]!;
        moon.rotation.x += 0.002 + index * 0.0004;
        moon.rotation.y -= 0.0015 + index * 0.0003;
      }
      leviathan.position.x = Math.sin(time * 0.18) * 48;
      leviathan.position.y = 22 + Math.sin(time * 0.7) * 2.5;
      leviathan.rotation.z = Math.cos(time * 0.18) * 0.12;
      leviathan.rotation.y = Math.cos(time * 0.18) > 0 ? 0.18 : Math.PI - 0.18;
    },
  };
}

function createLeviathan(): Group {
  const group = new Group();
  group.name = "MigratingStarLeviathan";
  group.position.set(-40, 22, 158);

  const bodyMaterial = new MeshBasicMaterial({
    color: "#71c8ff",
    transparent: true,
    opacity: 0.72,
    blending: AdditiveBlending,
  });
  const body = new Mesh(new SphereGeometry(5.6, 16, 10), bodyMaterial);
  body.scale.set(1.85, 0.7, 0.75);
  group.add(body);

  const glowMaterial = new MeshBasicMaterial({
    color: "#d6a4ff",
    transparent: true,
    opacity: 0.8,
    blending: AdditiveBlending,
  });
  const eye = new Mesh(new SphereGeometry(0.42, 8, 6), glowMaterial);
  eye.position.set(8.4, 0.7, -0.25);
  group.add(eye);

  const tail = new Mesh(new ConeGeometry(3.8, 7.5, 4), glowMaterial.clone());
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -10;
  group.add(tail);

  const finGeometry = new OctahedronGeometry(2.8, 0);
  for (const [x, y, z] of [
    [-1, 2.6, 0],
    [1, -2.6, 0],
  ] as const) {
    const fin = new Mesh(finGeometry, glowMaterial.clone());
    fin.scale.set(1.3, 0.4, 0.6);
    fin.position.set(x * 2.4, y, z);
    group.add(fin);
  }
  return group;
}
