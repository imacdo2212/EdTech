import { describe, it, expect } from "vitest";
import { initLedger } from "../src/shared/audit.js";
import { initPK1, pk1SubmitDelta } from "../src/kernels/pk1/pk1Kernel.js";

describe("PK1 — boundedness", () => {
  it("REFUSAL(PK-REF-SCHEMA) on oversized topic_state payload", () => {
    const ledger = initLedger();
    const state = initPK1("learner-1", {
      status: "granted",
      scopes: ["profile.read", "profile.write"],
      timestamp: "2025-12-16T00:00:00Z"
    });

    const big = "x".repeat(2000); // >1KB

    const r = pk1SubmitDelta(state, ledger, {
      sk_code: "MSK",
      ts: "2025-12-16T00:00:00Z",
      scope: "profile",
      payload: {
        topic_state: { blob: big }
      }
    });

    expect(r.resp.ok).toBe(false);
    expect((r.resp as any).termination).toBe("REFUSAL(PK-REF-SCHEMA)");
  });

  it("REFUSAL(PK-REF-SCHEMA) on oversized delta payload", () => {
    const ledger = initLedger();
    const state = initPK1("learner-1", {
      status: "granted",
      scopes: ["profile.read", "profile.write"],
      timestamp: "2025-12-16T00:00:00Z"
    });

    const huge = "x".repeat(40 * 1024);

    const r = pk1SubmitDelta(state, ledger, {
      sk_code: "MSK",
      ts: "2025-12-16T00:00:00Z",
      scope: "profile",
      payload: { data: huge }
    });

    expect(r.resp.ok).toBe(false);
    expect((r.resp as any).termination).toBe("REFUSAL(PK-REF-SCHEMA)");
  });
});
