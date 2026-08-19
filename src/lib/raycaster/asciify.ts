// src/lib/raycaster/asciify.ts
//
// The ascii_magic core for photographic input: take a rendered RGBA framebuffer
// (from an offscreen 3D render of the real city) and convert it to a grid of
// coloured ASCII cells. Each character cell averages the pixels beneath it, maps
// perceived brightness to a glyph, and tints the glyph with the average colour —
// so real rendered video becomes ASCII while keeping the scene's light and hue.
//
// This is intentionally decoupled from any renderer: the input is a plain pixel
// buffer (as produced by `CanvasRenderingContext2D.getImageData` or, after a
// vertical flip, `WebGLRenderingContext.readPixels`), so it is pure and testable.

import { luminanceToChar } from "@/lib/raycaster/chars";

export type AsciiCell = {
  char: string;
  r: number;
  g: number;
  b: number;
};

// Rec. 601 perceptual luminance weights.
const R_WEIGHT = 0.299;
const G_WEIGHT = 0.587;
const B_WEIGHT = 0.114;

// Average one character cell's block of pixels and turn it into an AsciiCell.
function cellFromBlock(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  cellW: number,
  cellH: number,
): AsciiCell {
  const x1 = Math.min(width, x0 + cellW);
  const y1 = Math.min(height, y0 + cellH);
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      rSum += pixels[i] ?? 0;
      gSum += pixels[i + 1] ?? 0;
      bSum += pixels[i + 2] ?? 0;
      count++;
    }
  }
  if (count === 0) {
    return { char: " ", r: 0, g: 0, b: 0 };
  }
  const r = rSum / count;
  const g = gSum / count;
  const b = bSum / count;
  const luminance = (R_WEIGHT * r + G_WEIGHT * g + B_WEIGHT * b) / 255;
  return {
    char: luminanceToChar(luminance),
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
  };
}

// Convert an RGBA framebuffer to a row-major grid of coloured ASCII cells.
// `pixels` is top-down RGBA (getImageData order); flip WebGL readPixels rows
// before calling. Returns `cols * rows` cells, where
// cols = floor(width / cellW), rows = floor(height / cellH).
export function framebufferToAscii(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  cellW: number,
  cellH: number,
): { cells: AsciiCell[]; cols: number; rows: number } {
  const cols = Math.floor(width / cellW);
  const rows = Math.floor(height / cellH);
  const cells: AsciiCell[] = [];
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      cells.push(
        cellFromBlock(
          pixels,
          width,
          height,
          cx * cellW,
          cy * cellH,
          cellW,
          cellH,
        ),
      );
    }
  }
  return { cells, cols, rows };
}
