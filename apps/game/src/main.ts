import { Group, Vector2, Vector3, WebGLRenderer } from "three";
import { DEFAULT_CONFIG, presetForTier, type QualityTier } from "./config/config.js";
import { GameLoop } from "./core/gameLoop.js";
import { FpsMeter } from "./core/fpsMeter.js";
import {
  createBaseScene,
  createCamera,
  createRenderer,
} from "./rendering/renderer.js";
import { ResizeHandler } from "./rendering/resizeHandler.js";
import { FpsOverlay } from "./rendering/fpsOverlay.js";
import { createPostProcess, type PostProcessContext } from "./rendering/postprocess/composer.js";
import { createEnvironment, type Environment } from "./scene/environment.js";
import { WorldRebase } from "./world/origin.js";
import { createRacerMesh } from "./racer/racerMesh.js";
import { Racer } from "./racer/racer.js";
import { KeyboardControls } from "./racer/controls.js";
import { ChaseCamera } from "./racer/chaseCamera.js";
import { createDraftingTarget, type DraftingTarget } from "./racer/draftingTarget.js";
import { createObstaclesField, type ObstaclesField } from "./racer/obstacles.js";

interface ApplicationState {
  loop: GameLoop;
  resize: ResizeHandler;
  fps: FpsOverlay;
  meter: FpsMeter;
  worldRoot: Group;
  environment: Environment;
  obstacles: ObstaclesField;
  draftTarget: DraftingTarget;
  rebase: WorldRebase;
  renderer: WebGLRenderer;
  post: PostProcessContext;
  tier: QualityTier;
  gpuLabel: string;
  viewport: Vector3;
  racer: Racer;
  controls: KeyboardControls;
  chase: ChaseCamera;
}

function tierFor(renderer: WebGLRenderer): QualityTier {
  const gl = renderer.getContext();
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  if (!debugInfo) return DEFAULT_CONFIG.startingTier;
  const name = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "").toLowerCase();
  if (name.includes("swiftshader") || name.includes("llvmpipe")) return "low";
  if (name.includes("intel") && (name.includes("hd graphics") || name.includes("uhd"))) return "medium";
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
  const container = document.getElementById("app");
  if (!container) throw new Error("Missing #app container");

  const overlayRoot = document.getElementById("fps-overlay");
  if (!overlayRoot) throw new Error("Missing #fps-overlay element");

  const initialSize = new Vector2(container.clientWidth, container.clientHeight);
  const viewport = new Vector3(initialSize.x, initialSize.y, 1);

  const renderer = createRenderer(container, presetForTier(DEFAULT_CONFIG.startingTier));
  const camera = createCamera(container);

  const scene = createBaseScene();

  // World root holds everything that should float with the rebase.
  // Its position is shifted each frame so render-space coords stay bounded.
  const worldRoot = new Group();
  worldRoot.name = "WorldRoot";
  scene.add(worldRoot);

  const environment = createEnvironment({
    starfield: { pixelRatio: renderer.getPixelRatio() },
    planets: { count: 6, minDistance: 800, maxDistance: 1400, seed: 0x5EED5 },
    nebula: {
      domes: [
        { radius: 1800, colorA: "#0a1030", colorB: "#2a1850", colorC: "#ff5a9a", intensity: 0.85 },
        { radius: 1600, colorA: "#04081c", colorB: "#0a3060", colorC: "#76ffd5", intensity: 0.7 },
        { radius: 1400, colorA: "#0a0814", colorB: "#1f0830", colorC: "#7c5cff", intensity: 0.55 },
      ],
    },
    aurora: {
      layers: [
        { length: 600, segments: 80, width: 50, layer: 0, yOffset: 8, colorNear: "#76ffd5", colorMid: "#2fc7ff", colorFar: "#9b6dff", intensity: 1.1 },
        { length: 700, segments: 80, width: 70, layer: 1, yOffset: 16, colorNear: "#a8ff7a", colorMid: "#67e5ff", colorFar: "#ff7bd9", intensity: 0.85 },
        { length: 800, segments: 80, width: 90, layer: 2, yOffset: 24, colorNear: "#ff9be0", colorMid: "#9a7dff", colorFar: "#76ffd5", intensity: 0.7 },
      ],
    },
  });
  worldRoot.add(environment.group);

  // Racer at absolute world coords (never shifted).
  const racerMesh = createRacerMesh({ viewport });
  const racer = new Racer(racerMesh.group);
  racer.position.set(0, 0.6, 0);
  racer.heading = 0;
  scene.add(racerMesh.group);

  // Drafting target — lives in render-space (under worldRoot).
  const draftTarget = createDraftingTarget({
    offsetAhead: 18,
    baseSpeed: 70,
    laneAmplitude: 1.6,
  });
  worldRoot.add(draftTarget.group);

  // Obstacles — render-space mesh, world-space collision sphere.
  const obstacles = createObstaclesField({
    viewport,
    initialPositions: [
      new Vector3(-3, 0.6, 30),
      new Vector3(2.5, 0.6, 65),
      new Vector3(-1.5, 0.6, 105),
      new Vector3(3.5, 0.6, 150),
      new Vector3(-2.5, 0.6, 200),
    ],
    recycleAhead: 220,
    recycleBehind: -10,
  });
  worldRoot.add(obstacles.group);

  const rebase = new WorldRebase({ chunkSize: 256 });

  const chase = new ChaseCamera(camera);
  const controls = new KeyboardControls(window);

  const post = createPostProcess(renderer, {
    width: container.clientWidth,
    height: container.clientHeight,
    pixelRatio: renderer.getPixelRatio(),
  });

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
  const meter = new FpsMeter();
  const tier = tierFor(renderer);
  applyTier(renderer, tier);

  // Scratch vectors used in the hot loop.
  const renderPlayer = new Vector3();
  const origin = new Vector3();
  let lastBoostFlag = false;
  let lastImpactFlag = false;

  const loop = new GameLoop({
    onUpdate: (deltaSeconds: number) => {
      const input = controls.sample();

      // 1. Update racer (uses world coords).
      racer.applyInput(input, deltaSeconds, {
        position: racer.position, // placeholder; drafting uses local refs below
        velocity: draftTarget.velocity,
      });

      // 2. Compute rebase delta and shift render-space containers.
      const rebaseDelta = rebase.update(racer.position);
      origin.copy(rebase.currentOrigin);
      worldRoot.position.sub(rebaseDelta);
      camera.position.sub(rebaseDelta);

      // 3. Compute render-space player position for chase camera.
      renderPlayer.copy(racer.position).sub(origin);
      chase.update(renderPlayer, racer.heading, racer.speed, racer.drifting, deltaSeconds);

      // 4. Drafting target & obstacles operate in render-space. Use the
      //    racer's render-z for recycling.
      // Drafting target lives in world coords (uses racer.position).
      draftTarget.update(deltaSeconds, racer.position, origin);
      obstacles.update(deltaSeconds, racer.position, origin);

      // Collision check: obstacles expose world-space positions.
      for (let i = 0; i < obstacles.spheres.length; i += 1) {
        racer.applyImpact(obstacles.spheres[i]!, origin);
      }

      // 6. Animate environment (already at large coords; fine).
      environment.update(deltaSeconds, performance.now() * 0.001);

      // 7. Feedback triggers.
      if (racer.boostActive && !lastBoostFlag) {
        chase.triggerFovPulse(8, 0.6);
        chase.triggerShake(0.12, 0.25);
      }
      lastBoostFlag = racer.boostActive;

      const inRecovery = racer.lastImpact !== null && racer.recoveryTimer > 0;
      if (inRecovery && !lastImpactFlag) {
        chase.triggerShake(0.25, 0.35);
      }
      lastImpactFlag = inRecovery;
    },
    onRender: () => {
      post.render(scene, camera);
    },
  });

  const state: ApplicationState = {
    loop,
    resize,
    fps: overlay,
    meter,
    worldRoot,
    environment,
    obstacles,
    draftTarget,
    rebase,
    renderer,
    post,
    tier,
    gpuLabel: gpuShortName(renderer),
    viewport,
    racer,
    controls,
    chase,
  };

  resize.attach();
  loop.start();
  startMeter(state);
  startOverlayUpdates(state);

  window.addEventListener("beforeunload", () => {
    loop.stop();
    resize.detach();
    renderer.dispose();
    controls.dispose();
  });
}

function applyTier(renderer: WebGLRenderer, tier: QualityTier): void {
  const preset = presetForTier(tier);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.pixelRatioCap));
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
    state.fps.render({
      fps: state.meter.current.fps,
      frameMs: state.meter.current.frameMs,
      drawCalls: state.renderer.info.render.calls,
      triangles: state.renderer.info.render.triangles,
      quality: state.tier,
      renderer: state.gpuLabel,
      speed: state.racer.speed,
      driftCharge: state.racer.driftCharge,
      boostActive: state.racer.boostActive,
      boostCooldown: state.racer.boostCooldownTimer,
      drafting: state.racer.drafting.intensity,
    });
  }, 250);
}

function main(): void {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
}

main();