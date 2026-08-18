// src/lib/raycaster/chars.ts

// Wall characters indexed by distance band (0 = closest, 4 = furthest)
// N/S faces (directly facing camera)
export const WALL_NS = ["@", "#", "*", ":", "."] as const;

// E/W faces (side faces — vertical strokes)
export const WALL_EW = ["%", "|", "!", ";", "'"] as const;

// Ground characters indexed by distance from bottom of screen (near → far)
export const FLOOR = ["#", ":", ".", ",", " "] as const;

// Sky characters — sparse
export const SKY = [" ", " ", " ", "·", " "] as const;

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

// IBM CGA palette — discrete colors by distance band
// NS faces: yellow up close fading into blue
const WALL_NS_COLORS: readonly string[] = [
  "#ffff55", // band 0 — bright yellow (CGA bright yellow)
  "#ffffff", // band 1 — white
  "#5555ff", // band 2 — bright blue
  "#0000aa", // band 3 — blue
  "#000055", // band 4 — dark blue
];

// EW faces: white fading into blue (no yellow — yellow only on direct face)
const WALL_EW_COLORS: readonly string[] = [
  "#ffffff", // band 0 — white
  "#5555ff", // band 1 — bright blue
  "#0000aa", // band 2 — blue
  "#000055", // band 3 — dark blue
  "#000033", // band 4 — near-black blue
];

export function wallColour(distance: number, face: "NS" | "EW"): string {
  const band = distanceBand(distance);
  const palette = face === "NS" ? WALL_NS_COLORS : WALL_EW_COLORS;
  return palette[band] ?? "#000033";
}

// Floor — IBM blue gradient, bright near feet
const FLOOR_COLORS: readonly string[] = [
  "#0000aa", // near
  "#000077",
  "#000055",
  "#000033",
  "#000022", // far
];

export function floorColour(band: number): string {
  return FLOOR_COLORS[band] ?? "#000022";
}

// Sky — near-black blue throughout
export function skyColour(): string {
  return "#000022";
}

// ASCII density gradient for texture sampling (dense → sparse)
const TEXTURE_CHARS = "@#%*+=!;:,. " as const;

// Map texture pixel brightness (0=dark, 255=bright) to an ASCII character.
// Bright pixel → dense char (looks bright on black bg).
// Dark pixel  → sparse char (looks dark / empty).
export function brightnessToChar(b: number): string {
  const idx = Math.floor((1 - b / 255) * (TEXTURE_CHARS.length - 1));
  return TEXTURE_CHARS[Math.max(0, Math.min(TEXTURE_CHARS.length - 1, idx))];
}
