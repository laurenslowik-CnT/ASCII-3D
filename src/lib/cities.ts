// src/lib/cities.ts
import type { CityConfig } from "@/lib/grid/types";

export const CITIES: Record<string, CityConfig> = {
  nyc: {
    name: "Manhattan",
    bbox: {
      north: 40.882, // Inwood / Washington Heights
      south: 40.7, // Battery Park / Financial District
      east: -73.907, // East River
      west: -74.02, // Hudson River
    },
    center: { lat: 40.758896, lng: -73.98513 }, // Times Square
    cellSize: 8,
  },
};

export const DEFAULT_CITY = "nyc";
