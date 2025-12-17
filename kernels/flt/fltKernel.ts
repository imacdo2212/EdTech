import { enforceBudgetCaps } from "../../shared/budgets.js";
import { appendAudit } from "../../shared/audit.js";
import { hashOfObject } from "../../shared/hashing.js";
import { refusal } from "../../shared/errors.js";
import { computeCCI, evidenceGate } from "./evidenceGate.js";

import { decideOnboarding } from "./onboardingService.js";
import { runCognitive } from "./cognitiveService.js";
import { computePlan } from "./planningService.js";

import type { FLTRequest, FLTResponse } from "./types.js";

export function fltRoute(req: FLTRequest): FLTResponse {
  /* ============================
     INIT — budgets & invariants
     ============================ */
  const consumedBase = {
    tokens_out: 0,
    time_ms: 1,
    mem_mb: 32,
    depth: 1,
    web_requests: 0
  };

  const budgetFail = enforceBudgetCaps(req.budgets, consumedBase);
  if (budgetFail) {
    const ledger = appendAudit(req.ledger, {
      exec_id: hashOfObject({ route: "flt", stage: "INIT", req }),
      route: "flt",
      budgets: { requested: req.budgets, granted: req.budgets, consumed: consumedBase },
      termination: budgetFail.termination,
      metrics: { SCS: 0, SCA: 0, SVR: 0, DIS: 1, CCI: 0 },
      provenance: { sources: [] },
      prev_hash: req.ledger.head,
      event: "init",
      event_data: { ts: req.ts }
    });
    return { ...budgetFail, ledger };
  }

  /* ============================
     ONBOARD — mandatory gating
     ============================ */
  const onboardingDecision = decideOnboarding(req.onboarding.student_profile, req.ts);

  if (onboardingDecision.route !== "main_menu") {
    const r = refusal(
      "ONBOARD_REQUIRED",
      onboardingDecision.route === "welcome"
        ? "Welcome — onboarding is required before lessons can begin."
        : onboardingDecision.banner ?? "Onboarding required.",
      onboardingDecision.options
    );

    const ledger = appendAudit(req.ledger, {
      exec_id: hashOfObject({ route: "flt", stage: "ONBOARD", req }),
      route: "flt",
      budgets: { requested: req.budgets, granted: req.budgets, consumed: consumedBase },
      termination: r.termination,
      metrics: { SCS: 1, SCA: 1, SVR: 1, DIS: 1, CCI: 1 },
      provenance: { sources: [] },
      prev_hash: req.ledger.head,
      event: "onboarding_gate",
      event_data: { decision: onboardingDecision, ts: req.ts }
    });

    return { ...r, ledger };
  }

  /* ============================
     PLAN (PRE) — baseline
     ============================ */
  const cognitiveBase = runCognitive({}, new Date(req.ts).getUTCFullYear());

  // Pre-plan (no performance evidence yet)
  const prePlan = computePlan({ cognitive: cognitiveBase as any });

  const preSnapshot = {
    pace_factor: prePlan.pace_factor,
    scaffold_level: prePlan.scaffold_level,
    problem_novelty: prePlan.problem_novelty,
    cfu_frequency: prePlan.cfu_frequency,
    working_memory_supports: prePlan.working_memory_supports,
    processing_speed_supports: prePlan.processing_speed_supports,
    example_density: prePlan.example_density,
    homework_load: prePlan.homework_load,
    retention_spacing_days: prePlan.retention_spacing_days
  };

  const preEvidence = {
    cfu_mean: null as number | null,
    errors_consecutive_max: null as number | null
  };

  const ledgerAfterPrePlan = appendAudit(req.ledger, {
    exec_id: hashOfObject({ route: "flt", event: "planning_update", phase: "pre", ts: req.ts, preSnapshot, preEvidence }),
    route: "flt",
    budgets: { requested: req.budgets, granted: req.budgets, consumed: consumedBase },
    termination: "BOUNDED_OUTPUT",
    metrics: { SCS: 1, SCA: 1, SVR: 1, DIS: 1, CCI: 1 },
    provenance: { sources: [] },
    prev_hash: req.ledger.head,
    event: "planning_update",
    event_data: { phase: "pre", ts: req.ts, snapshot: preSnapshot, evidence: preEvidence }
  });

  /* ============================
     PK1 (PRE) — store baseline plan to topic_states.FLT
     ============================ */
  const preStoreResp = req.pk.submitDelta({
    sk_code: "FLT",
    ts: req.ts,
    scope: "profile",
    payload: {
      topic_state: {
        event: "planning_update",
        phase: "pre",
        ts: req.ts,
        snapshot: preSnapshot,
        evidence: preEvidence
      }
    }
  });

  if (!preStoreResp.ok) {
    const ledger = appendAudit(ledgerAfterPrePlan, {
      exec_id: hashOfObject({ route: "flt", stage: "PK_SYNC", op: "planning_store_pre", req, preStoreResp }),
      route: "flt",
      budgets: { requested: req.budgets, granted: req.budgets, consumed: consumedBase },
      termination: preStoreResp.termination,
      metrics: { SCS: 1, SCA: 1, SVR: 1, DIS: 1, CCI: 1 },
      provenance: { sources: [] },
      prev_hash: ledgerAfterPrePlan.head,
      event: "pk_sync_planning_store_refusal",
      event_data: { phase: "pre", ts: req.ts }
    });
    return { ...preStoreResp, ledger };
  }

  /* ============================
     PK_SYNC — MSK view
     ============================ */
  const viewResp = req.pk.getView("MSK");
  if (!viewResp.ok) {
    const ledger = appendAudit(ledgerAfterPrePlan, {
      exec_id: hashOfObject({ route: "flt", stage: "PK_SYNC", op: "msk_view", req, viewResp }),
      route: "flt",
      budgets: { requested: req.budgets, granted: req.budgets, consumed: consumedBase },
      termination: viewResp.termination,
      metrics: { SCS: 1, SCA: 1, SVR: 1, DIS: 1, CCI: 1 },
      provenance: { sources: [] },
      prev_hash: ledgerAfterPrePlan.head,
      event: "pk_sync_view_refusal",
      event_data: { ts: req.ts }
    });
    return { ...viewResp, ledger };
  }

  /* ============================
     SK_ROUTE — exactly one SK
     ============================ */
  const skCode = req.sk_code ?? "MSK";
  if (skCode !== "MSK") {
    const r = refusal("BOUND_DEPTH", "Exactly one Side-Kick per turn is permitted.", ["Use sk_code: MSK."]);

    const ledger = appendAudit(ledgerAfterPrePlan, {
      exec_id: hashOfObject({ route: "flt", stage: "SK_ROUTE", req }),
      route: "flt",
      budgets: { requested: req.budgets, granted: req.budgets, consumed: consumedBase },
      termination: r.termination,
      metrics: { SCS: 1, SCA: 1, SVR: 1, DIS: 1, CCI: 1 },
      provenance: { sources: [] },
      prev_hash: ledgerAfterPrePlan.head,
      event: "sk_route_refusal",
      event_data: { ts: req.ts }
    });

    return { ...r, ledger };
  }

  const skOut = req.sk.mskRoute({
    sk_code: "MSK",
    projection: viewResp.profile,
    plan: prePlan,
    stage: viewResp.profile?.topic_states?.MSK?.stage ?? "intro",
    user_input: req.user_input
  });

  /* ============================
     PK1 — store MSK topic state (continuity)
     ============================ */
  const mskTopicState = skOut.topic_state_delta ?? { stage: skOut.output.stage };

  const mskStoreResp = req.pk.submitDelta({
    sk_code: "MSK",
    ts: req.ts,
    scope: "profile",
    payload: { topic_state: mskTopicState }
  });

  if (!mskStoreResp.ok) {
    const ledger = appendAudit(ledgerAfterPrePlan, {
      exec_id: hashOfObject({ route: "flt", stage: "PK_SYNC", op: "msk_topic_state_store", req, mskStoreResp }),
      route: "flt",
      budgets: { requested: req.budgets, granted: req.budgets, consumed: consumedBase },
      termination: mskStoreResp.termination,
      metrics: { SCS: 1, SCA: 1, SVR: 1, DIS: 1, CCI: 1 },
      provenance: { sources: [] },
      prev_hash: ledgerAfterPrePlan.head,
      event: "pk_sync_msk_topic_state_store_refusal",
      event_data: { ts: req.ts }
    });
    return { ...mskStoreResp, ledger };
  }

  const ledgerAfterMSKStore = appendAudit(ledgerAfterPrePlan, {
    exec_id: hashOfObject({ route: "flt", event: "msk_topic_state_store", ts: req.ts, mskTopicState }),
    route: "flt",
    budgets: { requested: req.budgets, granted: req.budgets, consumed: consumedBase },
    termination: "BOUNDED_OUTPUT",
    metrics: { SCS: 1, SCA: 1, SVR: 1, DIS: 1, CCI: 1 },
    provenance: { sources: [] },
    prev_hash: ledgerAfterPrePlan.head,
    event: "msk_topic_state_store",
    event_data: { ts: req.ts, topic_state: mskTopicState }
  });

  /* ============================
     PLAN (POST) — feedback loop
     ============================ */
  const cfu_mean = skOut.performance?.cfu_pass_rate ?? null;
  const errors_consecutive_max = skOut.performance?.errors_consecutive_max ?? null;

  const wmHint = req.user_input?.working_memory_band;
  const working_memory =
    wmHint === "high" || wmHint === "above_average" || wmHint === "average" || wmHint === "below_average" || wmHint === "developing"
      ? wmHint
      : undefined;

  const postPlan = computePlan({
    cognitive: {
      ...(cognitiveBase as any),
      working_memory,
      last_two_cfu_pass_rates: typeof cfu_mean === "number" ? cfu_mean : undefined
    }
  });

  const postSnapshot = {
    pace_factor: postPlan.pace_factor,
    scaffold_level: postPlan.scaffold_level,
    problem_novelty: postPlan.problem_novelty,
    cfu_frequency: postPlan.cfu_frequency,
    working_memory_supports: postPlan.working_memory_supports,
    processing_speed_supports: postPlan.processing_speed_supports,
    example_density: postPlan.example_density,
    homework_load: postPlan.homework_load,
    retention_spacing_days: postPlan.retention_spacing_days
  };

  const postEvidence = { cfu_mean, errors_consecutive_max };

  const ledgerAfterPostPlan = appendAudit(ledgerAfterMSKStore, {
    exec_id: hashOfObject({ route: "flt", event: "planning_update", phase: "post", ts: req.ts, postSnapshot, postEvidence }),
    route: "flt",
    budgets: { requested: req.budgets, granted: req.budgets, consumed: consumedBase },
    termination: "BOUNDED_OUTPUT",
    metrics: { SCS: 1, SCA: 1, SVR: 1, DIS: 1, CCI: 1 },
    provenance: { sources: [] },
    prev_hash: ledgerAfterMSKStore.head,
    event: "planning_update",
    event_data: { phase: "post", ts: req.ts, snapshot: postSnapshot, evidence: postEvidence }
  });

  const postStoreResp = req.pk.submitDelta({
    sk_code: "FLT",
    ts: req.ts,
    scope: "profile",
    payload: {
      topic_state: {
        event: "planning_update",
        phase: "post",
        ts: req.ts,
        snapshot: postSnapshot,
        evidence: postEvidence
      }
    }
  });

  if (!postStoreResp.ok) {
    const ledger = appendAudit(ledgerAfterPostPlan, {
      exec_id: hashOfObject({ route: "flt", stage: "PK_SYNC", op: "planning_store_post", req, postStoreResp }),
      route: "flt",
      budgets: { requested: req.budgets, granted: req.budgets, consumed: consumedBase },
      termination: postStoreResp.termination,
      metrics: { SCS: 1, SCA: 1, SVR: 1, DIS: 1, CCI: 1 },
      provenance: { sources: [] },
      prev_hash: ledgerAfterPostPlan.head,
      event: "pk_sync_planning_store_refusal",
      event_data: { phase: "post", ts: req.ts }
    });
    return { ...postStoreResp, ledger };
  }

  /* ============================
     EVIDENCE_GATE
     ============================ */
  const metrics = computeCCI({
    SCS: skOut.metrics?.SCS ?? 0.98,
    SCA: skOut.metrics?.SCA ?? 0.9,
    SVR: skOut.metrics?.SVR ?? 0.8,
    DIS: skOut.metrics?.DIS ?? 1.0
  });

  const gate = evidenceGate(metrics, !!req.budgets.citations_required, skOut.provenance?.sources ?? []);

  if ("ok" in gate && gate.ok === false) {
    const ledger = appendAudit(ledgerAfterPostPlan, {
      exec_id: hashOfObject({ route: "flt", stage: "EVIDENCE_GATE", req }),
      route: "flt",
      budgets: { requested: req.budgets, granted: req.budgets, consumed: consumedBase },
      termination: gate.termination,
      metrics,
      provenance: { sources: skOut.provenance?.sources ?? [] },
      prev_hash: ledgerAfterPostPlan.head,
      event: "evidence_gate_refusal",
      event_data: { ts: req.ts }
    });
    return { ...gate, ledger };
  }

  /* ============================
     EMIT — bounded
     ============================ */
  const output = {
    route: "flt",
    status: gate.status,
    sk_output: skOut.output
  };

  const ledger = appendAudit(ledgerAfterPostPlan, {
    exec_id: hashOfObject({ route: "flt", stage: "EMIT", req, output }),
    route: "flt",
    budgets: {
      requested: req.budgets,
      granted: req.budgets,
      consumed: { ...consumedBase, tokens_out: 250 }
    },
    termination: "BOUNDED_OUTPUT",
    metrics,
    provenance: { sources: skOut.provenance?.sources ?? [] },
    prev_hash: ledgerAfterPostPlan.head,
    event: "emit",
    event_data: { ts: req.ts, gate_status: gate.status }
  });

  return { ok: true, termination: "BOUNDED_OUTPUT", output, ledger };
}
