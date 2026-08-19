"use client";

import { useCallback, useEffect, useRef } from "react";

import type { Grid } from "@/lib/grid/types";
import type { Camera } from "@/lib/raycaster/camera";
import { moveCamera, pitchCamera, rotateCamera } from "@/lib/raycaster/camera";
import { buildFrameData } from "@/lib/raycaster/engine";
import { canvasDimensions, renderFrame } from "@/lib/raycaster/renderer";

type Props = {
  readonly grid: Grid;
  readonly camera: Camera;
  readonly cellSize: number;
  readonly onCameraChange: (camera: Camera) => void;
};

const PRESSED = new Set<string>();

export function RaycasterCanvas({
  grid,
  camera,
  cellSize,
  onCameraChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef(camera);
  const gridRef = useRef(grid);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    cameraRef.current = camera;
  });
  useEffect(() => {
    gridRef.current = grid;
  });

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cam = cameraRef.current;
    if (PRESSED.has("ArrowUp") || PRESSED.has("w")) {
      cam = moveCamera(cam, "forward", gridRef.current);
    }
    if (PRESSED.has("ArrowDown") || PRESSED.has("s")) {
      cam = moveCamera(cam, "backward", gridRef.current);
    }
    if (PRESSED.has("ArrowLeft") || PRESSED.has("a")) {
      cam = rotateCamera(cam, "left");
    }
    if (PRESSED.has("ArrowRight") || PRESSED.has("d")) {
      cam = rotateCamera(cam, "right");
    }
    if (PRESSED.has("q")) {
      cam = pitchCamera(cam, "up");
    }
    if (PRESSED.has("e")) {
      cam = pitchCamera(cam, "down");
    }
    if (cam !== cameraRef.current) {
      onCameraChange(cam);
    }

    const { cols, rows } = canvasDimensions(canvas);
    const frameData = buildFrameData(
      cam,
      gridRef.current,
      cols,
      rows,
      cellSize,
    );
    renderFrame(
      frameData,
      canvas,
      cols,
      rows,
      cam.x,
      cam.y,
      cam.pitch,
      cam.angle,
      cam.fov,
      cellSize,
    );

    rafRef.current = requestAnimationFrame(loop);
  }, [onCameraChange, cellSize]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") {
        return;
      }
      PRESSED.add(e.key);
    }
    function onKeyUp(e: KeyboardEvent) {
      PRESSED.delete(e.key);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [loop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block size-full bg-black"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
