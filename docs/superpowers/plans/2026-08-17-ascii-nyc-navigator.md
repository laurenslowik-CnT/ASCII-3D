# ASCII NYC Navigator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based ASCII 3D NYC street navigator with first-person raycaster view and overhead 2D map, powered by Mapbox building data and Google Maps routing.

**Architecture:** Canvas 2D DDA raycaster renders NYC buildings (from Mapbox Vector Tiles) as ASCII characters — no WebGL. Two views share one grid: `RaycasterCanvas` (first-person) and `OverheadCanvas` (top-down). All external API calls (Mapbox, Google) go through Next.js API routes; the client receives only typed grid/route data.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4, pnpm, Vitest, `@mapbox/vector-tile`, `pbf`, `@googlemaps/js-api-loader`

---

## File Map

```
src/
  env.ts                                  ← MODIFY: add Mapbox + Google env vars
  __mocks__/handlers.ts                   ← MODIFY: add API mock handlers
  app/
    page.tsx                              ← MODIFY: render Navigator
    api/
      geocode/route.ts                    ← CREATE: Google Geocoding API proxy
      route/route.ts                      ← CREATE: Google Routes API proxy
      grid/route.ts                       ← CREATE: Mapbox tiles → Cell[][] proxy
  components/
    navigator/
      Navigator.tsx                       ← CREATE: "use client" root + context
      NavigatorContext.tsx                ← CREATE: shared state context
      RaycasterCanvas.tsx                 ← CREATE: first-person canvas + rAF loop
      OverheadCanvas.tsx                  ← CREATE: top-down ASCII map canvas
      ViewToggle.tsx                      ← CREATE: Tab/button view switcher
      AddressSearch.tsx                   ← CREATE: start + destination inputs
      RoutePanel.tsx                      ← CREATE: turn-by-turn step list
  lib/
    grid/
      types.ts                            ← CREATE: Cell, Grid, Route, BBox, LatLng, Step
      builder.ts                          ← CREATE: Mapbox tile data → Cell[][]
      coords.ts                           ← CREATE: LatLng ↔ grid coordinate math
    raycaster/
      chars.ts                            ← CREATE: ASCII character set constants
      engine.ts                           ← CREATE: DDA ray casting algorithm
      renderer.ts                         ← CREATE: FrameData[] → canvas
      camera.ts                           ← CREATE: Camera type + movement helpers
    mapbox/
      tiles.ts                            ← CREATE: fetch + parse vector tiles
    google/
      geocoding.ts                        ← CREATE: address → LatLng client
      routes.ts                           ← CREATE: LatLng pair → RouteResult
    cities.ts                             ← CREATE: city config registry
```

---

## Task 1: Scaffold project from template

**Files:**

- All files in project root

- [ ] **Step 1: Copy template into working directory**

```bash
cp -r /Users/laurenslowik/Documents/GitHub/candt-nextjs-template/. /Users/laurenslowik/Documents/GitHub/ASCII-3D/
cd /Users/laurenslowik/Documents/GitHub/ASCII-3D
```

- [ ] **Step 2: Update package name**

In `package.json`, change `"name": "candt-nextjs-template"` to `"name": "ascii-nyc-navigator"`.

- [ ] **Step 3: Install base dependencies and new packages**

```bash
pnpm install
pnpm add @mapbox/vector-tile pbf @googlemaps/js-api-loader
pnpm add -D @types/google.maps @types/pbf
```

- [ ] **Step 4: Initialize git**

```bash
git init
git add -A
git commit -m "chore: scaffold from candt-nextjs-template"
```

- [ ] **Step 5: Verify dev server starts**

```bash
pnpm dev
```

Expected: server starts on `http://localhost:3000`, page renders "Hello, world."

- [ ] **Step 6: Verify tests pass**

```bash
pnpm test
```

Expected: 0 failures (template ships with no tests).

---

## Task 2: Environment variables

**Files:**

- Modify: `src/env.ts`
- Create: `.env.local`

- [ ] **Step 1: Add `.env.local`**

Create `/Users/laurenslowik/Documents/GitHub/ASCII-3D/.env.local`:

```bash
MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key_here
```

(Fill in real tokens — get Mapbox token at mapbox.com/account/access-tokens, Google key at console.cloud.google.com with Geocoding API + Routes API + Maps JS API enabled.)

- [ ] **Step 2: Update `src/env.ts`**

```typescript
import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const env = createEnv({
  server: {
    MAPBOX_ACCESS_TOKEN: z.string().min(1),
    GOOGLE_MAPS_API_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().optional(),
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1),
  },
  runtimeEnv: {
    MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_VERCEL_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "localhost:3000",
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
});
```

- [ ] **Step 3: Verify build still works**

```bash
pnpm build
```

Expected: build succeeds (will error if env vars are missing — add placeholder values to `.env.local` if needed for CI).

- [ ] **Step 4: Commit**

```bash
git add src/env.ts .env.local
git commit -m "chore: add Mapbox and Google Maps env vars"
```

---

## Task 3: Shared types

**Files:**

- Create: `src/lib/grid/types.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/lib/grid/types.ts

export type LatLng = { lat: number; lng: number };

export type BBox = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type CellType = "road" | "building" | "empty";

export type Cell = {
  type: CellType;
  height: number; // metres, 0 for non-buildings
};

export type Grid = Cell[][];

export type GridMeta = {
  origin: LatLng; // lat/lng of cell [0][0]
  rows: number;
  cols: number;
  cellSize: number; // metres per cell side
};

export type Step = {
  instruction: string;
  distanceMetres: number;
  streetName: string;
};

export type Route = {
  polyline: LatLng[];
  steps: Step[];
};

export type CityConfig = {
  name: string;
  bbox: BBox;
  center: LatLng;
  cellSize: number; // metres per cell, e.g. 4
};
```

- [ ] **Step 2: No test needed** — types have no runtime behaviour.

- [ ] **Step 3: Commit**

```bash
git add src/lib/grid/types.ts
git commit -m "feat: add shared grid types"
```

---

## Task 4: City config registry

**Files:**

- Create: `src/lib/cities.ts`

- [ ] **Step 1: Create city registry**

```typescript
// src/lib/cities.ts
import type { CityConfig } from "@/lib/grid/types";

export const CITIES: Record<string, CityConfig> = {
  nyc: {
    name: "New York City",
    bbox: {
      north: 40.917577,
      south: 40.477399,
      east: -73.700272,
      west: -74.25909,
    },
    center: { lat: 40.758896, lng: -73.98513 }, // Times Square
    cellSize: 4,
  },
};

export const DEFAULT_CITY = "nyc";
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/cities.ts
git commit -m "feat: add city config registry"
```

---

## Task 5: Coordinate conversion utilities

**Files:**

- Create: `src/lib/grid/coords.ts`
- Create: `src/lib/grid/coords.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/grid/coords.test.ts
import { describe, it, expect } from "vitest";
import { latLngToCell, cellToLatLng, latLngToTileXY } from "@/lib/grid/coords";
import type { GridMeta } from "@/lib/grid/types";

const META: GridMeta = {
  origin: { lat: 40.758896, lng: -73.98513 },
  rows: 100,
  cols: 100,
  cellSize: 4,
};

describe("latLngToCell", () => {
  it("returns [0, 0] for the origin", () => {
    const result = latLngToCell(META.origin, META);
    expect(result).toEqual({ row: 0, col: 0 });
  });

  it("returns positive col for east of origin", () => {
    const eastPoint = { lat: 40.758896, lng: -73.984 };
    const result = latLngToCell(eastPoint, META);
    expect(result.col).toBeGreaterThan(0);
  });
});

describe("latLngToTileXY", () => {
  it("returns correct tile for Times Square at zoom 16", () => {
    const tile = latLngToTileXY(40.758896, -73.98513, 16);
    expect(tile).toEqual({ x: 19293, y: 24641, z: 16 });
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test src/lib/grid/coords.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement coords**

```typescript
// src/lib/grid/coords.ts
import type { LatLng, GridMeta } from "@/lib/grid/types";

const METRES_PER_DEGREE_LAT = 111320;

function metresPerDegreeLng(lat: number): number {
  return 111320 * Math.cos((lat * Math.PI) / 180);
}

export function latLngToCell(
  point: LatLng,
  meta: GridMeta,
): { row: number; col: number } {
  const metersNorth = (point.lat - meta.origin.lat) * METRES_PER_DEGREE_LAT;
  const metersEast =
    (point.lng - meta.origin.lng) * metresPerDegreeLng(meta.origin.lat);
  return {
    row: Math.floor(metersNorth / meta.cellSize),
    col: Math.floor(metersEast / meta.cellSize),
  };
}

export function cellToLatLng(row: number, col: number, meta: GridMeta): LatLng {
  const lat = meta.origin.lat + (row * meta.cellSize) / METRES_PER_DEGREE_LAT;
  const lng =
    meta.origin.lng +
    (col * meta.cellSize) / metresPerDegreeLng(meta.origin.lat);
  return { lat, lng };
}

export function latLngToTileXY(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number; z: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y, z: zoom };
}

export function tileBBox(
  x: number,
  y: number,
  z: number,
): { north: number; south: number; west: number; east: number } {
  const n = Math.pow(2, z);
  const west = (x / n) * 360 - 180;
  const east = ((x + 1) / n) * 360 - 180;
  const northRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const southRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
  return {
    north: (northRad * 180) / Math.PI,
    south: (southRad * 180) / Math.PI,
    west,
    east,
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test src/lib/grid/coords.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/grid/coords.ts src/lib/grid/coords.test.ts
git commit -m "feat: add coordinate conversion utilities"
```

---

## Task 6: ASCII character constants

**Files:**

- Create: `src/lib/raycaster/chars.ts`

- [ ] **Step 1: Create character sets**

```typescript
// src/lib/raycaster/chars.ts

// Wall characters indexed by distance band (0 = closest, 4 = furthest)
// N/S faces (horizontal walls — use vertical bar density)
export const WALL_NS = ["█", "▓", "▒", "░", "|"] as const;

// E/W faces (vertical walls — use horizontal bar density for shading contrast)
export const WALL_EW = ["█", "▓", "▒", "░", "─"] as const;

// Ground characters indexed by distance from bottom of screen
export const FLOOR = [".", ",", ":", ";", " "] as const;

// Sky characters indexed by distance from top of screen
export const SKY = [" ", " ", " ", ".", " "] as const;

// Overhead map characters
export const OVERHEAD_BUILDING = "█";
export const OVERHEAD_ROAD = " ";
export const OVERHEAD_CAMERA = "@";
export const OVERHEAD_ROUTE = "·";
export const OVERHEAD_EMPTY = "░";

// Max render distance in grid units
export const MAX_RENDER_DIST = 30;

// Distance bands: divide MAX_RENDER_DIST into 5 bands
export function distanceBand(distance: number): number {
  return Math.min(4, Math.floor((distance / MAX_RENDER_DIST) * 5));
}

// Wall colour by distance (CSS colour string)
export function wallColour(distance: number): string {
  const brightness = Math.max(40, Math.floor(255 - distance * 6));
  return `rgb(${brightness},${brightness},${brightness})`;
}
```

- [ ] **Step 2: Write a quick test for `distanceBand`**

```typescript
// src/lib/raycaster/chars.test.ts
import { describe, it, expect } from "vitest";
import { distanceBand } from "@/lib/raycaster/chars";

describe("distanceBand", () => {
  it("returns 0 for distance 0", () => expect(distanceBand(0)).toBe(0));
  it("returns 4 for max distance", () => expect(distanceBand(30)).toBe(4));
  it("caps at 4 beyond max", () => expect(distanceBand(100)).toBe(4));
});
```

- [ ] **Step 3: Run tests — expect PASS**

```bash
pnpm test src/lib/raycaster/chars.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/raycaster/chars.ts src/lib/raycaster/chars.test.ts
git commit -m "feat: add ASCII character set constants"
```

---

## Task 7: DDA raycaster engine

**Files:**

- Create: `src/lib/raycaster/engine.ts`
- Create: `src/lib/raycaster/engine.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/raycaster/engine.test.ts
import { describe, it, expect } from "vitest";
import { castRay } from "@/lib/raycaster/engine";
import type { Grid } from "@/lib/grid/types";

// 5×5 grid: building ring around empty centre
const GRID: Grid = [
  [
    { type: "building", height: 10 },
    { type: "building", height: 10 },
    { type: "building", height: 10 },
    { type: "building", height: 10 },
    { type: "building", height: 10 },
  ],
  [
    { type: "building", height: 10 },
    { type: "road", height: 0 },
    { type: "road", height: 0 },
    { type: "road", height: 0 },
    { type: "building", height: 10 },
  ],
  [
    { type: "building", height: 10 },
    { type: "road", height: 0 },
    { type: "road", height: 0 },
    { type: "road", height: 0 },
    { type: "building", height: 10 },
  ],
  [
    { type: "building", height: 10 },
    { type: "road", height: 0 },
    { type: "road", height: 0 },
    { type: "road", height: 0 },
    { type: "building", height: 10 },
  ],
  [
    { type: "building", height: 10 },
    { type: "building", height: 10 },
    { type: "building", height: 10 },
    { type: "building", height: 10 },
    { type: "building", height: 10 },
  ],
];

describe("castRay", () => {
  it("hits the north wall when facing north from centre", () => {
    // Camera at (2.5, 2.5), facing north (angle = -PI/2 in row/col space)
    const hit = castRay({ x: 2.5, y: 2.5 }, -Math.PI / 2, GRID);
    expect(hit).not.toBeNull();
    expect(hit!.face).toBe("NS");
    expect(hit!.cell.type).toBe("building");
  });

  it("hits the east wall when facing east", () => {
    const hit = castRay({ x: 2.5, y: 2.5 }, 0, GRID);
    expect(hit).not.toBeNull();
    expect(hit!.face).toBe("EW");
  });

  it("returns null when no wall within max distance", () => {
    // Open grid — all empty
    const openGrid: Grid = Array.from({ length: 100 }, () =>
      Array.from({ length: 100 }, () => ({ type: "road" as const, height: 0 })),
    );
    const hit = castRay({ x: 50, y: 50 }, 0, openGrid);
    expect(hit).toBeNull();
  });

  it("returns a positive distance", () => {
    const hit = castRay({ x: 2.5, y: 2.5 }, 0, GRID);
    expect(hit!.distance).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test src/lib/raycaster/engine.test.ts
```

- [ ] **Step 3: Implement DDA engine**

```typescript
// src/lib/raycaster/engine.ts
import type { Grid, Cell } from "@/lib/grid/types";
import { MAX_RENDER_DIST } from "@/lib/raycaster/chars";

export type RayHit = {
  distance: number;
  face: "NS" | "EW";
  cell: Cell;
  mapX: number;
  mapY: number;
};

export function castRay(
  pos: { x: number; y: number },
  angle: number,
  grid: Grid,
): RayHit | null {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const rayDirX = Math.cos(angle);
  const rayDirY = Math.sin(angle);

  let mapX = Math.floor(pos.x);
  let mapY = Math.floor(pos.y);

  const deltaDistX = Math.abs(1 / (rayDirX === 0 ? 1e-10 : rayDirX));
  const deltaDistY = Math.abs(1 / (rayDirY === 0 ? 1e-10 : rayDirY));

  const stepX = rayDirX < 0 ? -1 : 1;
  const stepY = rayDirY < 0 ? -1 : 1;

  let sideDistX =
    rayDirX < 0 ? (pos.x - mapX) * deltaDistX : (mapX + 1 - pos.x) * deltaDistX;
  let sideDistY =
    rayDirY < 0 ? (pos.y - mapY) * deltaDistY : (mapY + 1 - pos.y) * deltaDistY;

  let face: "NS" | "EW" = "NS";
  let steps = 0;

  while (steps++ < MAX_RENDER_DIST * 2) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      face = "EW";
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      face = "NS";
    }

    if (mapX < 0 || mapY < 0 || mapX >= cols || mapY >= rows) return null;

    const cell = grid[mapY][mapX];
    if (cell.type === "building") {
      const distance =
        face === "EW" ? sideDistX - deltaDistX : sideDistY - deltaDistY;
      if (distance > MAX_RENDER_DIST) return null;
      return { distance, face, cell, mapX, mapY };
    }
  }

  return null;
}

export type FrameData = {
  charHeight: number; // how many character rows tall the wall strip is
  wallTop: number; // row index where wall starts
  distance: number;
  face: "NS" | "EW";
  cell: Cell;
};

export function buildFrameData(
  camera: { x: number; y: number; angle: number; fov: number },
  grid: Grid,
  cols: number,
  rows: number,
): (FrameData | null)[] {
  return Array.from({ length: cols }, (_, col) => {
    const rayAngle = camera.angle - camera.fov / 2 + (col / cols) * camera.fov;
    const hit = castRay({ x: camera.x, y: camera.y }, rayAngle, grid);
    if (!hit) return null;

    const correctedDist = hit.distance * Math.cos(rayAngle - camera.angle);
    const wallHeight = Math.min(rows, Math.floor(rows / correctedDist));
    const wallTop = Math.floor((rows - wallHeight) / 2);

    return {
      charHeight: wallHeight,
      wallTop,
      distance: correctedDist,
      face: hit.face,
      cell: hit.cell,
    };
  });
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test src/lib/raycaster/engine.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/raycaster/engine.ts src/lib/raycaster/engine.test.ts
git commit -m "feat: implement DDA raycaster engine"
```

---

## Task 8: Camera state and movement

**Files:**

- Create: `src/lib/raycaster/camera.ts`
- Create: `src/lib/raycaster/camera.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/raycaster/camera.test.ts
import { describe, it, expect } from "vitest";
import { moveCamera, rotateCamera, createCamera } from "@/lib/raycaster/camera";
import type { Grid } from "@/lib/grid/types";

const OPEN_GRID: Grid = Array.from({ length: 20 }, () =>
  Array.from({ length: 20 }, () => ({ type: "road" as const, height: 0 })),
);

describe("moveCamera", () => {
  it("moves forward along the camera angle", () => {
    const cam = createCamera(10, 10, 0); // facing east
    const moved = moveCamera(cam, "forward", OPEN_GRID);
    expect(moved.x).toBeGreaterThan(10);
    expect(moved.y).toBeCloseTo(10);
  });

  it("does not move into a building cell", () => {
    const wallGrid: Grid = OPEN_GRID.map((row, r) =>
      row.map((cell, c) =>
        c === 11 ? { type: "building" as const, height: 10 } : cell,
      ),
    );
    const cam = createCamera(10, 10, 0);
    const moved = moveCamera(cam, "forward", wallGrid);
    expect(Math.floor(moved.x)).toBeLessThan(11);
  });
});

describe("rotateCamera", () => {
  it("increases angle when rotating right", () => {
    const cam = createCamera(10, 10, 0);
    const rotated = rotateCamera(cam, "right");
    expect(rotated.angle).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test src/lib/raycaster/camera.test.ts
```

- [ ] **Step 3: Implement camera**

```typescript
// src/lib/raycaster/camera.ts
import type { Grid } from "@/lib/grid/types";

export type Camera = {
  x: number; // grid col (float)
  y: number; // grid row (float)
  angle: number; // radians, 0 = east
  fov: number; // radians, default Math.PI / 3
};

const MOVE_SPEED = 0.05;
const ROTATE_SPEED = 0.04;

export function createCamera(x: number, y: number, angle: number): Camera {
  return { x, y, angle, fov: Math.PI / 3 };
}

function isPassable(x: number, y: number, grid: Grid): boolean {
  const col = Math.floor(x);
  const row = Math.floor(y);
  if (
    row < 0 ||
    row >= grid.length ||
    col < 0 ||
    col >= (grid[0]?.length ?? 0)
  ) {
    return false;
  }
  return grid[row][col].type !== "building";
}

export function moveCamera(
  camera: Camera,
  direction: "forward" | "backward" | "left" | "right",
  grid: Grid,
): Camera {
  const angles: Record<typeof direction, number> = {
    forward: camera.angle,
    backward: camera.angle + Math.PI,
    left: camera.angle - Math.PI / 2,
    right: camera.angle + Math.PI / 2,
  };
  const moveAngle = angles[direction];
  const newX = camera.x + Math.cos(moveAngle) * MOVE_SPEED;
  const newY = camera.y + Math.sin(moveAngle) * MOVE_SPEED;

  return {
    ...camera,
    x: isPassable(newX, camera.y, grid) ? newX : camera.x,
    y: isPassable(camera.x, newY, grid) ? newY : camera.y,
  };
}

export function rotateCamera(
  camera: Camera,
  direction: "left" | "right",
): Camera {
  const delta = direction === "right" ? ROTATE_SPEED : -ROTATE_SPEED;
  return { ...camera, angle: camera.angle + delta };
}

export function advanceCameraAlongRoute(
  camera: Camera,
  routeCells: { col: number; row: number }[],
  stepIndex: number,
): { camera: Camera; nextStepIndex: number } {
  const target = routeCells[stepIndex];
  if (!target) return { camera, nextStepIndex: stepIndex };

  const targetX = target.col + 0.5;
  const targetY = target.row + 0.5;
  const dx = targetX - camera.x;
  const dy = targetY - camera.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 0.1) {
    return {
      camera,
      nextStepIndex: Math.min(stepIndex + 1, routeCells.length - 1),
    };
  }

  const speed = Math.min(MOVE_SPEED, dist);
  const angle = Math.atan2(dy, dx);
  return {
    camera: {
      ...camera,
      x: camera.x + (dx / dist) * speed,
      y: camera.y + (dy / dist) * speed,
      angle,
    },
    nextStepIndex: stepIndex,
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test src/lib/raycaster/camera.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/raycaster/camera.ts src/lib/raycaster/camera.test.ts
git commit -m "feat: implement camera state and movement"
```

---

## Task 9: Raycaster canvas renderer

**Files:**

- Create: `src/lib/raycaster/renderer.ts`
- Create: `src/lib/raycaster/renderer.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/raycaster/renderer.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderFrame } from "@/lib/raycaster/renderer";
import type { FrameData } from "@/lib/raycaster/engine";

function makeCanvas() {
  const ctx = {
    fillStyle: "",
    font: "",
    fillRect: vi.fn(),
    fillText: vi.fn(),
  };
  return {
    width: 800,
    height: 400,
    getContext: vi.fn().mockReturnValue(ctx),
    _ctx: ctx,
  } as unknown as HTMLCanvasElement & { _ctx: typeof ctx };
}

describe("renderFrame", () => {
  it("calls fillRect to clear the canvas", () => {
    const canvas = makeCanvas();
    const frameData: (FrameData | null)[] = [null, null];
    renderFrame(frameData, canvas, 2, 10);
    expect(canvas._ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 400);
  });

  it("calls fillText for a wall hit", () => {
    const canvas = makeCanvas();
    const frameData: (FrameData | null)[] = [
      {
        charHeight: 5,
        wallTop: 2,
        distance: 3,
        face: "NS",
        cell: { type: "building", height: 10 },
      },
    ];
    renderFrame(frameData, canvas, 1, 10);
    expect(canvas._ctx.fillText).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test src/lib/raycaster/renderer.test.ts
```

- [ ] **Step 3: Implement renderer**

```typescript
// src/lib/raycaster/renderer.ts
import type { FrameData } from "@/lib/raycaster/engine";
import {
  WALL_NS,
  WALL_EW,
  FLOOR,
  SKY,
  distanceBand,
  wallColour,
} from "@/lib/raycaster/chars";

const CHAR_W = 10; // px per character column
const CHAR_H = 16; // px per character row

export function renderFrame(
  frameData: (FrameData | null)[],
  canvas: HTMLCanvasElement,
  cols: number,
  rows: number,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${CHAR_H}px monospace`;

  for (let col = 0; col < cols; col++) {
    const data = frameData[col];
    const x = col * CHAR_W;

    if (!data) {
      // Sky only
      for (let row = 0; row < rows; row++) {
        const band = Math.min(4, Math.floor((row / rows) * 5));
        ctx.fillStyle = "#111";
        ctx.fillText(SKY[band], x, row * CHAR_H);
      }
      continue;
    }

    const wallBottom = data.wallTop + data.charHeight;
    const band = distanceBand(data.distance);
    const chars = data.face === "NS" ? WALL_NS : WALL_EW;

    for (let row = 0; row < rows; row++) {
      const y = row * CHAR_H;
      if (row < data.wallTop) {
        const skyBand = Math.min(4, Math.floor((row / data.wallTop) * 5));
        ctx.fillStyle = "#111";
        ctx.fillText(SKY[skyBand], x, y);
      } else if (row < wallBottom) {
        ctx.fillStyle = wallColour(data.distance);
        ctx.fillText(chars[band], x, y);
      } else {
        const floorRow = row - wallBottom;
        const floorBand = Math.min(
          4,
          Math.floor((floorRow / (rows - wallBottom)) * 5),
        );
        ctx.fillStyle = "#222";
        ctx.fillText(FLOOR[floorBand], x, y);
      }
    }
  }
}

export function canvasDimensions(canvas: HTMLCanvasElement): {
  cols: number;
  rows: number;
} {
  return {
    cols: Math.floor(canvas.width / CHAR_W),
    rows: Math.floor(canvas.height / CHAR_H),
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test src/lib/raycaster/renderer.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/raycaster/renderer.ts src/lib/raycaster/renderer.test.ts
git commit -m "feat: implement raycaster canvas renderer"
```

---

## Task 10: Mapbox tiles client

**Files:**

- Create: `src/lib/mapbox/tiles.ts`
- Create: `src/lib/mapbox/tiles.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/mapbox/tiles.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchTile, parseBuildingsFromTile } from "@/lib/mapbox/tiles";

// Mock fetch
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("fetchTile", () => {
  it("calls the correct Mapbox URL", async () => {
    const mockBuffer = new ArrayBuffer(0);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockBuffer),
    } as Response);

    await fetchTile(16, 19293, 24641, "test-token");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/16/19293/24641.mvt?access_token=test-token",
    );
  });

  it("throws if response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response);

    await expect(fetchTile(16, 0, 0, "bad-token")).rejects.toThrow("401");
  });
});

describe("parseBuildingsFromTile", () => {
  it("returns empty array for empty buffer", () => {
    const result = parseBuildingsFromTile(new Uint8Array(0).buffer, 16, 0, 0);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test src/lib/mapbox/tiles.test.ts
```

- [ ] **Step 3: Implement tiles client**

```typescript
// src/lib/mapbox/tiles.ts
import VectorTile from "@mapbox/vector-tile";
import Pbf from "pbf";
import { tileBBox } from "@/lib/grid/coords";

export type TileBuilding = {
  polygonLatLng: [number, number][][]; // array of rings, each ring is [lat, lng][]
  height: number;
  minHeight: number;
};

export async function fetchTile(
  z: number,
  x: number,
  y: number,
  accessToken: string,
): Promise<ArrayBuffer> {
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${z}/${x}/${y}.mvt?access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox tile fetch failed: ${res.status}`);
  return res.arrayBuffer();
}

export function parseBuildingsFromTile(
  buffer: ArrayBuffer,
  z: number,
  x: number,
  y: number,
): TileBuilding[] {
  if (buffer.byteLength === 0) return [];

  let tile: VectorTile.VectorTile;
  try {
    tile = new VectorTile.VectorTile(new Pbf(buffer));
  } catch {
    return [];
  }

  const layer = tile.layers["building"];
  if (!layer) return [];

  const bbox = tileBBox(x, y, z);
  const extent = layer.extent ?? 4096;
  const buildings: TileBuilding[] = [];

  for (let i = 0; i < layer.length; i++) {
    const feature = layer.feature(i);
    const props = feature.properties;
    if (!props["extrude"]) continue;

    const height = Number(props["height"] ?? 10);
    const minHeight = Number(props["min_height"] ?? 0);

    // Convert tile geometry to LatLng
    const geom = feature.loadGeometry();
    const rings: [number, number][][] = geom.map((ring) =>
      ring.map(({ x: tx, y: ty }) => {
        const lat = bbox.north - (ty / extent) * (bbox.north - bbox.south);
        const lng = bbox.west + (tx / extent) * (bbox.east - bbox.west);
        return [lat, lng] as [number, number];
      }),
    );

    buildings.push({ polygonLatLng: rings, height, minHeight });
  }

  return buildings;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test src/lib/mapbox/tiles.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/mapbox/tiles.ts src/lib/mapbox/tiles.test.ts
git commit -m "feat: implement Mapbox vector tile client"
```

---

## Task 11: Grid builder

**Files:**

- Create: `src/lib/grid/builder.ts`
- Create: `src/lib/grid/builder.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/grid/builder.test.ts
import { describe, it, expect } from "vitest";
import { buildGrid, rasteriseBuilding } from "@/lib/grid/builder";
import type { GridMeta } from "@/lib/grid/types";

const META: GridMeta = {
  origin: { lat: 40.758, lng: -73.985 },
  rows: 50,
  cols: 50,
  cellSize: 4,
};

describe("rasteriseBuilding", () => {
  it("marks cells inside a square polygon as building", () => {
    // Square building near origin: ~20m × 20m
    const polygon: [number, number][][] = [
      [
        [40.7581, -73.9849],
        [40.7581, -73.9847],
        [40.7583, -73.9847],
        [40.7583, -73.9849],
        [40.7581, -73.9849],
      ],
    ];
    const grid = Array.from({ length: 50 }, () =>
      Array.from({ length: 50 }, () => ({ type: "road" as const, height: 0 })),
    );
    rasteriseBuilding(grid, polygon, 20, META);
    const buildingCells = grid.flat().filter((c) => c.type === "building");
    expect(buildingCells.length).toBeGreaterThan(0);
    expect(buildingCells[0].height).toBe(20);
  });
});

describe("buildGrid", () => {
  it("returns a grid of the correct dimensions", () => {
    const grid = buildGrid([], META);
    expect(grid.length).toBe(50);
    expect(grid[0].length).toBe(50);
  });

  it("all cells default to empty", () => {
    const grid = buildGrid([], META);
    expect(grid.flat().every((c) => c.type === "empty")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test src/lib/grid/builder.test.ts
```

- [ ] **Step 3: Implement grid builder**

```typescript
// src/lib/grid/builder.ts
import type { Grid, GridMeta, Cell } from "@/lib/grid/types";
import type { TileBuilding } from "@/lib/mapbox/tiles";
import { latLngToCell } from "@/lib/grid/coords";

function pointInPolygon(
  px: number,
  py: number,
  polygon: [number, number][],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function rasteriseBuilding(
  grid: Grid,
  polygonLatLng: [number, number][][],
  height: number,
  meta: GridMeta,
): void {
  const outerRing = polygonLatLng[0];
  if (!outerRing || outerRing.length < 3) return;

  // Bounding box of polygon in grid coords
  let minRow = Infinity,
    maxRow = -Infinity;
  let minCol = Infinity,
    maxCol = -Infinity;

  for (const [lat, lng] of outerRing) {
    const { row, col } = latLngToCell({ lat, lng }, meta);
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
  }

  minRow = Math.max(0, minRow);
  maxRow = Math.min(meta.rows - 1, maxRow);
  minCol = Math.max(0, minCol);
  maxCol = Math.min(meta.cols - 1, maxCol);

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      // Test cell centre
      const cellLat = meta.origin.lat + ((row + 0.5) * meta.cellSize) / 111320;
      const cellLng =
        meta.origin.lng +
        ((col + 0.5) * meta.cellSize) /
          (111320 * Math.cos((meta.origin.lat * Math.PI) / 180));

      if (pointInPolygon(cellLat, cellLng, outerRing)) {
        grid[row][col] = { type: "building", height };
      }
    }
  }
}

export function buildGrid(buildings: TileBuilding[], meta: GridMeta): Grid {
  const grid: Grid = Array.from({ length: meta.rows }, () =>
    Array.from({ length: meta.cols }, (): Cell => ({
      type: "empty",
      height: 0,
    })),
  );

  for (const building of buildings) {
    rasteriseBuilding(grid, building.polygonLatLng, building.height, meta);
  }

  return grid;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test src/lib/grid/builder.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/grid/builder.ts src/lib/grid/builder.test.ts
git commit -m "feat: implement grid builder from Mapbox tile buildings"
```

---

## Task 12: Google geocoding client

**Files:**

- Create: `src/lib/google/geocoding.ts`
- Create: `src/lib/google/geocoding.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/google/geocoding.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { geocodeAddress } from "@/lib/google/geocoding";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("geocodeAddress", () => {
  it("returns lat/lng for a valid address", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "OK",
          results: [
            {
              geometry: { location: { lat: 40.7589, lng: -73.9851 } },
              formatted_address: "Times Square, New York, NY",
            },
          ],
        }),
    } as Response);

    const result = await geocodeAddress("Times Square, NYC", "test-key");
    expect(result.lat).toBeCloseTo(40.7589);
    expect(result.lng).toBeCloseTo(-73.9851);
    expect(result.displayName).toBe("Times Square, New York, NY");
  });

  it("throws when status is not OK", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "ZERO_RESULTS", results: [] }),
    } as Response);

    await expect(geocodeAddress("nowhere special", "test-key")).rejects.toThrow(
      "ZERO_RESULTS",
    );
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test src/lib/google/geocoding.test.ts
```

- [ ] **Step 3: Implement geocoding client**

```typescript
// src/lib/google/geocoding.ts
import type { LatLng } from "@/lib/grid/types";

export type GeocodeResult = LatLng & { displayName: string };

export async function geocodeAddress(
  address: string,
  apiKey: string,
): Promise<GeocodeResult> {
  const params = new URLSearchParams({ address, key: apiKey });
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
  );
  if (!res.ok) throw new Error(`Geocoding HTTP error: ${res.status}`);

  const data = await res.json();
  if (data.status !== "OK" || !data.results[0]) {
    throw new Error(data.status ?? "No results");
  }

  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng, displayName: data.results[0].formatted_address };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test src/lib/google/geocoding.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/google/geocoding.ts src/lib/google/geocoding.test.ts
git commit -m "feat: implement Google geocoding client"
```

---

## Task 13: Google Routes client

**Files:**

- Create: `src/lib/google/routes.ts`
- Create: `src/lib/google/routes.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/google/routes.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchRoute } from "@/lib/google/routes";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

const MOCK_RESPONSE = {
  routes: [
    {
      polyline: { encodedPolyline: "abc123" },
      legs: [
        {
          steps: [
            {
              navigationInstruction: { instructions: "Head north on 5th Ave" },
              distanceMeters: 120,
              localizedValues: { distance: { text: "120 m" } },
              endLocation: { latLng: { latitude: 40.76, longitude: -73.98 } },
            },
          ],
        },
      ],
    },
  ],
};

describe("fetchRoute", () => {
  it("returns steps and a polyline", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_RESPONSE),
    } as Response);

    const result = await fetchRoute(
      { lat: 40.758, lng: -73.985 },
      { lat: 40.762, lng: -73.98 },
      "test-key",
    );

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].instruction).toBe("Head north on 5th Ave");
    expect(result.steps[0].distanceMetres).toBe(120);
    expect(result.polyline).toBeDefined();
  });

  it("throws on no routes returned", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ routes: [] }),
    } as Response);

    await expect(
      fetchRoute({ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, "key"),
    ).rejects.toThrow("No routes");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test src/lib/google/routes.test.ts
```

- [ ] **Step 3: Implement routes client**

```typescript
// src/lib/google/routes.ts
import type { LatLng, Route, Step } from "@/lib/grid/types";

// Decode Google's encoded polyline format
function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0,
    lat = 0,
    lng = 0;

  while (index < encoded.length) {
    let shift = 0,
      result = 0,
      b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

export async function fetchRoute(
  origin: LatLng,
  destination: LatLng,
  apiKey: string,
): Promise<Route> {
  const res = await fetch(
    `https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "routes.polyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.endLocation",
      },
      body: JSON.stringify({
        origin: {
          location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
        },
        destination: {
          location: {
            latLng: { latitude: destination.lat, longitude: destination.lng },
          },
        },
        travelMode: "WALK",
        computeAlternativeRoutes: false,
      }),
    },
  );

  if (!res.ok) throw new Error(`Routes API error: ${res.status}`);
  const data = await res.json();

  if (!data.routes?.[0]) throw new Error("No routes returned");

  const route = data.routes[0];
  const steps: Step[] = route.legs.flatMap(
    (leg: {
      steps: {
        navigationInstruction?: { instructions?: string };
        distanceMeters?: number;
        endLocation?: { latLng?: { latitude?: number; longitude?: number } };
      }[];
    }) =>
      leg.steps.map(
        (step: {
          navigationInstruction?: { instructions?: string };
          distanceMeters?: number;
          endLocation?: { latLng?: { latitude?: number; longitude?: number } };
        }) => ({
          instruction: step.navigationInstruction?.instructions ?? "",
          distanceMetres: step.distanceMeters ?? 0,
          streetName:
            step.navigationInstruction?.instructions?.split(" on ")?.[1] ?? "",
        }),
      ),
  );

  return {
    polyline: decodePolyline(route.polyline.encodedPolyline),
    steps,
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test src/lib/google/routes.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/google/routes.ts src/lib/google/routes.test.ts
git commit -m "feat: implement Google Routes API client"
```

---

## Task 14: API route — /api/grid

**Files:**

- Create: `src/app/api/grid/route.ts`

- [ ] **Step 1: Create the route handler**

```typescript
// src/app/api/grid/route.ts
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { CITIES, DEFAULT_CITY } from "@/lib/cities";
import { latLngToTileXY, tileBBox } from "@/lib/grid/coords";
import { fetchTile, parseBuildingsFromTile } from "@/lib/mapbox/tiles";
import { buildGrid } from "@/lib/grid/builder";
import type { GridMeta } from "@/lib/grid/types";

const ZOOM = 16;
const CACHE_SECONDS = 86400; // 24 hours — buildings don't move

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const cityKey = searchParams.get("city") ?? DEFAULT_CITY;
  const city = CITIES[cityKey];

  if (!city) {
    return NextResponse.json({ error: "Unknown city" }, { status: 400 });
  }

  try {
    // Collect all tiles covering the city bounding box
    const sw = latLngToTileXY(city.bbox.south, city.bbox.west, ZOOM);
    const ne = latLngToTileXY(city.bbox.north, city.bbox.east, ZOOM);

    // Limit to a 3×3 tile area around centre to keep response manageable
    const centre = latLngToTileXY(city.center.lat, city.center.lng, ZOOM);
    const tileRange = {
      x: [centre.x - 1, centre.x + 1],
      y: [centre.y - 1, centre.y + 1],
    };

    const tilePromises: Promise<{
      buffer: ArrayBuffer;
      x: number;
      y: number;
    }>[] = [];
    for (let tx = tileRange.x[0]; tx <= tileRange.x[1]; tx++) {
      for (let ty = tileRange.y[0]; ty <= tileRange.y[1]; ty++) {
        tilePromises.push(
          fetchTile(ZOOM, tx, ty, env.MAPBOX_ACCESS_TOKEN).then((buffer) => ({
            buffer,
            x: tx,
            y: ty,
          })),
        );
      }
    }

    const tiles = await Promise.all(tilePromises);
    const allBuildings = tiles.flatMap(({ buffer, x, y }) =>
      parseBuildingsFromTile(buffer, ZOOM, x, y),
    );

    // Build grid covering 3×3 tile area
    const swBbox = tileBBox(tileRange.x[0], tileRange.y[1], ZOOM); // y increases southward
    const neBbox = tileBBox(tileRange.x[1], tileRange.y[0], ZOOM);
    const widthMetres =
      (neBbox.east - swBbox.west) *
      111320 *
      Math.cos((city.center.lat * Math.PI) / 180);
    const heightMetres = (neBbox.north - swBbox.south) * 111320;

    const meta: GridMeta = {
      origin: { lat: swBbox.south, lng: swBbox.west },
      rows: Math.ceil(heightMetres / city.cellSize),
      cols: Math.ceil(widthMetres / city.cellSize),
      cellSize: city.cellSize,
    };

    const grid = buildGrid(allBuildings, meta);

    return NextResponse.json(
      { grid, meta },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate`,
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify the route typechecks**

```bash
pnpm typecheck
```

Expected: no errors in `src/app/api/grid/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/grid/route.ts
git commit -m "feat: add /api/grid route handler"
```

---

## Task 15: API route — /api/geocode

**Files:**

- Create: `src/app/api/geocode/route.ts`

- [ ] **Step 1: Create the route handler**

```typescript
// src/app/api/geocode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { geocodeAddress } from "@/lib/google/geocoding";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  try {
    const result = await geocodeAddress(address, env.GOOGLE_MAPS_API_KEY);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Geocoding failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/geocode/route.ts
git commit -m "feat: add /api/geocode route handler"
```

---

## Task 16: API route — /api/route

**Files:**

- Create: `src/app/api/route/route.ts`

- [ ] **Step 1: Create the route handler**

```typescript
// src/app/api/route/route.ts
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { fetchRoute } from "@/lib/google/routes";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: {
    origin?: { lat?: number; lng?: number };
    destination?: { lat?: number; lng?: number };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { origin, destination } = body;
  if (
    typeof origin?.lat !== "number" ||
    typeof origin?.lng !== "number" ||
    typeof destination?.lat !== "number" ||
    typeof destination?.lng !== "number"
  ) {
    return NextResponse.json(
      { error: "origin and destination must have lat and lng" },
      { status: 400 },
    );
  }

  try {
    const route = await fetchRoute(
      { lat: origin.lat, lng: origin.lng },
      { lat: destination.lat, lng: destination.lng },
      env.GOOGLE_MAPS_API_KEY,
    );
    return NextResponse.json(route);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Routing failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
```

- [ ] **Step 2: Verify typechecks**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/route/route.ts
git commit -m "feat: add /api/route route handler"
```

---

## Task 17: NavigatorContext

**Files:**

- Create: `src/components/navigator/NavigatorContext.tsx`

- [ ] **Step 1: Create context**

```typescript
// src/components/navigator/NavigatorContext.tsx
"use client"

import { createContext, useContext, useReducer, type ReactNode } from "react"
import type { Grid, GridMeta, Route, Step } from "@/lib/grid/types"
import type { Camera } from "@/lib/raycaster/camera"
import { createCamera } from "@/lib/raycaster/camera"
import { CITIES, DEFAULT_CITY } from "@/lib/cities"

export type View = "firstperson" | "overhead"

type NavigatorState = {
  grid: Grid | null
  gridMeta: GridMeta | null
  camera: Camera
  route: Route | null
  routeCells: { col: number; row: number }[]
  routeStepIndex: number
  routeSteps: Step[]
  view: View
  isWalking: boolean
  error: string | null
}

type Action =
  | { type: "SET_GRID"; grid: Grid; meta: GridMeta }
  | { type: "SET_CAMERA"; camera: Camera }
  | { type: "SET_ROUTE"; route: Route; routeCells: { col: number; row: number }[] }
  | { type: "ADVANCE_STEP"; stepIndex: number; camera: Camera }
  | { type: "TOGGLE_VIEW" }
  | { type: "TOGGLE_WALKING" }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }

const city = CITIES[DEFAULT_CITY]
const initialCamera = createCamera(0, 0, 0)

const initialState: NavigatorState = {
  grid: null,
  gridMeta: null,
  camera: initialCamera,
  route: null,
  routeCells: [],
  routeStepIndex: 0,
  routeSteps: [],
  view: "firstperson",
  isWalking: false,
  error: null,
}

function reducer(state: NavigatorState, action: Action): NavigatorState {
  switch (action.type) {
    case "SET_GRID":
      return { ...state, grid: action.grid, gridMeta: action.meta }
    case "SET_CAMERA":
      return { ...state, camera: action.camera }
    case "SET_ROUTE":
      return {
        ...state,
        route: action.route,
        routeCells: action.routeCells,
        routeSteps: action.route.steps,
        routeStepIndex: 0,
        isWalking: true,
      }
    case "ADVANCE_STEP":
      return {
        ...state,
        camera: action.camera,
        routeStepIndex: action.stepIndex,
      }
    case "TOGGLE_VIEW":
      return { ...state, view: state.view === "firstperson" ? "overhead" : "firstperson" }
    case "TOGGLE_WALKING":
      return { ...state, isWalking: !state.isWalking }
    case "SET_ERROR":
      return { ...state, error: action.error }
    case "CLEAR_ERROR":
      return { ...state, error: null }
    default:
      return state
  }
}

type NavigatorContextValue = {
  state: NavigatorState
  dispatch: React.Dispatch<Action>
}

const NavigatorContext = createContext<NavigatorContextValue | null>(null)

export function NavigatorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <NavigatorContext.Provider value={{ state, dispatch }}>
      {children}
    </NavigatorContext.Provider>
  )
}

export function useNavigator(): NavigatorContextValue {
  const ctx = useContext(NavigatorContext)
  if (!ctx) throw new Error("useNavigator must be used within NavigatorProvider")
  return ctx
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/navigator/NavigatorContext.tsx
git commit -m "feat: add NavigatorContext with useReducer"
```

---

## Task 18: ViewToggle component

**Files:**

- Create: `src/components/navigator/ViewToggle.tsx`
- Create: `src/components/navigator/ViewToggle.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/navigator/ViewToggle.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { ViewToggle } from "@/components/navigator/ViewToggle"

describe("ViewToggle", () => {
  it("shows '3D' label when view is firstperson", () => {
    render(<ViewToggle view="firstperson" onToggle={vi.fn()} />)
    expect(screen.getByText(/3D/i)).toBeInTheDocument()
  })

  it("shows 'MAP' label when view is overhead", () => {
    render(<ViewToggle view="overhead" onToggle={vi.fn()} />)
    expect(screen.getByText(/MAP/i)).toBeInTheDocument()
  })

  it("calls onToggle when button is clicked", () => {
    const onToggle = vi.fn()
    render(<ViewToggle view="firstperson" onToggle={onToggle} />)
    fireEvent.click(screen.getByRole("button"))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test src/components/navigator/ViewToggle.test.tsx
```

- [ ] **Step 3: Implement ViewToggle**

```typescript
// src/components/navigator/ViewToggle.tsx
"use client"

import { useEffect } from "react"
import type { View } from "@/components/navigator/NavigatorContext"

type Props = {
  view: View
  onToggle: () => void
}

export function ViewToggle({ view, onToggle }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Tab") {
        e.preventDefault()
        onToggle()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onToggle])

  return (
    <button
      onClick={onToggle}
      className="absolute top-4 right-4 z-10 rounded border border-green-500 bg-black px-3 py-1 font-mono text-sm text-green-400 hover:bg-green-900"
      title="Toggle view (Tab)"
    >
      {view === "firstperson" ? "[ 3D ]" : "[ MAP ]"}
    </button>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test src/components/navigator/ViewToggle.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/navigator/ViewToggle.tsx src/components/navigator/ViewToggle.test.tsx
git commit -m "feat: add ViewToggle component"
```

---

## Task 19: RoutePanel component

**Files:**

- Create: `src/components/navigator/RoutePanel.tsx`
- Create: `src/components/navigator/RoutePanel.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/navigator/RoutePanel.test.tsx
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { RoutePanel } from "@/components/navigator/RoutePanel"
import type { Step } from "@/lib/grid/types"

const STEPS: Step[] = [
  { instruction: "Head north on 5th Ave", distanceMetres: 100, streetName: "5th Ave" },
  { instruction: "Turn left on 42nd St", distanceMetres: 50, streetName: "42nd St" },
]

describe("RoutePanel", () => {
  it("renders all steps", () => {
    render(<RoutePanel steps={STEPS} currentStep={0} />)
    expect(screen.getByText(/Head north on 5th Ave/)).toBeInTheDocument()
    expect(screen.getByText(/Turn left on 42nd St/)).toBeInTheDocument()
  })

  it("shows arrived message when no steps", () => {
    render(<RoutePanel steps={[]} currentStep={0} />)
    expect(screen.getByText(/Arrived/i)).toBeInTheDocument()
  })

  it("highlights the current step", () => {
    render(<RoutePanel steps={STEPS} currentStep={1} />)
    const current = screen.getByText(/Turn left on 42nd St/).closest("li")
    expect(current?.className).toMatch(/text-green/)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test src/components/navigator/RoutePanel.test.tsx
```

- [ ] **Step 3: Implement RoutePanel**

```typescript
// src/components/navigator/RoutePanel.tsx
import type { Step } from "@/lib/grid/types"

type Props = {
  steps: Step[]
  currentStep: number
}

export function RoutePanel({ steps, currentStep }: Props) {
  if (steps.length === 0) {
    return (
      <div className="absolute bottom-4 left-4 z-10 w-64 rounded border border-green-700 bg-black/90 p-3 font-mono text-green-400">
        <p className="text-center text-sm">— Arrived —</p>
      </div>
    )
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 w-64 rounded border border-green-700 bg-black/90 p-3 font-mono">
      <p className="mb-2 text-xs text-green-600 uppercase tracking-widest">Route</p>
      <ul className="space-y-1 text-xs">
        {steps.map((step, i) => (
          <li
            key={i}
            className={i === currentStep ? "text-green-300" : i < currentStep ? "text-green-800 line-through" : "text-green-600"}
          >
            {i === currentStep ? "▶ " : "  "}
            {step.instruction}
            <span className="ml-1 text-green-800">({step.distanceMetres}m)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test src/components/navigator/RoutePanel.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/navigator/RoutePanel.tsx src/components/navigator/RoutePanel.test.tsx
git commit -m "feat: add RoutePanel component"
```

---

## Task 20: AddressSearch component

**Files:**

- Create: `src/components/navigator/AddressSearch.tsx`

- [ ] **Step 1: Create AddressSearch**

```typescript
// src/components/navigator/AddressSearch.tsx
"use client"

import { useState, type FormEvent } from "react"

type Props = {
  onRoute: (origin: string, destination: string) => void
  isLoading: boolean
}

export function AddressSearch({ onRoute, isLoading }: Props) {
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (origin.trim() && destination.trim()) {
      onRoute(origin.trim(), destination.trim())
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="absolute top-4 left-4 z-10 flex flex-col gap-2 w-72"
    >
      <input
        type="text"
        placeholder="From (e.g. Times Square, NYC)"
        value={origin}
        onChange={(e) => setOrigin(e.target.value)}
        className="rounded border border-green-700 bg-black px-3 py-1 font-mono text-sm text-green-400 placeholder-green-900 focus:border-green-400 focus:outline-none"
      />
      <input
        type="text"
        placeholder="To (e.g. Brooklyn Bridge, NYC)"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        className="rounded border border-green-700 bg-black px-3 py-1 font-mono text-sm text-green-400 placeholder-green-900 focus:border-green-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={isLoading || !origin.trim() || !destination.trim()}
        className="rounded border border-green-500 bg-black px-3 py-1 font-mono text-sm text-green-400 hover:bg-green-900 disabled:opacity-40"
      >
        {isLoading ? "Loading…" : "[ Navigate ]"}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/navigator/AddressSearch.tsx
git commit -m "feat: add AddressSearch component"
```

---

## Task 21: RaycasterCanvas component

**Files:**

- Create: `src/components/navigator/RaycasterCanvas.tsx`

- [ ] **Step 1: Create RaycasterCanvas**

```typescript
// src/components/navigator/RaycasterCanvas.tsx
"use client"

import { useRef, useEffect, useCallback } from "react"
import type { Grid } from "@/lib/grid/types"
import type { Camera } from "@/lib/raycaster/camera"
import { moveCamera, rotateCamera } from "@/lib/raycaster/camera"
import { buildFrameData } from "@/lib/raycaster/engine"
import { renderFrame, canvasDimensions } from "@/lib/raycaster/renderer"

type Props = {
  grid: Grid
  camera: Camera
  onCameraChange: (camera: Camera) => void
}

const PRESSED = new Set<string>()

export function RaycasterCanvas({ grid, camera, onCameraChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraRef = useRef(camera)
  const gridRef = useRef(grid)
  const rafRef = useRef<number>(0)

  cameraRef.current = camera
  gridRef.current = grid

  const loop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Handle movement
    let cam = cameraRef.current
    if (PRESSED.has("ArrowUp") || PRESSED.has("w"))    cam = moveCamera(cam, "forward", gridRef.current)
    if (PRESSED.has("ArrowDown") || PRESSED.has("s"))  cam = moveCamera(cam, "backward", gridRef.current)
    if (PRESSED.has("ArrowLeft") || PRESSED.has("a"))  cam = rotateCamera(cam, "left")
    if (PRESSED.has("ArrowRight") || PRESSED.has("d")) cam = rotateCamera(cam, "right")
    if (cam !== cameraRef.current) onCameraChange(cam)

    const { cols, rows } = canvasDimensions(canvas)
    const frameData = buildFrameData(cam, gridRef.current, cols, rows)
    renderFrame(frameData, canvas, cols, rows)

    rafRef.current = requestAnimationFrame(loop)
  }, [onCameraChange])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { PRESSED.add(e.key) }
    function onKeyUp(e: KeyboardEvent)   { PRESSED.delete(e.key) }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [loop])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full bg-black"
      style={{ imageRendering: "pixelated" }}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/navigator/RaycasterCanvas.tsx
git commit -m "feat: add RaycasterCanvas with rAF loop"
```

---

## Task 22: OverheadCanvas component

**Files:**

- Create: `src/components/navigator/OverheadCanvas.tsx`

- [ ] **Step 1: Create OverheadCanvas**

```typescript
// src/components/navigator/OverheadCanvas.tsx
"use client"

import { useRef, useEffect } from "react"
import type { Grid } from "@/lib/grid/types"
import type { Camera } from "@/lib/raycaster/camera"
import {
  OVERHEAD_BUILDING,
  OVERHEAD_ROAD,
  OVERHEAD_CAMERA,
  OVERHEAD_ROUTE,
  OVERHEAD_EMPTY,
} from "@/lib/raycaster/chars"

type Props = {
  grid: Grid
  camera: Camera
  routeCells: { col: number; row: number }[]
}

const CELL_PX = 6
const FONT = `${CELL_PX * 1.2}px monospace`

export function OverheadCanvas({ grid, camera, routeCells }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rows = grid.length
    const cols = grid[0]?.length ?? 0
    canvas.width = cols * CELL_PX
    canvas.height = rows * CELL_PX

    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = FONT

    const routeSet = new Set(routeCells.map(({ row, col }) => `${row},${col}`))
    const camRow = Math.floor(camera.y)
    const camCol = Math.floor(camera.x)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * CELL_PX
        const y = row * CELL_PX
        const cell = grid[row][col]

        if (row === camRow && col === camCol) {
          ctx.fillStyle = "#00ff00"
          ctx.fillText(OVERHEAD_CAMERA, x, y + CELL_PX)
        } else if (routeSet.has(`${row},${col}`)) {
          ctx.fillStyle = "#00aa00"
          ctx.fillText(OVERHEAD_ROUTE, x, y + CELL_PX)
        } else if (cell.type === "building") {
          ctx.fillStyle = "#555"
          ctx.fillText(OVERHEAD_BUILDING, x, y + CELL_PX)
        } else if (cell.type === "road") {
          ctx.fillStyle = "#222"
          ctx.fillText(OVERHEAD_ROAD, x, y + CELL_PX)
        } else {
          ctx.fillStyle = "#111"
          ctx.fillText(OVERHEAD_EMPTY, x, y + CELL_PX)
        }
      }
    }
  }, [grid, camera, routeCells])

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full bg-black object-contain"
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/navigator/OverheadCanvas.tsx
git commit -m "feat: add OverheadCanvas top-down map"
```

---

## Task 23: Navigator root component and page

**Files:**

- Create: `src/components/navigator/Navigator.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create Navigator**

```typescript
// src/components/navigator/Navigator.tsx
"use client"

import { useEffect, useState } from "react"
import { NavigatorProvider, useNavigator } from "@/components/navigator/NavigatorContext"
import { RaycasterCanvas } from "@/components/navigator/RaycasterCanvas"
import { OverheadCanvas } from "@/components/navigator/OverheadCanvas"
import { ViewToggle } from "@/components/navigator/ViewToggle"
import { AddressSearch } from "@/components/navigator/AddressSearch"
import { RoutePanel } from "@/components/navigator/RoutePanel"
import { latLngToCell } from "@/lib/grid/coords"
import { createCamera, advanceCameraAlongRoute } from "@/lib/raycaster/camera"
import type { Route } from "@/lib/grid/types"

function NavigatorInner() {
  const { state, dispatch } = useNavigator()
  const [isLoading, setIsLoading] = useState(false)

  // Route auto-walking: advance camera along route cells at ~30fps
  useEffect(() => {
    if (!state.isWalking || state.routeCells.length === 0 || !state.grid) return
    const interval = setInterval(() => {
      const { camera, nextStepIndex } = advanceCameraAlongRoute(
        state.camera,
        state.routeCells,
        state.routeStepIndex
      )
      dispatch({ type: "ADVANCE_STEP", camera, stepIndex: nextStepIndex })
    }, 33)
    return () => clearInterval(interval)
  }, [state.isWalking, state.routeCells, state.camera, state.routeStepIndex, state.grid, dispatch])

  // Spacebar toggles walking
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code === "Space") { e.preventDefault(); dispatch({ type: "TOGGLE_WALKING" }) }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [dispatch])

  // Load initial grid on mount
  useEffect(() => {
    fetch("/api/grid?city=nyc")
      .then((r) => r.json())
      .then(({ grid, meta }) => {
        dispatch({ type: "SET_GRID", grid, meta })
        const centre = { col: Math.floor(meta.cols / 2), row: Math.floor(meta.rows / 2) }
        dispatch({ type: "SET_CAMERA", camera: createCamera(centre.col + 0.5, centre.row + 0.5, 0) })
      })
      .catch((err) => dispatch({ type: "SET_ERROR", error: String(err) }))
  }, [dispatch])

  async function handleRoute(originAddr: string, destinationAddr: string) {
    setIsLoading(true)
    try {
      const [originGeo, destGeo] = await Promise.all([
        fetch(`/api/geocode?address=${encodeURIComponent(originAddr)}`).then((r) => r.json()),
        fetch(`/api/geocode?address=${encodeURIComponent(destinationAddr)}`).then((r) => r.json()),
      ])

      const routeRes = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: originGeo, destination: destGeo }),
      })
      const route: Route = await routeRes.json()

      if (!state.gridMeta) return

      const routeCells = route.polyline.map((ll) => latLngToCell(ll, state.gridMeta!))
      dispatch({ type: "SET_ROUTE", route, routeCells })
    } catch (err) {
      dispatch({ type: "SET_ERROR", error: String(err) })
    } finally {
      setIsLoading(false)
    }
  }

  if (!state.grid) {
    return (
      <div className="flex h-screen items-center justify-center bg-black font-mono text-green-400">
        Loading city…
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {state.view === "firstperson" ? (
        <RaycasterCanvas
          grid={state.grid}
          camera={state.camera}
          onCameraChange={(cam) => dispatch({ type: "SET_CAMERA", camera: cam })}
        />
      ) : (
        <OverheadCanvas
          grid={state.grid}
          camera={state.camera}
          routeCells={state.routeCells}
        />
      )}
      <ViewToggle
        view={state.view}
        onToggle={() => dispatch({ type: "TOGGLE_VIEW" })}
      />
      <AddressSearch onRoute={handleRoute} isLoading={isLoading} />
      {state.routeSteps.length > 0 && (
        <RoutePanel steps={state.routeSteps} currentStep={state.routeStepIndex} />
      )}
      {state.error && (
        <div className="absolute bottom-4 right-4 z-20 max-w-xs rounded border border-red-700 bg-black/90 p-3 font-mono text-xs text-red-400">
          {state.error}
          <button
            onClick={() => dispatch({ type: "CLEAR_ERROR" })}
            className="ml-2 underline"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

export function Navigator() {
  return (
    <NavigatorProvider>
      <NavigatorInner />
    </NavigatorProvider>
  )
}
```

- [ ] **Step 2: Update page.tsx**

```typescript
// src/app/page.tsx
import { Navigator } from "@/components/navigator/Navigator"

export default function Home() {
  return <Navigator />
}
```

- [ ] **Step 3: Run all tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Type check**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Start dev server and verify manually**

```bash
pnpm dev
```

Open `http://localhost:3000`. Expected:

- Black screen with "Loading city…" briefly
- First-person ASCII view renders (may show empty if Mapbox token not yet set)
- `[ 3D ]` button in top right — click it, view switches to overhead `[ MAP ]`
- Tab key toggles views
- Address inputs in top left — enter two NYC addresses and hit Navigate

- [ ] **Step 7: Commit**

```bash
git add src/components/navigator/Navigator.tsx src/app/page.tsx
git commit -m "feat: assemble Navigator root component and page"
```

---

## Done

All tasks complete. The app has:

- First-person ASCII raycaster view of NYC buildings from Mapbox Vector Tiles
- Overhead ASCII map view with route highlighted
- Tab to toggle views
- Destination-based navigation via Google Routes API + Google Geocoding API
- Turn-by-turn step panel
- Error states for failed geocoding, routing, and grid fetch
- Multi-city growth path via `lib/cities.ts`
