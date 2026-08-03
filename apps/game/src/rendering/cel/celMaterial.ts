import {
  Color,
  FrontSide,
  ShaderMaterial,
  Vector3,
} from "three";

export interface CelMaterialOptions {
  baseColor: Color | string;
  shadowColor: Color | string;
  highlightColor: Color | string;
  rimColor: Color | string;
  rimPower: number;
  rimStrength: number;
  specularColor: Color | string;
  specularThreshold: number;
  bandCount: number;
  bandSoftness: number;
}

const VERTEX = /* glsl */ `
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDir;
varying vec3 vObjectNormal;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vObjectNormal = normalize(normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;

uniform vec3 uBaseColor;
uniform vec3 uShadowColor;
uniform vec3 uHighlightColor;
uniform vec3 uRimColor;
uniform vec3 uSpecularColor;
uniform float uRimPower;
uniform float uRimStrength;
uniform float uSpecularThreshold;
uniform int uBandCount;
uniform float uBandSoftness;
uniform vec3 uKeyLightDir;
uniform vec3 uFillLightDir;
uniform float uKeyLightStrength;
uniform float uFillLightStrength;
uniform vec3 uAmbientColor;

varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDir;
varying vec3 vObjectNormal;

float quantize(float v, float bands, float softness) {
  float scaled = v * bands;
  float lower = floor(scaled);
  float upper = lower + 1.0;
  float frac = scaled - lower;
  float band = mix(lower, upper, smoothstep(0.5 - softness * 0.5, 0.5 + softness * 0.5, frac));
  return band / bands;
}

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(vViewDir);
  vec3 L = normalize(uKeyLightDir);
  vec3 F = normalize(uFillLightDir);

  float keyDot = dot(N, L);
  float fillDot = dot(N, F);

  // Key lighting with hard banding.
  float keyLit = max(keyDot, 0.0);
  float keyBand = quantize(keyLit, float(uBandCount), uBandSoftness);

  // Fill lighting (additive, unbanded, soft).
  float fillLit = max(fillDot, 0.0) * uFillLightStrength;

  // Base palette mix.
  vec3 lit = mix(uShadowColor, uBaseColor, keyBand);
  lit = mix(lit, uHighlightColor, smoothstep(0.85, 1.0, keyBand));

  // Add fill light tint.
  lit += uAmbientColor + F * fillLit * 0.15;

  // Hard-banded specular highlight (Blinn-Phong).
  vec3 H = normalize(L + V);
  float specRaw = pow(max(dot(N, H), 0.0), 64.0);
  float specBand = step(uSpecularThreshold, specRaw);
  lit += uSpecularColor * specBand;

  // Fresnel rim lighting.
  float fres = pow(1.0 - max(dot(N, V), 0.0), uRimPower);
  float rimBand = smoothstep(0.45, 0.85, fres);
  lit += uRimColor * rimBand * uRimStrength;

  gl_FragColor = vec4(lit, 1.0);
}
`;

const DEFAULTS: CelMaterialOptions = {
  baseColor: new Color("#7fd4ff"),
  shadowColor: new Color("#16244a"),
  highlightColor: new Color("#f0fbff"),
  rimColor: new Color("#9affe0"),
  rimPower: 2.4,
  rimStrength: 0.9,
  specularColor: new Color("#ffffff"),
  specularThreshold: 0.55,
  bandCount: 4,
  bandSoftness: 0.0,
};

export class CelMaterial extends ShaderMaterial {
  constructor(options: Partial<CelMaterialOptions> = {}) {
    const merged: CelMaterialOptions = { ...DEFAULTS, ...options };

    super({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: FrontSide,
      uniforms: {
        uBaseColor: { value: new Color(merged.baseColor) },
        uShadowColor: { value: new Color(merged.shadowColor) },
        uHighlightColor: { value: new Color(merged.highlightColor) },
        uRimColor: { value: new Color(merged.rimColor) },
        uRimPower: { value: merged.rimPower },
        uRimStrength: { value: merged.rimStrength },
        uSpecularColor: { value: new Color(merged.specularColor) },
        uSpecularThreshold: { value: merged.specularThreshold },
        uBandCount: { value: merged.bandCount },
        uBandSoftness: { value: merged.bandSoftness },
        uKeyLightDir: { value: new Vector3(0.4, 0.8, 0.5).normalize() },
        uFillLightDir: { value: new Vector3(-0.6, 0.2, -0.4).normalize() },
        uKeyLightStrength: { value: 1.0 },
        uFillLightStrength: { value: 0.55 },
        uAmbientColor: { value: new Color("#0a1530") },
      },
    });

    this.toneMapped = false;
  }

  setBandCount(count: number): void {
    const uniform = this.uniforms.uBandCount;
    if (uniform) uniform.value = Math.max(2, Math.min(6, Math.round(count)));
  }
}
