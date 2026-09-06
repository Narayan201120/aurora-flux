# ADR 0004: Phase 3 production readiness scope

- Status: accepted for planning
- Date: 2026-09-06

## Context

Aurora Flux has a verified three-lap race loop and a completed Phase 2 visual
uplift. The remaining weaknesses are visible in captured frames and in the
missing product loop around pause, settings, persistence, repeated sessions,
and long-run verification.

Adding another large rendering system would increase risk without addressing
those weaknesses. The project also needs to preserve its frozen handling and
asset-free constraints.

## Decision

Phase 3 is a production-readiness pass in this order:

1. establish a quality-tier screenshot benchmark and visual critic gate
2. correct composition and reduced-motion behavior
3. add pause, safe audio settings, accessibility, and validated persistence
4. run a five-race performance soak and inspect bundle cost
5. add personal-best results and small deterministic trial conditions
6. run the release gate across desktop, portrait, and quality tiers

The next replay feature is local personal-best feedback plus deterministic trial
conditions. New tracks, new physics, new audio soundtrack, online features,
and full GPU/WebGPU rendering are deferred.

## Consequences

Phase 3 improves the player-facing loop without reopening the M13 gameplay
contract. The work crosses more product boundaries than Phase 2, so settings,
pause, persistence, and trial conditions require explicit browser tests. The
plan accepts that a human screenshot review remains necessary for composition,
while automated checks prove state, safety, and performance stability.

