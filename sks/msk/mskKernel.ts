import type {
  MSKRouteRequest,
  MSKRouteResponse,
  MSKStage,
  MSKPerformance
} from "./types.js";

import { DeterministicRenderer } from "./renderer/deterministicRenderer.js";
import type { TutorRenderer } from "./renderer/types.js";
import { guardRenderedOutput } from "./renderer/guard.js";
import { hashOfObject } from "../../shared/hashing.js";
import { appendAudit } from "../../shared/audit.js";

const defaultRenderer: TutorRenderer = new DeterministicRenderer();

const RENDER_BUDGET = { maxChars: 1200 };

export function mskRoute(
  req: MSKRouteRequest,
  renderer: TutorRenderer = defaultRenderer
): MSKRouteResponse {
  const stage = resolveStage(req);
  const performance = computePerformance(req.user_input);
  const topic_state_delta = computeTopicStateDelta(stage, req.user_input);

  const rawRendered = renderer.render({
    stage,
    plan: req.plan,
    topic_state: req.projection?.topic_states?.MSK,
    user_input: req.user_input
  });

  const { output: rendered, usage } = guardRenderedOutput(
    rawRendered,
    RENDER_BUDGET
  );

  const ledger = appendAudit(req.ledger, {
    exec_id: hashOfObject({
      route: "msk",
      event: "renderer_budget",
      stage,
      usage
    }),
    route: "msk",
    budgets: {
      requested: { renderer_chars: RENDER_BUDGET.maxChars },
      granted: { renderer_chars: RENDER_BUDGET.maxChars },
      consumed: { renderer_chars: usage.usedChars }
    },
    termination: "BOUNDED_OUTPUT",
    metrics: { SCS: 1, SCA: 1, SVR: 1, DIS: 1, CCI: 1 },
    provenance: { sources: [] },
    prev_hash: req.ledger.head,
    event: "renderer_budget",
    event_data: { stage, usage }
  });

  return {
    output: {
      stage,
      reply: rendered.reply,
      checks: rendered.checks,
      next_hint: rendered.next_hint,
      verification_checks: rendered.verification_checks,
      controls: "advance | stay | rewind"
    },
    provenance: { sources: [] },
    metrics: { SCS: 0.98, SCA: 0.9, SVR: 0.8, DIS: 1.0 },
    performance,
    topic_state_delta,
    ledger
  };
}

/* helpers unchanged */

function resolveStage(req: MSKRouteRequest): MSKStage {
  const ctrl = req.user_input?.control;

  if (ctrl === "rewind") return "identify";
  if (ctrl === "advance") {
    if (req.stage_hint === "identify") return "plan";
    if (req.stage_hint === "plan") return "apply";
    if (req.stage_hint === "apply") return "solve";
  }

  if (req.plan?.scaffold_level === "rich") return "identify";
  if (req.plan?.scaffold_level === "minimal" && req.stage_hint === "identify") {
    return "plan";
  }

  return req.stage_hint ?? "intro";
}

function computePerformance(user_input: any): MSKPerformance {
  const cfu = user_input?.cfu_results;
  const errs = user_input?.errors_consecutive_max;

  return {
    cfu_pass_rate:
      Array.isArray(cfu) && cfu.length
        ? cfu.filter(Boolean).length / cfu.length
        : null,
    errors_consecutive_max:
      typeof errs === "number" ? errs : null
  };
}

function computeTopicStateDelta(stage: MSKStage, user_input: any) {
  return {
    stage,
    topic: user_input?.topic,
    area: user_input?.area,
    difficulty: user_input?.difficulty
  };
}
