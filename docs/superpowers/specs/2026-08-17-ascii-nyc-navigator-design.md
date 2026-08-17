# ASCII NYC Navigator — Design Spec

**Date:** 2026-08-17  
**Status:** Approved for implementation

---

## Overview

A browser-based, destination-driven ASCII 3D city navigator starting with NYC. The user enters a start and end address, then navigates the route in first-person ASCII 3D or toggles to an overhead 2D ASCII map view. No GPU required — all rendering is Canvas 2D.

Built on the `candt-nextjs-template` stack: Next.js 16 App Router, TypeScript strict, Tailwind v4, pnpm.

---

## Core Approach

A custom canvas raycaster engine (DDA algorithm — same technique as Wolfenstein 3D). The city is a 2D grid of cells. Every frame, rays are cast from the camera across the grid; hits are converted to ASCII characters based on distance, face direction, and cell type. No WebGL, no Three.js — pure Canvas 2D math.

**What we write:**

- DDA raycaster engine (TypeScript, ~100 lines, informed by `ludthor/ascii-city` aesthetics)
- Mapbox tile → grid pipeline
- Google routing + geocoding integration
- Overhead ASCII map renderer
- Navigation UX + Next.js app shell

**What we use:**

- `mapbox/vector-tile-js` — parses Mapbox binary tile format (saves writing a protobuf parser)
- `ludthor/ascii-city` — studied for ASCII character set tuning and distance fog curve; not adopted as a dependency

---

## Architecture

Three layers:

**Data layer (server-side)** — Next.js API routes. Client never calls external APIs directly.

**Render layer (`"use client"`)** — Canvas 2D raycaster. Two canvases share one grid: `RaycasterCanvas` (first-person) and `OverheadCanvas` (top-down).

**UI layer** — Tailwind-styled components outside the canvas: address search, route panel, view toggle.

---

## Data Layer

### External APIs

| Purpose                           | Provider                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------- |
| Building footprints + heights     | Mapbox Vector Tiles (`building` layer — `height`, `min_height`, `extrude` fields) |
| Address geocoding + autocomplete  | Google Maps Geocoding API                                                         |
| Pedestrian routing + turn-by-turn | Google Routes API                                                                 |

### API Routes

**`/api/geocode`**  
Input: `{ address: string, city?: string }`  
Output: `{ lat: number, lng: number, displayName: string }`  
Calls Google Geocoding API server-side.

**`/api/route`**  
Input: `{ start: LatLng, end: LatLng }`  
Output: `{ polyline: LatLng[], steps: Step[] }`  
`Step = { instruction: string, distance: number, streetName: string }`  
Calls Google Routes API server-side.

**`/api/grid`**  
Input: `{ bbox: BBox, city?: string }`  
Output: `{ cells: Cell[][], origin: LatLng, resolution: number }`  
Fetches Mapbox Vector Tiles, parses with `vector-tile-js`, converts building polygons to grid cells with height. Cached aggressively (buildings don't change).

### Grid Format

```ts
type CellType = "road" | "building" | "empty";
type Cell = { type: CellType; height: number };
type Grid = Cell[][];
```

`height` comes from Mapbox `height` field (metres). ASCII character selection is based on face direction (N/S vs E/W) and distance — not building material type, which Mapbox doesn't reliably expose.

### Multi-City Growth

A city is a config object in `lib/cities.ts`:

```ts
type CityConfig = {
  name: string;
  bbox: BBox;
  center: LatLng;
  gridResolution: number;
};
```

All API routes accept an optional `city` param. Adding a new city is one config entry — OSM/Mapbox cover the world.

---

## Raycaster Engine

Lives entirely in `lib/raycaster/`. Pure math — no DOM, no canvas calls.

### `engine.ts` — DDA raycast

For each screen column:

1. Compute ray angle: `cameraAngle - fov/2 + col * (fov / columns)`
2. Run DDA grid traversal to find first non-empty cell
3. Apply fisheye correction: `correctedDist = dist * cos(rayAngle - cameraAngle)`
4. Compute wall strip height: `screenHeight / correctedDist * cell.height`
5. Return `FrameData`: `{ charHeight, cellType, face, distance }`

### `renderer.ts` — ASCII mapping

Maps `FrameData[]` to a 2D char array, writes to canvas with `fillText` in monospace font on a black background. Target: 30fps.

Character sets (near → far):

| Surface           | Characters                 |
| ----------------- | -------------------------- |
| Building N/S face | `█ ▓ ▒ ░ \|`               |
| Building E/W face | `█ ▓ ▒ ░ ─`                |
| Road/ground       | `. , : ;`                  |
| Sky               | `(space)` → `.` at horizon |

N/S and E/W use different character sets to simulate directional shading without a lighting model.

### `camera.ts` — camera state

```ts
type Camera = { x: number; y: number; angle: number; fov: number };
```

Two movement modes:

- **Manual:** WASD/arrow keys, collision-checked against building cells, constrained to road cells
- **Route follow:** auto-advances along route polyline at walking pace (~4 km/h), user can look left/right freely

### `chars.ts` — character constants

Named exports for each character set. Centralised so tuning the aesthetic is one-file change.

---

## Component Structure

```
src/
  app/
    page.tsx                     ← server shell, renders Navigator
    api/
      geocode/route.ts           ← Google Geocoding API
      route/route.ts             ← Google Routes API
      grid/route.ts              ← Mapbox tiles → Cell[][] grid
  components/
    navigator/
      Navigator.tsx              ← "use client" root, NavigatorContext + layout
      RaycasterCanvas.tsx        ← canvas + requestAnimationFrame loop
      OverheadCanvas.tsx         ← top-down ASCII map canvas
      ViewToggle.tsx             ← Tab key + button, switches view
      AddressSearch.tsx          ← start + destination with Google Autocomplete
      RoutePanel.tsx             ← turn-by-turn steps, current step highlighted
  lib/
    raycaster/
      engine.ts                  ← DDA algorithm → FrameData[]
      renderer.ts                ← FrameData[] → char grid → canvas
      camera.ts                  ← Camera type + movement helpers
      chars.ts                   ← ASCII character set constants
    grid/
      builder.ts                 ← Mapbox tile data → Cell[][]
      types.ts                   ← Cell, Grid, Route, BBox, LatLng types
    google/
      geocoding.ts               ← address → LatLng
      routes.ts                  ← LatLng pair → RouteResult + Steps
    mapbox/
      tiles.ts                   ← fetch + parse via vector-tile-js
    cities.ts                    ← city registry
```

All files respect the template's 300-line limit. JSX depth stays at ≤ 3 throughout.

### State

Single `NavigatorContext` — no external state library:

```ts
type NavigatorState = {
  grid: Grid;
  camera: Camera;
  route: Route | null;
  view: "firstperson" | "overhead";
  routeSteps: Step[];
  currentStep: number;
};
```

---

## Navigation Flow

1. **Land** — NYC loads as default city. Grid fetches for initial viewport. Camera starts at 5th Ave + 42nd St.

2. **Search** — User types destination. Google Autocomplete suggests addresses. User selects → geocodes to `LatLng`. Start defaults to current camera position.

3. **Route** — `/api/route` returns polyline + steps. Polyline converts to grid coordinates.

4. **Navigate** — Overhead highlights path as `·`. `RoutePanel` lists steps. First-person auto-walks at walking pace.

5. **In-route controls:**
   - Spacebar — pause/resume auto-walk
   - A/D or mouse — look left/right while route advances
   - Tab — toggle overhead ↔ first-person; camera shown as `@` on map
   - Any WASD — take manual control; spacebar resumes route

6. **Arrive** — Camera reaches destination cell. RoutePanel shows "Arrived." User can search again or free-roam.

### Error States

| Condition          | Handling                                        |
| ------------------ | ----------------------------------------------- |
| Address not found  | Inline error below input, prompt to retry       |
| No walkable route  | "No walking route found" in RoutePanel          |
| Grid fetch failure | Retry once, then show "Map unavailable" overlay |

---

## Dependencies

| Package                     | Purpose                                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `@mapbox/vector-tile`       | Parse Mapbox binary tile format                                                                                                     |
| `@googlemaps/js-api-loader` | Google Maps Autocomplete widget (client-side UI only — actual geocode calls go through `/api/geocode`, never directly from browser) |

No Three.js. No game engine. No canvas library.

---

## Out of Scope (for now)

- NPC pedestrians or cars (can be added later as animated cell types)
- Real-time traffic or events
- Interior building views
- Audio
- Mobile touch controls (keyboard-first for v1)
