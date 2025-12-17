import { describe, it, expect } from "vitest";
import { runCognitive } from "../src/kernels/flt/cognitiveService.js";

it("Flynn adjustment deterministic", () => {
  const out = runCognitive({ historic_iq_estimate: 110, norm_year: 2000 }, 2025);
  expect(out.modern_iq).toBe(110 - 6); // two decades
  expect(out.band).toBeDefined();
});
