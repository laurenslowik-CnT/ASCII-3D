// src/lib/mapbox/tiles.ts
import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";

import { tileBBox } from "@/lib/grid/coords";

export type TileBuilding = {
  polygonLatLng: [number, number][][]; // array of rings, each ring is [lat, lng][]
  height: number;
  minHeight: number;
};

export async function fetchTile(
  z: number,
  x: number,
  y: number,
  accessToken: string,
): Promise<ArrayBuffer> {
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${z}/${x}/${y}.mvt?access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Mapbox tile fetch failed: ${res.status}`);
  }
  return res.arrayBuffer();
}

function toLatLng(
  tx: number,
  ty: number,
  extent: number,
  bbox: { north: number; south: number; west: number; east: number },
): [number, number] {
  const lat = bbox.north - (ty / extent) * (bbox.north - bbox.south);
  const lng = bbox.west + (tx / extent) * (bbox.east - bbox.west);
  return [lat, lng];
}

export function parseBuildingsFromTile(
  buffer: ArrayBuffer,
  z: number,
  x: number,
  y: number,
): TileBuilding[] {
  if (buffer.byteLength === 0) {
    return [];
  }

  let tile: VectorTile;
  try {
    tile = new VectorTile(new PbfReader(buffer));
  } catch {
    return [];
  }

  const layer = tile.layers.building;
  if (!layer) {
    return [];
  }

  const bbox = tileBBox(x, y, z);
  const extent = layer.extent ?? 4096;
  const buildings: TileBuilding[] = [];

  for (let i = 0; i < layer.length; i++) {
    const feature = layer.feature(i);
    const props = feature.properties;
    if (props.extrude) {
      const height = Number(props.height ?? 10);
      const minHeight = Number(props.min_height ?? 0);

      const geom = feature.loadGeometry();
      const rings: [number, number][][] = geom.map((ring) =>
        ring.map(({ x: tx, y: ty }) => toLatLng(tx, ty, extent, bbox)),
      );

      buildings.push({ polygonLatLng: rings, height, minHeight });
    }
  }

  return buildings;
}
