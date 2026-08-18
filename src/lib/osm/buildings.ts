import { z } from "zod";

import type { Building } from "@/lib/grid/types";

const overpassWaySchema = z.object({
  type: z.literal("way"),
  geometry: z.array(z.object({ lat: z.number(), lon: z.number() })),
  tags: z.record(z.string()).optional(),
});

const overpassResponseSchema = z.object({
  elements: z.array(z.unknown()),
});

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const USER_AGENT = "ASCII-3D-Navigator/1.0 (educational project)";
const DEFAULT_HEIGHT_M = 10;
const METRES_PER_LEVEL = 3.5;

function parseMetres(val: string | undefined): number {
  if (!val) {
    return 0;
  }
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export async function fetchOsmBuildings(
  south: number,
  west: number,
  north: number,
  east: number,
): Promise<Building[]> {
  const bbox = `${south},${west},${north},${east}`;
  const query = `[out:json][timeout:30];way["building"](${bbox});out geom;`;

  const headers = { "User-Agent": USER_AGENT };
  let lastError = "";
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(`${mirror}?data=${encodeURIComponent(query)}`, {
        headers,
      });
      if (res.ok) {
        const { elements } = overpassResponseSchema.parse(await res.json());
        type ParsedWay = ReturnType<typeof overpassWaySchema.parse>;
        return elements
          .map((el) => overpassWaySchema.safeParse(el))
          .filter(
            (r): r is { success: true; data: ParsedWay } =>
              r.success && r.data.geometry.length >= 4,
          )
          .map((r) => {
            const way = r.data;
            const tags = way.tags ?? {};
            const height =
              parseMetres(tags.height) ||
              parseMetres(tags["building:levels"]) * METRES_PER_LEVEL ||
              DEFAULT_HEIGHT_M;
            const minHeight = parseMetres(tags.min_height);
            const ring: [number, number][] = way.geometry.map(
              ({ lat, lon }) => [lat, lon],
            );
            return { polygonLatLng: [ring], height, minHeight };
          });
      }
      lastError = `${res.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(`Overpass API failed on all mirrors: ${lastError}`);
}
