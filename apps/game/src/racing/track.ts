import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Group,
  Mesh,
  ShaderMaterial,
  Vector3,
} from "three";

export interface TrackSample {
  position: Vector3;
  tangent: Vector3;
  progress: number;
}

export interface TrackSystem {
  group: Group;
  curve: CatmullRomCurve3;
  length: number;
  sample: (progress: number) => TrackSample;
  nearest: (position: Vector3) => TrackSample & { distance: number };
  update: (time: number) => void;
  setVisualState: (audioPulse: number, boost01: number, drift01: number) => void;
}

const TRACK_POINTS = [
  new Vector3(0, 0.3, 0),
  new Vector3(0, 0.45, 70),
  new Vector3(22, 0.7, 140),
  new Vector3(54, 0.4, 220),
  new Vector3(25, 0.6, 300),
  new Vector3(-40, 0.5, 330),
  new Vector3(-75, 0.35, 260),
  new Vector3(-60, 0.45, 170),
  new Vector3(-25, 0.35, 100),
  new Vector3(-12, 0.3, 38),
];

const RIBBON_VERTEX = /* glsl */ `
attribute float aProgress;
attribute float aSide;
uniform float uTime;

varying vec2 vLocal;
varying float vProgress;
varying float vSide;

void main() {
  vProgress = aProgress;
  vSide = aSide;
  vLocal = vec2(aProgress, aSide);

  vec3 pos = position;

  float edge = abs(aSide);
  float edgeWave = sin(aProgress * 34.0 - uTime * 2.4 + aSide * 1.6);
  float centerWave = sin(aProgress * 15.0 - uTime * 1.15);
  float filamentWave = sin(aProgress * 78.0 + uTime * 4.2);
  float displacement = edgeWave * 0.025 * edge;
  displacement += centerWave * 0.018 * (1.0 - edge * 0.65);
  displacement += filamentWave * 0.006 * edge;
  pos.y += clamp(displacement, -0.052, 0.052);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const RIBBON_FRAGMENT = /* glsl */ `
precision highp float;

uniform vec3 uPaletteMint;
uniform vec3 uPaletteCyan;
uniform vec3 uPaletteViolet;
uniform vec3 uPalettePink;
uniform float uTime;
uniform float uAudioPulse;
uniform float uBoost;
uniform float uDrift;

varying vec2 vLocal;
varying float vProgress;
varying float vSide;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  local = local * local * (3.0 - 2.0 * local);

  float a = hash21(cell);
  float b = hash21(cell + vec2(1.0, 0.0));
  float c = hash21(cell + vec2(0.0, 1.0));
  float d = hash21(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 3; octave += 1) {
    value += noise(p) * amplitude;
    p = p * 2.03 + vec2(17.1, 9.2);
    amplitude *= 0.5;
  }
  return value;
}

vec3 sectionPalette(float progress) {
  float section = mod(floor(progress * 4.0), 4.0);
  float sectionProgress = fract(progress * 4.0);
  float hasCyan = step(1.0, section);
  float hasViolet = step(2.0, section);
  float hasPink = step(3.0, section);

  vec3 sectionStart = mix(uPaletteMint, uPaletteCyan, hasCyan);
  sectionStart = mix(sectionStart, uPaletteViolet, hasViolet);
  sectionStart = mix(sectionStart, uPalettePink, hasPink);

  vec3 sectionEnd = mix(uPaletteCyan, uPaletteViolet, hasCyan);
  sectionEnd = mix(sectionEnd, uPalettePink, hasViolet);
  sectionEnd = mix(sectionEnd, uPaletteMint, hasPink);

  return mix(sectionStart, sectionEnd, smoothstep(0.08, 0.92, sectionProgress));
}

void main() {
  float width = abs(vSide);
  float core = 1.0 - smoothstep(0.08, 0.58, width);
  float coreHighlight = 1.0 - smoothstep(0.0, 0.24, width);
  float edgeEnergy = smoothstep(0.46, 0.98, width);

  float along = vLocal.x * 34.0;
  float drift = sin(vLocal.x * 13.0 - uTime * 1.3) * 0.18;
  float flow = fbm(vec2(along - uTime * 1.1 + drift, vLocal.y * 2.4 + uTime * 0.12));
  float filamentWave = sin(vLocal.x * 92.0 - uTime * 5.5 + flow * 4.0) * 0.5 + 0.5;
  float filament = smoothstep(0.62, 0.94, filamentWave) * (0.45 + flow * 0.55);
  float lanePulse = smoothstep(
    0.52,
    0.92,
    sin(vProgress * 170.0 - uTime * 8.0) * 0.5 + 0.5
  );

  vec3 color = sectionPalette(vProgress);
  vec3 edgeColor = mix(uPaletteCyan, uPaletteViolet, flow);
  color = mix(color, edgeColor, edgeEnergy * 0.48);
  color = mix(color, vec3(0.78, 1.0, 0.97), coreHighlight * 0.58);

  float audioEnergy = uAudioPulse * 0.22 + uBoost * 0.18 + uDrift * 0.08;
  float energy = clamp(
    flow * 0.32 + filament * 0.42 + lanePulse * 0.2 + audioEnergy,
    0.0,
    1.0
  );
  color *= 0.78 + energy * 0.52;

  float alpha = core * (0.3 + energy * 0.24);
  alpha += edgeEnergy * (0.14 + flow * 0.2 + filament * 0.12);
  alpha += lanePulse * (0.08 + core * 0.12);
  alpha = clamp(alpha * (0.9 + audioEnergy * 0.8), 0.0, 0.86);

  gl_FragColor = vec4(color, alpha);
}
`;

function createRibbon(
  curve: CatmullRomCurve3,
  segments: number,
  width: number,
): Mesh {
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const progress = new Float32Array((segments + 1) * 2);
  const sides = new Float32Array((segments + 1) * 2);
  const indices = new Uint32Array(segments * 6);
  const point = new Vector3();
  const tangent = new Vector3();
  const side = new Vector3();
  const up = new Vector3(0, 1, 0);

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    curve.getPointAt(t, point);
    curve.getTangentAt(t, tangent).normalize();
    side.crossVectors(tangent, up).normalize();
    const left = point.clone().addScaledVector(side, width);
    const right = point.clone().addScaledVector(side, -width);
    const vertex = i * 2;
    positions.set([left.x, left.y, left.z], vertex * 3);
    positions.set([right.x, right.y, right.z], (vertex + 1) * 3);
    progress[vertex] = t;
    progress[vertex + 1] = t;
    sides[vertex] = -1;
    sides[vertex + 1] = 1;

    if (i < segments) {
      const next = i * 6;
      indices.set(
        [vertex, vertex + 1, vertex + 2, vertex + 1, vertex + 3, vertex + 2],
        next,
      );
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aProgress", new BufferAttribute(progress, 1));
  geometry.setAttribute("aSide", new BufferAttribute(sides, 1));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  const material = new ShaderMaterial({
    vertexShader: RIBBON_VERTEX,
    fragmentShader: RIBBON_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uPaletteMint: { value: new Color("#9affe0") },
      uPaletteCyan: { value: new Color("#72f8ff") },
      uPaletteViolet: { value: new Color("#a984ff") },
      uPalettePink: { value: new Color("#ff78ce") },
      uAudioPulse: { value: 0 },
      uBoost: { value: 0 },
      uDrift: { value: 0 },
    },
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = "RacingLineRibbon";
  mesh.renderOrder = 45;
  return mesh;
}

export function createTrackSystem(): TrackSystem {
  const group = new Group();
  group.name = "TrackSystem";
  const curve = new CatmullRomCurve3(TRACK_POINTS, true, "catmullrom", 0.5);
  const ribbon = createRibbon(curve, 280, 2.2);
  group.add(ribbon);
  const samples = Array.from({ length: 281 }, (_, index) => {
    const progress = index / 280;
    return {
      position: curve.getPointAt(progress),
      tangent: curve.getTangentAt(progress).normalize(),
      progress,
    };
  });

  return {
    group,
    curve,
    length: curve.getLength(),
    sample(progress: number): TrackSample {
      const wrapped = ((progress % 1) + 1) % 1;
      const position = curve.getPointAt(wrapped);
      const tangent = curve.getTangentAt(wrapped).normalize();
      return { position, tangent, progress: wrapped };
    },
    nearest(position: Vector3) {
      let nearestSample = samples[0]!;
      let minDistanceSquared = Infinity;
      for (const candidate of samples) {
        const distanceSquared = candidate.position.distanceToSquared(position);
        if (distanceSquared < minDistanceSquared) {
          minDistanceSquared = distanceSquared;
          nearestSample = candidate;
        }
      }
      return {
        position: nearestSample.position,
        tangent: nearestSample.tangent,
        progress: nearestSample.progress,
        distance: Math.sqrt(minDistanceSquared),
      };
    },
    update(time: number) {
      if (ribbon.material instanceof ShaderMaterial) {
        const timeUniform = ribbon.material.uniforms.uTime;
        if (timeUniform) timeUniform.value = time;
      }
    },
    setVisualState(audioPulse: number, boost01: number, drift01: number) {
      if (!(ribbon.material instanceof ShaderMaterial)) return;
      const uniforms = ribbon.material.uniforms;
      const audioPulseUniform = uniforms.uAudioPulse;
      const boostUniform = uniforms.uBoost;
      const driftUniform = uniforms.uDrift;
      if (
        audioPulseUniform === undefined ||
        boostUniform === undefined ||
        driftUniform === undefined
      )
        return;
      audioPulseUniform.value = clamp01(audioPulse);
      boostUniform.value = clamp01(boost01);
      driftUniform.value = clamp01(drift01);
    },
  };
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
