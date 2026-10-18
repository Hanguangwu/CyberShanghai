# Cyber Shanghai: Campus Defense（赛博沪上：保卫上科大校园）

Browser 3D tower-defense game built with Vite, React, TypeScript, Three.js and Zustand.

Defend the SUSTech campus core against waves of rogue beetles, patrol robots and the Deepseek whale boss. Each run starts with a fate blind box: one random card out of eight permanently modifies the run.

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

- One playable level, "保卫上科大校园", with story, objective, 8 waves, starting funds, difficulty multipliers and clear reward in `src/game/levels.ts`.
- Six tower types; three enemy types: beetle (虫子), patrol robot (机器人) and the Deepseek whale boss (鲸鱼, waves 6 and 8).
- Tower economy uses 100-credit units; upgrade costs `100 × level`, sell refunds `100 × level`; all credit mutations are rounded at the store boundary.
- Kill rewards, per-wave rewards and level-clear rewards.
- Opening fate blind box in `src/game/cards.ts`: one random card out of eight, revealed on open, permanent run modifiers, save-safe results.
- Versioned local save data (v4) with v2/v3 migration; restores towers, credits, wave and card state.
- MP3 soundtrack in `public/audios/`: one menu track plus four shuffled gameplay tracks, managed by `src/game/music.ts`.
- All 3D assets are HyperAI-generated GLBs under `public/models/`, normalized on load (height alignment, grounding, fallback materials).
- Vite `base: './'`, so the production build can be hosted from any GitHub Pages subpath.
