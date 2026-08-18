// src/lib/grid/types.ts

export type LatLng = { lat: number; lng: number };

export type BBox = {
  north: number;
  south: number;
  east: number;
  west: number;
};

// Flat row-major grid. Value at [row * cols + col] = building height in
// metres (integer). 0 means empty / passable.
export type Grid = {
  data: Int16Array;
  rows: number;
  cols: number;
};

export type GridMeta = {
  origin: LatLng; // lat/lng of cell [0][0]
  rows: number;
  cols: number;
  cellSize: number; // metres per cell side
};

export type Step = {
  instruction: string;
  distanceMetres: number;
  streetName: string;
};

export type Route = {
  polyline: LatLng[];
  steps: Step[];
};

export type CityConfig = {
  name: string;
  bbox: BBox;
  center: LatLng;
  cellSize: number;
};

export type Building = {
  polygonLatLng: [number, number][][];
  height: number;
  minHeight: number;
};
