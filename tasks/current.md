# Current Objective

Milestone: M4 Racing Mechanics

Transform movement into an arcade racing feel.

Requirements:

- Drift mechanics (handbrake + steering reduces lateral grip)
- Drift charging (accumulator builds while drifting, decays otherwise)
- Boost system (release charged drift for a timed speed boost)
- Drafting system (gain speed when behind another racer)
- Impact recovery (collision response with bounce-back and input damping)
- Speed balancing (boost extends top speed; tuning constants surfaced)
- Visual feedback (camera shake/drift bias, FOV pulse on boost, exposure flash)
- Vehicle tuning config (single source of truth for racer balance)

Verification:

- bun run check-types passes
- bun run lint passes
- bun run build passes
- bun run dev launches without console errors
- Manual: handbrake + steer slides; releasing charges a boost; pressing boost uses it
- Manual: chasing the showcase-area ahead point briefly speeds up the racer