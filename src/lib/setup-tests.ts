import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "../__mocks__/server";

// Satisfy @t3-oss/env validation for modules that import `@/env` (client vars
// are validated in the jsdom "client" environment). The Mapbox token stays
// unset so the photoreal view falls back to its guard.
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??= "test-google-key";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
