import { describe, it, expect } from "vitest";
import { initLedger } from "../src/shared/audit.js";
import {
  initPK1,
  pk1SubmitDelta,
  pk1GetView
} from "../src/kernels/pk1/pk1Kernel.js";

describe("PK1 — deterministic replay", () => {
  it("same inputs produce identical profile + audit hash", () => {
    const run = () => {
      let ledger = initLedger();
      let state = initPK1("learner-1", {
        status: "granted",
        scopes: ["profile.read", "profile.write"],
        timestamp: "2025-12-16T00:00:00Z"
      });

      const delta = {
        sk_code: "MSK",
        ts: "2025-12-16T00:00:00Z",
        scope: "profile" as const,
        payload: {
          preferred_style: "brief",
          topic_state: { stage: "identify", strand: "algebra" }
        }
      };

      const d = pk1SubmitDelta(state, ledger, delta);
      state = d.state;
      ledger = d.ledger;

      const v = pk1GetView(state, ledger, "MSK");
      ledger = v.ledger;

      return {
        profile: (v.resp as any).profile,
        audit_head: ledger.head
      };
    };

    const a = run();
    const b = run();

    expect(a.profile).toEqual(b.profile);
    expect(a.audit_head).toEqual(b.audit_head);
  });
});
