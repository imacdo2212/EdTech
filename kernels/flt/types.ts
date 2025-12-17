import type { Budgets } from "../../shared/budgets.js";
import type { AuditLedger } from "../../shared/audit.js";

export type FLTStage = "INIT" | "ONBOARD" | "PLAN" | "PK_SYNC" | "SK_ROUTE" | "EVIDENCE_GATE" | "AUDIT" | "EMIT";

export type StudentProfileOnboarding = {
  student_profile: null | {
    student_id: string;
    stage: string;
    onboarding_state: {
      status: "not_started" | "in_progress" | "completed" | "expired";
      started_at: string | null;
      completed_at: string | null;
      expires_after_days: number;
    };
  };
};

export type FLTState = {
  session_id: string;
  learner_id: string;
  stage: "init" | "onboard" | "plan" | "execute" | "reflect";
  profile_ref: string;
  plan: {
    pace_factor: number;
    scaffold_level: "standard" | "full" | "minimal";
    cfu_frequency: "per_major_step" | "per_minor_step" | "section_end";
    example_density: "standard" | "rich" | "sparse";
    homework_load: "light" | "standard" | "extended";
    retention_spacing_days: number[];
  };
  active_sk: "MSK";
  last_output_ref: string;
  audit_ref: string;
};

export type FLTRequest = {
  budgets: Budgets;
  onboarding: StudentProfileOnboarding;
  // determinism: caller provides ts for any freshness checks (not used unless needed)
  ts: string;
  intent: "teach" | "practice" | "exam" | "review" | "profile";
  sk_code?: "MSK";
  user_input: any;
  // PK1 wiring
  pk: {
    submitDelta: (req: any) => any;
    getView: (sk_code: string) => any;
  };
  // SK wiring (exactly one per turn)
  sk: {
    mskRoute: (req: any) => any;
  };
  ledger: AuditLedger;
};

export type FLTResponse =
  | { ok: true; termination: "BOUNDED_OUTPUT"; output: any; ledger: AuditLedger }
  | { ok: false; termination: string; cause: string; next_steps: string[]; ledger: AuditLedger };
