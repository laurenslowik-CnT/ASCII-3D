// src/lib/raycaster/renderer.ts
import {
  buildingRGB,
  charFromFloor,
  floorColour,
  luminanceToChar,
  MAX_RENDER_DIST,
  shadeRGB,
} from "@/lib/raycaster/chars";
import type { FrameData } from "@/lib/raycaster/engine";
import { FLOOR_TEXTURE, sampleTexture } from "@/lib/raycaster/textures";

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

// Real-world building structure (metres)
const FLOOR_HEIGHT_M = 4; // one storey
const SPANDREL_FRAC = 0.3; // bottom of each storey is the concrete slab
const BAY_WIDTH_M = 3.5; // horizontal window bay
const MULLION_FRAC = 0.16; // edge of each bay is a mullion

function litWindowHash(
  mapX: number,
  mapY: number,
  floorIdx: number,
  bayIdx: number,
): number {
  const h =
    (Math.imul(floorIdx, 73856093) ^
      Math.imul(bayIdx, 19349663) ^
      Math.imul(mapX, 83492791) ^
      Math.imul(mapY, 2971215073)) >>>
    0;
  return h % 100;
}

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
  const rgb = buildingRGB(mapX, mapY);
  const buildingHeightM = heightInCells * cellSize;

  // Directional light: faces pointing one way are brighter than the other.
  const faceShade = face === "NS" ? 1 : 0.72;
  // Distance fog — never fully black so far buildings still read.
  const fog = 0.24 + 0.76 * Math.max(0, 1 - distance / MAX_RENDER_DIST);

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

      // Structural darkening: slabs and mullions read as darker luminance.
      const structure = isSpandrel || onMullion ? 0.42 : 1;

      // Some windows are lit — scattered warm glow, the cyberpunk-night feel.
      const lit =
        !isSpandrel &&
        !onMullion &&
        litWindowHash(mapX, mapY, floorIdx, bayIdx) < 16;

      let luminance = faceShade * fog * structure;
      let glow = 0;
      if (lit) {
        luminance = Math.min(1, fog * 1.2);
        glow = 0.55;
      }

      // The camera-perspective mapping: brightness picks the glyph.
      ctx.fillStyle = shadeRGB(rgb, Math.min(1, luminance * 1.1), glow);
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
      drawColumn(ctx, data, x, rows, camX, camY, horizon, cellSize);
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
