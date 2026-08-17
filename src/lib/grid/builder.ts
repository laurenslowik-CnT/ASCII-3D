// src/lib/grid/builder.ts
import { latLngToCell } from "@/lib/grid/coords";
import type { Cell, Grid, GridMeta } from "@/lib/grid/types";
import type { TileBuilding } from "@/lib/mapbox/tiles";

function edgeCrossesRay(
  px: number,
  py: number,
  xi: number,
  yi: number,
  xj: number,
  yj: number,
): boolean {
  return yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
}

function pointInPolygon(
  px: number,
  py: number,
  polygon: [number, number][],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pair_i = polygon[i];
    const pair_j = polygon[j];
    if (pair_i && pair_j) {
      const [xi, yi] = pair_i;
      const [xj, yj] = pair_j;
      if (edgeCrossesRay(px, py, xi, yi, xj, yj)) {
        inside = !inside;
      }
    }
  }
  return inside;
}

function computeBBox(
  outerRing: [number, number][],
  meta: GridMeta,
): { minRow: number; maxRow: number; minCol: number; maxCol: number } {
  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;

  for (const [lat, lng] of outerRing) {
    const { row, col } = latLngToCell({ lat, lng }, meta);
    if (row < minRow) {
      minRow = row;
    }
    if (row > maxRow) {
      maxRow = row;
    }
    if (col < minCol) {
      minCol = col;
    }
    if (col > maxCol) {
      maxCol = col;
    }
  }

  return { minRow, maxRow, minCol, maxCol };
}

export function rasteriseBuilding(
  grid: Grid,
  polygonLatLng: [number, number][][],
  height: number,
  meta: GridMeta,
): void {
  const outerRing = polygonLatLng[0];
  if (!outerRing || outerRing.length < 3) {
    return;
  }

  const { minRow, maxRow, minCol, maxCol } = computeBBox(outerRing, meta);

  const clampedMinRow = Math.max(0, minRow);
  const clampedMaxRow = Math.min(meta.rows - 1, maxRow);
  const clampedMinCol = Math.max(0, minCol);
  const clampedMaxCol = Math.min(meta.cols - 1, maxCol);

  const metresPerDegreeLat = 111320;
  const metresPerDegreeLng =
    111320 * Math.cos((meta.origin.lat * Math.PI) / 180);

  for (let row = clampedMinRow; row <= clampedMaxRow; row++) {
    for (let col = clampedMinCol; col <= clampedMaxCol; col++) {
      const cellLat =
        meta.origin.lat + ((row + 0.5) * meta.cellSize) / metresPerDegreeLat;
      const cellLng =
        meta.origin.lng + ((col + 0.5) * meta.cellSize) / metresPerDegreeLng;

      if (pointInPolygon(cellLat, cellLng, outerRing)) {
        const gridRow = grid[row];
        if (gridRow) {
          gridRow[col] = { type: "building", height };
        }
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
