// src/lib/raycaster/chars.ts

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
  "#ffff55", // band 0 — bright yellow
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
  "#0000aa",
  "#000077",
  "#000055",
  "#000033",
  "#000022",
];

export function floorColour(band: number): string {
  return FLOOR_COLORS[band] ?? "#000022";
}

// Sky — near-black blue throughout
export function skyColour(): string {
  return "#000022";
}

// ── Per-material character palettes ──────────────────────────────────────────
//
// Each palette is a string ordered dark→bright (index 0 = darkest texture
// pixel, index N = brightest). Characters are chosen for visual semantics —
// what the surface *looks like* — rather than generic density.

function paletteChar(b: number, palette: string): string {
  const idx = Math.floor((b / 255) * (palette.length - 1));
  return palette[Math.max(0, Math.min(palette.length - 1, idx))] ?? " ";
}

// Glass curtain wall — vertical strokes suggest window panes; spandrel fades out
//   dark (spandrel) →  ' ; ! | I |  ← bright (glass reflection)
const GLASS_PALETTE = "  ';!||II|";
export function charFromGlass(b: number): string {
  return paletteChar(b, GLASS_PALETTE);
}

// Brick / masonry — chunky chars for solid mass; dots for mortar joints
//   dark (mortar) →  . , : = + # @ ← bright (brick highlight)
const BRICK_PALETTE = " .,:=+#@@";
export function charFromBrick(b: number): string {
  return paletteChar(b, BRICK_PALETTE);
}

// Pavement / floor — subtle surface texture, mostly empty at distance
//   dark (far concrete) →  . , ; : ← bright (close concrete)
const FLOOR_PALETTE = "   ..,;:=";
export function charFromFloor(b: number): string {
  return paletteChar(b, FLOOR_PALETTE);
}
