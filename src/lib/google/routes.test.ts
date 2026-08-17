import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchRoute } from "@/lib/google/routes";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

const MOCK_RESPONSE = {
  routes: [
    {
      polyline: { encodedPolyline: "abc123" },
      legs: [
        {
          steps: [
            {
              navigationInstruction: {
                instructions: "Head north on 5th Ave",
              },
              distanceMeters: 120,
              endLocation: {
                latLng: { latitude: 40.76, longitude: -73.98 },
              },
            },
          ],
        },
      ],
    },
  ],
};

describe("fetchRoute", () => {
  it("returns steps and a polyline", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_RESPONSE),
    } as Response);

    const result = await fetchRoute(
      { lat: 40.758, lng: -73.985 },
      { lat: 40.762, lng: -73.98 },
      "test-key",
    );

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.instruction).toBe("Head north on 5th Ave");
    expect(result.steps[0]?.distanceMetres).toBe(120);
    expect(result.polyline).toBeDefined();
  });

  it("throws on no routes returned", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ routes: [] }),
    } as Response);

    await expect(
      fetchRoute({ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, "key"),
    ).rejects.toThrow("No routes");
  });
});
