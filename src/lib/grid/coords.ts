// src/lib/grid/coords.ts
import type { GridMeta, LatLng } from "@/lib/grid/types";

const METRES_PER_DEGREE_LAT = 111320;

function metresPerDegreeLng(lat: number): number {
  return 111320 * Math.cos((lat * Math.PI) / 180);
}

export function latLngToCell(
  point: LatLng,
  meta: GridMeta,
): { row: number; col: number } {
  const metersNorth = (point.lat - meta.origin.lat) * METRES_PER_DEGREE_LAT;
  const metersEast =
    (point.lng - meta.origin.lng) * metresPerDegreeLng(meta.origin.lat);
  return {
    row: Math.floor(metersNorth / meta.cellSize),
    col: Math.floor(metersEast / meta.cellSize),
  };
}

export function cellToLatLng(row: number, col: number, meta: GridMeta): LatLng {
  const lat = meta.origin.lat + (row * meta.cellSize) / METRES_PER_DEGREE_LAT;
  const lng =
    meta.origin.lng +
    (col * meta.cellSize) / metresPerDegreeLng(meta.origin.lat);
  return { lat, lng };
}

export function latLngToTileXY(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number; z: number } {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y, z: zoom };
}

export function tileBBox(
  x: number,
  y: number,
  z: number,
): { north: number; south: number; west: number; east: number } {
  const n = 2 ** z;
  const west = (x / n) * 360 - 180;
  const east = ((x + 1) / n) * 360 - 180;
  const northRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const southRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
  return {
    north: (northRad * 180) / Math.PI,
    south: (southRad * 180) / Math.PI,
    west,
    east,
  };
}
