# Antaris Simulation Module

The simulation module is now a compact 3D-only scene that exists to support the portfolio homepage foundation.

## What It Does

- Renders a dark Earth with `public/textures/earth-night.jpg`
- Keeps the space backdrop on `public/textures/night-sky.png`
- Animates satellites from Kepler orbital elements
- Preserves satellite colors, hover orbit paths, click details, ground-station markers, visibility cones, and coverage rings
- Keeps camera interaction simple with orbit controls

## Public Entry Point

```tsx
import { OriginalSimulation } from '@/modules/simulation/components/OriginalSimulation';

<OriginalSimulation
    satellites={satellites}
    groundStations={groundStations}
/>
```

## Accepted Props

- `satellites`: `KeplerParams[]`
- `groundStations`: `ManualGroundStation[]`

## Main Files

- `components/OriginalSimulation.tsx`
- `components/SatelliteSimulation.ts`
- `services/KeplerPropagator.ts`
- `services/physics/*`
- `types/index.ts`
- `utils/coordUtils.ts`
- `utils/satelliteUtils.ts`

## Intentionally Removed

- 2D map rendering
- online map rendering and map-service configuration
- header and settings UI
- time acceleration controls
- create/edit, ground-target, and AOI/polygon flows
- environment-variable-based map configuration
- extra Earth textures

## Current Direction

This module is intentionally narrow now so we can shape the portfolio experience in smaller, safer steps from here.
