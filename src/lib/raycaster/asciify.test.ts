import { describe, expect, it } from "vitest";

import { framebufferToAscii } from "@/lib/raycaster/asciify";

// Build a width×height RGBA buffer from a per-pixel colour function.
function makeBuffer(
  width: number,
  height: number,
  color: (x: number, y: number) => [number, number, number],
): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b] = color(x, y);
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

describe("framebufferToAscii", () => {
  it("computes grid dimensions from cell size", () => {
    const buf = makeBuffer(10, 6, () => [0, 0, 0]);
    const { cols, rows } = framebufferToAscii(buf, 10, 6, 5, 3);
    expect(cols).toBe(2);
    expect(rows).toBe(2);
  });

  it("maps a black block to a blank glyph and a white block to a dense one", () => {
    const black = makeBuffer(4, 4, () => [0, 0, 0]);
    const white = makeBuffer(4, 4, () => [255, 255, 255]);
    const b = framebufferToAscii(black, 4, 4, 4, 4).cells[0];
    const w = framebufferToAscii(white, 4, 4, 4, 4).cells[0];
    expect(b?.char).toBe(" ");
    expect(w?.char).not.toBe(" ");
    expect(w?.char.trim()).not.toBe("");
  });

  it("tints each cell with the average colour of its block", () => {
    // Left half red, right half blue; one cell per half.
    const buf = makeBuffer(4, 2, (x) => (x < 2 ? [200, 0, 0] : [0, 0, 200]));
    const { cells } = framebufferToAscii(buf, 4, 2, 2, 2);
    expect(cells[0]).toMatchObject({ r: 200, g: 0, b: 0 });
    expect(cells[1]).toMatchObject({ r: 0, g: 0, b: 200 });
  });

  it("averages mixed pixels within a cell", () => {
    // A 2×1 cell over one white and one black pixel → mid grey.
    const buf = makeBuffer(2, 1, (x) =>
      x === 0 ? [255, 255, 255] : [0, 0, 0],
    );
    const cell = framebufferToAscii(buf, 2, 1, 2, 1).cells[0];
    expect(cell?.r).toBe(128);
    expect(cell?.g).toBe(128);
    expect(cell?.b).toBe(128);
  });
});
