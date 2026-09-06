import { Group } from "three";
import type { QualityTier } from "../config/config.js";
import { createNebulaField, type NebulaFieldOptions } from "../world/nebula.js";
import {
  createPlanetSystem,
  type PlanetSystemOptions,
} from "../world/planet.js";
import { createStarfield, type StarfieldOptions } from "../world/starfield.js";
import {
  createAuroraRiver,
  type AuroraRiverOptions,
} from "../world/auroraRiver.js";
import { FlowField } from "../world/flowField.js";
import {
  createLandmarkSystem,
  type LandmarkSystem,
} from "../world/landmarks.js";

export interface EnvironmentOptions {
  starfield: StarfieldOptions;
  planets: PlanetSystemOptions;
  nebula: NebulaFieldOptions;
  aurora: AuroraRiverOptions;
}

export interface Environment {
  group: Group;
  flow: FlowField;
  landmarks: LandmarkSystem;
  update: (deltaSeconds: number, time: number) => void;
  setQuality: (tier: QualityTier) => void;
}

export function createEnvironment(options: EnvironmentOptions): Environment {
  const group = new Group();
  group.name = "Environment";

  const starfield = createStarfield(options.starfield);
  group.add(starfield.group);

  const planets = createPlanetSystem(options.planets);
  group.add(planets.group);

  const nebula = createNebulaField(options.nebula);
  group.add(nebula.group);

  const flow = new FlowField(0.012);
  const aurora = createAuroraRiver(options.aurora);
  group.add(aurora.group);
  const landmarks = createLandmarkSystem();
  group.add(landmarks.group);

  return {
    group,
    flow,
    landmarks,
    update(_deltaSeconds: number, time: number) {
      starfield.update(time);
      planets.update(_deltaSeconds);
      nebula.update(time);
      aurora.update(time, flow);
      landmarks.update(time);
    },
    setQuality(tier: QualityTier) {
      starfield.setQuality(tier);
      nebula.setQuality(tier);
      landmarks.setQuality(tier);
    },
  };
}
