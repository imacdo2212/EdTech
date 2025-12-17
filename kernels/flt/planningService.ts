export type PlanningInput = {
  cognitive?: {
    band?: string;
    working_memory?: "high" | "above_average" | "average" | "below_average" | "developing";
    processing_speed?: "high" | "above_average" | "average" | "below_average" | "developing";
    last_two_cfu_pass_rates?: number; // 0..1
    overall_range?: [number, number];
  };
};

export function computePlan(input: PlanningInput) {
  const plan = {
    pace_factor: 1.0,
    scaffold_level: "standard" as const,
    problem_novelty: "standard",
    cfu_frequency: "per_major_step" as const,
    working_memory_supports: [] as string[],
    processing_speed_supports: [] as string[],
    example_density: "standard" as const,
    homework_load: "standard" as const,
    retention_spacing_days: [2, 7, 21] as number[]
  };

  const c = input.cognitive;
  if (!c) return plan;

  // Band-based mappings (existing subset already implemented)
  if (["high", "above_average"].includes(c.band ?? "")) {
    plan.problem_novelty = "high";
    plan.example_density = "sparse";
    plan.cfu_frequency = "section_end";
  }

  if (["below_average", "developing"].includes(c.band ?? "")) {
    plan.problem_novelty = "low";
    plan.example_density = "rich";
    plan.cfu_frequency = "per_minor_step";
  }

  // Processing speed rules (existing subset already implemented)
  if (c.processing_speed === "below_average" || c.processing_speed === "developing") {
    plan.pace_factor = 0.9;
    plan.homework_load = "light";
    plan.processing_speed_supports.push("extra_time_1_2");
  }

  if (c.processing_speed === "high" || c.processing_speed === "above_average") {
    plan.pace_factor = 1.2;
    plan.homework_load = "extended";
  }

  // Overall range spacing rules (existing subset already implemented)
  if (c.overall_range) {
    if (c.overall_range[1] >= 120) plan.retention_spacing_days = [3, 10, 30];
    if (c.overall_range[0] <= 90) plan.retention_spacing_days = [1, 4, 14];
  }

  // NEW (but explicitly from FLT blueprint): if WM high/above_average AND last_two_cfu_pass_rates ≥ 0.80 => minimal
  if (
    (c.working_memory === "high" || c.working_memory === "above_average") &&
    typeof c.last_two_cfu_pass_rates === "number" &&
    c.last_two_cfu_pass_rates >= 0.8
  ) {
    plan.scaffold_level = "minimal";
  }

  return plan;
}
