import { describe, it, expect } from "vitest";
import { initLedger } from "../src/shared/audit.js";
import { initPK1, pk1SubmitDelta, pk1GetView } from "../src/kernels/pk1/pk1Kernel.js";
import { fltRoute } from "../src/kernels/flt/fltKernel.js";
import { mskRoute } from "../src/sks/msk/mskKernel.js";

describe("FLT -> planning write-back audit event", () => {
  it("emits planning_update audit event before PK sync / SK route", () => {
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

    const hasPlanningUpdate = ledger.entries.some((e) => e.route === "flt" && e.event === "planning_update");
    expect(hasPlanningUpdate).toBe(true);

    const planningEntry = ledger.entries.find((e) => e.route === "flt" && e.event === "planning_update");
    expect(planningEntry).toBeTruthy();

    expect(planningEntry!.event_data.snapshot).toHaveProperty("pace_factor");
    expect(planningEntry!.event_data.snapshot).toHaveProperty("cfu_frequency");
    expect(planningEntry!.event_data.snapshot).toHaveProperty("retention_spacing_days");

    // Evidence fields exist but are null unless computed elsewhere
    expect(planningEntry!.event_data.evidence).toHaveProperty("cfu_mean", null);
    expect(planningEntry!.event_data.evidence).toHaveProperty("errors_consecutive_max", null);
  });
});
