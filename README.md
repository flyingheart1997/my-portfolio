# Antaris

This repo is now a simplified 3D foundation for a portfolio website.

The old 2D map system, dashboard UI, edit flows, modal controls, map switching, and multi-texture Earth pipeline have been removed. The app now renders a single dark 3D Earth scene powered by Three.js and a lightweight Kepler-based satellite animation path.

## Current Stack

- Next.js
- React
- Three.js
- TypeScript

## Current Behavior

- Full-screen 3D scene
- Dark Earth rendered with `public/textures/earth-night.jpg`
- Real-time satellite motion from seeded orbital elements
- Simple ground-station markers
- No environment variables required

## Quick Start

```bash
pnpm install
pnpm dev
```

The local app runs on `http://localhost:3001`.

## Verification

```bash
pnpm exec tsc --noEmit
pnpm build
pnpm lint
```

## Project Focus

The goal from here is to build the portfolio step by step on top of this cleaner visual core instead of carrying the older simulation product surface.

## References

- [Simulation module](./src/modules/simulation/README.md)
- [Architecture note](./docs/architecture.md)
