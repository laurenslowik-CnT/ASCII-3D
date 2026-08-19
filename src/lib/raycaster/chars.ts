// src/lib/raycaster/chars.ts

// Sky characters — not used (sky is pure black), kept for overhead map
export const SKY = [" ", " ", " ", " ", " "] as const;

// Overhead map characters
export const OVERHEAD_BUILDING = "█";
export const OVERHEAD_ROAD = " ";
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
// Distance dims the color toward black.

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

export function buildingColour(
  mapX: number,
  mapY: number,
  distance: number,
): string {
  const [r, g, b] = buildingRGB(mapX, mapY);
  const t = Math.max(0, 1 - distance / MAX_RENDER_DIST);
  const brightness = Math.max(0.08, t ** 0.9);
  return `rgb(${Math.round(r * brightness)},${Math.round(g * brightness)},${Math.round(b * brightness)})`;
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
// varied grid rather than flat sheets that quantise into solid blocks. ~14% of
// windows are "lit" with a warm glow (cyberpunk-night feel).
export function windowLevel(
  mapX: number,
  mapY: number,
  floorIdx: number,
  bayIdx: number,
): { level: number; lit: boolean } {
  const h = cellNoise(
    Math.imul(mapX, 92821) ^ (floorIdx * 40503),
    Math.imul(mapY, 53987) ^ (bayIdx * 26879),
  );
  if (h < 0.14) {
    // Lit window — bright, warm, with its own brightness spread
    return { level: 0.85 + h, lit: true };
  }
  // Unlit — continuous spread from dark to fairly bright, never saturating
  return { level: 0.25 + (h - 0.14) * 0.7, lit: false };
}

// Tint a base rgb by a luminance value, optionally shifting toward warm white
// for a "lit window" glow.
export function shadeRGB(
  rgb: [number, number, number],
  luminance: number,
  warmGlow = 0,
): string {
  const l = Math.max(0, Math.min(1, luminance));
  const [r, g, b] = rgb;
  // warmGlow (0..1) lifts toward warm white (255,235,180)
  const wr = r + (255 - r) * warmGlow;
  const wg = g + (235 - g) * warmGlow;
  const wb = b + (180 - b) * warmGlow;
  return `rgb(${Math.round(wr * l)},${Math.round(wg * l)},${Math.round(wb * l)})`;
}

// Dim an rgb(...) colour string toward black by a factor (0..1).
export function dimColour(rgb: string, factor: number): string {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) {
    return rgb;
  }
  const r = Math.round(Number(m[0]) * factor);
  const g = Math.round(Number(m[1]) * factor);
  const b = Math.round(Number(m[2]) * factor);
  return `rgb(${r},${g},${b})`;
}

// ── Data-stream wall characters ───────────────────────────────────────────────
// Alphanumeric + symbol set gives the "city made of data" look.
// Character is selected by screen column + wall row so it appears to scroll
// as you move, matching the reference video's Matrix-style streams.

const DATA_CHARS = "0123456789ABCDEFabcdef.:=+-|/!;,#@%*~^<>";

export function dataStreamChar(screenCol: number, wallRow: number): string {
  const idx =
    (((screenCol * 7 + wallRow * 3) % DATA_CHARS.length) + DATA_CHARS.length) %
    DATA_CHARS.length;
  return DATA_CHARS[idx] ?? "0";
}

// ── Floor ─────────────────────────────────────────────────────────────────────

// Floor colour — dark grey, brighter near camera
const FLOOR_COLOURS: readonly string[] = [
  "#333333",
  "#222222",
  "#1a1a1a",
  "#111111",
  "#0a0a0a",
];

export function floorColour(band: number): string {
  return FLOOR_COLOURS[band] ?? "#0a0a0a";
}

// Floor character — perspective lines suggest a street grid
const FLOOR_CHARS = "   ...,,;:";

export function charFromFloor(b: number): string {
  const idx = Math.floor((b / 255) * (FLOOR_CHARS.length - 1));
  return FLOOR_CHARS[Math.max(0, Math.min(FLOOR_CHARS.length - 1, idx))] ?? " ";
}
