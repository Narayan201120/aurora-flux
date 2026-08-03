import { Vector2, Vector3, WebGLRenderer } from "three";
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
import {
  createSceneContent,
  type SceneContent,
} from "./scene/sceneContent.js";

interface ApplicationState {
  loop: GameLoop;
  resize: ResizeHandler;
  fps: FpsOverlay;
  meter: FpsMeter;
  sceneContent: SceneContent;
  renderer: WebGLRenderer;
  post: PostProcessContext;
  tier: QualityTier;
  gpuLabel: string;
  viewport: Vector3;
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
  const sceneContent = createSceneContent({ viewport });
  scene.add(sceneContent.group);

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
      sceneContent.update(deltaSeconds);
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
    sceneContent,
    renderer,
    post,
    tier,
    gpuLabel: gpuShortName(renderer),
    viewport,
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
      `${Math.round(state.viewport.x)}x${Math.round(state.viewport.y)}`,
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
