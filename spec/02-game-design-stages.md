# Milestones

This document defines the implementation roadmap for Aurora Flux.

The milestones are ordered intentionally. Later milestones assume earlier systems already exist and are stable. The project should remain playable after every milestone.

A milestone is not complete when code exists. A milestone is complete when its acceptance criteria are met and the implementation is stable.

---

# M0 Foundation

Objective:

Establish the technical foundation of the game.

Requirements:

- Bun workspace functions correctly
- Vite application launches
- Three.js renderer initializes
- Camera system exists
- Resize handling works
- Render loop is stable
- Debug overlay exists
- FPS metrics exist
- Performance telemetry exists
- World origin rebasing exists
- Playwright screenshot harness exists
- Screenshot capture can run automatically

Deliverable:

A stable application shell capable of rendering a simple scene and collecting performance metrics.

---

# M1 Aurora System

Objective:

Create the infinite celestial environment.

Requirements:

- Infinite starfield
- Infinite horizon
- Aurora river rendering
- Multi-layer aurora motion
- Procedural flow fields
- Energy current visualization
- Nebula generation
- Planet rendering
- Celestial atmosphere
- Dynamic environment coloring

Deliverable:

A beautiful infinite cosmos that can be explored even before racing mechanics exist.

---

# M2 Cel Shading Pipeline

Objective:

Create the visual identity of the game.

Requirements:

- Custom cel shading
- Hard lighting bands
- Outline rendering
- Screen-space edge detection
- Rim lighting
- Stylized highlights
- Post-processing pipeline
- Color grading

Deliverable:

The environment should visually resemble a stylized anime production rather than a traditional Three.js scene.

---

# M3 Racer Prototype

Objective:

Create a controllable racer.

Requirements:

- Racer entity
- Acceleration
- Braking
- Steering
- Hover movement
- Camera follow
- Speed feedback
- Collision foundations

Deliverable:

The player can freely move through the aurora environment.

---

# M4 Racing Mechanics

Objective:

Transform movement into a racing system.

Requirements:

- Drift mechanics
- Drift charging
- Boost system
- Drafting system
- Impact recovery
- Speed balancing
- Vehicle tuning

Deliverable:

Movement feels enjoyable and arcade-like.

---

# M5 Track System

Objective:

Build an actual race course.

Requirements:

- Spline track
- Racing line visualization
- Checkpoints
- Lap tracking
- Wrong-way detection
- Position tracking
- Race start
- Race finish

Deliverable:

The player can complete a full race course.

---

# M6 Environmental Hazards

Objective:

Turn the environment into gameplay.

Requirements:

- Meteor streams
- Lightning veins
- Gravity wells
- Spatial fractures
- Dark matter storms
- Comet crossings
- Hazard warnings

Deliverable:

The course contains dynamic challenges beyond steering.

---

# M7 World Content

Objective:

Populate the universe.

Requirements:

- Crystal forests
- Shattered moon fields
- Celestial arches
- Nebula banks
- Large-scale landmarks
- Star whales
- Celestial leviathans

Deliverable:

The world feels alive and memorable.

---

# M8 AI Racers

Objective:

Create believable opponents.

Requirements:

- Three AI racers
- Racing line following
- Drafting
- Overtaking
- Obstacle avoidance
- Personality traits
- Recovery behavior
- Rubber banding

Deliverable:

The player can compete against AI opponents.

---

# M9 Riders

Objective:

Bring racers to life.

Requirements:

- Procedural rider generation
- Leaning animations
- Drift animations
- Boost animations
- Impact reactions
- Idle movement
- Victory animations

Deliverable:

Every racer has a living pilot rather than a static model.

---

# M10 User Interface

Objective:

Create a complete race presentation layer.

Requirements:

- Speed display
- Lap display
- Position display
- Boost meter
- Minimap
- Hazard indicators
- Results screen
- Countdown sequence

Deliverable:

The player can understand all race information without debugging tools.

---

# M11 Audio

Objective:

Create the sonic identity of the game.

Requirements:

- Engine synthesis
- Drift sounds
- Boost sounds
- Collision sounds
- Hazard sounds
- Ambient soundscape
- Dynamic mixing

Deliverable:

The game sounds alive without using external assets.

---

# M12 Performance Pass

Objective:

Ensure broad hardware compatibility.

Requirements:

- GPU profiling
- CPU profiling
- Draw-call reduction
- Particle scaling
- Dynamic quality scaling
- LOD validation
- Memory optimization

Deliverable:

The game performs well on integrated GPUs and constrained hardware.

---

# M13 Polish Pass

Objective:

Ship quality.

Requirements:

- Visual consistency
- Audio consistency
- Gameplay balancing
- Bug fixing
- Screenshot review
- Performance review
- Final tuning

Deliverable:

The project feels complete and production-ready.

---

# Release Candidate

A release candidate is produced only when:

- All milestones are complete
- Acceptance criteria are satisfied
- Screenshot reviews pass
- Performance targets pass
- No critical gameplay bugs remain
- No placeholder systems remain

The release candidate should feel like a finished game rather than a collection of systems.