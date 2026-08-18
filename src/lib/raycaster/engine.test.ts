import { describe, expect, it } from "vitest";

import type { Grid } from "@/lib/grid/types";
import { buildFrameData, castRay } from "@/lib/raycaster/engine";

// 5×5 grid: building ring (h=10) around empty centre
const gridData = new Int16Array(5 * 5).fill(10);
// Clear the 3×3 interior (rows 1-3, cols 1-3)
for (let r = 1; r <= 3; r++) {
  for (let c = 1; c <= 3; c++) {
    gridData[r * 5 + c] = 0;
  }
}
const GRID: Grid = { data: gridData, rows: 5, cols: 5 };

describe("castRay", () => {
  it("hits a building when facing into one", () => {
    const hit = castRay({ x: 2.5, y: 2.5 }, 0, GRID);
    expect(hit).not.toBeNull();
    expect(hit?.cellHeight).toBeGreaterThan(0);
  });

  it("returns EW face when facing east", () => {
    const hit = castRay({ x: 2.5, y: 2.5 }, 0, GRID);
    expect(hit?.face).toBe("EW");
  });

  it("returns NS face when facing north (negative Y direction)", () => {
    const hit = castRay({ x: 2.5, y: 2.5 }, -Math.PI / 2, GRID);
    expect(hit?.face).toBe("NS");
  });

  it("returns null when no wall within max distance", () => {
    const open = new Int16Array(100 * 100); // all zeros
    const openGrid: Grid = { data: open, rows: 100, cols: 100 };
    const hit = castRay({ x: 50, y: 50 }, 0, openGrid);
    expect(hit).toBeNull();
  });

  it("returns a positive distance", () => {
    const hit = castRay({ x: 2.5, y: 2.5 }, 0, GRID);
    expect(hit?.distance).toBeGreaterThan(0);
  });
});

describe("buildFrameData", () => {
  it("returns array of length equal to cols", () => {
    const camera = { x: 2.5, y: 2.5, angle: 0, fov: Math.PI / 3, pitch: 0 };
    const result = buildFrameData(camera, GRID, 10, 20, 4);
    expect(result).toHaveLength(10);
  });
});
