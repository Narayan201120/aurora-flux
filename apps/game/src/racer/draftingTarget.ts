import { BoxGeometry, Group, Mesh, Vector3 } from "three";
import { CelMaterial } from "../rendering/cel/celMaterial.js";

/**
 * Placeholder ghost racer used as a drafting target until real AI arrives
 * in M8. Travels in world coordinates ahead of the player at a constant
 * forward speed.
 *
 * The exposed `position` Vector3 and visual mesh position are both in world
 * coordinates. Its rebased parent supplies the world-to-render translation.
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
  update: (deltaSeconds: number, playerPosition: Vector3) => void;
}

export function createDraftingTarget(
  options: DraftingTargetOptions,
): DraftingTarget {
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
    update(deltaSeconds: number, playerPosition: Vector3) {
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

      // The rebased parent handles conversion into render-space.
      group.position.set(position.x, position.y, position.z);
    },
  };
}
