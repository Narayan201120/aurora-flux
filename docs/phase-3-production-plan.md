# Aurora Flux Phase 3 production plan

- Status: proposed and self-grilled
- Date: 2026-09-06
- Baseline: M13 release candidate plus Phase 2 visual uplift

## The outcome

Phase 3 should make Aurora Flux easier to read, safer to use, more stable over
long sessions, and worth replaying. It should not become another shader sweep.

The aurora current and racer remain the visual focus. The world frames the
route. The HUD explains the race. The result screen gives the player a reason
to run again.

The frozen boundary stays intact:

- no handling constant changes
- no control remapping in the core race loop
- no checkpoint or lap rule changes
- no AI decision changes
- no external assets
- no raw audio path that can bypass the current limiter

## Evidence from the Phase 2 baseline

The final browser suite passes, but the captured frames show four real gaps:

1. The wide view has a dark lower field and broad horizon bands that sometimes
   compete with the racing line.
2. Portrait framing still lets nearby geometry dominate the countdown view.
3. The browser harness proves one race and one restart, but not settings,
   persistence, repeated sessions, pause, or reduced motion.
4. The production bundle is about 600 KB after minification and still emits
   Vite's 500 KB warning.

These are acceptance targets, not invitations to add more decoration.

## Design direction

The visual hierarchy remains deliberately narrow:

```text
quiet nebula and landmark silhouette
              ↓
      readable aurora current
              ↓
        racer and hazard
              ↓
       compact race HUD
```

Core colors remain Deep Space `#04060F`, Void Navy `#0B1433`, Aurora Mint
`#9AFFE0`, Plasma Cyan `#72F8FF`, Orbit Violet `#A984FF`, and Signal Pink
`#FF78CE`. Starlight white is reserved for readable text and high-priority
silhouettes.

The HUD stays sentence-case where it communicates an action or setting. The
existing angular panels remain, but new screens should not become a wall of
identical cards. Results and pause screens should use one clear primary action.

## Module sketch

The next code should be shaped around these seams before implementation:

```ts
type MotionMode = "full" | "reduced";
type QualityPreference = "auto" | "low" | "medium" | "high";

interface PlayerSettings {
  motion: MotionMode;
  quality: QualityPreference;
  masterVolume: number;
  engineVolume: number;
  effectsVolume: number;
  muted: boolean;
}

type TrialCondition =
  | { kind: "clear-current"; label: "Clear Current" }
  | { kind: "stormline"; label: "Stormline" }
  | { kind: "overdrive"; label: "Overdrive" };

interface RaceRecord {
  rulesVersion: string;
  condition: TrialCondition["kind"];
  bestTotalMs: number | null;
  bestLapMs: number | null;
  completedRuns: number;
}

interface VisualBenchmark {
  id: string;
  viewport: { width: number; height: number };
  quality: "low" | "medium" | "high";
  state: "countdown" | "moving" | "hazard" | "pause" | "results";
}
```

`PlayerSettings` is parsed at the local-storage boundary. Rendering, audio,
and UI receive validated values, not JSON-shaped objects. `TrialCondition` is a
closed union so a new condition cannot silently skip race setup. `RaceRecord`
updates only after a verified three-lap finish.

## Milestone sequence

Each milestone ends with its own build, runtime check, screenshot review,
commit, and push. Do not start the next milestone while its predecessor is
red.

### P3.0: Benchmark and visual critic baseline

Goal: turn the current screenshot review into a repeatable gate.

Work:

- Add deterministic high, medium, and low capture states to the browser API.
- Capture desktop and portrait frames for countdown, moving, hazard, pause
  placeholder, results, and restart.
- Add a human review checklist for horizon balance, racer silhouette, current
  readability, hazard contrast, HUD collisions, and reduced-motion expectations.
- Add a lightweight screenshot metadata report. Do not require brittle pixel
  equality for animated scenes.

Acceptance:

- Every benchmark has a stable state identifier and quality tier.
- No page, console, HTTP, or shader errors occur.
- The current frame review is recorded before visual changes begin.

Commit: `Establish Phase 3 visual benchmark baseline`

### P3.1: Visual correction and comfort

Goal: fix the defects seen in the baseline captures without expanding the
rendering architecture.

Work:

- Rebalance the lower horizon and preserve a clear racing-line corridor.
- Tune portrait chase distance and landmark visibility separately from desktop.
- Reduce speed-line and chromatic effects under reduced motion.
- Keep hazard telegraphs visible through shape, position, text, and pulse, not
  color alone.
- Review the eight benchmark frames again and remove one effect that does not
  improve navigation.

Acceptance:

- The racer and current remain readable in every quality tier.
- Portrait countdown no longer lets nearby geometry dominate the frame.
- Reduced motion removes camera shake, chromatic pulses, and nonessential
  particle bursts while leaving route and hazard information intact.
- No physics, controls, AI, or checkpoint files change in this milestone.

Commit: `Complete Phase 3 visual and motion correction`

### P3.2: Safety, pause, and settings

Goal: make the game comfortable to play repeatedly.

Work:

- Add Escape-to-pause with a keyboard-accessible pause panel.
- Add master, engine, effects volume, and mute controls.
- Preserve the current conservative gain ceiling and compressor path.
- Add reduced-motion and quality preferences.
- Persist settings with a versioned, validated local-storage record.
- Restore focus to the pause trigger or results action after closing a panel.

Acceptance:

- Pause freezes race time, hazards, AI, particles, and audio modulation.
- Restart from pause returns to a clean countdown state.
- Volume settings survive reload and never exceed the safe output cap.
- Corrupt storage falls back to defaults without a page error.
- Keyboard focus is visible and all settings work without a mouse.

Commit: `Complete Phase 3 player safety settings`

### P3.3: Performance soak and bundle hygiene

Goal: prove the game stays healthy beyond a single screenshot run.

Work:

- Add a five-race browser soak with restart between runs.
- Record draw calls, geometries, textures, CPU time, render time, and quality
  tier before and after the soak.
- Add low, medium, and high capture runs to the same verification command.
- Inspect the 600 KB bundle warning. Split only if the measured boot or runtime
  cost justifies the added complexity.
- Add disposal assertions for post-processing targets, audio nodes, and FX
  pools during teardown.

Acceptance:

- Five completed races show no increasing geometry, texture, or draw-call
  trend.
- Existing limits remain draw calls ≤80, geometries ≤200, and textures ≤32.
- Quality changes do not allocate alternate particle buffers.
- Automated soak results are recorded as stability evidence. Real integrated
  GPU frame-rate checks remain a manual release check because headless Chrome
  is not a representative GPU benchmark.

Commit: `Complete Phase 3 performance soak`

### P3.4: Replay loop and results feedback

Goal: give the player a reason to run the circuit again using the systems that
already exist.

Work:

- Add a personal-best race card with best total time, best lap, and run delta.
- Update records only after a completed three-lap race.
- Ignore restarts and incomplete runs.
- Version records so future rule changes do not corrupt comparisons.
- Add lap splits, best-lap delta, clean-run status, and a short time-loss
  summary based on existing impacts, wrong-way state, and boost use.
- Add three small deterministic trial conditions using existing track,
  hazards, palettes, and boost systems. Conditions must not change vehicle
  handling constants or checkpoint semantics.
- Show the trial name and seed/rules version in results.

Acceptance:

- Personal bests survive reload and ignore invalid or incomplete records.
- All three conditions complete the existing race-flow verification.
- Results explain the run in plain language and do not obscure the final time.
- A second race feels meaningfully different through conditions and feedback,
  not through untested new physics.

Commit: `Complete Phase 3 replay loop`

### P3.5: Release gate

Goal: produce a release candidate that can be replayed, configured, and tested
without relying on developer-only behavior.

Work:

- Expand the README with settings, pause, trials, and verification commands.
- Run the full desktop/mobile and quality-tier screenshot matrix.
- Add CI for typecheck, lint, build, race flow, and browser verification if the
  repository's GitHub settings allow it.
- Review console errors, shader errors, network errors, accessibility failures,
  and audio safety assertions.
- Run a manual integrated-GPU session and a long browser session.

Release criteria:

- Every existing acceptance criterion still passes.
- All Phase 3 settings and trial tests pass.
- Five-race soak shows stable resource counters.
- No critical accessibility, audio-safety, gameplay, or visual-readability
  defect remains.
- `main` is pushed with one commit per completed milestone.

Commit: `Complete Phase 3 release gate`

## Dependency order

```text
P3.0 benchmark
   ├── P3.1 visual correction
   ├── P3.2 settings and pause
   └── P3.3 performance soak
          └── P3.4 replay loop
                 └── P3.5 release gate
```

P3.1 and P3.2 can be developed in separate files after P3.0, but both must
land before P3.3 because motion and settings affect the performance matrix.

## Self-grill

### Are more shaders the next priority?

No. The screenshots already contain enough visual material. The weak spots are
composition, comfort, and the reason to replay.

### Should Phase 3 add a second track?

No. A second track would touch routing, checkpoints, hazards, AI, screenshots,
and balance. Seeded trial conditions provide replay value at much lower risk.

### Is the current analyzer a soundtrack synesthesia system?

No. The current audio graph has procedural engine and ambient tones, not a
full procedural music/BPM model. Phase 3 should call this audio-reactive
presentation. A soundtrack system is a separate future milestone.

### Should we add full GPU particles, raymarching, or WebGPU?

No. Those are expensive solutions to problems the screenshots do not prove.
The current pooled instanced effects and layered nebula are sufficient until a
measured bottleneck demands more.

### Is the screenshot harness enough to judge visual quality?

No. It proves state, errors, and numeric budgets. It cannot decide whether a
frame feels crowded. Automated assertions and a short human review checklist
must remain separate.

### What is explicitly deferred?

Online leaderboards, cloud saves, multiplayer, full ghosts, progression,
vehicle upgrades, daily challenges, new hazard families, gamepad remapping,
full raymarching, GPU simulation, and a new soundtrack/BPM system.

## Blast-radius checks

- Settings touch audio, rendering, UI, and local storage. Prove safety with a
  browser reload test, corrupted-storage test, and gain assertions.
- Pause touches the game loop and every time-based system. Prove it with a
  snapshot taken before and after a paused interval.
- Trial conditions touch world configuration and results. Prove deterministic
  seed output and complete all three conditions through the real browser path.
- Personal-best storage touches only completed results. Prove incomplete runs,
  restart, reload, and invalid JSON cases.
- Bundle splitting can change boot order. Prove `bun run dev`, production
  preview, and the browser harness from a clean process.

