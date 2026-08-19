// src/lib/raycaster/renderer.ts
import {
  buildingRGB,
  cellNoise,
  luminanceToChar,
  MAX_RENDER_DIST,
  windowLevel,
} from "@/lib/raycaster/chars";
import type { FrameData } from "@/lib/raycaster/engine";

const CHAR_W = 5;
const CHAR_H = 9;

type Ctx = CanvasRenderingContext2D;

// Grid line half-width in world units, grown with distance so joints stay
// ~1 cell wide on screen instead of collapsing to nothing near the horizon.
function gridLine(wx: number, wy: number, floorDist: number): number {
  const fx = wx - Math.floor(wx);
  const fy = wy - Math.floor(wy);
  const dLine = Math.min(fx, 1 - fx, fy, 1 - fy);
  const halfWidth = Math.min(0.42, 0.015 + floorDist * 0.014);
  if (dLine > halfWidth) {
    return 0;
  }
  return 1 - dLine / halfWidth; // 1 at the line centre, 0 at its edge
}

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

  // Perspective fade — brightest underfoot, dimming with distance but never to
  // pure black, so the street stays readable against the void.
  const fade = Math.max(0.16, 1 - floorDist / 24);
  // Base asphalt with world-space grain that stays put as the camera moves…
  const grain = cellNoise(Math.floor(wx * 3), Math.floor(wy * 3));
  // …and a brighter scaffold along the cell/street grid lines.
  const line = gridLine(wx, wy, floorDist);
  const lum = fade * (0.32 + grain * 0.18 + line * 0.5);

  const g = Math.round(20 + lum * 170);
  ctx.fillStyle = `rgb(${g},${g},${g})`;
  ctx.fillText(luminanceToChar(lum), x, row * CHAR_H);
}

// Real-world building structure (metres)
const FLOOR_HEIGHT_M = 4; // one storey
const SPANDREL_FRAC = 0.3; // bottom of each storey is the concrete slab
const BAY_WIDTH_M = 3.5; // horizontal window bay
const MULLION_FRAC = 0.16; // edge of each bay is a mullion

function drawColumn(
  ctx: Ctx,
  data: FrameData,
  x: number,
  rows: number,
  camX: number,
  camY: number,
  horizon: number,
  cellSize: number,
): void {
  const {
    wallTop,
    charHeight,
    distance,
    face,
    mapX,
    mapY,
    rayAngle,
    wallU,
    heightInCells,
  } = data;
  const wallBottom = wallTop + charHeight;
  const [br, bg, bb] = buildingRGB(mapX, mapY);
  const buildingHeightM = heightInCells * cellSize;

  // Neutral directional light gives each face form without a hard night look.
  const faceShade = face === "NS" ? 1 : 0.78;
  // Depth cue against the black void: distant surfaces dim but never to zero,
  // so far buildings stay legible instead of dissolving into the background.
  const depth = 0.4 + 0.6 * Math.max(0, 1 - distance / MAX_RENDER_DIST);

  const col = Math.round(x / CHAR_W);
  const bayPosRaw = (wallU * cellSize) / BAY_WIDTH_M;
  const bayIdx = Math.floor(bayPosRaw);
  const bayPos = ((bayPosRaw % 1) + 1) % 1;
  const onMullion = bayPos < MULLION_FRAC;

  for (let row = 0; row < rows; row++) {
    if (row >= wallTop && row < wallBottom) {
      const fracFromTop = (row - wallTop) / Math.max(1, charHeight);
      const heightM = (1 - fracFromTop) * buildingHeightM;
      const floorIdx = Math.floor(heightM / FLOOR_HEIGHT_M);
      const withinFloor = (heightM / FLOOR_HEIGHT_M) % 1;
      const isSpandrel = withinFloor < SPANDREL_FRAC;
      const structural = isSpandrel || onMullion;

      // Concrete slab/mullion reads as matte; glass panes vary pane-to-pane.
      const base = structural
        ? 0.55
        : windowLevel(mapX, mapY, floorIdx, bayIdx);

      // Per-cell dither breaks the quantised "lego brick" blocks into grain.
      const dither = (cellNoise(col, row) - 0.5) * 0.14;
      const surf = Math.max(0, Math.min(1, faceShade * depth * base + dither));
      // Gamma < 1 lifts the midtones so facades read bright and detailed
      // against black without clipping the highlights.
      const luminance = surf ** 0.7;

      const r = Math.round(br * luminance);
      const g = Math.round(bg * luminance);
      const b = Math.round(bb * luminance);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillText(luminanceToChar(luminance), x, row * CHAR_H);
    } else if (row > horizon) {
      drawFloorRow(ctx, x, row, rayAngle, horizon, camX, camY);
    }
    // sky rows: leave black
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
  cellSize = 10,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  // Pure black void — buildings and street are drawn over it; sky stays black.
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
      drawColumn(ctx, data, x, rows, camX, camY, horizon, cellSize);
    } else {
      // No wall hit — street below the horizon, black sky above.
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
