// src/lib/raycaster/renderer.ts
import {
  distanceBand,
  FLOOR,
  SKY,
  WALL_EW,
  WALL_NS,
  wallColour,
} from "@/lib/raycaster/chars";
import type { FrameData } from "@/lib/raycaster/engine";

const CHAR_W = 10; // px per character column
const CHAR_H = 16; // px per character row

type Ctx = CanvasRenderingContext2D;

function drawSky(ctx: Ctx, x: number, row: number, totalRows: number): void {
  const band = Math.min(4, Math.floor((row / totalRows) * 5));
  ctx.fillStyle = "#111";
  ctx.fillText(SKY[band], x, row * CHAR_H);
}

function drawWall(ctx: Ctx, data: FrameData, x: number, row: number): void {
  const band = distanceBand(data.distance);
  const chars = data.face === "NS" ? WALL_NS : WALL_EW;
  ctx.fillStyle = wallColour(data.distance);
  ctx.fillText(chars[band], x, row * CHAR_H);
}

function drawFloor(
  ctx: Ctx,
  x: number,
  row: number,
  wallBottom: number,
  rows: number,
): void {
  const floorRow = row - wallBottom;
  const floorBand = Math.min(
    4,
    Math.floor((floorRow / Math.max(1, rows - wallBottom)) * 5),
  );
  ctx.fillStyle = "#222";
  ctx.fillText(FLOOR[floorBand], x, row * CHAR_H);
}

function drawColumn(ctx: Ctx, data: FrameData, x: number, rows: number): void {
  const wallBottom = data.wallTop + data.charHeight;
  for (let row = 0; row < rows; row++) {
    if (row < data.wallTop) {
      const skyBand = Math.min(
        4,
        Math.floor((row / Math.max(1, data.wallTop)) * 5),
      );
      ctx.fillStyle = "#111";
      ctx.fillText(SKY[skyBand], x, row * CHAR_H);
    } else if (row < wallBottom) {
      drawWall(ctx, data, x, row);
    } else {
      drawFloor(ctx, x, row, wallBottom, rows);
    }
  }
}

function drawEmptyColumn(ctx: Ctx, x: number, rows: number): void {
  for (let row = 0; row < rows; row++) {
    drawSky(ctx, x, row, rows);
  }
}

export function renderFrame(
  frameData: (FrameData | null)[],
  canvas: HTMLCanvasElement,
  cols: number,
  rows: number,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${CHAR_H}px monospace`;

  for (let col = 0; col < cols; col++) {
    const data = frameData[col];
    const x = col * CHAR_W;

    if (data) {
      drawColumn(ctx, data, x, rows);
    } else {
      drawEmptyColumn(ctx, x, rows);
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
