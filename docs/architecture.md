# System Architecture

The project now uses a deliberately minimal 3D-only rendering path so it can evolve into a portfolio site without carrying the older simulation dashboard complexity.

## Runtime Shape

1. `src/app/page.tsx`
- Provides demo satellite and ground-station seed data.
- Mounts a single full-screen `OriginalSimulation` instance.

2. `src/modules/simulation/components/OriginalSimulation.tsx`
- Owns the canvas container.
- Creates and disposes the Three.js runtime inside a React effect.

3. `src/modules/simulation/components/SatelliteSimulation.ts`
- Builds the Three.js scene, camera, renderer, and orbit controls.
- Renders a single textured Earth using `public/textures/earth-night.jpg` with `public/textures/night-sky.png` behind it.
- Updates satellite positions in real time from Kepler elements.
- Preserves satellite icons, category colors, hover orbit paths, ground-station markers, visibility cones, and GS coverage rings.

4. `src/modules/simulation/services/KeplerPropagator.ts`
- Converts orbital elements into live latitude, longitude, and altitude.
- Uses local physics helpers for the portfolio seed data; the fallback demo TLE set is generated offline.

## Removed Systems

- 2D rendering
- online map rendering and map-service configuration
- header and settings UI
- time-speed controls
- create/edit workspace, ground-target, and AOI/polygon flows
- MapLibre, flat-map, and tiled-globe map pipelines

## Goal

This leaves the repo with a clean visual core that can be used as the foundation for the portfolio homepage and expanded step by step.
