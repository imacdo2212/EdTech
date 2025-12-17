import { describe, it, expect } from "vitest";
import { initLedger } from "../src/shared/audit.js";
import { initPK1, pk1GetView, pk1SubmitDelta } from "../src/kernels/pk1/pk1Kernel.js";
import { fltRoute } from "../src/kernels/flt/fltKernel.js";
import { mskRoute } from "../src/sks/msk/mskKernel.js";

describe("FLT acceptance", () => {
  it("onboarding incomplete -> REFUSAL(ONBOARD_REQUIRED)", () => {
    const ledger = initLedger();
    const pk = initPK1("learner-1", { status: "granted", scopes: ["profile.read", "profile.write"], timestamp: "2025-12-16T00:00:00Z" });

    const resp = fltRoute({
      budgets: { tokens_output_max: 900, time_ms: 60000, mem_mb: 512, depth_max: 6, clarifying_questions_max: 3, citations_required: true },
      onboarding: { student_profile: null },
      ts: "2025-12-16T00:00:00Z",
      intent: "teach",
      user_input: {},
      pk: {
        submitDelta: (r: any) => pk1SubmitDelta(pk, ledger, r).resp,
        getView: (sk: string) => pk1GetView(pk, ledger, sk).resp
      },
      sk: { mskRoute },
      ledger
    });

    expect(resp.ok).toBe(false);
    expect(resp.termination).toBe("REFUSAL(ONBOARD_REQUIRED)");
  });

  it("two SKs in one turn not allowed (only MSK wired) -> BOUND_DEPTH", () => {
    const ledger = initLedger();
    const pk = initPK1("learner-1", { status: "granted", scopes: ["profile.read", "profile.write"], timestamp: "2025-12-16T00:00:00Z" });

    const resp = fltRoute({
      budgets: { tokens_output_max: 900, time_ms: 60000, mem_mb: 512, depth_max: 6, clarifying_questions_max: 3, citations_required: false },
      onboarding: {
        student_profile: {
          student_id: "s1",
          stage: "x",
          onboarding_state: { status: "completed", started_at: null, completed_at: "2025-01-01T00:00:00Z", expires_after_days: 365 }
        }
      },
      ts: "2025-12-16T00:00:00Z",
      intent: "teach",
      sk_code: "MSK",
      user_input: {},
      pk: {
        submitDelta: (r: any) => pk1SubmitDelta(pk, ledger, r).resp,
        getView: (sk: string) => pk1GetView(pk, ledger, sk).resp
      },
      sk: { mskRoute },
      ledger
    });

    expect(resp.ok).toBe(true);
    expect(resp.termination).toBe("BOUNDED_OUTPUT");
  });
});
