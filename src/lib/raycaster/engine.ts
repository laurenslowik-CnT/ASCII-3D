// src/lib/raycaster/engine.ts
import type { Grid } from "@/lib/grid/types";
import { MAX_RENDER_DIST } from "@/lib/raycaster/chars";

export type RayHit = {
  distance: number;
  face: "NS" | "EW";
  cellHeight: number;
  mapX: number;
  mapY: number;
};

type DDAState = {
  mapX: number;
  mapY: number;
  sideDistX: number;
  sideDistY: number;
  deltaDistX: number;
  deltaDistY: number;
  stepX: number;
  stepY: number;
};

function initDDA(
  pos: { x: number; y: number },
  rayDirX: number,
  rayDirY: number,
): DDAState {
  const mapX = Math.floor(pos.x);
  const mapY = Math.floor(pos.y);
  const deltaDistX = Math.abs(1 / (rayDirX === 0 ? 1e-10 : rayDirX));
  const deltaDistY = Math.abs(1 / (rayDirY === 0 ? 1e-10 : rayDirY));
  const stepX = rayDirX < 0 ? -1 : 1;
  const stepY = rayDirY < 0 ? -1 : 1;
  const sideDistX =
    rayDirX < 0 ? (pos.x - mapX) * deltaDistX : (mapX + 1 - pos.x) * deltaDistX;
  const sideDistY =
    rayDirY < 0 ? (pos.y - mapY) * deltaDistY : (mapY + 1 - pos.y) * deltaDistY;
  return {
    mapX,
    mapY,
    sideDistX,
    sideDistY,
    deltaDistX,
    deltaDistY,
    stepX,
    stepY,
  };
}

function stepDDA(state: DDAState): "EW" | "NS" {
  if (state.sideDistX < state.sideDistY) {
    state.sideDistX += state.deltaDistX;
    state.mapX += state.stepX;
    return "EW";
  }
  state.sideDistY += state.deltaDistY;
  state.mapY += state.stepY;
  return "NS";
}

function resolveHit(
  state: DDAState,
  face: "EW" | "NS",
  cellHeight: number,
  mapX: number,
  mapY: number,
): RayHit | null {
  const distance =
    face === "EW"
      ? state.sideDistX - state.deltaDistX
      : state.sideDistY - state.deltaDistY;
  if (distance > MAX_RENDER_DIST) {
    return null;
  }
  return { distance, face, cellHeight, mapX, mapY };
}

export function castRay(
  pos: { x: number; y: number },
  angle: number,
  grid: Grid,
): RayHit | null {
  const { rows, cols, data } = grid;
  const state = initDDA(pos, Math.cos(angle), Math.sin(angle));

  for (let steps = 0; steps < MAX_RENDER_DIST * 2; steps++) {
    const face = stepDDA(state);
    const { mapX, mapY } = state;

    if (mapX < 0 || mapY < 0 || mapX >= cols || mapY >= rows) {
      return null;
    }

    const cellHeight = data[mapY * cols + mapX] ?? 0;
    if (cellHeight > 0) {
      return resolveHit(state, face, cellHeight, mapX, mapY);
    }
  }

  return null;
}

export type FrameData = {
  charHeight: number;
  wallTop: number;
  distance: number;
  face: "NS" | "EW";
  cellHeight: number;
  wallU: number;
  heightInCells: number;
  rayAngle: number;
};

export function buildFrameData(
  camera: { x: number; y: number; angle: number; fov: number; pitch: number },
  grid: Grid,
  cols: number,
  rows: number,
  cellSize: number,
): (FrameData | null)[] {
  const horizon = rows / 2 + camera.pitch;

  return Array.from({ length: cols }, (_, col) => {
    const rayAngle = camera.angle - camera.fov / 2 + (col / cols) * camera.fov;
    const hit = castRay({ x: camera.x, y: camera.y }, rayAngle, grid);
    if (!hit) {
      return null;
    }

    const correctedDist = hit.distance * Math.cos(rayAngle - camera.angle);
    const heightInCells = hit.cellHeight / cellSize;
    const wallHeight = Math.min(
      rows * 2,
      Math.floor((rows * heightInCells) / correctedDist),
    );
    const wallTop = Math.floor(horizon - wallHeight / 2);

    const hitX = camera.x + hit.distance * Math.cos(rayAngle);
    const hitY = camera.y + hit.distance * Math.sin(rayAngle);
    const wallU =
      hit.face === "EW" ? hitY - Math.floor(hitY) : hitX - Math.floor(hitX);

    return {
      charHeight: wallHeight,
      wallTop,
      distance: correctedDist,
      face: hit.face,
      cellHeight: hit.cellHeight,
      wallU,
      heightInCells,
      rayAngle,
    };
  });
}
