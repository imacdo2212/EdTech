import { describe, it, expect } from "vitest";
import { initLedger } from "../src/shared/audit.js";
import {
  initPK1,
  pk1SetConsent,
  pk1SubmitDelta,
  pk1GetView
} from "../src/kernels/pk1/pk1Kernel.js";

describe("PK1 — acceptance tests", () => {
  it("REFUSAL(PK-REF-CONSENT) when consent missing on write", () => {
    const ledger = initLedger();
    let state = initPK1("learner-1", {
      status: "revoked",
      scopes: [],
      timestamp: "2025-12-16T00:00:00Z"
    });

    const r = pk1SubmitDelta(state, ledger, {
      sk_code: "MSK",
      ts: "2025-12-16T00:00:00Z",
      scope: "profile",
      payload: { preferred_style: "brief" }
    });

    expect(r.resp.ok).toBe(false);
    expect((r.resp as any).termination).toBe("REFUSAL(PK-REF-CONSENT)");
  });

  it("REFUSAL(PK-REF-SCOPE) when read scope missing", () => {
    const ledger = initLedger();
    const state = initPK1("learner-1", {
      status: "granted",
      scopes: ["profile.write"],
      timestamp: "2025-12-16T00:00:00Z"
    });

    const v = pk1GetView(state, ledger, "MSK");
    expect(v.resp.ok).toBe(false);
    expect((v.resp as any).termination).toBe("REFUSAL(PK-REF-SCOPE)");
  });

  it("rejects unknown fields in delta request (schema)", () => {
    const ledger = initLedger();
    const state = initPK1("learner-1", {
      status: "granted",
      scopes: ["profile.read", "profile.write"],
      timestamp: "2025-12-16T00:00:00Z"
    });

    const r = pk1SubmitDelta(state, ledger, {
      sk_code: "MSK",
      ts: "2025-12-16T00:00:00Z",
      scope: "profile",
      payload: {},
      illegal: 123
    } as any);

    expect(r.resp.ok).toBe(false);
    expect((r.resp as any).termination).toBe("REFUSAL(PK-REF-SCHEMA)");
  });

  it("applies MSK preferred_style and exposes via projection", () => {
    const ledger = initLedger();
    let state = initPK1("learner-1", {
      status: "granted",
      scopes: ["profile.read", "profile.write"],
      timestamp: "2025-12-16T00:00:00Z"
    });

    const d = pk1SubmitDelta(state, ledger, {
      sk_code: "MSK",
      ts: "2025-12-16T00:00:00Z",
      scope: "profile",
      payload: {
        preferred_style: "brief",
        topic_state: { stage: "identify", strand: "algebra" }
      }
    });

    expect(d.resp.ok).toBe(true);
    state = d.state;

    const v = pk1GetView(state, d.ledger, "MSK");
    expect(v.resp.ok).toBe(true);
    const profile = (v.resp as any).profile;

    expect(profile.preferences.style).toBe("brief");
    expect(profile.topic_states.MSK.stage).toBe("identify");
  });
});
