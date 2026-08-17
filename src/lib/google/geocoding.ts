// src/lib/google/geocoding.ts
import { z } from "zod";

import type { LatLng } from "@/lib/grid/types";

export type GeocodeResult = LatLng & { displayName: string };

const googleGeocodeSchema = z.object({
  status: z.string(),
  results: z.array(
    z.object({
      geometry: z.object({
        location: z.object({ lat: z.number(), lng: z.number() }),
      }),
      formatted_address: z.string(),
    }),
  ),
});

export async function geocodeAddress(
  address: string,
  apiKey: string,
): Promise<GeocodeResult> {
  const params = new URLSearchParams({ address, key: apiKey });
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`Geocoding HTTP error: ${res.status}`);
  }

  const data = googleGeocodeSchema.parse(await res.json());

  if (data.status !== "OK" || !data.results[0]) {
    throw new Error(data.status ?? "No results");
  }

  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng, displayName: data.results[0].formatted_address };
}
