// src/app/api/grid/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@/env";
import { CITIES, DEFAULT_CITY } from "@/lib/cities";
import { buildGrid } from "@/lib/grid/builder";
import { latLngToTileXY, tileBBox } from "@/lib/grid/coords";
import type { GridMeta } from "@/lib/grid/types";
import { fetchTile, parseBuildingsFromTile } from "@/lib/mapbox/tiles";

const ZOOM = 16;
const CACHE_SECONDS = 86400; // 24 hours

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const cityKey = searchParams.get("city") ?? DEFAULT_CITY;
  const city = CITIES[cityKey];

  if (!city) {
    return NextResponse.json({ error: "Unknown city" }, { status: 400 });
  }

  try {
    const centre = latLngToTileXY(city.center.lat, city.center.lng, ZOOM);
    const tileMinX = centre.x - 1;
    const tileMaxX = centre.x + 1;
    const tileMinY = centre.y - 1;
    const tileMaxY = centre.y + 1;

    const tilePromises: Promise<{
      buffer: ArrayBuffer;
      x: number;
      y: number;
    }>[] = [];
    for (let tx = tileMinX; tx <= tileMaxX; tx++) {
      for (let ty = tileMinY; ty <= tileMaxY; ty++) {
        tilePromises.push(
          fetchTile(ZOOM, tx, ty, env.MAPBOX_ACCESS_TOKEN).then((buffer) => ({
            buffer,
            x: tx,
            y: ty,
          })),
        );
      }
    }

    const tiles = await Promise.all(tilePromises);
    const allBuildings = tiles.flatMap(({ buffer, x, y }) =>
      parseBuildingsFromTile(buffer, ZOOM, x, y),
    );

    const swBbox = tileBBox(tileMinX, tileMaxY, ZOOM);
    const neBbox = tileBBox(tileMaxX, tileMinY, ZOOM);
    const widthMetres =
      (neBbox.east - swBbox.west) *
      111320 *
      Math.cos((city.center.lat * Math.PI) / 180);
    const heightMetres = (neBbox.north - swBbox.south) * 111320;

    const meta: GridMeta = {
      origin: { lat: swBbox.south, lng: swBbox.west },
      rows: Math.ceil(heightMetres / city.cellSize),
      cols: Math.ceil(widthMetres / city.cellSize),
      cellSize: city.cellSize,
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
