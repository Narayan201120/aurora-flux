# ADR 0002: Procedural horizon composition

- Status: accepted
- Date: 2026-09-06

## Context

The first Phase 2 screenshots improved motion feedback but still left the
horizon visually flat. Aurora Flux needs scale without a random field of
unbounded meshes or a full-screen raymarch that would punish integrated GPUs.

## Decision

Use layered procedural dome noise with four fixed octaves and a quality-scaled
detail layer. Use a small deterministic set of landmark anchors for horizon
framing. Anchors are shared-geometry meshes or instanced meshes, and lower
quality tiers hide secondary anchors instead of allocating alternate scenes.

The horizon pass remains presentation-only. It does not change track routing,
hazard positions, or race logic.

## Consequences

The world gains depth and recognizable silhouettes while keeping geometry and
shader work bounded. The scene is still stylized rather than volumetrically
realistic. A higher-cost raymarched path can be evaluated separately if a
future hardware budget justifies it.

