import { hashOfObject } from "./hashing.js";
import type { Termination } from "./errors.js";
import type { Budgets, BudgetConsume } from "./budgets.js";

export type EvidenceMetrics = { SCS: number; SCA: number; SVR: number; DIS: number; CCI: number };

export type AuditEnvelope = {
  exec_id: string;
  route: "flt" | "pk1" | "msk";
  budgets: { requested: Budgets; granted: Budgets; consumed: BudgetConsume };
  termination: Termination;
  metrics: EvidenceMetrics;
  provenance: { sources: string[] };

  // Optional event channel for FLT templates (e.g., planning_update, onboarding_step).
  // This does not change any invariants; it is purely audited metadata.
  event?: string;
  event_data?: any;

  prev_hash: string;
  hash: string;
};

export type AuditLedger = {
  entries: AuditEnvelope[];
  head: string; // last hash
};

export function initLedger(): AuditLedger {
  const genesis = "0".repeat(64);
  return { entries: [], head: genesis };
}

export function appendAudit(ledger: AuditLedger, entryNoHash: Omit<AuditEnvelope, "hash">): AuditLedger {
  const hash = hashOfObject({ ...entryNoHash, hash: "" });
  const full: AuditEnvelope = { ...entryNoHash, hash };
  return { entries: [...ledger.entries, full], head: hash };
}
