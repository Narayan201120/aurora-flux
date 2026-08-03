import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  ShaderMaterial,
  Vector3,
} from "three";
import { FlowField } from "./flowField.js";

const AURORA_VERT = /* glsl */ `
attribute float aLength;
attribute float aLayer;
attribute vec3 aFlow;

uniform float uTime;
uniform float uIntensity;

varying float vLayer;
varying float vEnergy;
varying vec3 vFlow;
varying float vAlong;

void main() {
  vLayer = aLayer;
  vFlow = aFlow;
  vAlong = aLength;

  float layerScale = 0.6 + aLayer * 0.6;
  vec3 pos = position;
  pos.y += aLayer * 6.0;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const AURORA_FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec3 uColorNear;
uniform vec3 uColorMid;
uniform vec3 uColorFar;
uniform float uIntensity;

varying float vLayer;
varying vec3 vFlow;
varying float vAlong;

void main() {
  float t = uTime * 0.4 + vLayer * 1.7;
  float wave = sin(vAlong * 4.0 + t + vFlow.x * 1.5) * 0.5 + 0.5;
  float pulse = sin(t * 0.7 + vAlong * 1.2) * 0.5 + 0.5;
  float energy = wave * 0.6 + pulse * 0.4;

  float band1 = smoothstep(0.0, 0.4, energy);
  float band2 = smoothstep(0.45, 0.85, energy);

  vec3 color = mix(uColorNear, uColorMid, band1);
  color = mix(color, uColorFar, band2);

  float alpha = (0.25 + energy * 0.6) * uIntensity * (0.6 + vLayer * 0.2);
  gl_FragColor = vec4(color, alpha);
}
`;

export interface AuroraLayerOptions {
  length: number;
  segments: number;
  width: number;
  layer: number;
  yOffset: number;
  colorNear: Color | string;
  colorMid: Color | string;
  colorFar: Color | string;
  intensity: number;
}

export function createAuroraLayer(options: AuroraLayerOptions): {
  mesh: Mesh;
  update: (time: number, flow: FlowField) => void;
} {
  const positions = new Float32Array(options.segments * 2 * 3);
  const lengths = new Float32Array(options.segments * 2);
  const layerAttr = new Float32Array(options.segments * 2);
  const flows = new Float32Array(options.segments * 2 * 3);
  const indices = new Uint16Array((options.segments - 1) * 6);

  for (let i = 0; i < options.segments; i += 1) {
    const t = i / (options.segments - 1);
    const along = (t - 0.5) * options.length;
    const y = options.yOffset;
    const z = along * 0.6;

    const left = (i * 2) * 3;
    const right = (i * 2 + 1) * 3;
    positions[left] = -options.width;
    positions[left + 1] = y;
    positions[left + 2] = z;
    positions[right] = options.width;
    positions[right + 1] = y;
    positions[right + 2] = z;

    lengths[i * 2] = t;
    lengths[i * 2 + 1] = t;
    layerAttr[i * 2] = options.layer;
    layerAttr[i * 2 + 1] = options.layer;

    flows[i * 2 * 3] = 1;
    flows[i * 2 * 3 + 1] = 0;
    flows[i * 2 * 3 + 2] = 0;
    flows[(i * 2 + 1) * 3] = 1;
    flows[(i * 2 + 1) * 3 + 1] = 0;
    flows[(i * 2 + 1) * 3 + 2] = 0;
  }

  for (let i = 0; i < options.segments - 1; i += 1) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices[i * 6] = a;
    indices[i * 6 + 1] = b;
    indices[i * 6 + 2] = c;
    indices[i * 6 + 3] = b;
    indices[i * 6 + 4] = d;
    indices[i * 6 + 5] = c;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aLength", new BufferAttribute(lengths, 1));
  geometry.setAttribute("aLayer", new BufferAttribute(layerAttr, 1));
  geometry.setAttribute("aFlow", new BufferAttribute(flows, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));

  const material = new ShaderMaterial({
    vertexShader: AURORA_VERT,
    fragmentShader: AURORA_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColorNear: { value: new Color(options.colorNear) },
      uColorMid: { value: new Color(options.colorMid) },
      uColorFar: { value: new Color(options.colorFar) },
      uIntensity: { value: options.intensity },
    },
  });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 50;

  const tempDir = new Vector3();
  const flowAttribute = geometry.attributes.aFlow as BufferAttribute;

  return {
    mesh,
    update(time: number, flow: FlowField) {
      const u = material.uniforms.uTime;
      if (u) u.value = time;
      flow.setTime(time);
      const samplePositions = positions;
      for (let i = 0; i < options.segments; i += 1) {
        const left = i * 2;
        const right = i * 2 + 1;
        const wx = samplePositions[left * 3]!;
        const wy = samplePositions[left * 3 + 1]!;
        const wz = samplePositions[left * 3 + 2]!;
        const sample = flow.sample(wx, wy, wz);
        tempDir.copy(sample.direction);
        flowAttribute.setXYZ(left, tempDir.x, tempDir.y, tempDir.z);
        flowAttribute.setXYZ(right, tempDir.x, tempDir.y, tempDir.z);
      }
      flowAttribute.needsUpdate = true;
    },
  };
}

export interface AuroraRiverOptions {
  layers: AuroraLayerOptions[];
}

export function createAuroraRiver(options: AuroraRiverOptions): {
  group: Group;
  update: (time: number, flow: FlowField) => void;
} {
  const group = new Group();
  group.name = "AuroraRiver";
  group.userData.followsPlayer = true;
  const layers = options.layers.map((layer) => {
    const created = createAuroraLayer(layer);
    group.add(created.mesh);
    return created;
  });
  return {
    group,
    update(time: number, flow: FlowField) {
      for (const layer of layers) layer.update(time, flow);
    },
  };
}
