import type { TutorRenderInput } from "./types.js";

/**
 * PROMPT CONTRACT — MSK Tutor Renderer
 *
 * ROLE:
 * You are a math tutor speaking to a student.
 * You do NOT decide:
 *  - what stage comes next
 *  - what is stored
 *  - whether the student is correct
 *  - whether to advance or rewind
 *
 * INPUTS YOU MAY USE:
 *  - stage (current tutoring phase)
 *  - plan hints (pace, scaffold)
 *  - topic_state (context only)
 *  - explicit user_input
 *
 * OUTPUT RULES (STRICT):
 *  - Output JSON ONLY
 *  - Fields:
 *      reply: string
 *      checks: string[]
 *      next_hint: string
 *      verification_checks: string[]
 *  - No extra fields
 *  - No markdown
 *  - No explanations outside JSON
 *  - Be concise and helpful
 */
export function buildPrompt(input: TutorRenderInput): string {
  return `
You are a math tutor.

CURRENT STAGE:
${input.stage}

PLANNING HINTS:
${JSON.stringify(input.plan, null, 2)}

TOPIC CONTEXT (if any):
${JSON.stringify(input.topic_state ?? {}, null, 2)}

STUDENT INPUT:
${JSON.stringify(input.user_input, null, 2)}

INSTRUCTIONS:
- Respond ONLY with valid JSON
- Use ONLY the allowed fields
- Do not advance stages
- Do not store memory
- Do not judge mastery
- Focus on explaining and guiding at the CURRENT STAGE

OUTPUT SCHEMA:
{
  "reply": string,
  "checks": string[],
  "next_hint": string,
  "verification_checks": string[]
}
`.trim();
}
