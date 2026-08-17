import { describe, expect, it } from "vitest";

import type { Grid } from "@/lib/grid/types";
import { createCamera, moveCamera, rotateCamera } from "@/lib/raycaster/camera";

const OPEN_GRID: Grid = Array.from({ length: 20 }, () =>
  Array.from({ length: 20 }, () => ({ type: "road" as const, height: 0 })),
);

describe("moveCamera", () => {
  it("moves forward along the camera angle", () => {
    const cam = createCamera(10, 10, 0); // facing east (angle=0)
    const moved = moveCamera(cam, "forward", OPEN_GRID);
    expect(moved.x).toBeGreaterThan(10);
    expect(moved.y).toBeCloseTo(10);
  });

  it("does not move into a building cell", () => {
    const wallGrid: Grid = OPEN_GRID.map((row) =>
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

  it("decreases angle when rotating left", () => {
    const cam = createCamera(10, 10, 0);
    const rotated = rotateCamera(cam, "left");
    expect(rotated.angle).toBeLessThan(0);
  });
});

describe("createCamera", () => {
  it("sets fov to PI/3 by default", () => {
    const cam = createCamera(5, 5, 0);
    expect(cam.fov).toBeCloseTo(Math.PI / 3);
  });
});
