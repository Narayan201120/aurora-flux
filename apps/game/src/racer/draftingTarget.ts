import { BoxGeometry, Group, Mesh, Vector3 } from "three";
import { CelMaterial } from "../rendering/cel/celMaterial.js";

/**
 * Placeholder ghost racer used as a drafting target until real AI arrives
 * in M8. Travels in world coordinates ahead of the player at a constant
 * forward speed.
 *
 * The exposed `position` Vector3 is in WORLD coordinates (used by drafting
 * math). The visual mesh is parented to the rebase worldRoot and offset to
 * stay near the player in render-space.
 */
export interface DraftingTargetOptions {
  offsetAhead: number;
  baseSpeed: number;
  laneAmplitude: number;
}

export interface DraftingTarget {
  group: Group;
  position: Vector3;
  velocity: Vector3;
  update: (deltaSeconds: number, playerPosition: Vector3, worldOrigin: Vector3) => void;
}

export function createDraftingTarget(options: DraftingTargetOptions): DraftingTarget {
  const group = new Group();
  group.name = "DraftingTarget";

  const body = new Mesh(
    new BoxGeometry(1.4, 0.4, 2.6),
    new CelMaterial({
      baseColor: "#ff7bd9",
      shadowColor: "#3a0c2e",
      highlightColor: "#fff0fb",
      rimColor: "#fff0fb",
    }),
  );
  body.position.set(0, 0.5, 0);
  group.add(body);

  const position = new Vector3();
  const velocity = new Vector3(0, 0, options.baseSpeed);
  let phase = 0;

  return {
    group,
    position,
    velocity,
    update(deltaSeconds: number, playerPosition: Vector3, worldOrigin: Vector3) {
      phase += deltaSeconds;
      const laneX = Math.sin(phase * 0.6) * options.laneAmplitude;
      const aheadDistance = options.offsetAhead + Math.sin(phase * 0.2) * 6;

      // World-space position used by drafting math.
      position.set(
        playerPosition.x + laneX,
        0.5,
        playerPosition.z + aheadDistance,
      );

      velocity.set(
        -Math.cos(phase * 0.6) * 0.6 * options.laneAmplitude,
        0,
        options.baseSpeed,
      );

      // Visual position = world position - origin (i.e., render-space).
      group.position.set(
        position.x - worldOrigin.x,
        position.y,
        position.z - worldOrigin.z,
      );
    },
  };
}