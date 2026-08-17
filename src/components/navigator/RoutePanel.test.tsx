import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RoutePanel } from "@/components/navigator/RoutePanel";
import type { Step } from "@/lib/grid/types";

const STEPS: Step[] = [
  {
    instruction: "Head north on 5th Ave",
    distanceMetres: 100,
    streetName: "5th Ave",
  },
  {
    instruction: "Turn left on 42nd St",
    distanceMetres: 50,
    streetName: "42nd St",
  },
];

describe("RoutePanel", () => {
  it("renders all steps", () => {
    render(<RoutePanel steps={STEPS} currentStep={0} />);
    expect(screen.getByText(/Head north on 5th Ave/)).toBeInTheDocument();
    expect(screen.getByText(/Turn left on 42nd St/)).toBeInTheDocument();
  });

  it("shows arrived message when no steps", () => {
    render(<RoutePanel steps={[]} currentStep={0} />);
    expect(screen.getByText(/Arrived/i)).toBeInTheDocument();
  });

  it("highlights the current step with green text", () => {
    render(<RoutePanel steps={STEPS} currentStep={1} />);
    const listItems = screen.getAllByRole("listitem");
    const currentItem = listItems.find((li) =>
      within(li).queryByText(/Turn left on 42nd St/),
    );
    expect(currentItem?.className).toMatch(/text-green-300/);
  });
});
