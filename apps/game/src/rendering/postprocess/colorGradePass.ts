import { Color, Texture, Vector2 } from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

interface ColorGradeUniforms {
  tDiffuse: { value: Texture | null };
  uResolution: { value: Vector2 };
  uLift: { value: Color };
  uGamma: { value: number };
  uGain: { value: Color };
  uSaturation: { value: number };
  uContrast: { value: number };
  uVignette: { value: number };
  uTint: { value: Color };
  uTintStrength: { value: number };
}

const COLOR_GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null as Texture | null },
    uResolution: { value: new Vector2(1, 1) },
    uLift: { value: new Color("#04060f") },
    uGamma: { value: 1.05 },
    uGain: { value: new Color("#ffffff") },
    uSaturation: { value: 1.15 },
    uContrast: { value: 1.08 },
    uVignette: { value: 0.35 },
    uTint: { value: new Color("#a6d4ff") },
    uTintStrength: { value: 0.08 },
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
    uniform vec3 uLift;
    uniform float uGamma;
    uniform vec3 uGain;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uVignette;
    uniform vec3 uTint;
    uniform float uTintStrength;

    varying vec2 vUv;

    vec3 applyLiftGammaGain(vec3 c, vec3 lift, float gamma, vec3 gain) {
      c = c + lift * (1.0 - c);
      c = pow(max(c, vec3(0.0)), vec3(1.0 / gamma));
      c = c * gain;
      return c;
    }

    float luma(vec3 c) {
      return dot(c, vec3(0.2126, 0.7152, 0.0722));
    }

    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c = applyLiftGammaGain(c, uLift, uGamma, uGain);
      float l = luma(c);
      c = mix(vec3(l), c, uSaturation);
      c = (c - 0.5) * uContrast + 0.5;

      vec2 d = vUv - 0.5;
      float vignette = smoothstep(0.85, 0.2, length(d));
      c *= mix(1.0 - uVignette, 1.0, vignette);

      c = mix(c, c * uTint, uTintStrength);

      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export class ColorGradePass extends ShaderPass {
  private readonly typedUniforms: ColorGradeUniforms;

  constructor() {
    super(COLOR_GRADE_SHADER);
    this.typedUniforms = this.uniforms as unknown as ColorGradeUniforms;
    this.needsSwap = true;
  }

  setSize(width: number, height: number): void {
    this.typedUniforms.uResolution.value.set(width, height);
  }
}
