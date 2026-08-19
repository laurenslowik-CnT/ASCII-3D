// src/lib/raycaster/chars.ts

// Overhead map characters
export const OVERHEAD_BUILDING = "█";
export const OVERHEAD_CAMERA = "@";
export const OVERHEAD_ROUTE = "·";
export const OVERHEAD_EMPTY = "░";

// Max render distance in grid units
export const MAX_RENDER_DIST = 40;

// Distance bands: divide MAX_RENDER_DIST into 5 bands
export function distanceBand(distance: number): number {
  return Math.min(4, Math.floor((distance / MAX_RENDER_DIST) * 5));
}

// ── Per-building color ─────────────────────────────────────────────────────────
// Each building gets a CGA color based on its grid position hash.

const BUILDING_PALETTE: readonly string[] = [
  "#5555ff", // blue
  "#ff5555", // red
  "#55ffff", // cyan
  "#ffff55", // yellow
  "#55ff55", // green
  "#ff55ff", // magenta
];

// Base building hue as [r,g,b], hashed from grid position (no shading).
export function buildingRGB(
  mapX: number,
  mapY: number,
): [number, number, number] {
  const hash = Math.abs(
    ((mapX * 1597) ^ (mapY * 2053)) % BUILDING_PALETTE.length,
  );
  const hex = BUILDING_PALETTE[hash] ?? "#5555ff";
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// ── Luminance → ASCII (the camera-perspective mapping) ────────────────────────
//
// The character is chosen by how bright a spot *looks*, not by what component
// it is. This is the "photographic" mapping used by the reference video: render
// a luminance value per cell, then quantise it to a density ramp.

// Ramp ordered dark → light by visual ink coverage. A fine ramp (à la
// ascii_magic) means small brightness differences map to different glyphs,
// which keeps flat regions from collapsing into solid "lego brick" blocks.
const LUMA_RAMP =
  " .'`^\":;!i><~+_-?][}{1)|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

export function luminanceToChar(l: number): string {
  const clamped = Math.max(0, Math.min(1, l));
  const idx = Math.round(clamped * (LUMA_RAMP.length - 1));
  return LUMA_RAMP[idx] ?? " ";
}

// Deterministic hash noise in [0,1) for a screen cell — breaks up the uniform
// "lego brick" blocks that pure quantisation produces.
export function cellNoise(a: number, b: number): number {
  let h = (Math.imul(a, 374761393) ^ Math.imul(b, 668265263)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Each window pane gets its own continuous brightness, so a facade reads as a
// varied grid rather than flat sheets that quantise into solid blocks. Panes
// are neutral, bright glass with a natural pane-to-pane spread — no self-lit
// "night window" glow.
export function windowLevel(
  mapX: number,
  mapY: number,
  floorIdx: number,
  bayIdx: number,
): number {
  const h = cellNoise(
    Math.imul(mapX, 92821) ^ (floorIdx * 40503),
    Math.imul(mapY, 53987) ^ (bayIdx * 26879),
  );
  // Reflective daytime glass: bright, continuous spread, never fully dark.
  return 0.58 + h * 0.4;
}
