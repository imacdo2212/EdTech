export type MSKStage = "intro" | "identify" | "plan" | "apply" | "solve";

export type MSKRouteRequest = {
  sk_code: "MSK";

  // Projection from PK1 (least privilege)
  projection: any;

  // Planning context from FLT
  plan: {
    scaffold_level?: "minimal" | "standard" | "rich";
    pace_factor?: number;
    cfu_frequency?: string;
  };

  // Advisory only — last known stable stage
  stage_hint?: MSKStage;

  // Explicit user input (authoritative)
  user_input: any;
};

export type MSKStrictOutput = {
  stage: MSKStage;
  reply: string;
  checks: string[];
  next_hint: string;
  verification_checks: string[];
  controls: string;
};

export type MSKPerformance = {
  cfu_pass_rate: number | null;
  errors_consecutive_max: number | null;
};

export type MSKRouteResponse = {
  output: MSKStrictOutput;
  provenance: { sources: string[] };
  metrics: { SCS: number; SCA: number; SVR: number; DIS: number };
  performance: MSKPerformance;

  // Bounded, advisory continuation state
  topic_state_delta?: {
    stage: MSKStage;
    topic?: string;
    area?: string;
    difficulty?: "easy" | "medium" | "hard";
  };
};
