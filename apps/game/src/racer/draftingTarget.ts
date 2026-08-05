import { BoxGeometry, Group, Mesh, Vector3 } from "three";
import { CelMaterial } from "../rendering/cel/celMaterial.js";

/**
 * Placeholder "ghost" racer used as a drafting target until real AI arrives
 * in M8. Travels a straight line ahead of the player; loops when far.
 *
 * Public API exposes `position` and `velocity` so the racer can read them to
 * compute draft speed bonuses and visual references.
 */
export interface DraftingTargetOptions {
  offsetAhead: number;
  baseSpeed: number;
  loopLength: number;
  laneAmplitude: number;
}

export interface DraftingTarget {
  group: Group;
  position: Vector3;
  velocity: Vector3;
  update: (deltaSeconds: number, playerPosition: Vector3) => void;
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
    update(deltaSeconds: number, playerPosition: Vector3) {
      phase += deltaSeconds;
      // Lane oscillation so the ghost weaves slightly (more interesting target).
      const laneX = Math.sin(phase * 0.6) * options.laneAmplitude;
      // Wrap forward distance so the ghost stays near the player.
      const aheadDistance = options.offsetAhead + Math.sin(phase * 0.2) * 6;

      position.set(
        playerPosition.x + laneX,
        0.5,
        playerPosition.z + aheadDistance,
      );

      velocity.set(-Math.cos(phase * 0.6) * 0.6 * options.laneAmplitude, 0, options.baseSpeed);
      group.position.copy(position);
    },
  };
}