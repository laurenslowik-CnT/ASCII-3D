// src/components/navigator/OverheadCanvas.tsx
"use client";

import { useEffect, useRef } from "react";

import type { Grid } from "@/lib/grid/types";
import type { Camera } from "@/lib/raycaster/camera";
import {
  OVERHEAD_BUILDING,
  OVERHEAD_CAMERA,
  OVERHEAD_EMPTY,
  OVERHEAD_ROUTE,
} from "@/lib/raycaster/chars";

type RouteCell = { col: number; row: number };

type Props = {
  readonly grid: Grid;
  readonly camera: Camera;
  readonly routeCells: RouteCell[];
};

const CELL_PX = 6;

function cellChar(
  row: number,
  col: number,
  camRow: number,
  camCol: number,
  routeSet: Set<string>,
  grid: Grid,
): { char: string; colour: string } {
  if (row === camRow && col === camCol) {
    return { char: OVERHEAD_CAMERA, colour: "#00ff00" };
  }
  if (routeSet.has(`${row},${col}`)) {
    return { char: OVERHEAD_ROUTE, colour: "#00aa00" };
  }
  const h = grid.data[row * grid.cols + col] ?? 0;
  if (h > 0) {
    return { char: OVERHEAD_BUILDING, colour: "#555" };
  }
  return { char: OVERHEAD_EMPTY, colour: "#111" };
}

export function OverheadCanvas({ grid, camera, routeCells }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    canvas.width = grid.cols * CELL_PX;
    canvas.height = grid.rows * CELL_PX;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${CELL_PX * 1.2}px monospace`;

    const routeSet = new Set(routeCells.map(({ row, col }) => `${row},${col}`));
    const camRow = Math.floor(camera.y);
    const camCol = Math.floor(camera.x);

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const { char, colour } = cellChar(
          row,
          col,
          camRow,
          camCol,
          routeSet,
          grid,
        );
        ctx.fillStyle = colour;
        ctx.fillText(char, col * CELL_PX, row * CELL_PX + CELL_PX);
      }
    }
  }, [grid, camera, routeCells]);

  return (
    <canvas
      ref={canvasRef}
      className="block size-full bg-black object-contain"
    />
  );
}
