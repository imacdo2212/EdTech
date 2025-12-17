import type { TutorRenderOutput } from "./types.js";
import type { RendererUsage } from "./budget.js";

export function guardRenderedOutput(
  out: any,
  opts: { maxChars: number }
): { output: TutorRenderOutput; usage: RendererUsage } {
  if (!out || typeof out !== "object") {
    throw new Error("Renderer output must be an object");
  }

  const allowedKeys = [
    "reply",
    "checks",
    "next_hint",
    "verification_checks"
  ];

  for (const k of Object.keys(out)) {
    if (!allowedKeys.includes(k)) {
      throw new Error(`Renderer output contains illegal field: ${k}`);
    }
  }

  if (typeof out.reply !== "string") {
    throw new Error("Renderer.reply must be a string");
  }

  if (!Array.isArray(out.checks) || !out.checks.every((x: any) => typeof x === "string")) {
    throw new Error("Renderer.checks must be string[]");
  }

  if (typeof out.next_hint !== "string") {
    throw new Error("Renderer.next_hint must be a string");
  }

  if (
    !Array.isArray(out.verification_checks) ||
    !out.verification_checks.every((x: any) => typeof x === "string")
  ) {
    throw new Error("Renderer.verification_checks must be string[]");
  }

  const usedChars =
    out.reply.length +
    out.next_hint.length +
    out.checks.join("").length +
    out.verification_checks.join("").length;

  if (usedChars > opts.maxChars) {
    throw new Error(
      `Renderer output exceeds budget: ${usedChars} > ${opts.maxChars} chars`
    );
  }

  return {
    output: out as TutorRenderOutput,
    usage: { usedChars, maxChars: opts.maxChars }
  };
}
