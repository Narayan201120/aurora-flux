import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
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
uniform float uTime;
varying float vProgress;

void main() {
  vProgress = aProgress;
  vec3 pos = position;
  pos.y += sin(aProgress * 48.0 - uTime * 3.0) * 0.035;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const RIBBON_FRAGMENT = /* glsl */ `
precision highp float;
uniform float uTime;
varying float vProgress;

void main() {
  float pulse = sin(vProgress * 70.0 - uTime * 4.0) * 0.5 + 0.5;
  vec3 cyan = vec3(0.15, 0.95, 1.0);
  vec3 violet = vec3(0.65, 0.25, 1.0);
  vec3 color = mix(cyan, violet, smoothstep(0.25, 0.8, vProgress));
  float dash = smoothstep(0.22, 0.5, sin(vProgress * 190.0 - uTime * 8.0) * 0.5 + 0.5);
  float alpha = 0.24 + pulse * 0.34 + dash * 0.22;
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
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  const material = new ShaderMaterial({
    vertexShader: RIBBON_VERTEX,
    fragmentShader: RIBBON_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
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
      const timeUniform = (ribbon.material as ShaderMaterial).uniforms.uTime;
      if (timeUniform) timeUniform.value = time;
    },
  };
}
