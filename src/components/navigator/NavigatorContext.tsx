"use client";

import type { ReactNode } from "react";
import { createContext, use, useMemo, useReducer } from "react";

import type { Grid, GridMeta, Route, Step } from "@/lib/grid/types";
import type { Camera } from "@/lib/raycaster/camera";
import { createCamera } from "@/lib/raycaster/camera";

export type View = "firstperson" | "overhead";

type NavigatorState = {
  grid: Grid | null;
  gridMeta: GridMeta | null;
  camera: Camera;
  route: Route | null;
  routeCells: { col: number; row: number }[];
  routeStepIndex: number;
  routeSteps: Step[];
  view: View;
  isWalking: boolean;
  error: string | null;
};

type Action =
  | { type: "SET_GRID"; grid: Grid; meta: GridMeta }
  | { type: "SET_CAMERA"; camera: Camera }
  | {
      type: "SET_ROUTE";
      route: Route;
      routeCells: { col: number; row: number }[];
    }
  | { type: "ADVANCE_STEP"; camera: Camera; stepIndex: number }
  | { type: "TOGGLE_VIEW" }
  | { type: "TOGGLE_WALKING" }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" };

const initialState: NavigatorState = {
  grid: null,
  gridMeta: null,
  camera: createCamera(0, 0, 0),
  route: null,
  routeCells: [],
  routeStepIndex: 0,
  routeSteps: [],
  view: "firstperson",
  isWalking: false,
  error: null,
};

function reducer(state: NavigatorState, action: Action): NavigatorState {
  switch (action.type) {
    case "SET_GRID":
      return { ...state, grid: action.grid, gridMeta: action.meta };
    case "SET_CAMERA":
      return { ...state, camera: action.camera };
    case "SET_ROUTE":
      return {
        ...state,
        route: action.route,
        routeCells: action.routeCells,
        routeSteps: action.route.steps,
        routeStepIndex: 0,
        isWalking: true,
      };
    case "ADVANCE_STEP":
      return {
        ...state,
        camera: action.camera,
        routeStepIndex: action.stepIndex,
      };
    case "TOGGLE_VIEW":
      return {
        ...state,
        view: state.view === "firstperson" ? "overhead" : "firstperson",
      };
    case "TOGGLE_WALKING":
      return { ...state, isWalking: !state.isWalking };
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
