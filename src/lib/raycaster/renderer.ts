// src/lib/raycaster/renderer.ts
import {
  brightnessToChar,
  floorColour,
  SKY,
  skyColour,
  wallColour,
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
  const dimmed = Math.floor(raw * Math.max(0.05, 1 - floorDist / 18));
  const band = Math.min(4, Math.floor(floorDist / 4));
  ctx.fillStyle = floorColour(band);
  ctx.fillText(brightnessToChar(dimmed), x, row * CHAR_H);
}

function drawSkyRow(ctx: Ctx, x: number, row: number, horizon: number): void {
  const band = Math.min(4, Math.floor((row / Math.max(1, horizon)) * 5));
  ctx.fillStyle = skyColour();
  ctx.fillText(SKY[band], x, row * CHAR_H);
}

function drawColumn(
  ctx: Ctx,
  data: FrameData,
  x: number,
  rows: number,
  camX: number,
  camY: number,
  horizon: number,
): void {
  const {
    wallTop,
    charHeight,
    wallU,
    heightInCells,
    distance,
    face,
    cellHeight,
    rayAngle,
  } = data;
  const wallBottom = wallTop + charHeight;
  const tex = selectTexture(cellHeight);

  for (let row = 0; row < rows; row++) {
    if (row >= wallTop && row < wallBottom) {
      const v = ((row - wallTop) / Math.max(1, charHeight)) * heightInCells;
      const brightness = sampleTexture(tex, wallU, v);
      ctx.fillStyle = wallColour(distance, face);
      ctx.fillText(brightnessToChar(brightness), x, row * CHAR_H);
    } else if (row > horizon) {
      drawFloorRow(ctx, x, row, rayAngle, horizon, camX, camY);
    } else {
      drawSkyRow(ctx, x, row, horizon);
    }
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
      drawColumn(ctx, data, x, rows, camX, camY, horizon);
    } else {
      for (let row = 0; row < rows; row++) {
        if (row > horizon) {
          drawFloorRow(ctx, x, row, rayAngle, horizon, camX, camY);
        } else {
          drawSkyRow(ctx, x, row, horizon);
        }
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
