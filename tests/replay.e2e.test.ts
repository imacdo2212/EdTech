import { describe, it, expect } from "vitest";
import { runTutorTurn } from "../src/index.js";

/**
 * End-to-end deterministic replay test.
 *
 * Invariant:
 *   identical input → identical output + identical audit head
 *
 * This test exercises:
 *   index.ts
 *   FLT
 *   PK1
 *   MSK
 *   audit hash chaining
 */
describe("Deterministic replay (end-to-end)", () => {
  it("produces identical output, profile, and audit hash for identical input", () => {
    const input = {
      learner_id: "learner-42",
      ts: "2025-12-16T12:00:00Z",
      budgets: {
        tokens_output_max: 900,
        time_ms: 60000,
        mem_mb: 512,
        depth_max: 6,
        clarifying_questions_max: 3,
        citations_required: false
      },
      onboarding: {
        student_profile: {
          student_id: "s42",
          stage: "x",
          onboarding_state: {
            status: "completed",
            started_at: null,
            completed_at: "2025-01-01T00:00:00Z",
            expires_after_days: 365
          }
        }
      },
      user_input: {
        control: "advance",
        problem: "Solve x^2 - 5x + 6 = 0",
        topic: "quadratics",
        area: "algebra",
        difficulty: "easy",
        symbols: ["x"],
        formula_keys: ["quadratic_formula"],
        cfu_results: [true, true],
        errors_consecutive_max: 0,
        working_memory_band: "high"
      }
    };

    const runOnce = () => {
      const result = runTutorTurn(input);
      return {
        output: result.output,
        profile: result.profile,
        ledgerHead: result.ledger.head
      };
    };

    const a = runOnce();
    const b = runOnce();

    // 1) Output must be identical
    expect(a.output).toEqual(b.output);

    // 2) Profile state must be identical
    expect(a.profile).toEqual(b.profile);

    // 3) Audit ledger head hash must be identical
    expect(a.ledgerHead).toBe(b.ledgerHead);
  });
});
