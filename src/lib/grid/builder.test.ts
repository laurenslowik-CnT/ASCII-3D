import { describe, expect, it } from "vitest";

import { buildGrid, rasteriseBuilding } from "@/lib/grid/builder";
import type { Grid, GridMeta } from "@/lib/grid/types";

const META: GridMeta = {
  origin: { lat: 40.758, lng: -73.985 },
  rows: 50,
  cols: 50,
  cellSize: 4,
};

describe("rasteriseBuilding", () => {
  it("marks cells inside a square polygon as building", () => {
    const polygon: [number, number][][] = [
      [
        [40.7581, -73.9849],
        [40.7581, -73.9847],
        [40.7583, -73.9847],
        [40.7583, -73.9849],
        [40.7581, -73.9849],
      ],
    ];
    const grid: Grid = {
      data: new Int16Array(50 * 50),
      rows: 50,
      cols: 50,
    };
    rasteriseBuilding(grid, polygon, 20, META);
    const buildingCells = [...grid.data].filter((h) => h > 0);
    expect(buildingCells.length).toBeGreaterThan(0);
    expect(buildingCells[0]).toBe(20);
  });
});

describe("buildGrid", () => {
  it("returns a grid of the correct dimensions", () => {
    const grid = buildGrid([], META);
    expect(grid.rows).toBe(50);
    expect(grid.cols).toBe(50);
    expect(grid.data).toHaveLength(50 * 50);
  });

  it("all cells default to 0 (empty) when no buildings", () => {
    const grid = buildGrid([], META);
    expect(grid.data.every((h) => h === 0)).toBe(true);
  });
});
