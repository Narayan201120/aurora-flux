import {
  ACESFilmicToneMapping,
  Color,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { DEFAULT_CONFIG, type QualityConfig } from "../config/config.js";

export function createRenderer(container: HTMLElement, quality: QualityConfig): WebGLRenderer {
  const renderer = new WebGLRenderer({
    powerPreference: "high-performance",
    antialias: quality.antialias,
    alpha: false,
  });

  const pixelRatio = Math.min(window.devicePixelRatio, quality.pixelRatioCap);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(new Color("#04060f"), 1);
  renderer.autoClear = false;

  container.appendChild(renderer.domElement);
  return renderer;
}

export function createCamera(container: HTMLElement): PerspectiveCamera {
  const camera = new PerspectiveCamera(
    DEFAULT_CONFIG.cameraFov,
    container.clientWidth / Math.max(container.clientHeight, 1),
    DEFAULT_CONFIG.cameraNear,
    DEFAULT_CONFIG.cameraFar,
  );
  camera.position.set(2.5, 2.6, 6.0);
  camera.lookAt(0, 1.1, 0);
  return camera;
}

export function createBaseScene(): Scene {
  const scene = new Scene();
  scene.background = new Color("#04060f");
  return scene;
}
