import { describe, it, expect } from "vitest";
import { initLedger } from "../src/shared/audit.js";

import { initPK1, pk1SubmitDelta, pk1GetView } from "../src/kernels/pk1/pk1Kernel.js";
import { fltRoute } from "../src/kernels/flt/fltKernel.js";
import { mskRoute } from "../src/sks/msk/mskKernel.js";

describe("FLT -> PK1 plan store (pre + post) under topic_states.FLT", () => {
  it("stores post plan snapshot in PK1 and remains deterministic", () => {
    const ts = "2025-12-16T00:00:00Z";
    const budgets = {
      tokens_output_max: 900,
      time_ms: 60000,
      mem_mb: 512,
      depth_max: 6,
      clarifying_questions_max: 3,
      citations_required: false
    };

    const onboarding = {
      student_profile: {
        student_id: "s1",
        stage: "x",
        onboarding_state: {
          status: "completed",
          started_at: null,
          completed_at: "2025-01-01T00:00:00Z",
          expires_after_days: 365
        }
      }
    };

    const runOnce = () => {
      let ledger = initLedger();

      // Maintain PK1 state across calls during the run.
      let pkState = initPK1("learner-1", {
        status: "granted",
        scopes: ["profile.read", "profile.write"],
        timestamp: ts
      });

      const resp = fltRoute({
        budgets,
        onboarding,
        ts,
        intent: "practice",
        user_input: {
          control: "stay",
          // performance evidence provided explicitly:
          cfu_results: [true, true],
          errors_consecutive_max: 0,
          // explicit hint to enable the existing planning rule:
          working_memory_band: "high"
        },
        pk: {
          submitDelta: (r: any) => {
            const out = pk1SubmitDelta(pkState, ledger, r);
            pkState = out.state;
            ledger = out.ledger;
            return out.resp;
          },
          getView: (sk: string) => {
            const out = pk1GetView(pkState, ledger, sk);
            ledger = out.ledger;
            return out.resp;
          }
        },
        sk: { mskRoute },
        ledger
      });

      const stored = pkState.profile.topic_states?.FLT;
      expect(stored).toBeTruthy();
      expect(stored.event).toBe("planning_update");
      expect(stored.phase).toBe("post");
      expect(stored.ts).toBe(ts);

      // Evidence stored from MSK performance
      expect(stored.evidence).toHaveProperty("cfu_mean", 1);
      expect(stored.evidence).toHaveProperty("errors_consecutive_max", 0);

      // Plan updated using existing rule: WM high + CFU>=0.80 => scaffold_level minimal
      expect(stored.snapshot).toHaveProperty("scaffold_level", "minimal");

      // Also ensure we have both planning_update phases in the audit ledger
      const planningUpdates = resp.ledger.entries.filter((e) => e.route === "flt" && e.event === "planning_update");
      expect(planningUpdates.length).toBeGreaterThanOrEqual(2);
      expect(planningUpdates.some((e) => e.event_data?.phase === "pre")).toBe(true);
      expect(planningUpdates.some((e) => e.event_data?.phase === "post")).toBe(true);

      return { pkState, ledgerHead: resp.ledger.head };
    };

    const a = runOnce();
    const b = runOnce();

    // Determinism: same inputs -> same audit head
    expect(a.ledgerHead).toBe(b.ledgerHead);

    // Determinism: stored post plan identical
    expect(a.pkState.profile.topic_states?.FLT).toEqual(b.pkState.profile.topic_states?.FLT);
  });
});
