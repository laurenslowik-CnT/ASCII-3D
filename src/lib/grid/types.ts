// src/lib/grid/types.ts

export type LatLng = { lat: number; lng: number };

export type BBox = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type CellType = "road" | "building" | "empty";

export type Cell = {
  type: CellType;
  height: number; // metres, 0 for non-buildings
};

export type Grid = Cell[][];

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
  cellSize: number; // metres per cell, e.g. 4
};
