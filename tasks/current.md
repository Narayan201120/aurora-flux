# Current objective

Milestone: M9 rider animation

M8 is complete. Aurora Flux now runs a complete procedural arcade race loop
with three personality-driven AI opponents that follow racing lines, draft,
overtake, avoid obstacles and hazards, recover from blockage, and use explicit
rubber-band pacing. The player starts in a three-second countdown, races a
three-lap circuit, and reaches a restartable results screen.

## Implemented systems

- Deterministic closed Catmull–Rom circuit with animated energy ribbon
- Ordered checkpoints, finish gate, three-lap progression, and wrong-way state
- Spring chase camera, drift framing, boost feedback, and floating-origin rebasing
- Three distinct AI racers with pace, lane, risk, drafting, overtaking,
  avoidance, recovery, and rubber-band differences
- Procedural rider pilots with lean, drift, boost, idle, and impact animation
- Meteor, lightning, gravity-well, comet, spatial-fracture, and dark-matter hazards
- Instanced crystal forests, celestial arches, eclipse gate, shattered moon
  fragments, star whales, and a celestial leviathan
- Race HUD with speed, lap, timer, position, boost charge, hazard channel, and minimap
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
