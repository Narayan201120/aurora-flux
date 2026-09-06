# Aurora Flux domain glossary

Aurora Flux is a procedural cosmic arcade racer. The player flies through a
living aurora current rather than on a conventional road. Race rules and
vehicle handling are authoritative gameplay concerns. Visual and audio
responses make those rules readable without changing them.

## Phase 2 terms

### Aurora Ribbon

The visible racing current that communicates route direction, speed, and
energy. It is a presentation of the existing track spline, not a second track
or a physics surface.

### VisualState

Presentation-only state derived from race, racer, hazard, camera, audio, and
quality state. It can influence materials, post-processing, particles, and
camera presentation. It cannot change physics, AI decisions, checkpoints, or
race outcomes.

### SensoryBus

A bounded stream of normalized audio-reactive values such as low, mid, high,
and pulse. It carries visual intensity, not raw output volume. It remains
quiet when audio is locked and stays downstream of the safe audio mix.

### Juice event

A short-lived visual response to a meaningful gameplay event, such as a boost,
impact, hazard discharge, or finish. Juice events expire on their own and do
not become gameplay state.

### Particle family

A fixed-budget visual effect with one purpose and one quality policy. Phase 2
starts with drift sparks, engine wakes, and impact bursts.

### Landmark anchor

A deterministic world placement selected for silhouette, scale, horizon framing,
or navigation value. Random decoration is not a landmark anchor.

### Quality tier

The low, medium, or high presentation budget chosen by adaptive quality. Every
Phase 2 effect must have a defined degradation path.

### Visual benchmark

A deterministic screenshot state with a named viewport, quality tier, and race
moment. It proves that a visual change can be reviewed again. A benchmark is
not a pixel-perfect comparison for animated scenes.

### Player settings

Validated preferences for motion, quality, audio levels, and mute. Settings
change presentation and comfort only. They do not change race rules.

### Trial condition

A closed, deterministic race presentation condition that gives a rematch a
different target or atmosphere without changing handling constants,
checkpoint semantics, or control inputs.

### Race record

A versioned local record written only after a completed three-lap race. A
restart, incomplete run, corrupt record, or changed rules version cannot
replace a valid record.

## Boundaries

- Racing owns handling, progress, drift, boost, and collisions.
- World owns aurora layers, hazards, nebulae, and landmarks.
- Rendering owns materials, post-processing, particles, and visual state.
- Audio owns synthesis, mixing, compression, and the normalized SensoryBus.
- UI reads snapshots and does not become a source of truth.
- Settings are parsed at the storage boundary and read by UI, audio, and
  rendering as validated presentation preferences.
- Race records belong to results persistence. They do not become race state.
