import {
  HalfFloatType,
  Mesh,
  MeshDepthMaterial,
  MeshNormalMaterial,
  NearestFilter,
  RGBADepthPacking,
  RGBAFormat,
  Scene,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ColorGradePass } from "./colorGradePass.js";
import { EdgePass } from "./edgePass.js";

export interface PostProcessContext {
  composer: EffectComposer;
  normalMaterial: MeshNormalMaterial;
  depthMaterial: MeshDepthMaterial;
  normalTarget: WebGLRenderTarget;
  depthTarget: WebGLRenderTarget;
  edgePass: EdgePass;
  colorGradePass: ColorGradePass;
  resize: (width: number, height: number) => void;
  render: (mainScene: Scene, camera: import("three").Camera) => void;
}

export interface CreatePostProcessOptions {
  width: number;
  height: number;
  pixelRatio: number;
}

const createTarget = (width: number, height: number): WebGLRenderTarget =>
  new WebGLRenderTarget(width, height, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthBuffer: true,
    stencilBuffer: false,
  });

export function createPostProcess(
  renderer: WebGLRenderer,
  options: CreatePostProcessOptions,
): PostProcessContext {
  const width = Math.max(1, Math.floor(options.width));
  const height = Math.max(1, Math.floor(options.height));
  const pixelRatio = options.pixelRatio;

  const normalTarget = createTarget(width, height);
  const depthTarget = createTarget(width, height);
  const mainTarget = createTarget(width, height);

  const composer = new EffectComposer(renderer, mainTarget);
  composer.setSize(width, height);
  composer.setPixelRatio(pixelRatio);

  const renderPass = new RenderPass(new Scene(), null as unknown as import("three").Camera);
  renderPass.clear = true;
  composer.addPass(renderPass);

  const edgePass = new EdgePass({
    edgeColor: "#0a0c1a",
    edgeStrength: 0.9,
    normalThreshold: 0.45,
    depthThreshold: 0.002,
    silhouetteDepthThreshold: 0.018,
  });
  edgePass.setSize(width, height);
  edgePass.setNormalTexture(normalTarget.texture);
  edgePass.setDepthTexture(depthTarget.texture);
  composer.addPass(edgePass);

  const colorGradePass = new ColorGradePass();
  colorGradePass.setSize(width, height);
  composer.addPass(colorGradePass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  const normalMaterial = new MeshNormalMaterial();
  const depthMaterial = new MeshDepthMaterial({
    depthPacking: RGBADepthPacking,
  });

  return {
    composer,
    normalMaterial,
    depthMaterial,
    normalTarget,
    depthTarget,
    edgePass,
    colorGradePass,
    resize(newWidth: number, newHeight: number) {
      const w = Math.max(1, Math.floor(newWidth));
      const h = Math.max(1, Math.floor(newHeight));
      composer.setSize(w, h);
      normalTarget.setSize(w, h);
      depthTarget.setSize(w, h);
      edgePass.setSize(w, h);
      colorGradePass.setSize(w, h);
      depthMaterial.needsUpdate = true;
    },
    render(mainScene: Scene, camera: import("three").Camera) {
      renderPass.scene = mainScene;
      renderPass.camera = camera;

      const previousOverride = mainScene.overrideMaterial;
      const previousBackground = mainScene.background;
      const hidden: Mesh[] = [];

      // Hide outlines during prepass to keep normal/depth clean for Sobel.
      mainScene.traverse((obj) => {
        const mesh = obj as Mesh;
        if (mesh.isMesh && mesh.userData.isOutline === true && mesh.visible) {
          mesh.visible = false;
          hidden.push(mesh);
        }
      });

      // Normal pass.
      mainScene.overrideMaterial = normalMaterial;
      mainScene.background = null;
      renderer.setRenderTarget(normalTarget);
      renderer.clear();
      renderer.render(mainScene, camera);

      // Depth pass.
      mainScene.overrideMaterial = depthMaterial;
      renderer.setRenderTarget(depthTarget);
      renderer.clear();
      renderer.render(mainScene, camera);

      // Restore.
      for (const mesh of hidden) mesh.visible = true;
      mainScene.overrideMaterial = previousOverride;
      mainScene.background = previousBackground;

      renderer.setRenderTarget(null);
      composer.render();
    },
  };
}
