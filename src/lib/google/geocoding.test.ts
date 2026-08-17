import { beforeEach, describe, expect, it, vi } from "vitest";

import { geocodeAddress } from "@/lib/google/geocoding";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("geocodeAddress", () => {
  it("returns lat/lng for a valid address", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "OK",
          results: [
            {
              geometry: { location: { lat: 40.7589, lng: -73.9851 } },
              formatted_address: "Times Square, New York, NY",
            },
          ],
        }),
    } as Response);

    const result = await geocodeAddress("Times Square, NYC", "test-key");
    expect(result.lat).toBeCloseTo(40.7589);
    expect(result.lng).toBeCloseTo(-73.9851);
    expect(result.displayName).toBe("Times Square, New York, NY");
  });

  it("throws when status is not OK", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "ZERO_RESULTS", results: [] }),
    } as Response);

    await expect(geocodeAddress("nowhere special", "test-key")).rejects.toThrow(
      "ZERO_RESULTS",
    );
  });
});
