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

import { cellNoise, luminanceToChar } from "@/lib/raycaster/chars";

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

// Per-cell brightness jitter (fraction) so flat-coloured regions break into
// varied glyphs instead of a solid block. Multiplicative, so pure black stays
// black (empty stays empty); keyed on cell position so it's a stable grain that
// doesn't shimmer as the view moves.
const DITHER = 0.3;

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
  const dithered = luminance * (1 + (cellNoise(x0, y0) - 0.5) * DITHER);
  return {
    char: luminanceToChar(dithered),
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

// ── Colour legibility ─────────────────────────────────────────────────────────
//
// On a black background the glyph already encodes brightness, so if colour ALSO
// darkens with the pixel, dark regions get a sparse glyph AND a near-black tint
// and vanish. legibleColor separates the channels: keep hue, boost saturation so
// map categories stay distinct, and remap lightness into a floored band so no
// drawn glyph is ever too dark to read. Tune the constants to taste.
const SAT_BOOST = 1.5; // multiply saturation (muted map tones → distinct hues)
const SAT_FLOOR = 0.1; // minimum saturation so near-greys still carry a tint
const LIGHT_FLOOR = 0.45; // darkest a drawn glyph may be
const LIGHT_CEIL = 0.92; // brightest, so highlights don't clip to pure white

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) {
    h = (gn - bn) / d + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }
  return [h / 6, s, l];
}

function hueToChannel(p: number, q: number, tRaw: number): number {
  let t = tRaw;
  if (t < 0) {
    t += 1;
  }
  if (t > 1) {
    t -= 1;
  }
  if (t < 1 / 6) {
    return p + (q - p) * 6 * t;
  }
  if (t < 1 / 2) {
    return q;
  }
  if (t < 2 / 3) {
    return p + (q - p) * (2 / 3 - t) * 6;
  }
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hueToChannel(p, q, h + 1 / 3) * 255),
    Math.round(hueToChannel(p, q, h) * 255),
    Math.round(hueToChannel(p, q, h - 1 / 3) * 255),
  ];
}

// Retint an averaged cell colour for maximum legibility on black.
export function legibleColor(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const [h, s, l] = rgbToHsl(r, g, b);
  // Keep near-greys neutral (roads, concrete) — adding a saturation floor to an
  // achromatic colour would tint it red, since hue defaults to 0.
  const s2 = s < 0.02 ? 0 : clamp01(s * SAT_BOOST + SAT_FLOOR);
  const l2 = LIGHT_FLOOR + clamp01(l) * (LIGHT_CEIL - LIGHT_FLOOR);
  return hslToRgb(h, s2, l2);
}
