import type {
  TutorRenderer,
  TutorRenderInput,
  TutorRenderOutput
} from "./types.js";

/**
 * LLM-backed tutor renderer.
 *
 * Invariants:
 * - language only
 * - no authority
 * - bounded output
 *
 * NOTE:
 * This implementation is intentionally inert.
 */
export class LLMRenderer implements TutorRenderer {
  private apiKey: string;

  constructor(opts: { apiKey: string }) {
    if (!opts.apiKey) {
      throw new Error("LLMRenderer requires an API key");
    }
    this.apiKey = opts.apiKey;
  }

  render(_input: TutorRenderInput): TutorRenderOutput {
    throw new Error(
      "LLMRenderer.render() not implemented yet. Use MockLLMRenderer or DeterministicRenderer."
    );
  }
}
