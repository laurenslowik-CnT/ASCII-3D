"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useRef } from "react";

import { env } from "@/env";
import type { LatLng } from "@/lib/grid/types";

import { addBuildingsLayer, applyKeys, asciifyMapInto } from "./mapboxHelpers";

const PRESSED = new Set<string>();

// Character cell in pixels. A monospace glyph's ink at CHAR_H px is ~5.4 wide
// but only ~0.72·CHAR_H tall, so a 5×9 cell renders real imagery ~1.5× wider
// than tall (vertical "squish"). Widening the horizontal cell to ~8 matches the
// horizontal ink fill to the vertical, so squares read square. Tune CHAR_W if
// the map still looks stretched (larger = taller) or squished (smaller = wider).
// The PHOTO view needs a CLASSIC (Streets-based) style — Mapbox Standard runs
// its own tone-mapping/lighting that washes our custom colours and ignores
// setLight. dark-v11 gives a dark base so warm lit buildings pop on black.
const DEFAULT_STYLE = "mapbox://styles/mapbox/dark-v11";
const ZOOM = 17.2;
const PITCH = 72;

type Props = {
  readonly center: LatLng;
  readonly onError: (message: string) => void;
};

// Drag on the display canvas: horizontal → pan, vertical → pitch.
// Drag down → tilt up (higher pitch); drag up → tilt down. ~150 px ≈ 22°.
function initDrag(
  canvas: HTMLCanvasElement,
  mapRef: { readonly current: mapboxgl.Map | null },
): () => void {
  let dragX: number | null = null;
  let dragY: number | null = null;
  function onMouseDown(e: MouseEvent) {
    dragX = e.clientX;
    dragY = e.clientY;
    canvas.style.cursor = "grabbing";
  }
  function onMouseMove(e: MouseEvent) {
    if (dragX === null || dragY === null) {
      return;
    }
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const dx = e.clientX - dragX;
    const dy = e.clientY - dragY;
    dragX = e.clientX;
    dragY = e.clientY;
    if (dx !== 0) {
      map.panBy([dx, 0], { duration: 0 });
    }
    if (dy !== 0) {
      map.setPitch(Math.max(0, Math.min(85, map.getPitch() + dy * 0.15)));
    }
  }
  function onMouseUp() {
    dragX = null;
    dragY = null;
    canvas.style.cursor = "grab";
  }
  canvas.style.cursor = "grab";
  canvas.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  return () => {
    canvas.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };
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
      maxPitch: 85,
      bearing: 0,
      interactive: false,
      attributionControl: false,
      preserveDrawingBuffer: true,
      antialias: true,
    });
    mapRef.current = map;
    sampleRef.current = document.createElement("canvas");
    map.on("load", () => {
      addBuildingsLayer(map, onErrorRef.current);
      // Resize once the style is up in case layout settled after map creation,
      // so the canvas aspect matches the display (avoids a stretched sample).
      map.resize();
      render();
    });
    map.on("render", render);
    map.on("error", (e) => {
      onErrorRef.current(`Mapbox: ${e.error.message}`);
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [render]);

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
        applyKeys(map, PRESSED);
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

  useEffect(() => {
    const canvas = displayRef.current;
    if (!canvas) {
      return;
    }
    return initDrag(canvas, mapRef);
  }, []);

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
