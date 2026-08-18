import { describe, expect, it } from "vitest";

import {
  BRICK_TEXTURE,
  sampleTexture,
  selectTexture,
  TEX_SIZE,
  WINDOW_TEXTURE,
} from "@/lib/raycaster/textures";

describe("BRICK_TEXTURE", () => {
  it("has correct size", () => {
    expect(BRICK_TEXTURE).toHaveLength(TEX_SIZE * TEX_SIZE);
  });

  it("mortar pixels are darker than brick face pixels", () => {
    const mortar = BRICK_TEXTURE[0] ?? 0;
    const brick = BRICK_TEXTURE[4 * TEX_SIZE + 8] ?? 0;
    expect(brick).toBeGreaterThan(mortar);
  });
});

describe("WINDOW_TEXTURE", () => {
  it("has correct size", () => {
    expect(WINDOW_TEXTURE).toHaveLength(TEX_SIZE * TEX_SIZE);
  });

  it("glass pixels are brighter than spandrel pixels", () => {
    const spandrel = WINDOW_TEXTURE[0] ?? 0;
    const glass = WINDOW_TEXTURE[8 * TEX_SIZE + 16] ?? 0;
    expect(glass).toBeGreaterThan(spandrel);
  });
});

describe("sampleTexture", () => {
  it("clamps u and v to 0..1", () => {
    const a = sampleTexture(BRICK_TEXTURE, 0.5, 0.5);
    const b = sampleTexture(BRICK_TEXTURE, 1.5, 1.5);
    expect(a).toBe(b);
  });

  it("returns a value in 0..255", () => {
    const v = sampleTexture(BRICK_TEXTURE, 0.3, 0.7);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(255);
  });
});

describe("selectTexture", () => {
  it("returns window texture for tall buildings", () => {
    expect(selectTexture(30)).toBe(WINDOW_TEXTURE);
  });

  it("returns brick texture for short buildings", () => {
    expect(selectTexture(10)).toBe(BRICK_TEXTURE);
  });
});
