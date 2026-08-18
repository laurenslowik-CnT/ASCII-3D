#!/usr/bin/env node
// scripts/download-buildings.mjs
// Downloads Manhattan building polygons from OSM via Overpass and saves them
// as a static JSON file used by the /api/grid route at runtime.
//
// Usage: node scripts/download-buildings.mjs

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const WEST = -74.02;
const EAST = -73.907;
const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const UA = "ASCII-3D-Navigator/1.0 (one-time static data download)";

// Three horizontal strips cover all of Manhattan without overloading Overpass.
const STRIPS = [
  { south: 40.7, north: 40.75 },   // Battery Park → Times Square
  { south: 40.75, north: 40.81 },  // Midtown → Upper West/East Side
  { south: 40.81, north: 40.882 }, // Harlem → Inwood
];

function parseHeight(v) {
  if (!v) return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

async function fetchStrip({ south, north }) {
  const bbox = `${south},${WEST},${north},${EAST}`;
  const query = `[out:json][timeout:90];way["building"](${bbox});out geom;`;

  for (const mirror of MIRRORS) {
    try {
      console.log(`  Trying ${mirror}...`);
      const res = await fetch(`${mirror}?data=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(100_000),
      });
      if (res.ok) {
        const json = await res.json();
        return json.elements ?? [];
      }
      console.warn(`  → ${res.status} from ${mirror}`);
    } catch (e) {
      console.warn(`  → ${mirror} error: ${e.message}`);
    }
  }
  throw new Error(`All mirrors failed for strip ${south}–${north}`);
}

async function main() {
  const seen = new Set();
  const buildings = [];

  for (const strip of STRIPS) {
    console.log(`\nStrip ${strip.south} → ${strip.north}`);
    const elements = await fetchStrip(strip);
    let added = 0;

    for (const el of elements) {
      if (el.type !== "way" || seen.has(el.id)) continue;
      if (!el.geometry || el.geometry.length < 4) continue;
      seen.add(el.id);

      const tags = el.tags ?? {};
      const height =
        parseHeight(tags.height) ||
        parseHeight(tags["building:levels"]) * 3.5 ||
        10;
      const minHeight = parseHeight(tags.min_height);
      const ring = el.geometry.map(({ lat, lon }) => [lat, lon]);

      buildings.push({ polygonLatLng: [ring], height, minHeight });
      added++;
    }

    console.log(`  → ${added} buildings added (${buildings.length} total)`);
  }

  const outDir = join(process.cwd(), "public", "data");
  mkdirSync(outDir, { recursive: true });

  const outPath = join(outDir, "manhattan-buildings.json");
  const payload = {
    generated: new Date().toISOString(),
    source: "OpenStreetMap contributors via Overpass API (ODbL)",
    bbox: { south: 40.7, west: WEST, north: 40.882, east: EAST },
    buildings,
  };

  writeFileSync(outPath, JSON.stringify(payload));
  const sizeMB = (JSON.stringify(payload).length / 1_048_576).toFixed(1);
  console.log(`\nSaved ${buildings.length.toLocaleString()} buildings → ${outPath} (${sizeMB} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
