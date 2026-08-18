import { describe, expect, it } from "vitest";

import type { Grid } from "@/lib/grid/types";
import { createCamera, moveCamera, rotateCamera } from "@/lib/raycaster/camera";

const OPEN_GRID: Grid = {
  data: new Int16Array(20 * 20), // all zeros = passable
  rows: 20,
  cols: 20,
};

// Grid with a wall at col 11 across all rows
const wallData = new Int16Array(20 * 20);
for (let r = 0; r < 20; r++) {
  wallData[r * 20 + 11] = 10;
}
const WALL_GRID: Grid = { data: wallData, rows: 20, cols: 20 };

describe("moveCamera", () => {
  it("moves forward along the camera angle", () => {
    const cam = createCamera(10, 10, 0); // facing east (angle=0)
    const moved = moveCamera(cam, "forward", OPEN_GRID);
    expect(moved.x).toBeGreaterThan(10);
    expect(moved.y).toBeCloseTo(10);
  });

  it("does not move into a building cell", () => {
    const cam = createCamera(10, 10, 0);
    const moved = moveCamera(cam, "forward", WALL_GRID);
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

  it("sets pitch to 0 by default", () => {
    const cam = createCamera(5, 5, 0);
    expect(cam.pitch).toBe(0);
  });
});
