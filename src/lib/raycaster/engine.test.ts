import { describe, expect, it } from "vitest";

import type { Grid } from "@/lib/grid/types";
import { buildFrameData, castRay } from "@/lib/raycaster/engine";

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
  it("hits a building when facing into one", () => {
    const hit = castRay({ x: 2.5, y: 2.5 }, 0, GRID);
    expect(hit).not.toBeNull();
    expect(hit?.cell.type).toBe("building");
  });

  it("returns EW face when facing east", () => {
    const hit = castRay({ x: 2.5, y: 2.5 }, 0, GRID);
    expect(hit).not.toBeNull();
    expect(hit?.face).toBe("EW");
  });

  it("returns NS face when facing north (negative Y direction)", () => {
    const hit = castRay({ x: 2.5, y: 2.5 }, -Math.PI / 2, GRID);
    expect(hit).not.toBeNull();
    expect(hit?.face).toBe("NS");
  });

  it("returns null when no wall within max distance", () => {
    const openGrid: Grid = Array.from({ length: 100 }, () =>
      Array.from({ length: 100 }, () => ({
        type: "road" as const,
        height: 0,
      })),
    );
    const hit = castRay({ x: 50, y: 50 }, 0, openGrid);
    expect(hit).toBeNull();
  });

  it("returns a positive distance", () => {
    const hit = castRay({ x: 2.5, y: 2.5 }, 0, GRID);
    expect(hit).not.toBeNull();
    expect(hit?.distance).toBeGreaterThan(0);
  });
});

describe("buildFrameData", () => {
  it("returns array of length equal to cols", () => {
    const camera = { x: 2.5, y: 2.5, angle: 0, fov: Math.PI / 3 };
    const result = buildFrameData(camera, GRID, 10, 20);
    expect(result).toHaveLength(10);
  });
});
