"use client";

import { useCallback, useEffect, useState } from "react";
import * as z from "zod";

import { latLngToCell } from "@/lib/grid/coords";
import type { Grid, GridMeta, LatLng } from "@/lib/grid/types";
import type { Camera } from "@/lib/raycaster/camera";

import { AddressSearch } from "./AddressSearch";
import { NavigatorProvider, useNavigator } from "./NavigatorContext";
import { OverheadCanvas } from "./OverheadCanvas";
import { RaycasterCanvas } from "./RaycasterCanvas";
import { ViewToggle } from "./ViewToggle";

// ── Zod schemas ────────────────────────────────────────────────────────────────

const latLngSchema = z.object({ lat: z.number(), lng: z.number() });

const gridMetaSchema = z.object({
  origin: latLngSchema,
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
  cellSize: z.number().positive(),
});

const gridResponseSchema = z.object({
  heights: z.array(z.number().int()),
  meta: gridMetaSchema,
});

// ── API helpers ────────────────────────────────────────────────────────────────

async function loadGrid(): Promise<{ grid: Grid; meta: GridMeta }> {
  const res = await fetch("/api/grid?city=nyc");
  if (!res.ok) {
    throw new Error(`Grid fetch failed: ${res.status}`);
  }
  const { heights, meta } = gridResponseSchema.parse(await res.json());
  const grid: Grid = {
    data: Int16Array.from(heights),
    rows: meta.rows,
    cols: meta.cols,
  };
  return { grid, meta };
}

async function geocodeOne(address: string): Promise<LatLng> {
  const res = await fetch(
    `/api/geocode?address=${encodeURIComponent(address)}`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const parsed = z.object({ error: z.string().optional() }).safeParse(body);
    const msg = parsed.success
      ? (parsed.data.error ?? `${res.status}`)
      : `${res.status}`;
    throw new Error(`Geocode failed: ${msg}`);
  }
  return latLngSchema.parse(await res.json());
}

// ── Error banner ───────────────────────────────────────────────────────────────

function ErrorBanner({ error }: { readonly error: string | null }) {
  if (!error) {
    return null;
  }
  return (
    <div className="absolute top-16 left-4 z-20 max-w-sm rounded-sm border border-red-700 bg-black/90 px-3 py-2 font-mono text-sm text-red-400">
      {error}
    </div>
  );
}

// ── Canvas layer ───────────────────────────────────────────────────────────────

function CanvasLayer({ grid }: { readonly grid: Grid }) {
  const { state, dispatch } = useNavigator();
  const cellSize = state.gridMeta?.cellSize ?? 4;

  const handleCameraChange = useCallback(
    (camera: Camera) => {
      dispatch({ type: "SET_CAMERA", camera });
    },
    [dispatch],
  );

  if (state.view === "firstperson") {
    return (
      <RaycasterCanvas
        grid={grid}
        camera={state.camera}
        cellSize={cellSize}
        onCameraChange={handleCameraChange}
      />
    );
  }
  return <OverheadCanvas grid={grid} camera={state.camera} routeCells={[]} />;
}

// ── Grid fetch hook ────────────────────────────────────────────────────────────

function useGridLoader() {
  const { dispatch } = useNavigator();

  useEffect(() => {
    let cancelled = false;
    loadGrid()
      .then(({ grid, meta }) => {
        if (cancelled) {
          return;
        }
        dispatch({ type: "SET_GRID", grid, meta });
        dispatch({
          type: "SET_CAMERA",
          camera: {
            x: Math.floor(meta.cols / 2) + 0.5,
            y: Math.floor(meta.rows / 2) + 0.5,
            angle: 0,
            fov: (Math.PI * 5) / 12,
          },
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Failed to load city";
        dispatch({ type: "SET_ERROR", error: message });
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);
}

// ── Inner (reads context) ──────────────────────────────────────────────────────

function NavigatorInner() {
  const { state, dispatch } = useNavigator();
  const [isLoading, setIsLoading] = useState(false);

  useGridLoader();

  const handleToggleView = useCallback(() => {
    dispatch({ type: "TOGGLE_VIEW" });
  }, [dispatch]);

  const handleNavigate = useCallback(
    (address: string) => {
      if (!state.gridMeta) {
        return;
      }
      const meta = state.gridMeta;
      setIsLoading(true);
      dispatch({ type: "CLEAR_ERROR" });
      geocodeOne(address)
        .then((latLng) => {
          const { row, col } = latLngToCell(latLng, meta);
          if (row < 0 || row >= meta.rows || col < 0 || col >= meta.cols) {
            throw new Error(
              "Address is outside Manhattan. Try any address on the island.",
            );
          }
          dispatch({
            type: "SET_CAMERA",
            camera: {
              x: col + 0.5,
              y: row + 0.5,
              angle: 0,
              fov: (Math.PI * 5) / 12,
              pitch: 0,
            },
          });
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : "Navigation failed";
          dispatch({ type: "SET_ERROR", error: message });
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [dispatch, state.gridMeta],
  );

  if (!state.grid) {
    return (
      <main className="flex h-screen items-center justify-center bg-black font-mono text-green-400">
        Loading city…
      </main>
    );
  }

  return (
    <main className="relative h-screen overflow-hidden bg-black">
      <CanvasLayer grid={state.grid} />
      <ViewToggle view={state.view} onToggle={handleToggleView} />
      <AddressSearch onNavigate={handleNavigate} isLoading={isLoading} />
      <ErrorBanner error={state.error} />
    </main>
  );
}

// ── Public export ──────────────────────────────────────────────────────────────

export function Navigator() {
  return (
    <NavigatorProvider>
      <NavigatorInner />
    </NavigatorProvider>
  );
}
