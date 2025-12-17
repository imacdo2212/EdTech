import { initLedger } from "./shared/audit.js";
import { initPK1 } from "./kernels/pk1/pk1Kernel.js";
import { fltRoute } from "./kernels/flt/fltKernel.js";
import { mskRoute } from "./sks/msk/mskKernel.js";

/**
 * Deterministic entry point.
 * All external I/O must be adapted into this shape.
 */
export function runTutorTurn(input: {
  learner_id: string;
  ts: string;
  budgets: any;
  onboarding: any;
  user_input: any;
}) {
  let ledger = initLedger();

  let pkState = initPK1(input.learner_id, {
    status: "granted",
    scopes: ["profile.read", "profile.write"],
    timestamp: input.ts
  });

  const resp = fltRoute({
    ts: input.ts,
    budgets: input.budgets,
    onboarding: input.onboarding,
    intent: "practice",
    user_input: input.user_input,
    ledger,
    pk: {
      submitDelta: (r: any) => {
        const out = pkState.submitDelta(ledger, r);
        pkState = out.state;
        ledger = out.ledger;
        return out.resp;
      },
      getView: (sk: string) => {
        const out = pkState.getView(ledger, sk);
        ledger = out.ledger;
        return out.resp;
      }
    },
    sk: { mskRoute }
  });

  return {
    output: resp.output,
    ledger: resp.ledger,
    profile: pkState.profile
  };
}
