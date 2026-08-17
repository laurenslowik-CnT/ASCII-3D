import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("renders the loading state while grid is null", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(vi.fn())),
    );
    render(<Home />);
    expect(screen.getByText("Loading city…")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
