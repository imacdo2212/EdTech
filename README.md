# EDU Stack (FLT → PK1 → MSK) — Deterministic Build

## Invariants
- Every call ends in `BOUNDED_OUTPUT` or `REFUSAL(code)`.
- No background work.
- No parallel SK calls; one SK per turn.
- Deterministic replay: identical inputs (including budgets + ts fields) produce identical outputs and identical audit hashes.
- PK1 is consent-first: no writes without `consent.status=granted` and `profile.write` scope; no reads without `profile.read`.
- Unknown fields are rejected (schema `additionalProperties: false` at enforced boundaries).

## Refusal Codes
- FLT: `ENTROPY_CLARITY`, `ONBOARD_REQUIRED`, `BOUND_*`, `SAFETY_POLICY`, `EVIDENCE_FAIL`, `DIS_INSUFFICIENT`, `CONFLICT_PST`.
- PK1: `PK-REF-CONSENT`, `PK-REF-SCHEMA`, `PK-REF-SCOPE`, `PK-REF-CONFLICT`.

## Replay Guarantees
- `exec_id` is derived deterministically via sha256 over stable JSON of inputs.
- Audit ledger is append-only, hash-chained (`prev_hash` -> `hash`).
- Stable JSON stringify sorts keys recursively.

## How to Run
- `npm test`
- `npm run typecheck`
