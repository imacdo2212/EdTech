import type { MSKStage } from "../types.js";

export type TutorRenderInput = {
  stage: MSKStage;
  plan: {
    scaffold_level?: string;
    pace_factor?: number;
  };
  topic_state?: any;
  user_input: any;
};

export type TutorRenderOutput = {
  reply: string;
  checks: string[];
  next_hint: string;
  verification_checks: string[];
};

export interface TutorRenderer {
  render(input: TutorRenderInput): TutorRenderOutput;
}
