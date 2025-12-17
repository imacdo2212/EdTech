import { describe, it, expect } from "vitest";
import { initLedger } from "../src/shared/audit.js";

import { initPK1, pk1SubmitDelta, pk1GetView } from "../src/kernels/pk1/pk1Kernel.js";
import { fltRoute } from "../src/kernels/flt/fltKernel.js";
import { mskRoute } from "../src/sks/msk/mskKernel.js";

describe("FLT -> PK1 stores MSK topic_states.MSK for continuity", () => {
  it("stores MSK topic state and remains deterministic", () => {
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
          control: "advance",
          problem: "Solve x^2 - 5x + 6 = 0",
          topic: "quadratics",
          area: "algebra",
          difficulty: "easy",
          symbols: ["x"],
          formula_keys: ["quadratic_formula"],
          cfu_results: [true, true],
          errors_consecutive_max: 0,
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

      // Stored MSK topic state should exist
      const stored = pkState.profile.topic_states?.MSK;
      expect(stored).toBeTruthy();
      expect(stored.stage).toBe("identify");
      expect(stored.topic).toBe("quadratics");
      expect(stored.area).toBe("algebra");

      return { pkState, ledgerHead: resp.ledger.head };
    };

    const a = runOnce();
    const b = runOnce();

    expect(a.ledgerHead).toBe(b.ledgerHead);
    expect(a.pkState.profile.topic_states?.MSK).toEqual(b.pkState.profile.topic_states?.MSK);
  });
});
