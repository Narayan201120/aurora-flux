# Aurora Flux

Cel-shaded arcade aurora racing game built with Three.js, TypeScript, Vite, and Bun.

## Quick start

```
bun install
bun run dev
```

Then open http://127.0.0.1:5173/.

## Scripts

- `bun run dev` — start the Vite dev server
- `bun run build` — typecheck and produce a production build
- `bun run lint` — run ESLint
- `bun run check-types` — run TypeScript checks

## Structure

- `apps/game` — the game app (Three.js + Vite)
- `packages/typescript-config` — shared `tsconfig` base
- `packages/eslint-config` — shared ESLint flat config
- `spec/` — game vision, architecture, milestones, acceptance criteria
- `tasks/current.md` — current milestone and objectives
- `AGENTS.md` — operating rules for AI agents working on this codebase

## Status

- M0 Foundation — complete
- M2 Cel Shading Pipeline — complete
- M1 Aurora System, M3+ — pending

## License

MIT
