import { Color, Texture, Vector2 } from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

interface EdgePassUniforms {
  tDiffuse: { value: Texture | null };
  tNormal: { value: Texture | null };
  tDepth: { value: Texture | null };
  uResolution: { value: Vector2 };
  uNormalThreshold: { value: number };
  uDepthThreshold: { value: number };
  uEdgeColor: { value: Color };
  uEdgeStrength: { value: number };
  uSilhouetteDepthThreshold: { value: number };
}

const EDGE_SHADER = {
  uniforms: {
    tDiffuse: { value: null as Texture | null },
    tNormal: { value: null as Texture | null },
    tDepth: { value: null as Texture | null },
    uResolution: { value: new Vector2(1, 1) },
    uNormalThreshold: { value: 0.4 },
    uDepthThreshold: { value: 0.0015 },
    uEdgeColor: { value: new Color("#0a0c1a") },
    uEdgeStrength: { value: 1.0 },
    uSilhouetteDepthThreshold: { value: 0.012 },
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
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform vec2 uResolution;
    uniform float uNormalThreshold;
    uniform float uDepthThreshold;
    uniform float uSilhouetteDepthThreshold;
    uniform vec3 uEdgeColor;
    uniform float uEdgeStrength;

    varying vec2 vUv;

    float linearDepth(float d) {
      float near = 0.1;
      float far = 2000.0;
      float z = d * 2.0 - 1.0;
      return (2.0 * near * far) / (far + near - z * (far - near));
    }

    float sampleDepth(vec2 uv) {
      return linearDepth(texture2D(tDepth, uv).x);
    }

    vec3 sampleNormal(vec2 uv) {
      return normalize(texture2D(tNormal, uv).xyz * 2.0 - 1.0);
    }

    void main() {
      vec2 px = 1.0 / uResolution;
      vec3 base = texture2D(tDiffuse, vUv).rgb;

      vec3 n0 = sampleNormal(vUv);
      vec3 nL = sampleNormal(vUv + vec2(-px.x, 0.0));
      vec3 nR = sampleNormal(vUv + vec2( px.x, 0.0));
      vec3 nT = sampleNormal(vUv + vec2(0.0,  px.y));
      vec3 nB = sampleNormal(vUv + vec2(0.0, -px.y));

      float dN = length(nL - nR) + length(nT - nB);
      // Treat near-grazing normals as a silhouette (covered by inverted-hull outline); suppress Sobel there.
      float grazing = pow(1.0 - max(n0.z, 0.0), 6.0);
      float nEdge = smoothstep(uNormalThreshold, uNormalThreshold + 0.4, dN);
      nEdge *= (1.0 - grazing);

      float dC = sampleDepth(vUv);
      float dL = sampleDepth(vUv + vec2(-px.x, 0.0));
      float dR = sampleDepth(vUv + vec2( px.x, 0.0));
      float dT = sampleDepth(vUv + vec2(0.0,  px.y));
      float dB = sampleDepth(vUv + vec2(0.0, -px.y));
      float dEdge = abs(dR - dL) + abs(dT - dB);
      float bigDepth = step(uSilhouetteDepthThreshold, dEdge);
      float depthEdge = smoothstep(uDepthThreshold, uDepthThreshold * 4.0, dEdge);
      depthEdge *= (1.0 - bigDepth);

      float edge = max(nEdge, depthEdge) * uEdgeStrength;
      vec3 outColor = mix(base, uEdgeColor, edge);
      gl_FragColor = vec4(outColor, 1.0);
    }
  `,
};

export interface EdgePassOptions {
  edgeColor?: Color | string;
  edgeStrength?: number;
  normalThreshold?: number;
  depthThreshold?: number;
  silhouetteDepthThreshold?: number;
}

export class EdgePass extends ShaderPass {
  private readonly typedUniforms: EdgePassUniforms;

  constructor(options: EdgePassOptions = {}) {
    super(EDGE_SHADER);
    this.typedUniforms = this.uniforms as unknown as EdgePassUniforms;

    if (options.edgeColor !== undefined)
      this.typedUniforms.uEdgeColor.value = new Color(options.edgeColor);
    if (options.edgeStrength !== undefined)
      this.typedUniforms.uEdgeStrength.value = options.edgeStrength;
    if (options.normalThreshold !== undefined)
      this.typedUniforms.uNormalThreshold.value = options.normalThreshold;
    if (options.depthThreshold !== undefined)
      this.typedUniforms.uDepthThreshold.value = options.depthThreshold;
    if (options.silhouetteDepthThreshold !== undefined)
      this.typedUniforms.uSilhouetteDepthThreshold.value = options.silhouetteDepthThreshold;

    this.needsSwap = true;
  }

  setSize(width: number, height: number): void {
    this.typedUniforms.uResolution.value.set(width, height);
  }

  setNormalTexture(tex: Texture | null): void {
    this.typedUniforms.tNormal.value = tex;
  }

  setDepthTexture(tex: Texture | null): void {
    this.typedUniforms.tDepth.value = tex;
  }
}
