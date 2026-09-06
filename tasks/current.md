# Current objective

Milestone: Phase 2 visual uplift, Stage 2 complete

M13 remains complete and verified. Phase 2 is a post-release visual milestone.
Stage 1 adds the Aurora Ribbon material upgrade, the presentation-only
VisualState vocabulary, safe normalized audio-reactive sampling, bounded radial
speed lines and chromatic pulses, and a fixed-capacity instanced FX pool. Race
physics, handling, AI, checkpoints, and audio output safety remain unchanged.

Next stage: finish the safe SensoryBus presentation mapping and rival-specific
visual trails, then run the final Phase 2 regression and screenshot review.

## Implemented systems

- Deterministic closed Catmull–Rom circuit with animated energy ribbon
- Ordered checkpoints, finish gate, three-lap progression, and wrong-way state
- Spring chase camera, drift framing, boost feedback, and floating-origin rebasing
- Three distinct AI racers with pace, lane, risk, drafting, overtaking,
  avoidance, recovery, and rubber-band differences
- Procedural rider pilots with lean, drift, boost, idle, and impact animation
- Procedural rider victory animation wired to the finished race phase
- Meteor, lightning, gravity-well, comet, spatial-fracture, and dark-matter hazards
- Instanced crystal forests, celestial arches, eclipse gate, shattered moon
  fragments, star whales, and a celestial leviathan
- Race HUD with speed, lap, timer, position, boost charge, hazard channel, and minimap
- Responsive HUD layout with accessibility labels and mobile overflow checks
- Countdown, finish results, and restart flow
- Web Audio synthesis for engine, countdown, drift, boost, impact, hazard, and finish cues
- Audio graph unlock diagnostics and runtime event verification
- Filtered, low-gain, compressed engine output with runtime safety checks
- Adaptive pixel-ratio quality scaling for constrained hardware
- Adaptive starfield particle scaling with low/medium/high tiers
- CPU, GPU, draw-call, triangle, geometry, and texture telemetry
- Playwright browser harness with startup, movement, three-lap finish, and restart captures
- Final polish pass with transient impact state and release-candidate checks
- Phase 2 Stage 1 Aurora Ribbon flow, post-process motion feedback, safe audio
  reactive state, and pooled visual FX
- Phase 2 Stage 2 layered nebula detail, deterministic horizon anchors, and
  quality-tier landmark fallbacks

## Verification

```text
bun run check-types
bun run lint
bun run build
bun run verify:race
node tools/capture-screenshots.mjs
```

The browser harness assumes `bun run dev` is running at
`http://127.0.0.1:5173/`. It writes runtime evidence to
`notes/browser-captures/` and fails on page errors, WebGL shader errors, HTTP
errors, incomplete three-lap flow, or a broken restart.
