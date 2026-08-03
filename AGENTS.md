# Agent Rules

This document defines the operating rules for any AI agent working on Aurora Flux.

These rules exist to maintain quality, consistency, performance, and architectural integrity throughout the project.

Failure to follow these rules should be treated as a defect.

---

# Primary Objective

Build a production-quality arcade racing game.

Do not build a prototype.

Do not build a technology demonstration.

Do not build isolated systems that do not contribute to the final game.

Every task should move the project closer to a playable, polished release.

---

# Source of Truth

The source of truth is:

1. 00-game-vision.md
2. 01-architecture.md
3. 02-game-design-stages.md
4. 03-acceptance-criteria.md
5. This document

If implementation conflicts with documentation, update the implementation unless the documentation is clearly incorrect.

Do not silently change project direction.

---

# Required Workflow

Before making changes:

- Read all files in the spec directory
- Identify the current milestone
- Identify dependencies of the task
- Verify that the task supports the current milestone

After making changes:

- Verify the application builds
- Verify the application runs
- Verify no new errors were introduced
- Verify acceptance criteria still pass
- Update documentation if required

---

# Milestone Discipline

Work only on the current milestone unless blocked.

Do not skip ahead.

Do not build future systems prematurely.

Do not introduce unfinished systems that are not currently needed.

A partially complete milestone should be completed before beginning the next milestone.

---

# Architecture Rules

Prefer composition over inheritance.

Avoid global mutable state.

Avoid tightly coupled systems.

Keep rendering separate from gameplay logic.

Keep gameplay separate from presentation logic.

Keep systems modular and independently testable.

Avoid creating dependencies between systems unless necessary.

Do not introduce architectural complexity without justification.

---

# Performance Rules

Performance is a feature.

Every new system must consider performance during implementation.

Do not postpone optimization decisions that affect architecture.

Use:

- Object pooling
- Instancing
- Frustum culling
- LOD systems
- Efficient update loops
- Reusable allocations

Avoid:

- Per-frame allocations
- Unbounded entity creation
- Expensive scene traversals
- Excessive draw calls
- Duplicate computations

Every major feature should have a degradation strategy for lower-end hardware.

---

# Dependency Rules

Do not add dependencies without justification.

Before adding a dependency:

- Explain why it is needed
- Explain why existing code cannot solve the problem
- Explain the maintenance cost

Prefer built-in browser APIs whenever practical.

Prefer project code over external libraries.

Smaller dependency graphs are preferred.

---

# Asset Rules

No external assets are allowed.

Do not add:

- Models
- Textures
- Audio files
- HDRIs
- Fonts
- Sprite sheets
- Particle atlases

Everything must be generated procedurally.

If a resource cannot be generated procedurally, document the limitation before proceeding.

---

# Code Quality Rules

Write readable code.

Optimize for maintainability first.

Use descriptive names.

Avoid unnecessary abstraction.

Avoid premature generalization.

Avoid dead code.

Avoid commented-out code.

Remove obsolete implementations when replacements are stable.

---

# Documentation Rules

Update documentation when:

- Architecture changes
- Milestones change
- Major systems are introduced
- Significant design decisions are made

Documentation should describe reality.

Documentation should never become stale.

---

# Testing Rules

Do not assume a feature works.

Verify it.

Use:

- Runtime validation
- Screenshot validation
- Manual gameplay validation
- Automated testing where appropriate

Evidence is preferred over assumptions.

---

# Visual Quality Rules

Aurora Flux is a visual-first project.

Visual quality matters as much as functionality.

When implementing visuals:

- Prioritize readability
- Prioritize silhouette quality
- Prioritize motion clarity
- Prioritize style consistency

Avoid:

- Generic visuals
- Placeholder aesthetics
- Inconsistent visual language
- Realistic rendering

The target is stylized anime-inspired presentation.

---

# Screenshot Review Rules

When a visual feature is completed:

- Capture screenshots
- Review screenshots critically
- Identify weaknesses
- Improve weaknesses
- Repeat

Do not use implementation effort as evidence of quality.

Only the result matters.

---

# Definition of Done

A task is complete only when:

- Code exists
- Build succeeds
- Runtime succeeds
- Acceptance criteria pass
- No critical regressions exist
- Documentation is updated if necessary

If any condition fails, the task is not complete.

---

# Forbidden Behaviors

Do not claim completion without verification.

Do not mark milestones complete early.

Do not ignore performance concerns.

Do not add unnecessary dependencies.

Do not introduce external assets.

Do not rewrite stable systems without reason.

Do not sacrifice maintainability for short-term progress.

Do not prioritize cleverness over clarity.

---

# Final Rule

When uncertain, choose the option that produces:

- Better gameplay
- Better visual quality
- Better maintainability
- Better performance
- Better long-term project health

The objective is not to generate code.

The objective is to ship Aurora Flux.