import { describe, it, expect } from "vitest";
import { initLedger } from "../src/shared/audit.js";
import { initPK1, pk1GetView, pk1SubmitDelta } from "../src/kernels/pk1/pk1Kernel.js";
import { fltRoute } from "../src/kernels/flt/fltKernel.js";
import { mskRoute } from "../src/sks/msk/mskKernel.js";

describe("Deterministic replay", () => {
  it("same input -> same output + same audit head hash", () => {
    const budgets = { tokens_output_max: 900, time_ms: 60000, mem_mb: 512, depth_max: 6, clarifying_questions_max: 3, citations_required: false } as const;

    const onboarding = {
      student_profile: {
        student_id: "s1",
        stage: "x",
        onboarding_state: { status: "completed", started_at: null, completed_at: "2025-01-01T00:00:00Z", expires_after_days: 365 }
      }
    } as const;

    const ts = "2025-12-16T00:00:00Z";

    const run = () => {
      let ledger = initLedger();
      const pk = initPK1("learner-1", { status: "granted", scopes: ["profile.read", "profile.write"], timestamp: ts });

      const resp = fltRoute({
        budgets,
        onboarding,
        ts,
        intent: "practice",
        user_input: { control: "stay" },
        pk: {
          submitDelta: (r: any) => pk1SubmitDelta(pk, ledger, r).resp,
          getView: (sk: string) => pk1GetView(pk, ledger, sk).resp
        },
        sk: { mskRoute },
        ledger
      });

      ledger = resp.ledger;
      return { resp, head: ledger.head };
    };

    const a = run();
    const b = run();

    expect(a.resp).toEqual(b.resp);
    expect(a.head).toEqual(b.head);
  });
});
