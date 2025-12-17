import type { TutorRenderer, TutorRenderInput } from "./types.js";

/**
 * Deterministic mock LLM renderer.
 *
 * Simulates an LLM by:
 *  - echoing structured inputs
 *  - remaining fully deterministic
 *
 * Safe for replay + tests.
 */
export class MockLLMRenderer implements TutorRenderer {
  render(input: TutorRenderInput) {
    return {
      reply: `[MOCK-LLM | stage=${input.stage}] Let’s work on this step together.`,
      checks: input.stage === "identify" ? ["What is the unknown?"] : [],
      next_hint:
        input.stage === "solve"
          ? "none"
          : "advance",
      verification_checks:
        input.stage === "solve"
          ? ["Verify by substitution."]
          : []
    };
  }
}
