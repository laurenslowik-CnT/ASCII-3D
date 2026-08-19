"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useRef } from "react";

import { env } from "@/env";
import type { LatLng } from "@/lib/grid/types";
import { framebufferToAscii } from "@/lib/raycaster/asciify";

const CHAR_W = 5;
const CHAR_H = 9;
const DEFAULT_STYLE = "mapbox://styles/laurenslowik/cmt0dd8r1001x01qjba6l6gz0";
const ZOOM = 17.2;
const PITCH = 72;
const PAN_PIXELS = 7; // forward/strafe speed per frame
const ROTATE_DEG = 2; // bearing change per frame
const PITCH_DEG = 1.5; // pitch change per frame

type Props = {
  readonly center: LatLng;
  readonly onError: (message: string) => void;
};

const PRESSED = new Set<string>();

// Convert the Mapbox WebGL canvas into coloured ASCII on the display canvas:
// downsample the rendered map into a cols×rows buffer (one pixel per glyph),
// then map each pixel's brightness to a character tinted by its colour.
function asciifyMapInto(
  map: mapboxgl.Map,
  display: HTMLCanvasElement,
  sample: HTMLCanvasElement,
): void {
  const ctx = display.getContext("2d");
  const sctx = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx || !sctx) {
    return;
  }
  const cols = Math.floor(display.width / CHAR_W);
  const rows = Math.floor(display.height / CHAR_H);
  if (cols < 1 || rows < 1) {
    return;
  }
  if (sample.width !== cols || sample.height !== rows) {
    sample.width = cols;
    sample.height = rows;
  }
  // drawImage downsamples the full-res GL canvas, averaging into one px/cell.
  sctx.drawImage(map.getCanvas(), 0, 0, cols, rows);
  const { data } = sctx.getImageData(0, 0, cols, rows);
  const { cells } = framebufferToAscii(data, cols, rows, 1, 1);

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, display.width, display.height);
  ctx.font = `${CHAR_H}px monospace`;
  ctx.textBaseline = "top";
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const cell = cells[cy * cols + cx];
      if (cell && cell.char !== " ") {
        ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`;
        ctx.fillText(cell.char, cx * CHAR_W, cy * CHAR_H);
      }
    }
  }
}

// Apply currently-pressed movement keys to the map camera. Returns true if the
// camera changed (so the caller knows a re-render/asciify is coming).
function applyKeys(map: mapboxgl.Map): boolean {
  let moved = false;
  const pan = (dx: number, dy: number) => {
    map.panBy([dx, dy], { duration: 0 });
    moved = true;
  };
  if (PRESSED.has("ArrowUp") || PRESSED.has("w")) {
    pan(0, -PAN_PIXELS);
  }
  if (PRESSED.has("ArrowDown") || PRESSED.has("s")) {
    pan(0, PAN_PIXELS);
  }
  if (PRESSED.has("a")) {
    pan(-PAN_PIXELS, 0);
  }
  if (PRESSED.has("d")) {
    pan(PAN_PIXELS, 0);
  }
  if (PRESSED.has("ArrowLeft")) {
    map.setBearing(map.getBearing() - ROTATE_DEG);
    moved = true;
  }
  if (PRESSED.has("ArrowRight")) {
    map.setBearing(map.getBearing() + ROTATE_DEG);
    moved = true;
  }
  if (PRESSED.has("q")) {
    map.setPitch(Math.min(85, map.getPitch() + PITCH_DEG));
    moved = true;
  }
  if (PRESSED.has("e")) {
    map.setPitch(Math.max(0, map.getPitch() - PITCH_DEG));
    moved = true;
  }
  return moved;
}

export function MapboxAsciiCanvas({ center, onError }: Props) {
  const displayRef = useRef<HTMLCanvasElement>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const sampleRef = useRef<HTMLCanvasElement | null>(null);
  const onErrorRef = useRef(onError);
  const centerRef = useRef(center);

  useEffect(() => {
    onErrorRef.current = onError;
    centerRef.current = center;
  });

  const render = useCallback(() => {
    const map = mapRef.current;
    const display = displayRef.current;
    const sample = sampleRef.current;
    if (map && display && sample) {
      asciifyMapInto(map, display, sample);
    }
  }, []);

  // Create the Mapbox map once.
  useEffect(() => {
    const token = env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    const container = mapDivRef.current;
    if (!container) {
      return;
    }
    if (!token) {
      onErrorRef.current(
        "Photoreal view needs NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local.",
      );
      return;
    }
    mapboxgl.accessToken = token;
    // centerRef gives the initial position without making the effect depend on
    // `center` — teleport is a separate effect so re-centering never recreates
    // the whole map.
    const start = centerRef.current;
    const map = new mapboxgl.Map({
      container,
      style: env.NEXT_PUBLIC_MAPBOX_STYLE ?? DEFAULT_STYLE,
      center: [start.lng, start.lat],
      zoom: ZOOM,
      pitch: PITCH,
      bearing: 0,
      interactive: false,
      attributionControl: false,
      preserveDrawingBuffer: true,
      antialias: true,
    });
    mapRef.current = map;
    sampleRef.current = document.createElement("canvas");
    map.on("render", render);
    map.on("error", (e) => {
      onErrorRef.current(`Mapbox: ${e.error.message}`);
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [render]);

  // Teleport when the address (center) changes.
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: [center.lng, center.lat],
        zoom: ZOOM,
        duration: 900,
      });
    }
  }, [center.lat, center.lng]);

  // Drive the camera from the keyboard.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") {
        return;
      }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
      }
      PRESSED.add(e.key);
    }
    function onKeyUp(e: KeyboardEvent) {
      PRESSED.delete(e.key);
    }
    let raf = 0;
    const loop = () => {
      const map = mapRef.current;
      if (map) {
        applyKeys(map);
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Keep both canvases sized to the viewport.
  useEffect(() => {
    const display = displayRef.current;
    const container = mapDivRef.current;
    if (!display || !container) {
      return;
    }
    const observer = new ResizeObserver(() => {
      display.width = display.offsetWidth;
      display.height = display.offsetHeight;
      mapRef.current?.resize();
      render();
    });
    observer.observe(display);
    return () => {
      observer.disconnect();
    };
  }, [render]);

  return (
    <div className="relative size-full bg-black">
      {/* Live Mapbox render, kept offscreen behind the ASCII output. */}
      <div
        ref={mapDivRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0"
      />
      <canvas
        ref={displayRef}
        className="absolute inset-0 block size-full bg-black"
        style={{ imageRendering: "pixelated" }}
      />
      <span className="absolute right-1 bottom-1 z-10 font-mono text-[10px] text-white/40">
        © Mapbox © OpenStreetMap
      </span>
    </div>
  );
}
