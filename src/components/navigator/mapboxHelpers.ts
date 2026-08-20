import type mapboxgl from "mapbox-gl";

import { framebufferToAscii, legibleColor } from "@/lib/raycaster/asciify";

const CHAR_W = 10;
const CHAR_H = 9;
const PAN_PIXELS = 7;
const ROTATE_DEG = 2;
const PITCH_DEG = 1.5;

export function asciifyMapInto(
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
        const [r, g, b] = legibleColor(cell.r, cell.g, cell.b);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillText(cell.char, cx * CHAR_W, cy * CHAR_H);
      }
    }
  }
}

export function applyKeys(
  map: mapboxgl.Map,
  pressed: ReadonlySet<string>,
): void {
  const pan = (dx: number, dy: number) => {
    map.panBy([dx, dy], { duration: 0 });
  };
  if (pressed.has("ArrowUp") || pressed.has("w")) {
    pan(0, -PAN_PIXELS);
  }
  if (pressed.has("ArrowDown") || pressed.has("s")) {
    pan(0, PAN_PIXELS);
  }
  if (pressed.has("a")) {
    pan(-PAN_PIXELS, 0);
  }
  if (pressed.has("d")) {
    pan(PAN_PIXELS, 0);
  }
  if (pressed.has("ArrowLeft")) {
    map.setBearing(map.getBearing() - ROTATE_DEG);
  }
  if (pressed.has("ArrowRight")) {
    map.setBearing(map.getBearing() + ROTATE_DEG);
  }
  if (pressed.has("q")) {
    map.setPitch(Math.min(85, map.getPitch() + PITCH_DEG));
  }
  if (pressed.has("e")) {
    map.setPitch(Math.max(0, map.getPitch() - PITCH_DEG));
  }
}

export function addBuildingsLayer(
  map: mapboxgl.Map,
  onError: (message: string) => void,
): void {
  if (map.getLayer("ascii-3d-buildings")) {
    return;
  }
  try {
    if (!map.getSource("ascii-streets")) {
      map.addSource("ascii-streets", {
        type: "vector",
        url: "mapbox://mapbox.mapbox-streets-v8",
      });
    }
    map.addLayer({
      id: "ascii-3d-buildings",
      type: "fill-extrusion",
      source: "ascii-streets",
      "source-layer": "building",
      minzoom: 14,
      filter: ["==", ["get", "extrude"], "true"],
      paint: {
        // Warm ramp by height so buildings read as a distinct hue against the
        // cool/grey streets and water — colour, not just tone, separates them.
        "fill-extrusion-color": [
          "interpolate",
          ["linear"],
          ["get", "height"],
          0,
          "#5c3a1e",
          40,
          "#b06a2c",
          120,
          "#e0a24e",
          300,
          "#f6e0a8",
        ],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": ["get", "min_height"],
        "fill-extrusion-opacity": 1,
        "fill-extrusion-vertical-gradient": true,
        "fill-extrusion-ambient-occlusion-intensity": 0.4,
        "fill-extrusion-ambient-occlusion-radius": 3,
      },
    });
    // Strong, low-angle directional light so building faces catch distinctly
    // different amounts of light (front bright, sides dark) — that per-face
    // contrast is what gives the ASCII its varied glyphs instead of flat blocks.
    map.setLight({
      anchor: "viewport",
      color: "#ffffff",
      intensity: 0.6,
      position: [1.4, 210, 78],
    });
  } catch {
    onError(
      "This Mapbox style has no vector building source — use a Mapbox Streets-based style for 3D buildings.",
    );
  }
}
