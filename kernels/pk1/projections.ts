import type { CDM } from "./types.js";

// Least-privilege projections (deterministic field order)
export function projectForSK(profile: CDM, sk_code: string): any {
  if (sk_code === "MSK") {
    return {
      preferences: profile.preferences ? { style: profile.preferences.style } : {},
      identity: profile.identity ? { education_level: profile.identity.education_level } : {},
      topic_states: profile.topic_states ? { MSK: profile.topic_states.MSK } : {}
    };
  }

  // Unknown SK in this build path: empty projection.
  return {};
}
