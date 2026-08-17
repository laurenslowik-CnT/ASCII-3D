import { describe, expect, it, vi } from "vitest";

import type { FrameData } from "@/lib/raycaster/engine";
import { canvasDimensions, renderFrame } from "@/lib/raycaster/renderer";

function makeCanvas() {
  const ctx = {
    fillStyle: "" as string,
    font: "" as string,
    fillRect: vi.fn(),
    fillText: vi.fn(),
  };
  const canvas = {
    width: 800,
    height: 400,
    getContext: vi.fn().mockReturnValue(ctx),
    offsetWidth: 800,
    offsetHeight: 400,
  } as unknown as HTMLCanvasElement;
  return { canvas, ctx };
}

describe("renderFrame", () => {
  it("calls fillRect to clear the canvas", () => {
    const { canvas, ctx } = makeCanvas();
    const frameData: (FrameData | null)[] = [null, null];
    renderFrame(frameData, canvas, 2, 10);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 400);
  });

  it("calls fillText for a wall hit", () => {
    const { canvas, ctx } = makeCanvas();
    const frameData: (FrameData | null)[] = [
      {
        charHeight: 5,
        wallTop: 2,
        distance: 3,
        face: "NS",
        cell: { type: "building", height: 10 },
      },
    ];
    renderFrame(frameData, canvas, 1, 10);
    expect(ctx.fillText).toHaveBeenCalled();
  });
});

describe("canvasDimensions", () => {
  it("computes cols and rows from canvas size", () => {
    const { canvas } = makeCanvas();
    const { cols, rows } = canvasDimensions(canvas);
    expect(cols).toBe(80); // 800 / 10
    expect(rows).toBe(25); // 400 / 16
  });
});
