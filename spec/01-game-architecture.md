# Architecture

This document defines the architectural boundaries of Aurora Flux. It is intended to prevent architecture drift as the project grows and to ensure that all systems remain modular, testable, and maintainable.

The game is composed of several major systems. Each system owns a clearly defined responsibility and should avoid reaching into the internals of other systems.

## Core Principles

The architecture must favor composition over inheritance.

Systems should communicate through well-defined interfaces rather than direct coupling.

Rendering code must never contain gameplay logic.

Gameplay systems must never directly manipulate rendering internals.

Procedural generation must be deterministic whenever possible.

Performance is a first-class requirement and must be considered during the design of every system.

All systems must be capable of running on GPU-constrained hardware through scalable quality settings.

No system may depend on external assets.

## High-Level Systems

### Core

The Core system owns:

- Application bootstrap
- Main game loop
- Timing
- Update scheduling
- Lifecycle management
- Event dispatching
- Global configuration

The Core system coordinates all other systems but should contain as little game-specific logic as possible.

---

### Rendering

The Rendering system owns:

- Three.js renderer
- Cameras
- Post-processing
- Cel shading
- Outline rendering
- Screen-space effects
- LOD management
- Visibility systems

The Rendering system is responsible only for visual presentation.

It must not contain race logic, AI decisions, or gameplay state.

---

### World

The World system owns:

- Infinite world management
- Aurora generation
- Flow fields
- Celestial structures
- Nebula regions
- Crystal forests
- Gravity anomalies
- Environmental hazards

The World system creates and updates the environment but does not decide race outcomes.

---

### Racing

The Racing system owns:

- Racer movement
- Vehicle handling
- Drift mechanics
- Boost systems
- Checkpoints
- Lap counting
- Race state
- Position tracking

The Racing system defines the rules of competition.

---

### AI

The AI system owns:

- Opponent behavior
- Racing line following
- Overtaking
- Drafting
- Shortcut evaluation
- Recovery behavior
- Personality traits

The AI system consumes world and racing information but does not directly control rendering.

---

### Audio

The Audio system owns:

- Sound synthesis
- Music generation
- Spatial audio
- Audio mixing
- Dynamic sound effects

All audio must be generated procedurally.

No external audio files are permitted.

---

### UI

The UI system owns:

- HUD
- Minimap
- Timers
- Position display
- Results screens
- Warning indicators
- Debug overlays

The UI reflects game state but does not own game state.

---

## Data Ownership

Every piece of data should have a single owner.

Rendering owns visual representations.

Racing owns race state.

World owns environmental state.

AI owns decision state.

UI reads state but should not become the source of truth.

Duplicated ownership should be treated as a design flaw.

## Performance Architecture

Performance is not a later optimization phase.

Every system must expose scalability controls.

Examples include:

- Particle budgets
- Render distance
- LOD levels
- Shader complexity
- Post-processing quality
- Simulation frequency

The game should automatically adapt quality settings based on runtime performance.

## Testing Philosophy

Major systems should be testable in isolation.

Visual systems should be validated through automated screenshot testing.

Gameplay systems should be validated through deterministic simulation where practical.

Performance regressions should be treated as bugs.

## Repository Structure

The implementation structure may evolve over time.

The architectural boundaries defined in this document must remain stable even if folders, packages, or modules change.

Architecture is defined by responsibilities, not by directory names.