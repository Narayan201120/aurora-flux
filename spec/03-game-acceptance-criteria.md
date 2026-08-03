# Acceptance Criteria

This document defines what "done" means for every major system in Aurora Flux.

A feature is not complete because code exists.

A feature is not complete because it compiles.

A feature is not complete because it works once.

A feature is complete only when all acceptance criteria for that feature are satisfied.

---

# Foundation

Complete when:

- Application launches using `bun run dev`
- No console errors occur during startup
- No unhandled runtime exceptions occur
- Window resizing works correctly
- Stable render loop exists
- Debug overlay functions correctly
- FPS metrics update correctly
- Screenshot harness captures images successfully
- Project runs without manual setup steps

Fail if:

- Startup errors occur
- Manual intervention is required
- Screenshots cannot be captured
- Performance metrics are unavailable

---

# Aurora Environment

Complete when:

- Horizon appears infinite in all directions
- No visible seams exist
- No visible world boundaries exist
- No obvious repeating patterns exist
- Aurora currents clearly communicate flow direction
- Environment feels alive while stationary
- Environment feels alive while moving
- Multiple aurora layers move independently
- Large-scale celestial structures are visible

Fail if:

- World appears finite
- Repetition becomes obvious
- Aurora appears static
- Environment feels empty

---

# Cel Shading

Complete when:

- Objects use hard lighting bands
- Lighting remains visually stable
- Outlines remain visible at all distances
- Interior edge detection functions correctly
- Rim lighting improves silhouette readability
- Visual style resembles anime artwork

Fail if:

- Objects appear realistically shaded
- Outlines flicker excessively
- Silhouettes become difficult to read
- Lighting bands appear muddy or inconsistent

---

# Racer Controls

Complete when:

- Vehicle accelerates smoothly
- Vehicle brakes correctly
- Vehicle steers predictably
- Vehicle remains controllable at high speed
- Camera supports gameplay without causing confusion
- Speed feels satisfying

Fail if:

- Controls feel delayed
- Steering feels inconsistent
- Camera fights the player
- Movement feels sluggish

---

# Drift System

Complete when:

- Drift can be entered intentionally
- Drift can be maintained through corners
- Drift generates boost energy
- Drift release produces meaningful reward
- Drift is useful but not mandatory

Fail if:

- Drift is never worth using
- Drift dominates all other strategies
- Drift behavior feels random

---

# Boost System

Complete when:

- Boost activation is responsive
- Speed increase is noticeable
- Visual feedback exists
- Audio feedback exists
- Boost integrates naturally with drift mechanics

Fail if:

- Boost feels weak
- Boost breaks vehicle handling
- Boost lacks feedback

---

# Track System

Complete when:

- Race route is clearly readable
- Checkpoints validate correctly
- Lap counting functions correctly
- Wrong-way detection functions correctly
- Race can be completed from start to finish

Fail if:

- Players can bypass progression
- Checkpoints fail unpredictably
- Track becomes confusing

---

# Environmental Hazards

Complete when:

- Hazards are visually readable
- Hazards provide reaction time
- Hazards influence player decisions
- Hazards feel fair
- Hazards create variety between races

Fail if:

- Hazards appear without warning
- Hazards feel unavoidable
- Hazards become frustrating

---

# World Content

Complete when:

- Crystal forests are visible
- Shattered moon fields exist
- Celestial structures exist
- Nebula regions exist
- Large landmarks aid navigation
- Leviathans appear naturally
- World feels populated

Fail if:

- World feels empty
- Landmarks lack visual identity
- Leviathans feel scripted or artificial

---

# AI Racers

Complete when:

- AI completes races successfully
- AI follows racing lines
- AI overtakes opponents
- AI avoids obvious collisions
- AI reacts to hazards
- Personality differences are visible

Fail if:

- AI becomes stuck
- AI ignores hazards
- AI behaves identically

---

# Rider Animation

Complete when:

- Riders lean into turns
- Riders react to acceleration
- Riders react to impacts
- Riders react to boosting
- Victory animations function correctly

Fail if:

- Riders appear static
- Reactions feel disconnected from gameplay

---

# User Interface

Complete when:

- Speed is visible
- Position is visible
- Lap count is visible
- Boost state is visible
- Hazard warnings are visible
- Minimap functions correctly
- Results screen functions correctly

Fail if:

- Important information is hidden
- UI obstructs gameplay
- UI style conflicts with game style

---

# Audio

Complete when:

- Engine audio exists
- Drift audio exists
- Boost audio exists
- Collision audio exists
- Hazard audio exists
- Ambient audio exists
- Audio reacts to gameplay state

Fail if:

- Audio feels disconnected
- Feedback is missing
- Large gameplay events occur silently

---

# Performance

Complete when:

- Frame rate remains stable
- Performance scaling functions correctly
- Quality settings adapt automatically
- Memory usage remains controlled
- Draw-call counts remain reasonable
- Large scenes remain playable

Fail if:

- Performance degrades continuously
- Quality adaptation fails
- Memory usage grows without limit

---

# Visual Quality

Complete when:

- Screenshots look intentional
- Visual hierarchy is clear
- Important gameplay elements stand out
- Motion communicates speed
- World feels alive
- Aurora remains the visual centerpiece

Fail if:

- Screenshots resemble a prototype
- Scene composition feels random
- Important gameplay information is difficult to see

---

# Release Candidate

Aurora Flux is considered release-ready only when:

- Every milestone is complete
- Every acceptance criterion passes
- No placeholder assets remain
- No placeholder systems remain
- No critical bugs remain
- No major performance regressions remain
- The game feels cohesive from start to finish

If any requirement above fails, the project is not release-ready.