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

interface ApplicationState {
  loop: GameLoop;
  resize: ResizeHandler;
  fps: FpsOverlay;
  meter: FpsMeter;
  worldRoot: Group;
  environment: Environment;
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

  // World root holds large-distance content (stars, planets, nebula).
  // It is shifted by rebase delta to keep render-space precision bounded.
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

  // Racer sits under scene at absolute world coords; no rebase shifting.
  const racerMesh = createRacerMesh({ viewport });
  const racer = new Racer(racerMesh.group);
  racer.position.set(0, 0.6, 0);
  racer.heading = 0;
  scene.add(racerMesh.group);

  // Aurora ribbons follow the racer.
  environment.group.children.forEach((child) => {
    if (child.name === "AuroraRiver" || child.userData.followsPlayer === true) {
      child.userData.followsPlayer = true;
    }
  });

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

  const loop = new GameLoop({
    onUpdate: (deltaSeconds: number) => {
      const input = controls.sample();
      racer.applyInput(input, deltaSeconds);
      chase.update(racer.position, racer.heading, racer.speed, deltaSeconds);
      const delta = rebase.update(racer.position);
      camera.position.sub(delta);
      worldRoot.position.sub(delta);
      // Anchor aurora to the racer so the river keeps flowing around it.
      environment.group.children.forEach((child) => {
        if (child.userData.followsPlayer === true) {
          child.position.x = -racer.position.x;
          child.position.z = -racer.position.z;
        }
      });
      environment.update(deltaSeconds, performance.now() * 0.001);
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
  startViewportHud(state);

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
    });
  }, 250);
}

function startViewportHud(state: ApplicationState): void {
  window.setInterval(() => {
    if (!state.loop.isRunning) return;
    const el = document.getElementById("fps-overlay");
    if (!el) return;
    el.setAttribute(
      "data-viewport",
      `${Math.round(state.viewport.x)}x${Math.round(state.viewport.y)} | ${state.racer.speed.toFixed(1)} m/s`,
    );
  }, 500);
}

function main(): void {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
}

main();
