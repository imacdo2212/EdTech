import { describe, it, expect } from "vitest";
import { mskRoute } from "../src/sks/msk/mskKernel.js";

describe("MSK acceptance", () => {
  it("outputs strict schema fields and one stage", () => {
    const r = mskRoute({
      sk_code: "MSK",
      projection: {},
      plan: {},
      stage: "intro",
      user_input: {}
    });
    expect(r.output.stage).toBe("intro");
    expect(typeof r.output.reply).toBe("string");
    expect(Array.isArray(r.output.checks)).toBe(true);
    expect(r.output.checks.length).toBeLessThanOrEqual(2);
    expect(typeof r.output.controls).toBe("string");
  });

  it("advance moves to next stage deterministically", () => {
    const a = mskRoute({ sk_code: "MSK", projection: {}, plan: {}, stage: "intro", user_input: { control: "advance" } });
    const b = mskRoute({ sk_code: "MSK", projection: {}, plan: {}, stage: "intro", user_input: { control: "advance" } });
    expect(a.output.stage).toBe("identify");
    expect(a.output).toEqual(b.output);
  });
});
