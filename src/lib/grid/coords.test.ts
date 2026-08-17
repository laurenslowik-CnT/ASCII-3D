import { describe, expect, it } from "vitest";

import { latLngToCell, latLngToTileXY } from "@/lib/grid/coords";
import type { GridMeta } from "@/lib/grid/types";

const META: GridMeta = {
  origin: { lat: 40.758896, lng: -73.98513 },
  rows: 100,
  cols: 100,
  cellSize: 4,
};

describe("latLngToCell", () => {
  it("returns row 0, col 0 for the origin", () => {
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
    expect(tile).toEqual({ x: 19299, y: 24629, z: 16 });
  });
});
