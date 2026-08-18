// src/lib/raycaster/camera.ts
import type { Grid } from "@/lib/grid/types";

export type Camera = {
  x: number;
  y: number;
  angle: number;
  fov: number;
  pitch: number;
};

const MOVE_SPEED = 0.05;
const ROTATE_SPEED = 0.04;
const PITCH_STEP = 4;
const MAX_PITCH = 100;

export function createCamera(x: number, y: number, angle: number): Camera {
  return { x, y, angle, fov: Math.PI / 3, pitch: 0 };
}

function isPassable(x: number, y: number, grid: Grid): boolean {
  const col = Math.floor(x);
  const row = Math.floor(y);
  if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols) {
    return false;
  }
  return grid.data[row * grid.cols + col] === 0;
}

export function moveCamera(
  camera: Camera,
  direction: "forward" | "backward" | "left" | "right",
  grid: Grid,
): Camera {
  const angles: Record<typeof direction, number> = {
    forward: camera.angle,
    backward: camera.angle + Math.PI,
    left: camera.angle - Math.PI / 2,
    right: camera.angle + Math.PI / 2,
  };
  const moveAngle = angles[direction];
  const newX = camera.x + Math.cos(moveAngle) * MOVE_SPEED;
  const newY = camera.y + Math.sin(moveAngle) * MOVE_SPEED;
  return {
    ...camera,
    x: isPassable(newX, camera.y, grid) ? newX : camera.x,
    y: isPassable(camera.x, newY, grid) ? newY : camera.y,
  };
}

export function rotateCamera(
  camera: Camera,
  direction: "left" | "right",
): Camera {
  const delta = direction === "right" ? ROTATE_SPEED : -ROTATE_SPEED;
  return { ...camera, angle: camera.angle + delta };
}

export function pitchCamera(camera: Camera, direction: "up" | "down"): Camera {
  const delta = direction === "up" ? PITCH_STEP : -PITCH_STEP;
  return {
    ...camera,
    pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, camera.pitch + delta)),
  };
}

export function advanceCameraAlongRoute(
  camera: Camera,
  routeCells: { col: number; row: number }[],
  stepIndex: number,
): { camera: Camera; nextStepIndex: number } {
  const target = routeCells[stepIndex];
  if (!target) {
    return { camera, nextStepIndex: stepIndex };
  }
  const targetX = target.col + 0.5;
  const targetY = target.row + 0.5;
  const dx = targetX - camera.x;
  const dy = targetY - camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.1) {
    return {
      camera,
      nextStepIndex: Math.min(stepIndex + 1, routeCells.length - 1),
    };
  }
  const speed = Math.min(MOVE_SPEED, dist);
  const angle = Math.atan2(dy, dx);
  return {
    camera: {
      ...camera,
      x: camera.x + (dx / dist) * speed,
      y: camera.y + (dy / dist) * speed,
      angle,
    },
    nextStepIndex: stepIndex,
  };
}
