// src/app/api/route/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as z from "zod";

import { env } from "@/env";
import { fetchRoute } from "@/lib/google/routes";

const BodySchema = z.object({
  origin: z.object({ lat: z.number(), lng: z.number() }),
  destination: z.object({ lat: z.number(), lng: z.number() }),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "origin and destination must have lat and lng" },
      { status: 400 },
    );
  }

  const { origin, destination } = parsed.data;

  try {
    const route = await fetchRoute(
      origin,
      destination,
      env.GOOGLE_MAPS_API_KEY,
    );
    return NextResponse.json(route);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Routing failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
