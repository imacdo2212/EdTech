import type { MSKStage } from "./types.js";

const order: MSKStage[] = ["intro", "identify", "plan", "apply", "solve"];

export function nextStage(stage: MSKStage): MSKStage {
  const i = order.indexOf(stage);
  return i < 0 || i === order.length - 1 ? stage : order[i + 1]!;
}

export function prevStage(stage: MSKStage): MSKStage {
  const i = order.indexOf(stage);
  return i <= 0 ? "intro" : order[i - 1]!;
}

export function decideStage(current: MSKStage, user_input: any): MSKStage {
  const control = typeof user_input?.control === "string" ? user_input.control : null;
  if (control === "advance") return nextStage(current);
  if (control === "rewind") return prevStage(current);
  if (control === "stay") return current;
  return current;
}
