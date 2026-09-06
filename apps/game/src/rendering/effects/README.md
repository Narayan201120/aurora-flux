# Visual FX pool

`createVisualFxPool()` creates one fixed-capacity instanced billboard mesh for
three presentation-only effect families:

- `drift-spark`: sharp diamond sparks with GPU-side gravity and fade-out.
- `engine-wake`: soft tapered wakes with GPU-side motion and fade-out.
- `impact-burst`: procedural ring/ray flashes for collisions or hazards.

The high-tier allocation is 188 instances total: 128 sparks, 48 wakes, and 12
impact bursts. Medium and low quality reduce activation caps to 64/24/8 and
24/12/4 respectively. No buffers are resized when quality changes. A disabled
pool clears active slots and hides its single mesh.

## Runtime contract

```ts
const fx = createVisualFxPool({ quality: "high" });
scene.add(fx.group);

fx.update(timeSeconds);
fx.spawnDriftSpark(
  timeSeconds,
  position,
  velocity,
  sparkColor,
  0.16,
  0.45,
  0.9,
  0,
  seed,
);

fx.setQuality("low");
fx.setEnabled(false);
fx.reset();
```

The positional spawn methods are the hot-path API: they write directly into
preallocated typed arrays and return `false` when the selected bucket is full
or disabled. `spawn(input)` is available for callers that already maintain a
reusable discriminated input record. `update()` only reclaims expired slots
and updates the shared shader clock; the particle motion itself is evaluated
in the vertex shader.

The module intentionally does not import racing, physics, AI, or audio code.
It accepts only visual transforms, colors, timing, and effect parameters.
