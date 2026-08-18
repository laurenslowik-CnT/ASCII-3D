import { describe, expect, it } from "vitest";

import { distanceBand } from "@/lib/raycaster/chars";

describe("distanceBand", () => {
  it("returns 0 for distance 0", () => expect(distanceBand(0)).toBe(0));
  it("returns 4 for max distance", () => expect(distanceBand(40)).toBe(4));
  it("caps at 4 beyond max", () => expect(distanceBand(100)).toBe(4));
});
