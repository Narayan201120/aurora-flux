import {
  BackSide,
  Color,
  Group,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
} from "three";

const NEBULA_VERT = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = normalize(position);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const NEBULA_FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uIntensity;

varying vec3 vDirection;

float hash(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i += 1) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vDirection);
  float t = uTime * 0.012;

  vec3 p = dir * 2.4 + vec3(t * 0.7, t * 0.4, -t * 0.5);
  float n1 = fbm(p);
  vec3 q = dir * 3.2 + vec3(-t * 0.6, t * 0.8, t * 0.3);
  float n2 = fbm(q + 11.7);

  float cloud = smoothstep(0.42, 0.78, n1);
  float accent = smoothstep(0.55, 0.82, n2);

  vec3 base = mix(uColorA, uColorB, cloud);
  base = mix(base, uColorC, accent * 0.7);

  float horizon = pow(max(1.0 - abs(dir.y), 0.0), 1.4);
  base *= mix(0.4, 1.0, horizon);

  base *= uIntensity;
  gl_FragColor = vec4(base, 1.0);
}
`;

export interface NebulaOptions {
  radius: number;
  colorA: Color | string;
  colorB: Color | string;
  colorC: Color | string;
  intensity: number;
}

export function createNebulaDome(options: NebulaOptions): {
  mesh: Mesh;
  update: (time: number) => void;
} {
  const geometry = new SphereGeometry(options.radius, 32, 24);
  const material = new ShaderMaterial({
    vertexShader: NEBULA_VERT,
    fragmentShader: NEBULA_FRAG,
    side: BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new Color(options.colorA) },
      uColorB: { value: new Color(options.colorB) },
      uColorC: { value: new Color(options.colorC) },
      uIntensity: { value: options.intensity },
    },
  });
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = -50;
  return {
    mesh,
    update(time: number) {
      const u = material.uniforms.uTime;
      if (u) u.value = time;
    },
  };
}

export interface NebulaFieldOptions {
  domes: NebulaOptions[];
}

export function createNebulaField(options: NebulaFieldOptions): {
  group: Group;
  update: (time: number) => void;
} {
  const group = new Group();
  const domes: { mesh: Mesh; update: (time: number) => void }[] = [];
  for (const dome of options.domes) {
    const created = createNebulaDome(dome);
    group.add(created.mesh);
    domes.push(created);
  }
  return {
    group,
    update(time: number) {
      for (const dome of domes) dome.update(time);
    },
  };
}
