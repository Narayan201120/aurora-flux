import { Texture, Vector2 } from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import {
  clamp01,
  POST_PROCESS_QUALITY_PROFILES,
  type PostProcessQuality,
} from "./quality.js";
import { requirePostProcessUniform } from "./uniforms.js";

interface ImpactPulseUniforms {
  tDiffuse: { value: Texture | null };
  uResolution: { value: Vector2 };
  uBoostPulse: { value: number };
  uImpactPulse: { value: number };
  uChromaticOffset: { value: number };
  uAspect: { value: number };
  uEnabled: { value: number };
}

const IMPACT_PULSE_SHADER = {
  uniforms: {
    tDiffuse: { value: null as Texture | null },
    uResolution: { value: new Vector2(1, 1) },
    uBoostPulse: { value: 0 },
    uImpactPulse: { value: 0 },
    uChromaticOffset: { value: 0.0032 },
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
    uniform float uBoostPulse;
    uniform float uImpactPulse;
    uniform float uChromaticOffset;
    uniform float uAspect;
    uniform float uEnabled;

    varying vec2 vUv;

    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      if (uEnabled < 0.5) {
        gl_FragColor = base;
        return;
      }

      float pulse = clamp(uBoostPulse + uImpactPulse * 1.15, 0.0, 1.0);
      if (pulse < 0.001) {
        gl_FragColor = base;
        return;
      }

      vec2 centered = (vUv - 0.5) * vec2(uAspect, 1.0);
      float radius = length(centered);
      vec2 direction = centered / max(radius, 0.0001);
      float edgeWeight = smoothstep(0.08, 0.95, radius);
      float offset = uChromaticOffset * pulse * edgeWeight;
      vec2 shift = direction * offset;

      vec2 redUv = clamp(vUv + shift, vec2(0.001), vec2(0.999));
      vec2 blueUv = clamp(vUv - shift, vec2(0.001), vec2(0.999));
      vec3 redSample = texture2D(tDiffuse, redUv).rgb;
      vec3 greenSample = texture2D(tDiffuse, vUv).rgb;
      vec3 blueSample = texture2D(tDiffuse, blueUv).rgb;
      vec3 separated = vec3(redSample.r, greenSample.g, blueSample.b);

      float blend = clamp(pulse * 0.7, 0.0, 0.7);
      vec3 color = mix(base.rgb, separated, blend);
      float flash = clamp(uImpactPulse * 0.035 + uBoostPulse * 0.012, 0.0, 0.045);
      color += vec3(flash * edgeWeight);

      gl_FragColor = vec4(color, base.a);
    }
  `,
};

export interface ImpactPulsePassOptions {
  quality?: PostProcessQuality;
  enabled?: boolean;
}

export class ImpactPulsePass extends ShaderPass {
  private readonly typedUniforms: ImpactPulseUniforms;

  constructor(options: ImpactPulsePassOptions = {}) {
    super(IMPACT_PULSE_SHADER);
    this.typedUniforms = {
      tDiffuse: requirePostProcessUniform<Texture | null>(this.uniforms.tDiffuse, "tDiffuse"),
      uResolution: requirePostProcessUniform<Vector2>(
        this.uniforms.uResolution,
        "uResolution",
      ),
      uBoostPulse: requirePostProcessUniform<number>(
        this.uniforms.uBoostPulse,
        "uBoostPulse",
      ),
      uImpactPulse: requirePostProcessUniform<number>(
        this.uniforms.uImpactPulse,
        "uImpactPulse",
      ),
      uChromaticOffset: requirePostProcessUniform<number>(
        this.uniforms.uChromaticOffset,
        "uChromaticOffset",
      ),
      uAspect: requirePostProcessUniform<number>(this.uniforms.uAspect, "uAspect"),
      uEnabled: requirePostProcessUniform<number>(this.uniforms.uEnabled, "uEnabled"),
    };
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
    this.typedUniforms.uChromaticOffset.value =
      POST_PROCESS_QUALITY_PROFILES[quality].chromaticOffset;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.typedUniforms.uEnabled.value = enabled ? 1 : 0;
  }

  /**
   * Sets bounded, caller-owned transient envelopes. Zero values are a shader
   * no-op even while the pass remains enabled for the next event.
   */
  setPulses(boost01: number, impact01: number): void {
    this.typedUniforms.uBoostPulse.value = clamp01(boost01);
    this.typedUniforms.uImpactPulse.value = clamp01(impact01);
  }
}
