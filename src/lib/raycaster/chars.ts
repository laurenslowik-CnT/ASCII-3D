// src/lib/raycaster/chars.ts

// Wall characters indexed by distance band (0 = closest, 4 = furthest)
// N/S faces (horizontal walls)
export const WALL_NS = ["█", "▓", "▒", "░", "|"] as const;

// E/W faces (vertical walls — different set for shading contrast)
export const WALL_EW = ["█", "▓", "▒", "░", "─"] as const;

// Ground characters indexed by distance from bottom of screen
export const FLOOR = [".", ",", ":", ";", " "] as const;

// Sky characters indexed by distance from top of screen
export const SKY = [" ", " ", " ", ".", " "] as const;

// Overhead map characters
export const OVERHEAD_BUILDING = "█";
export const OVERHEAD_ROAD = " ";
export const OVERHEAD_CAMERA = "@";
export const OVERHEAD_ROUTE = "·";
export const OVERHEAD_EMPTY = "░";

// Max render distance in grid units
export const MAX_RENDER_DIST = 30;

// Distance bands: divide MAX_RENDER_DIST into 5 bands
export function distanceBand(distance: number): number {
  return Math.min(4, Math.floor((distance / MAX_RENDER_DIST) * 5));
}

// Wall colour by distance (CSS colour string)
export function wallColour(distance: number): string {
  const brightness = Math.max(40, Math.floor(255 - distance * 6));
  return `rgb(${brightness},${brightness},${brightness})`;
}
