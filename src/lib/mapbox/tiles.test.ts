import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchTile, parseBuildingsFromTile } from "@/lib/mapbox/tiles";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("fetchTile", () => {
  it("calls the correct Mapbox URL", async () => {
    const mockBuffer = new ArrayBuffer(0);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockBuffer),
    } as Response);

    await fetchTile(16, 19299, 24629, "test-token");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/16/19299/24629.mvt?access_token=test-token",
    );
  });

  it("throws if response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response);

    await expect(fetchTile(16, 0, 0, "bad-token")).rejects.toThrow("401");
  });
});

describe("parseBuildingsFromTile", () => {
  it("returns empty array for empty buffer", () => {
    const result = parseBuildingsFromTile(new Uint8Array(0).buffer, 16, 0, 0);
    expect(result).toEqual([]);
  });
});
