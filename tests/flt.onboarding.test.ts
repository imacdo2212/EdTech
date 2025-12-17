import { decideOnboarding } from "../src/kernels/flt/onboardingService.js";
import { describe, it, expect } from "vitest";

it("null profile routes to welcome", () => {
  const d = decideOnboarding(null, "2025-12-16T00:00:00Z");
  expect(d.route).toBe("welcome");
});
