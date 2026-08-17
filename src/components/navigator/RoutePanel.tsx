// src/components/navigator/RoutePanel.tsx
import type { Step } from "@/lib/grid/types";

type Props = {
  readonly steps: Step[];
  readonly currentStep: number;
};

function stepClassName(index: number, currentStep: number): string {
  if (index === currentStep) {
    return "text-green-300";
  }
  if (index < currentStep) {
    return "text-green-800 line-through";
  }
  return "text-green-600";
}

export function RoutePanel({ steps, currentStep }: Props) {
  if (steps.length === 0) {
    return (
      <div className="absolute bottom-4 left-4 z-10 w-64 rounded-sm border border-green-700 bg-black/90 p-3 font-mono text-green-400">
        <p className="text-center text-sm">— Arrived —</p>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 w-64 rounded-sm border border-green-700 bg-black/90 p-3 font-mono">
      <p className="mb-2 text-xs tracking-widest text-green-600 uppercase">
        Route
      </p>
      <ul className="space-y-1 text-xs">
        {steps.map((step, i) => (
          <li key={step.instruction} className={stepClassName(i, currentStep)}>
            {i === currentStep ? "▶ " : "  "}
            {step.instruction}
            <span className="ml-1 text-green-800">
              ({step.distanceMetres}m)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
