# ADR 0003: Safe sensory reactivity and rival trails

- Status: accepted
- Date: 2026-09-06

## Context

The audio engine is synthesized and compressed for a restrained output level.
Phase 2 needs audio-reactive visuals and stronger rival identities, but direct
audio-to-material coupling would make presentation depend on raw output gain.
The existing AI profiles already define aggressive, technical, and wild
personalities without giving rendering permission to inspect AI internals.

## Decision

The audio graph exposes a fixed analyzer buffer after the compressor. Each
frame produces normalized low, mid, high, and pulse values in the SensoryBus.
Rendering consumes those values through VisualState. The values can change
track energy, aurora intensity, and color grading, but they cannot change
audio gain or gameplay state.

Rival wakes use the existing opponent snapshot position, velocity, heading, and
personality label. The visual FX pool maps those labels to fixed trail colors
and budgets. Rendering does not query AI decision state or alter opponent
movement.

## Consequences

The visual response follows the safe audio path and remains bounded when audio
is locked, quiet, or loud. Rival identity is visible in motion without adding
new meshes or AI coupling. The browser harness can validate the full signal
path by checking normalized audio and visual snapshots.

