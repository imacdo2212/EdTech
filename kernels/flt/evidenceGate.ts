import { refusal, type Refusal } from "../../shared/errors.js";
import type { EvidenceMetrics } from "../../shared/audit.js";

export function computeCCI(m: Omit<EvidenceMetrics, "CCI">): EvidenceMetrics {
  const CCI = (m.SCS * 0.4) + (m.SCA * 0.2) + (m.SVR * 0.2) + (m.DIS * 0.2);
  return { ...m, CCI };
}

export function evidenceGate(
  metrics: EvidenceMetrics,
  citationsRequired: boolean,
  sources: string[]
): { status: "Green" | "Yellow" } | Refusal {
  if (citationsRequired && sources.length === 0) {
    // per FLT: missing sources => at best Yellow, but if also low CCI => refusal
    if (metrics.CCI < 0.70) return refusal("EVIDENCE_FAIL", "Missing sources and evidence confidence too low.", ["Provide references or simplify claims."]);
    return { status: "Yellow" };
  }
  if (metrics.CCI >= 0.85) return { status: "Green" };
  if (metrics.CCI >= 0.70) return { status: "Yellow" };
  return refusal("EVIDENCE_FAIL", "Evidence confidence too low.", ["Add verification or reduce scope."]);
}
