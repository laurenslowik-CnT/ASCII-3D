// src/lib/raycaster/renderer.ts
import {
  buildingColour,
  charFromFloor,
  dataStreamChar,
  dimColour,
  floorColour,
} from "@/lib/raycaster/chars";
import type { FrameData } from "@/lib/raycaster/engine";
import {
  FLOOR_TEXTURE,
  sampleTexture,
  selectTexture,
} from "@/lib/raycaster/textures";

const CHAR_W = 5;
const CHAR_H = 9;

type Ctx = CanvasRenderingContext2D;

function drawFloorRow(
  ctx: Ctx,
  x: number,
  row: number,
  rayAngle: number,
  horizon: number,
  camX: number,
  camY: number,
): void {
  const relRow = row - horizon;
  if (relRow <= 0) {
    return;
  }
  const posZ = Math.max(1, horizon);
  const floorDist = posZ / relRow;
  const wx = camX + floorDist * Math.cos(rayAngle);
  const wy = camY + floorDist * Math.sin(rayAngle);
  const u = ((wx % 1) + 1) % 1;
  const v = ((wy % 1) + 1) % 1;
  const raw = sampleTexture(FLOOR_TEXTURE, u, v);
  const dimmed = Math.floor(raw * Math.max(0.04, 1 - floorDist / 16));
  const band = Math.min(4, Math.floor(floorDist / 4));
  ctx.fillStyle = floorColour(band);
  ctx.fillText(charFromFloor(dimmed), x, row * CHAR_H);
}

function drawColumn(
  ctx: Ctx,
  data: FrameData,
  screenCol: number,
  x: number,
  rows: number,
  camX: number,
  camY: number,
  horizon: number,
): void {
  const {
    wallTop,
    charHeight,
    distance,
    mapX,
    mapY,
    rayAngle,
    wallU,
    heightInCells,
    cellHeight,
  } = data;
  const wallBottom = wallTop + charHeight;
  const colour = buildingColour(mapX, mapY, distance);
  const dark = dimColour(colour, 0.35);
  const tex = selectTexture(cellHeight);

  for (let row = 0; row < rows; row++) {
    if (row >= wallTop && row < wallBottom) {
      // Sample the building texture (UV) to get window-vs-spandrel banding.
      const v = ((row - wallTop) / Math.max(1, charHeight)) * heightInCells;
      const brightness = sampleTexture(tex, wallU, v);
      if (brightness > 110) {
        // Window / brick face — bright data-stream glyph in building colour
        ctx.fillStyle = colour;
        ctx.fillText(dataStreamChar(screenCol, row - wallTop), x, row * CHAR_H);
      } else {
        // Spandrel / mortar — dim, sparse char so structure reads as banding
        ctx.fillStyle = dark;
        ctx.fillText(":", x, row * CHAR_H);
      }
    } else if (row > horizon) {
      drawFloorRow(ctx, x, row, rayAngle, horizon, camX, camY);
    }
    // sky rows: leave black (no fillText)
  }
}

export function renderFrame(
  frameData: (FrameData | null)[],
  canvas: HTMLCanvasElement,
  cols: number,
  rows: number,
  camX = 0,
  camY = 0,
  pitch = 0,
  camAngle = 0,
  camFov = Math.PI / 3,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  // Pure black background — sky is never drawn over
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${CHAR_H}px monospace`;
  ctx.textBaseline = "top";

  const horizon = rows / 2 + pitch;

  for (let col = 0; col < cols; col++) {
    const data = frameData[col];
    const x = col * CHAR_W;
    const rayAngle =
      data?.rayAngle ?? camAngle - camFov / 2 + (col / cols) * camFov;

    if (data) {
      drawColumn(ctx, data, col, x, rows, camX, camY, horizon);
    } else {
      // No wall hit — only render floor below horizon, sky stays black
      for (let row = Math.ceil(horizon); row < rows; row++) {
        drawFloorRow(ctx, x, row, rayAngle, horizon, camX, camY);
      }
    }
  }
}

export function canvasDimensions(canvas: HTMLCanvasElement): {
  cols: number;
  rows: number;
} {
  return {
    cols: Math.floor(canvas.width / CHAR_W),
    rows: Math.floor(canvas.height / CHAR_H),
  };
}
