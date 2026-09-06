import { Texture, Vector2 } from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import {
  clamp01,
  finiteOrZero,
  POST_PROCESS_QUALITY_PROFILES,
  type PostProcessQuality,
} from "./quality.js";
import { requirePostProcessUniform } from "./uniforms.js";

interface SpeedLineUniforms {
  tDiffuse: { value: Texture | null };
  uResolution: { value: Vector2 };
  uTime: { value: number };
  uSpeed: { value: number };
  uBoost: { value: number };
  uDraft: { value: number };
  uQuality: { value: number };
  uDensity: { value: number };
  uFlow: { value: number };
  uOpacity: { value: number };
  uAspect: { value: number };
  uEnabled: { value: number };
}

const SPEED_LINE_SHADER = {
  uniforms: {
    tDiffuse: { value: null as Texture | null },
    uResolution: { value: new Vector2(1, 1) },
    uTime: { value: 0 },
    uSpeed: { value: 0 },
    uBoost: { value: 0 },
    uDraft: { value: 0 },
    uQuality: { value: 0.5 },
    uDensity: { value: 13 },
    uFlow: { value: 1 },
    uOpacity: { value: 0.1 },
    uAspect: { value: 1 },
    uEnabled: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;

    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uSpeed;
    uniform float uBoost;
    uniform float uDraft;
    uniform float uQuality;
    uniform float uDensity;
    uniform float uFlow;
    uniform float uOpacity;
    uniform float uAspect;
    uniform float uEnabled;

    varying vec2 vUv;

    const float TAU = 6.28318530718;

    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      if (uEnabled < 0.5) {
        gl_FragColor = base;
        return;
      }

      vec2 centered = (vUv - 0.5) * vec2(uAspect, 1.0);
      float radius = length(centered);
      float angle = atan(centered.y, centered.x);
      float normalizedAngle = angle / TAU + 0.5;

      // Keep the center clear for racer readability and fade the outer corners.
      float radialMask = smoothstep(0.035, 0.18, radius);
      radialMask *= 1.0 - smoothstep(0.94, 1.22, radius);

      // The angular field creates spokes; the moving radial band makes them travel.
      float spokeCount = mix(uDensity * 0.82, uDensity, uQuality);
      float spokeDistance = abs(fract(normalizedAngle * spokeCount) - 0.5);
      float spoke = smoothstep(0.18, 0.015, spokeDistance);

      float radialPhase = fract(
        radius * (2.1 + uQuality * 0.9) -
        uTime * uFlow * (0.45 + uSpeed * 0.95) +
        sin(angle * 3.0 + uTime * 0.15) * 0.035
      );
      float movingBand = smoothstep(0.2, 0.02, abs(radialPhase - 0.5));

      float speedGate = smoothstep(0.48, 0.78, uSpeed);
      float eventGate = clamp(uBoost * 0.7 + uDraft * 0.16, 0.0, 0.42);
      float activity = clamp(speedGate + eventGate, 0.0, 1.0);
      float variation = 0.7 + 0.3 * sin(floor(normalizedAngle * spokeCount) * 12.9898);
      float streak = spoke * movingBand * radialMask * variation;
      float alpha = clamp(streak * activity * uOpacity, 0.0, 0.15);

      vec3 lineColor = mix(
        vec3(0.32, 0.94, 1.0),
        vec3(0.72, 0.4, 1.0),
        0.5 + 0.5 * sin(angle * 1.7 + uTime * 0.22)
      );
      vec3 color = base.rgb + lineColor * alpha;
      gl_FragColor = vec4(color, base.a);
    }
  `,
};

export interface SpeedLinePassOptions {
  quality?: PostProcessQuality;
  maxOpacity?: number;
  enabled?: boolean;
}

export class SpeedLinePass extends ShaderPass {
  private readonly typedUniforms: SpeedLineUniforms;
  private maxOpacity: number;
  private baseOpacity = 0.1;

  constructor(options: SpeedLinePassOptions = {}) {
    super(SPEED_LINE_SHADER);
    this.typedUniforms = {
      tDiffuse: requirePostProcessUniform<Texture | null>(this.uniforms.tDiffuse, "tDiffuse"),
      uResolution: requirePostProcessUniform<Vector2>(
        this.uniforms.uResolution,
        "uResolution",
      ),
      uTime: requirePostProcessUniform<number>(this.uniforms.uTime, "uTime"),
      uSpeed: requirePostProcessUniform<number>(this.uniforms.uSpeed, "uSpeed"),
      uBoost: requirePostProcessUniform<number>(this.uniforms.uBoost, "uBoost"),
      uDraft: requirePostProcessUniform<number>(this.uniforms.uDraft, "uDraft"),
      uQuality: requirePostProcessUniform<number>(this.uniforms.uQuality, "uQuality"),
      uDensity: requirePostProcessUniform<number>(this.uniforms.uDensity, "uDensity"),
      uFlow: requirePostProcessUniform<number>(this.uniforms.uFlow, "uFlow"),
      uOpacity: requirePostProcessUniform<number>(this.uniforms.uOpacity, "uOpacity"),
      uAspect: requirePostProcessUniform<number>(this.uniforms.uAspect, "uAspect"),
      uEnabled: requirePostProcessUniform<number>(this.uniforms.uEnabled, "uEnabled"),
    };
    this.maxOpacity = clamp01(options.maxOpacity ?? 1);
    this.needsSwap = true;

    this.setQuality(options.quality ?? "medium");
    this.setEnabled(options.enabled ?? false);
  }

  setSize(width: number, height: number): void {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    this.typedUniforms.uResolution.value.set(safeWidth, safeHeight);
    this.typedUniforms.uAspect.value = safeWidth / safeHeight;
  }

  setQuality(quality: PostProcessQuality): void {
    const profile = POST_PROCESS_QUALITY_PROFILES[quality];
    this.typedUniforms.uQuality.value = profile.level;
    this.typedUniforms.uDensity.value = profile.speedLineDensity;
    this.typedUniforms.uFlow.value = profile.speedLineFlow;
    this.baseOpacity = profile.speedLineOpacity;
    this.typedUniforms.uOpacity.value = this.baseOpacity * this.maxOpacity;
  }

  setMaxOpacity(maxOpacity: number): void {
    this.maxOpacity = clamp01(maxOpacity);
    this.typedUniforms.uOpacity.value = Math.min(
      0.15,
      this.baseOpacity * this.maxOpacity,
    );
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.typedUniforms.uEnabled.value = enabled ? 1 : 0;
  }

  /**
   * Updates only scalar uniforms. Reuse this pass from the frame loop without
   * creating a state object or allocating temporary vectors.
   */
  update(timeSeconds: number, speed01: number, boost01: number, draft01: number): void {
    this.typedUniforms.uTime.value = finiteOrZero(timeSeconds);
    this.typedUniforms.uSpeed.value = clamp01(speed01);
    this.typedUniforms.uBoost.value = clamp01(boost01);
    this.typedUniforms.uDraft.value = clamp01(draft01);
  }
}
