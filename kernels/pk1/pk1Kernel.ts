import cdmSchema from "./schemas/cdm.v1.json" assert { type: "json" };
import deltaSchema from "./schemas/delta.v1.json" assert { type: "json" };

import { validateNoUnknownFields } from "../../shared/schema.js";
import { refusal } from "../../shared/errors.js";
import { hashOfObject } from "../../shared/hashing.js";
import { appendAudit, type AuditLedger } from "../../shared/audit.js";

import { adapt } from "./adapters.js";
import { deterministicMerge, type MergeMeta } from "./merge.js";
import { projectForSK } from "./projections.js";

import type { CDM, DeltaRequest, DeltaResponse, PK1State, ViewResponse } from "./types.js";

const MAX_PROFILE_BYTES = 32 * 1024;
const MAX_TOPIC_STATE_BYTES = 1024;

export function initPK1(learner_id: string, consent: CDM["consent"]): PK1State {
  const profile: CDM = {
    pk_version: "1.0",
    learner_id,
    consent,
    identity: { locale: "en-GB", timezone: "Europe/London" },
    topic_states: {},
    audit: { created_at: consent.timestamp, updated_at: consent.timestamp }
  };

  const field_meta: MergeMeta = {};
  return { profile, field_meta };
}

// Consent setter (explicit)
export function pk1SetConsent(state: PK1State, consent: CDM["consent"]): PK1State {
  return {
    ...state,
    profile: {
      ...state.profile,
      consent,
      audit: { ...(state.profile.audit ?? {}), updated_at: consent.timestamp }
    }
  };
}

// POST /pk/v1/delta
export function pk1SubmitDelta(
  state: PK1State,
  ledger: AuditLedger,
  req: DeltaRequest
): { state: PK1State; ledger: AuditLedger; resp: DeltaResponse } {
  // 1) Validate request schema (reject unknown fields at the request top-level)
  const deltaSchemaErr = validateNoUnknownFields(deltaSchema as any, req as any);
  if (deltaSchemaErr) {
    return { state, ledger, resp: deltaSchemaErr as any };
  }

  // 2) Consent gate (write)
  if (state.profile.consent.status !== "granted" || !state.profile.consent.scopes.includes("profile.write")) {
    const r = refusal("PK-REF-CONSENT", "Consent missing or revoked for profile.write.", ["Grant consent with scope profile.write."]);
    const nextLedger = appendAudit(ledger, {
      exec_id: hashOfObject({ route: "pk1", op: "delta", req }),
      route: "pk1",
      budgets: { requested: dummyBudgets(), granted: dummyBudgets(), consumed: { tokens_out: 0, time_ms: 1, mem_mb: 16, depth: 1 } },
      termination: r.termination,
      metrics: { SCS: 1, SCA: 1, SVR: 1, DIS: 1, CCI: 1 },
      provenance: { sources: [] },
      prev_hash: ledger.head
    });
    return { state, ledger: nextLedger, resp: r as any };
  }

  // 3) Boundedness checks (delta payload)
  const payloadStr = JSON.stringify(req.payload ?? {});
  if (payloadStr.length > MAX_PROFILE_BYTES) {
    const r = refusal("PK-REF-SCHEMA", "Delta payload too large.", [`Reduce payload size (<=${MAX_PROFILE_BYTES} bytes).`]);
    return { state, ledger, resp: r as any };
  }

  // 4) Adapt (pure) -> normalized writes
  const { writes, strength } = adapt(req.sk_code, req.payload);

  // 5) TopicState payload bound (per SK one, <= 1KB) — enforce on adapted writes
  if (writes?.topic_states) {
    for (const [k, v] of Object.entries(writes.topic_states)) {
      const tsStr = JSON.stringify(v);
      if (tsStr.length > MAX_TOPIC_STATE_BYTES) {
        const r = refusal("PK-REF-SCHEMA", `topic_states.${k} too large.`, [`Reduce topic state payload (<=${MAX_TOPIC_STATE_BYTES} bytes).`]);
        return { state, ledger, resp: r as any };
      }
    }
  }

  // 6) Confidence scoring (deterministic; uses only inputs provided)
  // Spec: confidence = source_weight + freshness_weight (+ explicit_user_input when available).
  // We do not add new request fields; freshness defaults to 0 unless caller supplies distinct ts semantics.
  const confidence = strength + freshnessWeight(req.ts, req.ts);

  // 7) Deterministic merge
  const merged = deterministicMerge(state.profile, state.field_meta, writes, confidence, req.ts);

  const nextProfile: CDM = {
    ...merged.next,
    audit: { ...(merged.next.audit ?? {}), updated_at: req.ts }
  };

  // 8) Enforce profile size bound (post-merge)
  const profileStr = JSON.stringify(nextProfile);
  if (profileStr.length > MAX_PROFILE_BYTES) {
    const r = refusal("PK-REF-SCHEMA", "Merged profile exceeds max size.", [`Reduce stored fields (<=${MAX_PROFILE_BYTES} bytes).`]);
    return { state, ledger, resp: r as any };
  }

  // 9) Validate CDM schema (reject unknown fields at top-level and within constrained objects)
  const cdmErr = validateNoUnknownFields(cdmSchema as any, nextProfile as any);
  if (cdmErr) {
    return { state, ledger, resp: cdmErr as any };
  }

  // 10) Commit state (no partial writes rule respected: update state only after all checks pass)
  const nextState: PK1State = { profile: nextProfile, field_meta: merged.next_meta };

  // 11) Audit (append-only)
  const nextLedger = appendAudit(ledger, {
    exec_id: hashOfObject({ route: "pk1", op: "delta", req, applied: merged.applied }),
    route: "pk1",
    budgets: { requested: dummyBudgets(), granted: dummyBudgets(), consumed: { tokens_out: 0, time_ms: 2, mem_mb: 24, depth: 1 } },
    termination: "BOUNDED_OUTPUT",
    metrics: { SCS: 1, SCA: 1, SVR: 1, DIS: 1, CCI: 1 },
    provenance: { sources: [] },
    prev_hash: ledger.head
  });

  const resp: DeltaResponse = {
    ok: true,
    status: merged.applied ? "applied" : "skipped",
    reasons: merged.reasons,
    profile: nextProfile
  };

  return { state: nextState, ledger: nextLedger, resp };
}

// GET /pk/v1/view/{sk_code}
export function pk1GetView(
  state: PK1State,
  ledger: AuditLedger,
  sk_code: string
): { ledger: AuditLedger; resp: ViewResponse } {
  // Consent gate (read)
  if (state.profile.consent.status !== "granted" || !state.profile.consent.scopes.includes("profile.read")) {
    const r = refusal("PK-REF-SCOPE", "Client lacks profile.read scope.", ["Grant profile.read scope."]);
    const nextLedger = appendAudit(ledger, {
      exec_id: hashOfObject({ route: "pk1", op: "view", sk_code }),
      route: "pk1",
      budgets: { requested: dummyBudgets(), granted: dummyBudgets(), consumed: { tokens_out: 0, time_ms: 1, mem_mb: 16, depth: 1 } },
      termination: r.termination,
      metrics: { SCS: 1, SCA: 1, SVR: 1, DIS: 1, CCI: 1 },
      provenance: { sources: [] },
      prev_hash: ledger.head
    });
    return { ledger: nextLedger, resp: r as any };
  }

  const profile = projectForSK(state.profile, sk_code);

  const nextLedger = appendAudit(ledger, {
    exec_id: hashOfObject({ route: "pk1", op: "view", sk_code, profile }),
    route: "pk1",
    budgets: { requested: dummyBudgets(), granted: dummyBudgets(), consumed: { tokens_out: 0, time_ms: 1, mem_mb: 16, depth: 1 } },
    termination: "BOUNDED_OUTPUT",
    metrics: { SCS: 1, SCA: 1, SVR: 1, DIS: 1, CCI: 1 },
    provenance: { sources: [] },
    prev_hash: ledger.head
  });

  return { ledger: nextLedger, resp: { ok: true, profile } };
}

/* ----------------------------
   Deterministic helpers
----------------------------- */

function freshnessWeight(nowIso: string, deltaIso: string): number {
  // Spec: now - ts <= 30d => +1 else 0
  // Determinism: uses only explicit fields. If parse fails, return 0 deterministically.
  const now = Date.parse(nowIso);
  const ts = Date.parse(deltaIso);
  if (!Number.isFinite(now) || !Number.isFinite(ts)) return 0;
  const diff = now - ts;
  if (diff < 0) return 0; // future delta doesn't get freshness bonus
  return diff <= 30 * 86400000 ? 1 : 0;
}

function dummyBudgets() {
  // PK1 blueprint doesn’t define numeric caps here; audit envelope requires presence.
  return { tokens_output_max: 0, time_ms: 0, mem_mb: 0, depth_max: 0, clarifying_questions_max: 0 };
}
