# Current Objective

Milestone: M3 Racer Prototype

Create a controllable racer the player can drive through the aurora environment.

Requirements:

- Procedural cel-shaded hovercraft racer mesh (no external assets)
- Hover movement model (thrust, lateral grip, ride height)
- Acceleration, braking, steering
- Keyboard controls (W/S accelerate/brake, A/D steer, Space boost-ready)
- Chase camera with spring damping + look-ahead
- Speed feedback in HUD overlay (m/s)
- Collision foundations (placeholder bounds; full collision lands in M4/M5)
- World rebase and camera follow the racer

Verification:

- bun run check-types passes
- bun run lint passes
- bun run build passes
- bun run dev launches without console errors
- Manual: pressing W moves the racer forward; A/D steer; speed updates in HUD
