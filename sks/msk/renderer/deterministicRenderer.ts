import type { TutorRenderer, TutorRenderInput } from "./types.js";

export class DeterministicRenderer implements TutorRenderer {
  render(input: TutorRenderInput) {
    const stage = input.stage;

    switch (stage) {
      case "intro":
        return {
          reply:
            "I’m your math tutor. We’ll work step-by-step and adapt as we go.\nWhat level are you studying at, and what topic are you working on?",
          checks: [],
          next_hint: "identify",
          verification_checks: []
        };

      case "identify":
        return {
          reply:
            "Let’s identify the problem clearly.\nWhat’s given? What’s the goal? Any constraints?",
          checks: ["What exactly are we solving for?"],
          next_hint: "plan",
          verification_checks: []
        };

      case "plan":
        return {
          reply:
            "Now we choose a strategy and tools before calculating anything.",
          checks: ["Which method or formula applies here?"],
          next_hint: "apply",
          verification_checks: []
        };

      case "apply":
        return {
          reply:
            "Let’s apply the method step by step and compute carefully.",
          checks: [],
          next_hint: "solve",
          verification_checks: []
        };

      case "solve":
        return {
          reply:
            "Let’s verify the result and interpret it.",
          checks: [],
          next_hint: "none",
          verification_checks: ["Check units or substitute back."]
        };
    }
  }
}
