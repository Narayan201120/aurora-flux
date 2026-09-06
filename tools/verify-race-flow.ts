import {
  CHECKPOINT_PROGRESS,
  FINISH_PROGRESS,
  createCheckpointSystem,
} from "../apps/game/src/racing/checkpoints.ts";
import { calculatePosition } from "../apps/game/src/racing/position.ts";
import { RaceState } from "../apps/game/src/racing/raceState.ts";
import { createTrackSystem } from "../apps/game/src/racing/track.ts";
import {
  HAZARD_DEFINITIONS,
  HAZARD_WARNING_DISTANCE,
  createHazardSystem,
} from "../apps/game/src/world/hazards.ts";
import { createLandmarkSystem } from "../apps/game/src/world/landmarks.ts";

const trackA = createTrackSystem();
const trackB = createTrackSystem();
const checkpointSystem = createCheckpointSystem(trackA);
const race = new RaceState();
const hazards = createHazardSystem(trackA);
const landmarks = createLandmarkSystem();

if (
  HAZARD_DEFINITIONS.length !== 6 ||
  !HAZARD_DEFINITIONS.some((hazard) => hazard.kind === "dark-matter")
) {
  throw new Error("Environmental hazard set is incomplete");
}
for (const name of [
  "CrystalForestInstances",
  "CelestialEclipseGate",
  "CelestialLeviathan",
  "StarWhaleNorth",
  "StarWhaleSouth",
]) {
  if (!landmarks.group.children.some((child) => child.name === name)) {
    throw new Error(`World landmark is missing: ${name}`);
  }
}

for (const progress of [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 0]) {
  const sampleA = trackA.sample(progress);
  const sampleB = trackB.sample(progress);
  if (
    !sampleA.position.equals(sampleB.position) ||
    !sampleA.tangent.equals(sampleB.tangent)
  ) {
    throw new Error(`Track sample is not deterministic at ${progress}`);
  }
}

let snapshot = race.snapshot();
if (snapshot.canControl || snapshot.phase !== "countdown") {
  throw new Error("Race should begin movement-locked");
}

for (let index = 0; index < 30; index += 1) {
  snapshot = race.update({
    deltaSeconds: 0.1,
    lapsCompleted: 0,
    routeAlignment: 1,
    speed: 0,
  });
}
if (!snapshot.canControl || snapshot.statusLabel !== "GO!") {
  throw new Error("Race did not unlock after the countdown");
}

for (let lap = 0; lap < 3; lap += 1) {
  for (const progress of CHECKPOINT_PROGRESS) {
    checkpointSystem.update(trackA.sample(progress).position, 0);
  }
  checkpointSystem.update(trackA.sample(FINISH_PROGRESS).position, 0);
  snapshot = race.update({
    deltaSeconds: 0.1,
    lapsCompleted: checkpointSystem.state.lapsCompleted,
    routeAlignment: 1,
    speed: 70,
  });
}

if (
  checkpointSystem.state.lapsCompleted !== 3 ||
  snapshot.phase !== "finished"
) {
  throw new Error("Three-lap checkpoint flow did not finish");
}

const position = calculatePosition({ id: "player", lap: 2, progress: 0.7 }, [
  { id: "ace", lap: 2, progress: 0.9 },
  { id: "tech", lap: 2, progress: 0.5 },
  { id: "wild", lap: 1, progress: 0.95 },
]);
if (position.place !== 2 || position.total !== 4) {
  throw new Error("Position ordering is incorrect");
}

const warningSnapshot = hazards.update(0, 0, trackA.sample(0.12).position);
const meteorWarning = warningSnapshot.warnings.find(
  (warning) => warning.kind === "meteor",
);
if (
  !meteorWarning ||
  meteorWarning.distance <= 0 ||
  meteorWarning.distance > HAZARD_WARNING_DISTANCE
) {
  throw new Error("Hazard warning did not provide forward reaction time");
}

const afterMeteorSnapshot = hazards.update(0, 0, trackA.sample(0.2).position);
if (afterMeteorSnapshot.warnings.some((warning) => warning.kind === "meteor")) {
  throw new Error("Hazard warning remained active after the hazard was passed");
}

const gravityMesh = hazards.group.children.find(
  (child) => child.name === "gravity-hazard",
);
if (!gravityMesh) throw new Error("Gravity hazard visual was not created");
const gravitySnapshot = hazards.update(0, 0, gravityMesh.position.clone());
if (
  !gravitySnapshot.effect.active ||
  gravitySnapshot.activeLabel !== "GRAVITY WELL"
) {
  throw new Error("Gravity well did not apply its gameplay effect");
}

const darkMatterMesh = hazards.group.children.find(
  (child) => child.name === "dark-matter-hazard",
);
if (!darkMatterMesh)
  throw new Error("Dark matter storm visual was not created");
const darkMatterSnapshot = hazards.update(
  0,
  4,
  darkMatterMesh.position.clone(),
);
if (
  !darkMatterSnapshot.effect.active ||
  darkMatterSnapshot.effect.visibilityMultiplier >= 1
) {
  throw new Error("Dark matter storm did not reduce visibility while active");
}

const wrongWayRace = new RaceState();
for (let index = 0; index < 31; index += 1) {
  wrongWayRace.update({
    deltaSeconds: 0.1,
    lapsCompleted: 0,
    routeAlignment: 1,
    speed: 0,
  });
}
snapshot = wrongWayRace.update({
  deltaSeconds: 0.6,
  lapsCompleted: 0,
  routeAlignment: -1,
  speed: 40,
});
if (!snapshot.wrongWay) {
  throw new Error("Wrong-way warning did not trigger");
}

console.log(
  `race flow verified: ${trackA.length.toFixed(1)}m course, 3 laps, position ordering, wrong-way warning, six hazards, world landmarks`,
);
