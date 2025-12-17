export type RefusalCode =
  | "ENTROPY_CLARITY"
  | "ONBOARD_REQUIRED"
  | "PK_REF_CONSENT"
  | "PK-REF-CONSENT"
  | "PK-REF-SCHEMA"
  | "PK-REF-SCOPE"
  | "PK-REF-CONFLICT"
  | "DIS_INSUFFICIENT"
  | "BOUND_DEPTH"
  | "BOUND_TOKENS"
  | "BOUND_TIME"
  | "BOUND_MEM"
  | "SAFETY_POLICY"
  | "EVIDENCE_FAIL"
  | "CONFLICT_PST"
  | "STYLE_FAIL";

export type Termination = `REFUSAL(${RefusalCode})` | "BOUNDED_OUTPUT";

export type Refusal = {
  ok: false;
  termination: `REFUSAL(${RefusalCode})`;
  cause: string;
  next_steps: string[]; // <=3
};

export function refusal(code: RefusalCode, cause: string, nextSteps: string[]): Refusal {
  return {
    ok: false,
    termination: `REFUSAL(${code})`,
    cause,
    next_steps: nextSteps.slice(0, 3)
  };
}
