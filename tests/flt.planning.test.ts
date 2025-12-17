import { describe, it, expect } from "vitest";
import { computePlan } from "../src/kernels/flt/planningService.js";

it("below average band increases scaffolding", () => {
  const plan = computePlan({ cognitive: { band: "below_average" } });
  expect(plan.example_density).toBe("rich");
  expect(plan.cfu_frequency).toBe("per_minor_step");
});
