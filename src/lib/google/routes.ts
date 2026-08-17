// src/lib/google/routes.ts
import { z } from "zod";

import type { LatLng, Route, Step } from "@/lib/grid/types";

function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let b: number;
    do {
      b = (encoded.codePointAt(index++) ?? 0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = (encoded.codePointAt(index++) ?? 0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

const routesApiSchema = z.object({
  routes: z
    .array(
      z.object({
        polyline: z.object({ encodedPolyline: z.string() }),
        legs: z.array(
          z.object({
            steps: z.array(
              z.object({
                navigationInstruction: z
                  .object({ instructions: z.string().optional() })
                  .optional(),
                distanceMeters: z.number().optional(),
                endLocation: z
                  .object({
                    latLng: z
                      .object({
                        latitude: z.number().optional(),
                        longitude: z.number().optional(),
                      })
                      .optional(),
                  })
                  .optional(),
              }),
            ),
          }),
        ),
      }),
    )
    .optional(),
});

export async function fetchRoute(
  origin: LatLng,
  destination: LatLng,
  apiKey: string,
): Promise<Route> {
  const res = await fetch(
    `https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "routes.polyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.endLocation",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: { latitude: origin.lat, longitude: origin.lng },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.lat,
              longitude: destination.lng,
            },
          },
        },
        travelMode: "WALK",
        computeAlternativeRoutes: false,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Routes API error: ${res.status}`);
  }

  const data = routesApiSchema.parse(await res.json());

  const route = data.routes?.[0];
  if (!route) {
    throw new Error("No routes returned");
  }

  const steps: Step[] = route.legs.flatMap((leg) =>
    leg.steps.map((step) => ({
      instruction: step.navigationInstruction?.instructions ?? "",
      distanceMetres: step.distanceMeters ?? 0,
      streetName:
        step.navigationInstruction?.instructions?.split(" on ")[1] ?? "",
    })),
  );

  return {
    polyline: decodePolyline(route.polyline.encodedPolyline),
    steps,
  };
}
