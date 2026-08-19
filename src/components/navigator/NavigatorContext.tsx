"use client";

import type { ReactNode } from "react";
import { createContext, use, useMemo, useReducer } from "react";

import type { Grid, GridMeta } from "@/lib/grid/types";
import type { Camera } from "@/lib/raycaster/camera";
import { createCamera } from "@/lib/raycaster/camera";

export type View = "photoreal" | "firstperson" | "overhead";

const VIEW_ORDER: readonly View[] = ["photoreal", "firstperson", "overhead"];

type NavigatorState = {
  grid: Grid | null;
  gridMeta: GridMeta | null;
  camera: Camera;
  view: View;
  error: string | null;
};

type Action =
  | { type: "SET_GRID"; grid: Grid; meta: GridMeta }
  | { type: "SET_CAMERA"; camera: Camera }
  | { type: "TOGGLE_VIEW" }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" };

const initialState: NavigatorState = {
  grid: null,
  gridMeta: null,
  camera: createCamera(0, 0, 0),
  view: "photoreal",
  error: null,
};

function reducer(state: NavigatorState, action: Action): NavigatorState {
  switch (action.type) {
    case "SET_GRID":
      return { ...state, grid: action.grid, gridMeta: action.meta };
    case "SET_CAMERA":
      return { ...state, camera: action.camera };
    case "TOGGLE_VIEW": {
      const next = (VIEW_ORDER.indexOf(state.view) + 1) % VIEW_ORDER.length;
      return { ...state, view: VIEW_ORDER[next] ?? "photoreal" };
    }
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

type NavigatorContextValue = {
  state: NavigatorState;
  dispatch: React.Dispatch<Action>;
};

const NavigatorContext = createContext<NavigatorContextValue | null>(null);

export function NavigatorProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <NavigatorContext value={value}>{children}</NavigatorContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNavigator(): NavigatorContextValue {
  const ctx = use(NavigatorContext);
  if (!ctx) {
    throw new Error("useNavigator must be used within NavigatorProvider");
  }
  return ctx;
}
