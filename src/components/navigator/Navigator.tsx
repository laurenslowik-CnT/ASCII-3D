// src/components/navigator/Navigator.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as z from "zod";

import { latLngToCell } from "@/lib/grid/coords";
import type { Grid, GridMeta, LatLng, Route } from "@/lib/grid/types";
import type { Camera } from "@/lib/raycaster/camera";
import { advanceCameraAlongRoute } from "@/lib/raycaster/camera";

import { AddressSearch } from "./AddressSearch";
import { NavigatorProvider, useNavigator } from "./NavigatorContext";
import { OverheadCanvas } from "./OverheadCanvas";
import { RaycasterCanvas } from "./RaycasterCanvas";
import { RoutePanel } from "./RoutePanel";
import { ViewToggle } from "./ViewToggle";

const WALK_INTERVAL_MS = 33;

// ── Zod schemas ────────────────────────────────────────────────────────────────

const latLngSchema = z.object({ lat: z.number(), lng: z.number() });

const cellSchema = z.object({
  type: z.enum(["road", "building", "empty"]),
  height: z.number(),
});

const gridMetaSchema = z.object({
  origin: latLngSchema,
  rows: z.number(),
  cols: z.number(),
  cellSize: z.number(),
});

const gridResponseSchema = z.object({
  grid: z.array(z.array(cellSchema)),
  meta: gridMetaSchema,
});

const stepSchema = z.object({
  instruction: z.string(),
  distanceMetres: z.number(),
  streetName: z.string(),
});

const routeSchema = z.object({
  polyline: z.array(latLngSchema),
  steps: z.array(stepSchema),
});

// ── API helpers ────────────────────────────────────────────────────────────────

async function loadGrid(): Promise<{ grid: Grid; meta: GridMeta }> {
  const res = await fetch("/api/grid?city=nyc");
  if (!res.ok) {
    throw new Error(`Grid fetch failed: ${res.status}`);
  }
  return gridResponseSchema.parse(await res.json());
}

async function geocodeOne(address: string): Promise<LatLng> {
  const res = await fetch(
    `/api/geocode?address=${encodeURIComponent(address)}`,
  );
  if (!res.ok) {
    throw new Error(`Geocode failed for "${address}": ${res.status}`);
  }
  return latLngSchema.parse(await res.json());
}

async function loadRoute(origin: LatLng, destination: LatLng): Promise<Route> {
  const res = await fetch("/api/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination }),
  });
  if (!res.ok) {
    throw new Error(`Route fetch failed: ${res.status}`);
  }
  return routeSchema.parse(await res.json());
}

async function resolveRoute(
  originAddr: string,
  destAddr: string,
  meta: GridMeta,
): Promise<{ route: Route; routeCells: { col: number; row: number }[] }> {
  const [originLatLng, destLatLng] = await Promise.all([
    geocodeOne(originAddr),
    geocodeOne(destAddr),
  ]);
  const route = await loadRoute(originLatLng, destLatLng);
  const routeCells = route.polyline.map((pt) => latLngToCell(pt, meta));
  return { route, routeCells };
}

// ── Walking effect ─────────────────────────────────────────────────────────────

function useWalkingEffect() {
  const { state, dispatch } = useNavigator();
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    const id = setInterval(() => {
      const { isWalking, routeCells, routeStepIndex } = stateRef.current;
      if (!isWalking || routeCells.length === 0) {
        return;
      }
      const { camera, nextStepIndex } = advanceCameraAlongRoute(
        stateRef.current.camera,
        routeCells,
        routeStepIndex,
      );
      dispatch({ type: "ADVANCE_STEP", camera, stepIndex: nextStepIndex });
    }, WALK_INTERVAL_MS);

    return () => {
      clearInterval(id);
    };
  }, [dispatch]);
}

// ── Spacebar listener ──────────────────────────────────────────────────────────

function useSpacebarToggle() {
  const { dispatch } = useNavigator();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        dispatch({ type: "TOGGLE_WALKING" });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [dispatch]);
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

type CanvasLayerProps = {
  readonly grid: Grid;
};

function CanvasLayer({ grid }: CanvasLayerProps) {
  const { state, dispatch } = useNavigator();

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
        onCameraChange={handleCameraChange}
      />
    );
  }
  return (
    <OverheadCanvas
      grid={grid}
      camera={state.camera}
      routeCells={state.routeCells}
    />
  );
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
            fov: Math.PI / 3,
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

// ── Route request hook ─────────────────────────────────────────────────────────

function useRouteRequest() {
  const { state, dispatch } = useNavigator();
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  const handleRoute = useCallback(
    (origin: string, destination: string) => {
      if (!state.gridMeta) {
        return;
      }
      const meta = state.gridMeta;
      setIsRouteLoading(true);
      resolveRoute(origin, destination, meta)
        .then(({ route, routeCells }) => {
          dispatch({ type: "SET_ROUTE", route, routeCells });
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : "Navigation failed";
          dispatch({ type: "SET_ERROR", error: message });
        })
        .finally(() => {
          setIsRouteLoading(false);
        });
    },
    [dispatch, state.gridMeta],
  );

  return { handleRoute, isRouteLoading };
}

// ── Inner (reads context) ──────────────────────────────────────────────────────

function NavigatorInner() {
  const { state, dispatch } = useNavigator();

  useWalkingEffect();
  useSpacebarToggle();
  useGridLoader();

  const { handleRoute, isRouteLoading } = useRouteRequest();

  const handleToggleView = useCallback(() => {
    dispatch({ type: "TOGGLE_VIEW" });
  }, [dispatch]);

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
      <AddressSearch onRoute={handleRoute} isLoading={isRouteLoading} />
      <ErrorBanner error={state.error} />
      {state.routeSteps.length > 0 && (
        <RoutePanel
          steps={state.routeSteps}
          currentStep={state.routeStepIndex}
        />
      )}
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
