import type { CDM } from "./types.js";

export type MergeMeta = Record<string, { confidence: number; ts: string }>;

export type MergeResult = {
  next: CDM;
  next_meta: MergeMeta;
  applied: boolean;
  reasons: string[];
};

// Deterministic Merge Engine (DME)
// - No destructive downgrades
// - Union for sets (dedupe, case-normalize, stable sort)
// - Strongest signal wins; tie -> most recent ts
export function deterministicMerge(
  prior: CDM,
  prior_meta: MergeMeta,
  deltaWrites: any,
  confidence: number,
  ts: string
): MergeResult {
  const reasons: string[] = [];
  const next: CDM = structuredClone(prior);
  const meta: MergeMeta = structuredClone(prior_meta);

  let applied = false;

  function setField(path: string, value: any): boolean {
    const prev = meta[path];
    if (!prev) {
      meta[path] = { confidence, ts };
      writePath(next as any, path, value);
      return true;
    }
    if (confidence > prev.confidence || (confidence === prev.confidence && ts > prev.ts)) {
      meta[path] = { confidence, ts };
      writePath(next as any, path, value);
      return true;
    }
    reasons.push(`Skipped lower-confidence write to ${path}`);
    return false;
  }

  // preferences.style
  if (deltaWrites?.preferences?.style) {
    applied = setField("preferences.style", deltaWrites.preferences.style) || applied;
  }

  // topic_states.<SK> passthrough (caller ensures bounded size)
  if (deltaWrites?.topic_states) {
    for (const [k, v] of Object.entries(deltaWrites.topic_states)) {
      applied = setField(`topic_states.${k}`, v) || applied;
    }
  }

  // union sets for capabilities (if present)
  if (deltaWrites?.capabilities) {
    const keys: Array<keyof NonNullable<CDM["capabilities"]>> = ["languages", "instruments", "sports", "tech_stack"];
    for (const key of keys) {
      if (!deltaWrites.capabilities[key]) continue;
      const priorArr = normSet((next.capabilities as any)?.[key]);
      const deltaArr = normSet(deltaWrites.capabilities[key]);
      const merged = normSet([...priorArr, ...deltaArr]);
      applied = setField(`capabilities.${String(key)}`, merged) || applied;
    }
  }

  return { next, next_meta: meta, applied, reasons };
}

function normSet(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const dedup = new Set(
    arr
      .filter((x) => typeof x === "string")
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
      .map((x) => x.toLowerCase())
  );
  return Array.from(dedup).sort();
}

function writePath(obj: any, path: string, value: any) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i]!;
    cur[k] = cur[k] ?? {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]!] = value;
}
