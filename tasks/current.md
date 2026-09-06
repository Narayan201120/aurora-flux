# Current objective

Milestone: M11 audio

M10 is complete. Aurora Flux now runs a complete procedural arcade race loop
with a readable desktop and mobile presentation layer. Speed, lap, position,
boost, hazards, minimap, countdown, results, and restart state are all visible
without debug tooling.

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
- Adaptive pixel-ratio quality scaling for constrained hardware
- Playwright browser harness with startup, movement, three-lap finish, and restart captures

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
