import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchOsmBuildings } from "@/lib/osm/buildings";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

const makeResponse = (elements: unknown[]) =>
  ({
    ok: true,
    json: () => Promise.resolve({ elements }),
    text: () => Promise.resolve(""),
  }) as unknown as Response;

describe("fetchOsmBuildings", () => {
  it("posts to the Overpass API with a bbox query", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse([]));
    await fetchOsmBuildings(40.75, -74, 40.76, -73.99);
    const calledUrl = vi.mocked(fetch).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("overpass-api.de");
    expect(decodeURIComponent(calledUrl)).toContain("40.75,-74,40.76,-73.99");
  });

  it("throws when all mirrors return error status", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("rate limited"),
    } as unknown as Response);
    await expect(fetchOsmBuildings(0, 0, 1, 1)).rejects.toThrow("all mirrors");
  });

  it("maps way geometry to polygonLatLng rings", async () => {
    const way = {
      type: "way",
      geometry: [
        { lat: 40.75, lon: -74 },
        { lat: 40.751, lon: -74 },
        { lat: 40.751, lon: -73.99 },
        { lat: 40.75, lon: -73.99 },
        { lat: 40.75, lon: -74 },
      ],
      tags: { building: "yes", height: "42.5" },
    };
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse([way]));
    const buildings = await fetchOsmBuildings(40.74, -74.01, 40.76, -73.98);
    expect(buildings).toHaveLength(1);
    expect(buildings[0]?.height).toBe(42.5);
    expect(buildings[0]?.polygonLatLng[0]?.[0]).toEqual([40.75, -74]);
  });

  it("falls back to building:levels when height tag is absent", async () => {
    const way = {
      type: "way",
      geometry: Array.from({ length: 4 }, () => ({ lat: 0, lon: 0 })),
      tags: { building: "yes", "building:levels": "10" },
    };
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse([way]));
    const [b] = await fetchOsmBuildings(0, 0, 1, 1);
    expect(b?.height).toBe(35); // 10 * 3.5
  });

  it("uses default height when no height tags are present", async () => {
    const way = {
      type: "way",
      geometry: Array.from({ length: 4 }, () => ({ lat: 0, lon: 0 })),
      tags: { building: "yes" },
    };
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse([way]));
    const [b] = await fetchOsmBuildings(0, 0, 1, 1);
    expect(b?.height).toBe(10);
  });

  it("skips ways with fewer than 4 geometry nodes", async () => {
    const way = {
      type: "way",
      geometry: [
        { lat: 0, lon: 0 },
        { lat: 1, lon: 1 },
        { lat: 0, lon: 1 },
      ],
      tags: { building: "yes" },
    };
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse([way]));
    const result = await fetchOsmBuildings(0, 0, 1, 1);
    expect(result).toHaveLength(0);
  });
});
