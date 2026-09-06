import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  ShaderMaterial,
} from "three";
import type { QualityTier } from "../config/config.js";
import { SeededRng } from "./seededRng.js";

const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;

uniform float uTime;
uniform float uPixelRatio;

varying vec3 vColor;
varying float vTwinkle;

void main() {
  vColor = aColor;
  vTwinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 1.7) + aSeed * 6.2831);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float distance = max(-mvPosition.z, 0.001);
  gl_PointSize = aSize * uPixelRatio * (260.0 / distance);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const STAR_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying float vTwinkle;
void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  if (d > 0.5) discard;
  float halo = smoothstep(0.5, 0.0, d);
  float core = smoothstep(0.18, 0.0, d);
  vec3 color = vColor * (halo * 0.55 + core * 1.4) * vTwinkle;
  float alpha = halo * vTwinkle;
  gl_FragColor = vec4(color, alpha);
}
`;

export interface StarLayerOptions {
  count: number;
  innerRadius: number;
  outerRadius: number;
  sizeMin: number;
  sizeMax: number;
  seed: number;
  colorTint: Color | string;
  dimChance: number;
}

export function createStarLayer(
  options: StarLayerOptions,
  pixelRatio: number,
): Points {
  const rng = new SeededRng(options.seed);
  const positions = new Float32Array(options.count * 3);
  const sizes = new Float32Array(options.count);
  const seeds = new Float32Array(options.count);
  const colors = new Float32Array(options.count * 3);
  const baseColor = new Color(options.colorTint);

  for (let i = 0; i < options.count; i += 1) {
    const u = rng.next();
    const v = rng.next();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const radius = rng.range(options.innerRadius, options.outerRadius);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    sizes[i] = rng.range(options.sizeMin, options.sizeMax);
    seeds[i] = rng.next();
    const dim = rng.next() < options.dimChance ? 0.4 : 1.0;
    const tinted = baseColor.clone().multiplyScalar(dim);
    colors[i * 3] = tinted.r;
    colors[i * 3 + 1] = tinted.g;
    colors[i * 3 + 2] = tinted.b;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new BufferAttribute(sizes, 1));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
  geometry.setAttribute("aColor", new BufferAttribute(colors, 3));
  geometry.boundingSphere = null;

  const material = new ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
    },
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -100;
  return points;
}

export interface StarfieldOptions {
  pixelRatio: number;
}

export function createStarfield(options: StarfieldOptions): {
  group: Group;
  update: (time: number) => void;
  setQuality: (tier: QualityTier) => void;
} {
  const group = new Group();
  const layers: { points: Points; material: ShaderMaterial }[] = [];
  const layerSpecs: StarLayerOptions[] = [
    {
      count: 1400,
      innerRadius: 800,
      outerRadius: 1500,
      sizeMin: 0.4,
      sizeMax: 1.0,
      seed: 0xa1f1,
      colorTint: "#bcd4ff",
      dimChance: 0.6,
    },
    {
      count: 700,
      innerRadius: 600,
      outerRadius: 1300,
      sizeMin: 1.0,
      sizeMax: 2.4,
      seed: 0xb22e,
      colorTint: "#e9f0ff",
      dimChance: 0.4,
    },
    {
      count: 200,
      innerRadius: 400,
      outerRadius: 1200,
      sizeMin: 2.0,
      sizeMax: 4.0,
      seed: 0xc3d4,
      colorTint: "#fff3c2",
      dimChance: 0.3,
    },
  ];

  for (const spec of layerSpecs) {
    const layer = createStarLayer(spec, options.pixelRatio);
    group.add(layer);
    layers.push({ points: layer, material: layer.material as ShaderMaterial });
  }

  return {
    group,
    update(time: number) {
      for (const layer of layers) {
        const u = layer.material.uniforms.uTime;
        if (u) u.value = time;
      }
    },
    setQuality(tier: QualityTier) {
      const visibleLayers = tier === "low" ? 1 : tier === "medium" ? 2 : 3;
      for (let index = 0; index < layers.length; index += 1) {
        layers[index]!.points.visible = index < visibleLayers;
      }
    },
  };
}
