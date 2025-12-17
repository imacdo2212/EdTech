import { refusal } from "../../shared/errors.js";

export type OnboardDecision =
  | { route: "main_menu"; options: string[] }
  | { route: "onboarding"; banner: string; options: string[] }
  | { route: "welcome"; options: string[] };

export function decideOnboarding(sp: any, nowIso: string): OnboardDecision {
  if (!sp) {
    return { route: "welcome", options: ["load_existing_profile", "start_onboarding"] };
  }

  const state = sp.onboarding_state;
  if (state.status === "completed") {
    if (!state.completed_at) {
      return { route: "onboarding", banner: "Baseline incomplete.", options: ["resume_onboarding"] };
    }
    const completed = Date.parse(state.completed_at);
    const expiresMs = state.expires_after_days * 86400000;
    if (Date.parse(nowIso) - completed <= expiresMs) {
      return { route: "main_menu", options: ["teach", "practice", "exam", "review", "profile"] };
    }
    return {
      route: "onboarding",
      banner: "Your baseline is out of date. Please complete re-onboarding to continue.",
      options: ["re_onboard_now", "load_profile_readonly"]
    };
  }

  return {
    route: "onboarding",
    banner: "Onboarding required: we’ll run baseline and placement checks.",
    options: ["resume_onboarding", "restart_onboarding", "load_profile_readonly"]
  };
}
