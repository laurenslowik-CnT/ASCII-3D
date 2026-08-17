import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ViewToggle } from "@/components/navigator/ViewToggle";

describe("ViewToggle", () => {
  it("shows '3D' label when view is firstperson", () => {
    render(<ViewToggle view="firstperson" onToggle={vi.fn()} />);
    expect(screen.getByText(/3D/)).toBeInTheDocument();
  });

  it("shows 'MAP' label when view is overhead", () => {
    render(<ViewToggle view="overhead" onToggle={vi.fn()} />);
    expect(screen.getByText(/MAP/)).toBeInTheDocument();
  });

  it("calls onToggle when button is clicked", () => {
    const onToggle = vi.fn();
    render(<ViewToggle view="firstperson" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
