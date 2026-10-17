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
- Tower economy values use 100-credit units; all credit mutations are rounded at the store boundary.
- Kill rewards, per-wave rewards, level-clear rewards and carry-over funds.
- Versioned local save data with v1/v2/v3 migration support; current snapshots are v4 and restore only tower state.
- Procedural Web Audio music in `src/game/music.ts`, so no external audio asset is required.
- Opening fate draw in `src/game/cards.ts`: three random cards, one choice, permanent run modifiers, and save-safe results.
- Card visuals are currently CSS neon art with a stable `card-art` hook for replacing each card with PNG/illustration assets later.
- Tower previews load the GLB assets whose filenames contain `tower` under `public/models/`.
