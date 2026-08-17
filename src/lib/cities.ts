// src/lib/cities.ts
import type { CityConfig } from "@/lib/grid/types";

export const CITIES: Record<string, CityConfig> = {
  nyc: {
    name: "New York City",
    bbox: {
      north: 40.917577,
      south: 40.477399,
      east: -73.700272,
      west: -74.25909,
    },
    center: { lat: 40.758896, lng: -73.98513 }, // Times Square
    cellSize: 4,
  },
};

export const DEFAULT_CITY = "nyc";
