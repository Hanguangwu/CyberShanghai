# Cyber Shanghai: Boar Siege

Browser 3D tower-defense MVP built with Vite, React, TypeScript, Three.js and Zustand.

## Run

```bash
pnpm install
pnpm dev
```

## Verify

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm test:e2e
```

The Playwright regression starts the Vite preview server and checks the rendered game, six tower choices, music control, wave/pause flow, and local save restore.

## Current systems

- Three configurable levels with independent story, wave count, starting funds, difficulty multipliers and clear rewards in `src/game/levels.ts`.
- Six tower types, five regular enemy types and a boss.
- Moat bridge, gate, straight and corner modules with A* reachability validation.
- Kill rewards, per-wave rewards, level-clear rewards and carry-over funds.
- Versioned local save data with v1 migration support.
- Procedural Web Audio music in `src/game/music.ts`, so no external audio asset is required.
