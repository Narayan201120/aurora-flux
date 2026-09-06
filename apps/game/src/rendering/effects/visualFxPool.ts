import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
} from "three";
import type { QualityTier } from "../../config/config.js";

/**
 * Per-tier instance budgets. The high-tier allocation is fixed at construction
 * time; lowering quality only reduces which slots may be activated.
 */
export interface VisualFxCaps {
  readonly driftSparks: number;
  readonly engineWakes: number;
  readonly impactBursts: number;
}

export const VISUAL_FX_CAPS: Readonly<Record<QualityTier, VisualFxCaps>> = {
  low: {
    driftSparks: 24,
    engineWakes: 12,
    impactBursts: 4,
  },
  medium: {
    driftSparks: 64,
    engineWakes: 24,
    impactBursts: 8,
  },
  high: {
    driftSparks: 128,
    engineWakes: 48,
    impactBursts: 12,
  },
};

export interface DriftSparkSpawn {
  readonly kind: "drift-spark";
  readonly startTime: number;
  readonly position: Vector3;
  readonly velocity: Vector3;
  readonly color: Color;
  readonly size: number;
  readonly lifetimeSeconds: number;
  readonly intensity: number;
  readonly rotation: number;
  readonly seed: number;
}

export interface EngineWakeSpawn {
  readonly kind: "engine-wake";
  readonly startTime: number;
  readonly position: Vector3;
  readonly velocity: Vector3;
  readonly color: Color;
  readonly size: number;
  readonly lifetimeSeconds: number;
  readonly intensity: number;
  readonly rotation: number;
  readonly seed: number;
}

export interface ImpactBurstSpawn {
  readonly kind: "impact-burst";
  readonly startTime: number;
  readonly position: Vector3;
  readonly velocity: Vector3;
  readonly color: Color;
  readonly size: number;
  readonly lifetimeSeconds: number;
  readonly intensity: number;
  readonly rotation: number;
  readonly seed: number;
}

export type VisualFxSpawn =
  | DriftSparkSpawn
  | EngineWakeSpawn
  | ImpactBurstSpawn;

export interface VisualFxPoolStats {
  driftSparks: number;
  engineWakes: number;
  impactBursts: number;
}

export interface VisualFxPoolOptions {
  readonly quality?: QualityTier;
  readonly enabled?: boolean;
  readonly renderOrder?: number;
}

export interface VisualFxPool {
  readonly group: Group;
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  readonly maxCapacity: number;
  readonly quality: QualityTier;
  readonly enabled: boolean;
  readonly caps: VisualFxCaps;
  update(timeSeconds: number): void;
  spawn(input: VisualFxSpawn): boolean;
  spawnDriftSpark(
    startTime: number,
    position: Vector3,
    velocity: Vector3,
    color: Color,
    size: number,
    lifetimeSeconds: number,
    intensity: number,
    rotation: number,
    seed: number,
  ): boolean;
  spawnEngineWake(
    startTime: number,
    position: Vector3,
    velocity: Vector3,
    color: Color,
    size: number,
    lifetimeSeconds: number,
    intensity: number,
    rotation: number,
    seed: number,
  ): boolean;
  spawnImpactBurst(
    startTime: number,
    position: Vector3,
    velocity: Vector3,
    color: Color,
    size: number,
    lifetimeSeconds: number,
    intensity: number,
    rotation: number,
    seed: number,
  ): boolean;
  setQuality(tier: QualityTier): void;
  setEnabled(enabled: boolean): void;
  getStats(target: VisualFxPoolStats): void;
  reset(): void;
  dispose(): void;
}

const DRIFT_SPARK_KIND = 0;
const ENGINE_WAKE_KIND = 1;
const IMPACT_BURST_KIND = 2;

interface FxBucket {
  readonly kind: number;
  readonly offset: number;
  readonly maxCapacity: number;
  readonly freeStack: Int32Array;
  currentCapacity: number;
  freeCount: number;
  activeCount: number;
}

const FX_VERTEX_SHADER = /* glsl */ `
attribute vec3 aOrigin;
attribute vec3 aVelocity;
attribute vec4 aParams;
attribute vec4 aColor;
attribute vec4 aExtra;

uniform float uTime;

varying vec2 vLocalPosition;
varying vec4 vColor;
varying float vLife;
varying float vKind;
varying float vSeed;

mat2 rotate2d(float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return mat2(cosine, -sine, sine, cosine);
}

void main() {
  float startTime = aParams.x;
  float lifetime = aParams.y;
  float age = uTime - startTime;
  float life = lifetime > 0.0 ? clamp(age / lifetime, 0.0, 1.0) : 1.0;
  float kind = aExtra.x;
  float seed = aExtra.y;

  // Dead slots are still included in the fixed instance draw, but are moved
  // outside clip space so the pool never needs to compact its buffers.
  if (lifetime <= 0.0 || age < 0.0 || age > lifetime) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vLocalPosition = vec2(2.0);
    vColor = vec4(0.0);
    vLife = 1.0;
    vKind = kind;
    vSeed = seed;
    return;
  }

  vec3 worldPosition = aOrigin + aVelocity * age;
  if (kind < 0.5) {
    worldPosition.y -= age * age * 2.4;
  } else if (kind > 1.5) {
    worldPosition += aVelocity * age * (1.0 - life) * 0.25;
  }

  vec2 scale = vec2(aParams.z);
  if (kind < 0.5) {
    scale *= vec2(0.45 + fract(seed * 0.71) * 0.35, 1.0);
    scale.y *= 1.0 - life * 0.35;
  } else if (kind < 1.5) {
    scale *= vec2(0.45, 2.8 * (1.0 - life * 0.62));
  } else {
    scale *= vec2(0.9 + life * 0.4);
  }

  vec2 localPosition = rotate2d(aParams.w + seed * 6.28318) * position.xy;
  vec4 viewPosition = viewMatrix * modelMatrix * vec4(worldPosition, 1.0);
  viewPosition.xy += localPosition * scale;

  gl_Position = projectionMatrix * viewPosition;
  vLocalPosition = position.xy * 2.0;
  vColor = aColor;
  vLife = life;
  vKind = kind;
  vSeed = seed;
}
`;

const FX_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vLocalPosition;
varying vec4 vColor;
varying float vLife;
varying float vKind;
varying float vSeed;

void main() {
  vec2 point = vLocalPosition;
  float distanceFromCenter = length(point);
  float fadeOut = 1.0 - smoothstep(0.68, 1.0, vLife);
  float alpha = 0.0;

  if (vKind < 0.5) {
    // A diamond with a narrow hot core reads as a sharp drift spark.
    float diamond = max(0.0, 1.0 - abs(point.x) - abs(point.y));
    float core = 1.0 - smoothstep(0.0, 0.24, distanceFromCenter);
    alpha = max(diamond, core * 0.8) * fadeOut;
  } else if (vKind < 1.5) {
    // A soft tapered vertical wake keeps engine trails lightweight and legible.
    float width = 1.0 - smoothstep(0.05, 0.95, abs(point.x));
    float taper = 1.0 - smoothstep(-0.9, 0.95, point.y);
    alpha = width * taper * fadeOut * 0.72;
  } else {
    // Impact bursts combine a ring and four graphic rays without a texture.
    float ring = 1.0 - smoothstep(0.02, 0.16, abs(distanceFromCenter - 0.56));
    float rays = pow(max(abs(point.x), abs(point.y)), 7.0);
    float flash = 1.0 - smoothstep(0.0, 0.72, distanceFromCenter);
    alpha = max(ring, rays * 0.46) * fadeOut + flash * (1.0 - vLife) * 0.42;
  }

  alpha *= vColor.a;
  if (alpha < 0.008) discard;

  vec3 color = vColor.rgb * (1.15 + vColor.a * 0.85);
  gl_FragColor = vec4(color, alpha);
}
`;

function positiveOr(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, finiteOr(value, 0)));
}

function createGeometry(totalCapacity: number): InstancedBufferGeometry {
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      new Float32Array([
        -0.5, -0.5, 0,
        0.5, -0.5, 0,
        0.5, 0.5, 0,
        -0.5, 0.5, 0,
      ]),
      3,
    ),
  );
  geometry.setAttribute(
    "uv",
    new Float32BufferAttribute(
      new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      2,
    ),
  );
  geometry.setIndex(
    new BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1),
  );
  geometry.instanceCount = totalCapacity;
  return geometry;
}

function createBucket(
  kind: number,
  offset: number,
  maxCapacity: number,
  currentCapacity: number,
): FxBucket {
  const freeStack = new Int32Array(maxCapacity);
  for (let index = 0; index < currentCapacity; index += 1) {
    freeStack[index] = currentCapacity - index - 1;
  }
  return {
    kind,
    offset,
    maxCapacity,
    freeStack,
    currentCapacity,
    freeCount: currentCapacity,
    activeCount: 0,
  };
}

export function createVisualFxPool(
  options: VisualFxPoolOptions = {},
): VisualFxPool {
  const initialQuality = options.quality ?? "high";
  const initialCaps = VISUAL_FX_CAPS[initialQuality];
  const maxCaps = VISUAL_FX_CAPS.high;
  const sparkOffset = 0;
  const wakeOffset = maxCaps.driftSparks;
  const impactOffset = wakeOffset + maxCaps.engineWakes;
  const maxCapacity = impactOffset + maxCaps.impactBursts;

  const originValues = new Float32Array(maxCapacity * 3);
  const velocityValues = new Float32Array(maxCapacity * 3);
  const parameterValues = new Float32Array(maxCapacity * 4);
  const colorValues = new Float32Array(maxCapacity * 4);
  const extraValues = new Float32Array(maxCapacity * 4);
  const endTimes = new Float32Array(maxCapacity);
  const active = new Uint8Array(maxCapacity);

  const geometry = createGeometry(maxCapacity);
  geometry.setAttribute(
    "aOrigin",
    new InstancedBufferAttribute(originValues, 3),
  );
  geometry.setAttribute(
    "aVelocity",
    new InstancedBufferAttribute(velocityValues, 3),
  );
  geometry.setAttribute(
    "aParams",
    new InstancedBufferAttribute(parameterValues, 4),
  );
  geometry.setAttribute(
    "aColor",
    new InstancedBufferAttribute(colorValues, 4),
  );
  geometry.setAttribute(
    "aExtra",
    new InstancedBufferAttribute(extraValues, 4),
  );

  const originAttribute = geometry.getAttribute("aOrigin");
  const velocityAttribute = geometry.getAttribute("aVelocity");
  const parameterAttribute = geometry.getAttribute("aParams");
  const colorAttribute = geometry.getAttribute("aColor");
  const extraAttribute = geometry.getAttribute("aExtra");
  if (
    !(originAttribute instanceof InstancedBufferAttribute) ||
    !(velocityAttribute instanceof InstancedBufferAttribute) ||
    !(parameterAttribute instanceof InstancedBufferAttribute) ||
    !(colorAttribute instanceof InstancedBufferAttribute) ||
    !(extraAttribute instanceof InstancedBufferAttribute)
  ) {
    throw new Error("Visual FX instanced attributes failed to initialize");
  }

  const material = new ShaderMaterial({
    vertexShader: FX_VERTEX_SHADER,
    fragmentShader: FX_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { uTime: { value: 0 } },
  });
  const timeUniform = material.uniforms.uTime;
  if (timeUniform === undefined) {
    throw new Error("Visual FX time uniform failed to initialize");
  }
  const mesh = new Mesh(geometry, material);
  mesh.name = "VisualFxInstances";
  mesh.frustumCulled = false;
  mesh.renderOrder = options.renderOrder ?? 60;

  const group = new Group();
  group.name = "VisualFxPool";
  group.add(mesh);

  const sparkBucket = createBucket(
    DRIFT_SPARK_KIND,
    sparkOffset,
    maxCaps.driftSparks,
    initialCaps.driftSparks,
  );
  const wakeBucket = createBucket(
    ENGINE_WAKE_KIND,
    wakeOffset,
    maxCaps.engineWakes,
    initialCaps.engineWakes,
  );
  const impactBucket = createBucket(
    IMPACT_BURST_KIND,
    impactOffset,
    maxCaps.impactBursts,
    initialCaps.impactBursts,
  );

  let quality = initialQuality;
  let enabled = options.enabled ?? true;
  let currentTime = 0;
  mesh.visible = enabled;

  const pool: VisualFxPool = {
    group,
    mesh,
    maxCapacity,
    get quality() {
      return quality;
    },
    get enabled() {
      return enabled;
    },
    get caps() {
      return VISUAL_FX_CAPS[quality];
    },
    update(timeSeconds: number) {
      currentTime = finiteOr(timeSeconds, currentTime);
      timeUniform.value = currentTime;
      let attributesChanged = false;

      attributesChanged = releaseExpired(
        currentTime,
        sparkBucket,
        active,
        endTimes,
        parameterValues,
      ) || attributesChanged;
      attributesChanged = releaseExpired(
        currentTime,
        wakeBucket,
        active,
        endTimes,
        parameterValues,
      ) || attributesChanged;
      attributesChanged = releaseExpired(
        currentTime,
        impactBucket,
        active,
        endTimes,
        parameterValues,
      ) || attributesChanged;

      if (attributesChanged) {
        parameterAttribute.needsUpdate = true;
      }
    },
    spawn(input: VisualFxSpawn): boolean {
      switch (input.kind) {
        case "drift-spark":
          return pool.spawnDriftSpark(
            input.startTime,
            input.position,
            input.velocity,
            input.color,
            input.size,
            input.lifetimeSeconds,
            input.intensity,
            input.rotation,
            input.seed,
          );
        case "engine-wake":
          return pool.spawnEngineWake(
            input.startTime,
            input.position,
            input.velocity,
            input.color,
            input.size,
            input.lifetimeSeconds,
            input.intensity,
            input.rotation,
            input.seed,
          );
        case "impact-burst":
          return pool.spawnImpactBurst(
            input.startTime,
            input.position,
            input.velocity,
            input.color,
            input.size,
            input.lifetimeSeconds,
            input.intensity,
            input.rotation,
            input.seed,
          );
        default: {
          const exhaustive: never = input;
          return exhaustive;
        }
      }
    },
    spawnDriftSpark(
      startTime,
      position,
      velocity,
      color,
      size,
      lifetimeSeconds,
      intensity,
      rotation,
      seed,
    ) {
      return activate(
        sparkBucket,
        startTime,
        position,
        velocity,
        color,
        size,
        lifetimeSeconds,
        intensity,
        rotation,
        seed,
      );
    },
    spawnEngineWake(
      startTime,
      position,
      velocity,
      color,
      size,
      lifetimeSeconds,
      intensity,
      rotation,
      seed,
    ) {
      return activate(
        wakeBucket,
        startTime,
        position,
        velocity,
        color,
        size,
        lifetimeSeconds,
        intensity,
        rotation,
        seed,
      );
    },
    spawnImpactBurst(
      startTime,
      position,
      velocity,
      color,
      size,
      lifetimeSeconds,
      intensity,
      rotation,
      seed,
    ) {
      return activate(
        impactBucket,
        startTime,
        position,
        velocity,
        color,
        size,
        lifetimeSeconds,
        intensity,
        rotation,
        seed,
      );
    },
    setQuality(tier) {
      quality = tier;
      configureBucket(
        sparkBucket,
        VISUAL_FX_CAPS[tier].driftSparks,
        active,
        parameterValues,
      );
      configureBucket(
        wakeBucket,
        VISUAL_FX_CAPS[tier].engineWakes,
        active,
        parameterValues,
      );
      configureBucket(
        impactBucket,
        VISUAL_FX_CAPS[tier].impactBursts,
        active,
        parameterValues,
      );
      parameterAttribute.needsUpdate = true;
    },
    setEnabled(nextEnabled) {
      enabled = nextEnabled;
      mesh.visible = nextEnabled;
      if (!nextEnabled) pool.reset();
    },
    getStats(target) {
      target.driftSparks = sparkBucket.activeCount;
      target.engineWakes = wakeBucket.activeCount;
      target.impactBursts = impactBucket.activeCount;
    },
    reset() {
      resetBucket(sparkBucket, active, parameterValues);
      resetBucket(wakeBucket, active, parameterValues);
      resetBucket(impactBucket, active, parameterValues);
      parameterAttribute.needsUpdate = true;
    },
    dispose() {
      pool.reset();
      geometry.dispose();
      material.dispose();
    },
  };

  function activate(
    bucket: FxBucket,
    startTime: number,
    position: Vector3,
    velocity: Vector3,
    color: Color,
    size: number,
    lifetimeSeconds: number,
    intensity: number,
    rotation: number,
    seed: number,
  ): boolean {
    if (!enabled || bucket.freeCount <= 0) return false;
    const freeIndex = bucket.freeCount - 1;
    const localIndex = bucket.freeStack[freeIndex];
    if (localIndex === undefined) return false;
    bucket.freeCount = freeIndex;

    const slot = bucket.offset + localIndex;
    const originOffset = slot * 3;
    const parameterOffset = slot * 4;
    originValues[originOffset] = position.x;
    originValues[originOffset + 1] = position.y;
    originValues[originOffset + 2] = position.z;
    velocityValues[originOffset] = velocity.x;
    velocityValues[originOffset + 1] = velocity.y;
    velocityValues[originOffset + 2] = velocity.z;
    const spawnTime = finiteOr(startTime, currentTime);
    const lifetime = positiveOr(lifetimeSeconds, 0.1);
    parameterValues[parameterOffset] = spawnTime;
    parameterValues[parameterOffset + 1] = lifetime;
    parameterValues[parameterOffset + 2] = positiveOr(size, 0.1);
    parameterValues[parameterOffset + 3] = finiteOr(rotation, 0);
    colorValues[parameterOffset] = color.r;
    colorValues[parameterOffset + 1] = color.g;
    colorValues[parameterOffset + 2] = color.b;
    colorValues[parameterOffset + 3] = clamp01(intensity);
    extraValues[parameterOffset] = bucket.kind;
    extraValues[parameterOffset + 1] = finiteOr(seed, 0);
    active[slot] = 1;
    endTimes[slot] = spawnTime + lifetime;
    bucket.activeCount += 1;

    originAttribute.needsUpdate = true;
    velocityAttribute.needsUpdate = true;
    parameterAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    extraAttribute.needsUpdate = true;
    return true;
  }

  return pool;
}

function releaseExpired(
  timeSeconds: number,
  bucket: FxBucket,
  active: Uint8Array,
  endTimes: Float32Array,
  parameterValues: Float32Array,
): boolean {
  let changed = false;
  for (let localIndex = 0; localIndex < bucket.currentCapacity; localIndex += 1) {
    const slot = bucket.offset + localIndex;
    const endTime = endTimes[slot];
    if (active[slot] === 0 || endTime === undefined || timeSeconds < endTime) {
      continue;
    }
    active[slot] = 0;
    parameterValues[slot * 4 + 1] = 0;
    bucket.freeStack[bucket.freeCount] = localIndex;
    bucket.freeCount += 1;
    bucket.activeCount -= 1;
    changed = true;
  }
  return changed;
}

function configureBucket(
  bucket: FxBucket,
  nextCapacity: number,
  active: Uint8Array,
  parameterValues: Float32Array,
): void {
  bucket.currentCapacity = nextCapacity;
  bucket.freeCount = 0;
  bucket.activeCount = 0;

  for (let localIndex = 0; localIndex < bucket.maxCapacity; localIndex += 1) {
    const slot = bucket.offset + localIndex;
    if (localIndex >= nextCapacity) {
      active[slot] = 0;
      parameterValues[slot * 4 + 1] = 0;
    } else if (active[slot] === 0) {
      bucket.freeStack[bucket.freeCount] = localIndex;
      bucket.freeCount += 1;
    } else {
      bucket.activeCount += 1;
    }
  }
}

function resetBucket(
  bucket: FxBucket,
  active: Uint8Array,
  parameterValues: Float32Array,
): void {
  for (let localIndex = 0; localIndex < bucket.maxCapacity; localIndex += 1) {
    const slot = bucket.offset + localIndex;
    active[slot] = 0;
    parameterValues[slot * 4 + 1] = 0;
  }
  bucket.activeCount = 0;
  bucket.freeCount = 0;
  for (let localIndex = 0; localIndex < bucket.currentCapacity; localIndex += 1) {
    bucket.freeStack[bucket.freeCount] = localIndex;
    bucket.freeCount += 1;
  }
}
