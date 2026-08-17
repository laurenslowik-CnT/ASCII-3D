// src/app/api/geocode/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@/env";
import { geocodeAddress } from "@/lib/google/geocoding";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json(
      { error: "address is required" },
      { status: 400 },
    );
  }

  try {
    const result = await geocodeAddress(address, env.GOOGLE_MAPS_API_KEY);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Geocoding failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
