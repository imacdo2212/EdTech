// PK1 Adapter Library (pure functions)
//
// Contract: adapt(sk_code, payload) => normalized writes into CDM fragments.
// Notes:
// - TopicState snapshots pass through under topic_states.{SK_CODE} unchanged (bounded in pk1Kernel).

export type AdapterResult = {
  writes: any;      // CDM-shaped partial
  strength: number; // source weight baseline
};

const CORE_WEIGHT = 2;
const OTHER_WEIGHT = 1;

function sourceWeight(sk_code: string): number {
  // Core(ESK, MSK, SSK)=2; Others=1
  return sk_code === "ESK" || sk_code === "MSK" || sk_code === "SSK" ? CORE_WEIGHT : OTHER_WEIGHT;
}

export function adapt(sk_code: string, payload: any): AdapterResult {
  const w = sourceWeight(sk_code);

  // FLT mapping (kernel client; allowed as "future kernels" / clients):
  // - topic_state passthrough -> topic_states.FLT (bounded elsewhere)
  if (sk_code === "FLT") {
    const writes: any = {};
    if (payload?.topic_state !== undefined && payload?.topic_state !== null) {
      writes.topic_states = { FLT: payload.topic_state };
    }
    return { writes, strength: w };
  }

  // MSK mapping (minimal, per blueprint examples):
  // - preferred_style -> preferences.style
  // - topic_state snapshot -> topic_states.MSK
  if (sk_code === "MSK") {
    const writes: any = {};

    if (payload?.preferred_style === "brief" || payload?.preferred_style === "detailed") {
      writes.preferences = { style: payload.preferred_style };
    }

    if (payload?.topic_state !== undefined && payload?.topic_state !== null) {
      writes.topic_states = { MSK: payload.topic_state };
    }

    return { writes, strength: w };
  }

  // Other SK adapters are defined in the full suite, but out-of-scope for this build path.
  return { writes: {}, strength: w };
}
