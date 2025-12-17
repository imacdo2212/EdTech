import { refusal, type Refusal } from "./errors.js";

export type Budgets = {
  tokens_output_max: number;
  time_ms: number;
  mem_mb: number;
  depth_max: number;
  clarifying_questions_max: number;
  web_requests_max?: number;
  citations_required?: boolean;
};

export type BudgetConsume = {
  tokens_out: number;
  time_ms: number;
  mem_mb: number;
  depth: number;
  web_requests?: number;
};

export function enforceBudgetCaps(b: Budgets, c: BudgetConsume): Refusal | null {
  if (c.depth > b.depth_max) return refusal("BOUND_DEPTH", "Depth budget exceeded.", ["Reduce to one stage/action."]);
  if (c.tokens_out > b.tokens_output_max) return refusal("BOUND_TOKENS", "Output token budget exceeded.", ["Request a shorter output."]);
  if (c.time_ms > b.time_ms) return refusal("BOUND_TIME", "Time budget exceeded.", ["Try a smaller request."]);
  if (c.mem_mb > b.mem_mb) return refusal("BOUND_MEM", "Memory budget exceeded.", ["Reduce payload size."]);
  if (typeof b.web_requests_max === "number" && (c.web_requests ?? 0) > b.web_requests_max) {
    return refusal("BOUND_DEPTH", "Web request budget exceeded.", ["Reduce lookups."]);
  }
  return null;
}
