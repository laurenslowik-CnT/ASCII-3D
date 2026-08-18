import fs from "node:fs/promises";
import path from "node:path";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { CITIES, DEFAULT_CITY } from "@/lib/cities";
import { buildGrid } from "@/lib/grid/builder";
import type { GridMeta } from "@/lib/grid/types";

const CACHE_SECONDS = 86400;

const buildingSchema = z.object({
  polygonLatLng: z.array(z.array(z.tuple([z.number(), z.number()]))),
  height: z.number(),
  minHeight: z.number(),
});

const buildingsFileSchema = z.object({
  buildings: z.array(buildingSchema),
});

const BUILDINGS_FILE = path.join(
  process.cwd(),
  "public",
  "data",
  "manhattan-buildings.json",
);

async function loadBuildings() {
  let content: string;
  try {
    content = await fs.readFile(BUILDINGS_FILE, "utf8");
  } catch {
    throw new Error(
      "Building data not found. Run: node scripts/download-buildings.mjs",
    );
  }
  const parsed = buildingsFileSchema.parse(JSON.parse(content));
  return parsed.buildings;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const cityKey = searchParams.get("city") ?? DEFAULT_CITY;
  const city = CITIES[cityKey];

  if (!city) {
    return NextResponse.json({ error: "Unknown city" }, { status: 400 });
  }

  try {
    const allBuildings = await loadBuildings();
    const { bbox, center, cellSize } = city;

    const metresPerDegreeLng = 111320 * Math.cos((center.lat * Math.PI) / 180);
    const widthMetres = (bbox.east - bbox.west) * metresPerDegreeLng;
    const heightMetres = (bbox.north - bbox.south) * 111320;

    const meta: GridMeta = {
      origin: { lat: bbox.south, lng: bbox.west },
      rows: Math.ceil(heightMetres / cellSize),
      cols: Math.ceil(widthMetres / cellSize),
      cellSize,
    };

    const grid = buildGrid(allBuildings, meta);

    return NextResponse.json(
      { grid, meta },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate`,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
