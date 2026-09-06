# ADR 0001: Phase 2 visual architecture

- Status: accepted
- Date: 2026-09-06

## Context

M13 is a verified release candidate. Phase 2 is a new visual milestone, not a
reopening of the release-candidate gameplay systems. The existing renderer
already has procedural aurora and nebula materials, cel materials, inverted
hulls, a normal/depth prepass, edge detection, color grading, adaptive quality,
and browser screenshot verification.

The visual brief asks for stronger shaders, speed feedback, particles,
landmarks, and audio-reactive presentation. Implementing all of these as
independent hero effects would make racers unreadable and put integrated GPUs
outside the current budget. Direct coupling from the audio graph into shader
uniforms would also cross the rendering/audio boundary and could turn output
volume changes into visual instability.

## Decision

Phase 2 extends the existing systems in four verified stages:

1. Upgrade the Aurora Ribbon and establish a shared VisualState bridge.
2. Add bounded speed, impact, chromatic, and pooled particle feedback.
3. Improve procedural nebula depth and deterministic landmark framing.
4. Add optional audio reactivity through a normalized SensoryBus downstream of
   the compressed audio mix.

The Aurora Ribbon is the visual hero. Racers and hazards must remain readable
at the highest effect intensity. Chromatic aberration is reserved for short
boost and impact pulses. Full raymarching is not a default path. Particle
families use fixed capacities and quality-tier caps. Physics, controls, AI,
checkpoints, and race outcomes are out of scope.

Existing `EdgePass`, `ColorGradePass`, cel materials, quality tiers, and
screenshot harness remain the integration points. No second rendering
architecture is introduced.

## Consequences

The visual system gets a clear hierarchy and predictable fallbacks. The code
must carry a small amount of presentation state between gameplay, audio, and
rendering. New effects need screenshot evidence and telemetry checks before
the next stage begins. A full GPU particle simulation or full-screen raymarch
may be revisited later, but neither is required for this milestone.

