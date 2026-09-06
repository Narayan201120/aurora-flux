import { Color, Group, Vector2, Vector3, WebGLRenderer } from "three";
import { AudioSystem, type AudioSnapshot } from "./audio/audioSystem.js";
import { AdaptiveQuality } from "./core/adaptiveQuality.js";
import { GameLoop } from "./core/gameLoop.js";
import { FpsMeter } from "./core/fpsMeter.js";
import {
  PerformanceMonitor,
  type PerformanceSnapshot,
} from "./core/performanceMonitor.js";
import {
  DEFAULT_CONFIG,
  presetForTier,
  type QualityTier,
} from "./config/config.js";
import { KeyboardControls } from "./racer/controls.js";
import { ChaseCamera } from "./racer/chaseCamera.js";
import { Racer } from "./racer/racer.js";
import { createRacerMesh } from "./racer/racerMesh.js";
import {
  createObstaclesField,
  type ObstaclesField,
} from "./racer/obstacles.js";
import { calculatePosition } from "./racing/position.js";
import {
  createOpponentSystem,
  type OpponentSystem,
} from "./racing/opponents.js";
import {
  createCheckpointSystem,
  type CheckpointSystem,
} from "./racing/checkpoints.js";
import { RaceState } from "./racing/raceState.js";
import { createTrackSystem, type TrackSystem } from "./racing/track.js";
import { FpsOverlay } from "./rendering/fpsOverlay.js";
import {
  createVisualFxPool,
  type VisualFxPool,
} from "./rendering/effects/visualFxPool.js";
import {
  createPostProcess,
  type PostProcessContext,
} from "./rendering/postprocess/composer.js";
import { RaceHud } from "./rendering/raceHud.js";
import { RaceStatusOverlay } from "./rendering/raceStatusOverlay.js";
import {
  createVisualState,
  updateVisualState,
} from "./rendering/visualState.js";
import {
  createBaseScene,
  createCamera,
  createRenderer,
} from "./rendering/renderer.js";
import { ResizeHandler } from "./rendering/resizeHandler.js";
import { createEnvironment, type Environment } from "./scene/environment.js";
import { createHazardSystem, type HazardSystem } from "./world/hazards.js";
import { WorldRebase } from "./world/origin.js";

interface ApplicationState {
  loop: GameLoop;
  resize: ResizeHandler;
  fps: FpsOverlay;
  hud: RaceHud;
  status: RaceStatusOverlay;
  meter: FpsMeter;
  telemetry: PerformanceMonitor;
  quality: AdaptiveQuality;
  worldRoot: Group;
  environment: Environment;
  track: TrackSystem;
  checkpoints: CheckpointSystem;
  hazards: HazardSystem;
  opponents: OpponentSystem;
  obstacles: ObstaclesField;
  rebase: WorldRebase;
  renderer: WebGLRenderer;
  post: PostProcessContext;
  visualFx: VisualFxPool;
  gpuLabel: string;
  viewport: Vector3;
  racer: Racer;
  controls: KeyboardControls;
  chase: ChaseCamera;
  race: RaceState;
  audio: AudioSystem;
}

interface BrowserTestApi {
  teleportToProgress: (progress: number) => void;
  snapshot: () => {
    phase: string;
    lapsCompleted: number;
    nextCheckpoint: number;
    audio: AudioSnapshot;
    performance: PerformanceSnapshot;
  };
}

declare global {
  interface Window {
    __auroraFluxTest?: BrowserTestApi;
  }
}

function tierFor(renderer: WebGLRenderer): QualityTier {
  const gl = renderer.getContext();
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  if (!debugInfo) return DEFAULT_CONFIG.startingTier;
  const name = String(
    gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "",
  ).toLowerCase();
  if (name.includes("swiftshader") || name.includes("llvmpipe")) return "low";
  if (
    name.includes("intel") &&
    (name.includes("hd graphics") || name.includes("uhd"))
  )
    return "medium";
  return "high";
}

function gpuShortName(renderer: WebGLRenderer): string {
  const gl = renderer.getContext();
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  if (!debugInfo) return "unknown";
  const raw = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "");
  return raw.length > 38 ? `${raw.slice(0, 35)}…` : raw || "unknown";
}

function bootstrap(): void {
  const container = requiredElement("app");
  const overlayRoot = requiredElement("fps-overlay");
  const raceStatusRoot = requiredElement("race-status");
  const hudRoot = requiredElement("race-hud");
  const initialSize = new Vector2(
    container.clientWidth,
    container.clientHeight,
  );
  const viewport = new Vector3(initialSize.x, initialSize.y, 1);

  const renderer = createRenderer(
    container,
    presetForTier(DEFAULT_CONFIG.startingTier),
  );
  const camera = createCamera(container);
  const scene = createBaseScene();
  const worldRoot = new Group();
  worldRoot.name = "WorldRoot";
  scene.add(worldRoot);

  const environment = createEnvironment({
    starfield: { pixelRatio: renderer.getPixelRatio() },
    planets: { count: 6, minDistance: 800, maxDistance: 1400, seed: 0x5eed5 },
    nebula: {
      domes: [
        {
          radius: 1800,
          colorA: "#0a1030",
          colorB: "#2a1850",
          colorC: "#ff5a9a",
          intensity: 0.85,
        },
        {
          radius: 1600,
          colorA: "#04081c",
          colorB: "#0a3060",
          colorC: "#76ffd5",
          intensity: 0.7,
        },
        {
          radius: 1400,
          colorA: "#0a0814",
          colorB: "#1f0830",
          colorC: "#7c5cff",
          intensity: 0.55,
        },
      ],
    },
    aurora: {
      layers: [
        {
          length: 600,
          segments: 80,
          width: 50,
          layer: 0,
          yOffset: 8,
          colorNear: "#76ffd5",
          colorMid: "#2fc7ff",
          colorFar: "#9b6dff",
          intensity: 1.1,
        },
        {
          length: 700,
          segments: 80,
          width: 70,
          layer: 1,
          yOffset: 16,
          colorNear: "#a8ff7a",
          colorMid: "#67e5ff",
          colorFar: "#ff7bd9",
          intensity: 0.85,
        },
        {
          length: 800,
          segments: 80,
          width: 90,
          layer: 2,
          yOffset: 24,
          colorNear: "#ff9be0",
          colorMid: "#9a7dff",
          colorFar: "#76ffd5",
          intensity: 0.7,
        },
      ],
    },
  });
  worldRoot.add(environment.group);

  const track = createTrackSystem();
  const checkpoints = createCheckpointSystem(track);
  const hazards = createHazardSystem(track);
  const opponents = createOpponentSystem({ viewport, track });
  const obstacles = createObstaclesField({
    viewport,
    initialPositions: [
      new Vector3(-4, 0.6, 34),
      new Vector3(3.5, 0.6, 72),
      new Vector3(-2.5, 0.6, 126),
      new Vector3(4, 0.6, 184),
      new Vector3(-5, 0.6, 246),
    ],
    recycleAhead: 260,
    recycleBehind: -12,
  });
  worldRoot.add(
    track.group,
    checkpoints.group,
    hazards.group,
    opponents.group,
    obstacles.group,
  );

  const racerMesh = createRacerMesh({ viewport });
  const racer = new Racer(racerMesh.group);
  const startPosition = track.sample(0).position.clone();
  startPosition.y += 0.3;
  racer.reset(startPosition, 0);
  scene.add(racerMesh.group);

  const rebase = new WorldRebase({ chunkSize: 256 });
  const chase = new ChaseCamera(camera);
  const controls = new KeyboardControls(window);
  const post = createPostProcess(renderer, {
    width: container.clientWidth,
    height: container.clientHeight,
    pixelRatio: renderer.getPixelRatio(),
  });
  post.speedLinePass.setEnabled(true);
  post.impactPulsePass.setEnabled(true);
  const visualFx = createVisualFxPool({ quality: tierFor(renderer) });
  worldRoot.add(visualFx.group);
  const resize = new ResizeHandler([
    {
      element: container,
      camera,
      setSize: (width: number, height: number) => {
        renderer.setSize(width, height, false);
        post.resize(width, height);
        viewport.set(width, height, 1);
      },
    },
  ]);
  const overlay = new FpsOverlay(overlayRoot);
  if (!new URLSearchParams(window.location.search).has("debug")) overlay.hide();
  const status = new RaceStatusOverlay(raceStatusRoot);
  const meter = new FpsMeter();
  const telemetry = new PerformanceMonitor();
  const quality = new AdaptiveQuality(
    renderer,
    tierFor(renderer),
    (tier) => {
      environment.setQuality(tier);
      post.setQuality(tier);
      visualFx.setQuality(tier);
    },
  );
  const race = new RaceState();
  const audio = new AudioSystem();
  const visualState = createVisualState();
  let timeSeconds = 0;
  let lastBoostFlag = false;
  let lastImpactFlag = false;
  let exposureFlash = 0;
  let boostPulse = 0;
  let impactPulse = 0;
  let nextSparkTime = 0;
  let nextWakeTime = 0;
  let fxSeed = 1;
  const fxPosition = new Vector3();
  const fxVelocity = new Vector3();
  const sparkColor = new Color("#9affe0");
  const wakeColor = new Color("#72f8ff");
  const impactColor = new Color("#ff78ce");

  const resetRace = (): void => {
    racer.reset(startPosition, 0);
    checkpoints.reset();
    hazards.reset();
    opponents.reset();
    obstacles.reset();
    race.reset();
    rebase.update(racer.position);
    lastBoostFlag = false;
    lastImpactFlag = false;
    exposureFlash = 0;
    boostPulse = 0;
    impactPulse = 0;
    nextSparkTime = 0;
    nextWakeTime = 0;
    visualFx.reset();
  };
  const hud = new RaceHud(hudRoot, track, resetRace);
  if (new URLSearchParams(window.location.search).has("test")) {
    window.__auroraFluxTest = {
      teleportToProgress: (progress: number) => {
        const sample = track.sample(progress);
        racer.position.copy(sample.position);
        racer.position.y += 0.3;
        racer.velocity.copy(sample.tangent).multiplyScalar(64);
        racer.speed = 64;
        checkpoints.update(racer.position, timeSeconds);
      },
      snapshot: () => ({
        phase: race.snapshot().phase,
        lapsCompleted: checkpoints.state.lapsCompleted,
        nextCheckpoint: checkpoints.state.nextIndex,
        audio: audio.snapshot(),
        performance: telemetry.snapshot(),
      }),
    };
  }

  const renderPlayer = new Vector3();
  const origin = new Vector3();
  const loop = new GameLoop({
    onUpdate: (deltaSeconds: number) => {
      const cpuStart = performance.now();
      timeSeconds += deltaSeconds;
      const priorRace = race.snapshot();
      const playerDistance =
        checkpoints.state.lapsCompleted + checkpoints.state.routeProgress;
      const hazardSnapshot = hazards.update(
        deltaSeconds,
        timeSeconds,
        racer.position,
      );
      obstacles.update(deltaSeconds, racer.position);
      opponents.update(
        deltaSeconds,
        timeSeconds,
        priorRace.phase,
        playerDistance,
        racer.position,
        hazardSnapshot,
        obstacles.spheres,
      );
      const rawInput = priorRace.canControl
        ? controls.sample()
        : {
            throttle: 0,
            steer: 0,
            brake: false,
            handbrake: false,
            boost: false,
          };
      const input = {
        ...rawInput,
        steer: rawInput.steer * hazardSnapshot.effect.steeringMultiplier,
      };
      const draftTarget = opponents.draftTarget(racer.position, racer.heading);
      racer.applyInput(input, deltaSeconds, draftTarget);
      if (hazardSnapshot.effect.active) {
        racer.speed *= hazardSnapshot.effect.speedMultiplier;
        racer.velocity.multiplyScalar(hazardSnapshot.effect.speedMultiplier);
      }

      const rebaseDelta = rebase.update(racer.position);
      origin.copy(rebase.currentOrigin);
      renderPlayer.copy(racer.position).sub(origin);
      if (rebaseDelta.lengthSq() > 0) chase.shiftRenderOrigin(rebaseDelta);
      racerMesh.group.position.copy(renderPlayer);
      chase.update(
        renderPlayer,
        racer.heading,
        racer.speed,
        racer.drifting,
        racer.steerAngle,
        deltaSeconds,
      );

      worldRoot.position.set(-origin.x, -origin.y, -origin.z);
      visualFx.update(timeSeconds);
      environment.group.position.copy(racer.position);
      checkpoints.update(racer.position, timeSeconds);
      for (const sphere of obstacles.spheres) racer.applyImpact(sphere);
      const raceSnapshot = race.update({
        deltaSeconds,
        lapsCompleted: checkpoints.state.lapsCompleted,
        routeAlignment: routeAlignment(
          racer.velocity,
          checkpoints.state.routeTangent,
        ),
        speed: racer.speed,
      });
      racerMesh.rider.update({
        time: timeSeconds,
        throttle: input.throttle,
        steerAngle: racer.steerAngle,
        drifting: racer.drifting,
        boostActive: racer.boostActive,
        impactActive: racer.recoveryTimer > 0,
        victory: raceSnapshot.phase === "finished",
      });
      const racerSnapshot = racer.snapshot();
      const opponentSnapshots = opponents.snapshots();
      const position = calculatePosition(
        {
          id: "player",
          lap: checkpoints.state.lapsCompleted,
          progress: checkpoints.state.routeProgress,
        },
        opponentSnapshots.map((opponent) => ({
          id: opponent.id,
          lap: opponent.lap,
          progress: opponent.progress,
        })),
      );
      hud.render({
        race: raceSnapshot,
        racer: racerSnapshot,
        position,
        routeProgress: checkpoints.state.routeProgress,
        hazards: hazardSnapshot,
        opponents: opponentSnapshots,
      });
      status.render(raceSnapshot);
      audio.update({
        racer: racerSnapshot,
        race: raceSnapshot,
        hazards: hazardSnapshot,
      });
      updateVisualState(visualState, {
        time: timeSeconds,
        progress: checkpoints.state.routeProgress,
        racer: racerSnapshot,
        hazards: hazardSnapshot,
        audio: audio.reactiveState(),
        quality: quality.tier,
      });
      quality.update(meter.current.frameMs);
      renderer.toneMappingExposure =
        hazardSnapshot.effect.visibilityMultiplier + exposureFlash;
      exposureFlash = Math.max(0, exposureFlash - deltaSeconds * 3.8);

      track.update(timeSeconds);
      environment.update(deltaSeconds, timeSeconds);
      if (racer.boostActive && !lastBoostFlag) {
        chase.triggerFovPulse(8, 0.6);
        chase.triggerShake(0.12, 0.25);
        exposureFlash = Math.max(exposureFlash, 0.22);
        boostPulse = 1;
      }
      lastBoostFlag = racer.boostActive;
      const inRecovery = racer.lastImpact !== null && racer.recoveryTimer > 0;
      if (inRecovery && !lastImpactFlag) {
        chase.triggerShake(0.25, 0.35);
        impactPulse = 1;
        fxPosition.copy(racer.position);
        fxVelocity.copy(racer.velocity).multiplyScalar(0.15);
        visualFx.spawnImpactBurst(
          timeSeconds,
          fxPosition,
          fxVelocity,
          impactColor,
          1.8,
          0.42,
          0.95,
          racer.heading,
          fxSeed,
        );
        fxSeed += 1;
      }
      lastImpactFlag = inRecovery;
      if (racer.drifting && timeSeconds >= nextSparkTime) {
        fxPosition.copy(racer.position);
        fxPosition.y -= 0.3;
        fxVelocity.copy(racer.velocity).multiplyScalar(-0.18);
        visualFx.spawnDriftSpark(
          timeSeconds,
          fxPosition,
          fxVelocity,
          sparkColor,
          0.28,
          0.32,
          0.78,
          racer.heading,
          fxSeed,
        );
        fxSeed += 1;
        nextSparkTime = timeSeconds + 0.035;
      }
      if (Math.abs(racer.speed) > 9 && timeSeconds >= nextWakeTime) {
        fxPosition.copy(racer.position);
        fxPosition.y -= 0.42;
        fxVelocity.copy(racer.velocity).multiplyScalar(-0.25);
        visualFx.spawnEngineWake(
          timeSeconds,
          fxPosition,
          fxVelocity,
          racer.boostActive ? impactColor : wakeColor,
          racer.boostActive ? 0.34 : 0.22,
          0.38,
          racer.boostActive ? 0.92 : 0.58,
          racer.heading,
          fxSeed,
        );
        fxSeed += 1;
        nextWakeTime = timeSeconds + 0.07;
      }
      boostPulse = Math.max(0, boostPulse - deltaSeconds * 2.4);
      impactPulse = Math.max(0, impactPulse - deltaSeconds * 3.8);
      post.speedLinePass.update(
        timeSeconds,
        visualState.speed01,
        visualState.boost01,
        visualState.draft01,
      );
      post.impactPulsePass.setPulses(boostPulse, impactPulse);
      telemetry.recordCpu(performance.now() - cpuStart);
    },
    onRender: () => {
      const renderStart = performance.now();
      post.render(scene, camera);
      telemetry.recordRender(performance.now() - renderStart, renderer.info);
    },
  });

  const state: ApplicationState = {
    loop,
    resize,
    fps: overlay,
    hud,
    status,
    meter,
    telemetry,
    quality,
    worldRoot,
    environment,
    track,
    checkpoints,
    hazards,
    opponents,
    obstacles,
    rebase,
    renderer,
    post,
    visualFx,
    gpuLabel: gpuShortName(renderer),
    viewport,
    racer,
    controls,
    chase,
    race,
    audio,
  };

  const unlockAudio = (): void => audio.unlock();
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);
  resize.attach();
  loop.start();
  startMeter(state);
  startOverlayUpdates(state);
  window.addEventListener("beforeunload", () => {
    loop.stop();
    resize.detach();
    hud.dispose();
    visualFx.dispose();
    audio.dispose();
    renderer.dispose();
    controls.dispose();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
    delete window.__auroraFluxTest;
  });
}

function routeAlignment(velocity: Vector3, tangent: Vector3): number {
  const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
  if (horizontalSpeed <= 0.001) return 1;
  return (velocity.x * tangent.x + velocity.z * tangent.z) / horizontalSpeed;
}

function requiredElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement))
    throw new Error(`Missing #${id} element`);
  return element;
}

function startMeter(state: ApplicationState): void {
  let lastFrameTime = performance.now();
  const tick = (now: number): void => {
    const delta = now - lastFrameTime;
    lastFrameTime = now;
    state.meter.update(delta);
    if (state.loop.isRunning) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function startOverlayUpdates(state: ApplicationState): void {
  window.setInterval(() => {
    if (!state.loop.isRunning) return;
    const raceSnapshot = state.race.snapshot();
    const performanceSnapshot = state.telemetry.snapshot();
    state.fps.render({
      fps: state.meter.current.fps,
      frameMs: state.meter.current.frameMs,
      drawCalls: state.renderer.info.render.calls,
      triangles: state.renderer.info.render.triangles,
      quality: state.quality.tier,
      renderer: state.gpuLabel,
      speed: state.racer.speed,
      driftCharge: state.racer.driftCharge,
      boostActive: state.racer.boostActive,
      boostCooldown: state.racer.boostCooldownTimer,
      drafting: state.racer.drafting.intensity,
      lap: raceSnapshot.lap,
      totalLaps: raceSnapshot.totalLaps,
      wrongWay: raceSnapshot.wrongWay,
      cpuMs: performanceSnapshot.cpuMs,
      renderMs: performanceSnapshot.renderMs,
      geometries: performanceSnapshot.geometries,
      textures: performanceSnapshot.textures,
    });
  }, 250);
}

function main(): void {
  if (document.readyState === "loading")
    window.addEventListener("DOMContentLoaded", bootstrap);
  else bootstrap();
}

main();
