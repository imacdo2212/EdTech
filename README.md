MSK Tutor Stack (v1 — LLM-Ready, Math-First)
Overview

This repository implements a deterministic, auditable, math-first tutoring system built around a single guiding principle:

LLMs are used only to express tutoring decisions, never to make them.

The system is complete and production-ready for an MSK-exclusive (Math Side-Kick) tutor.
It is intentionally small, explicit, and replayable, with extensibility designed in from the start.

Math is the first (and currently only) domain because it forces correctness, bounded state, and clear progression — eliminating guesswork at the architectural level.

High-Level Architecture

The system is composed of four core components:

Entry (index.ts)
   ↓
FLT — Flow & Planning Kernel
   ↓
PK1 — Persistent Learner Profile
   ↓
MSK — Math Side-Kick (Tutor)


Each component has single ownership of responsibility and no hidden state.

Core Components
1. Entry Point (index.ts)

Single deterministic entry per turn

Adapts external input into the internal request shape

Owns no logic, no state, no policy

Enables full end-to-end replay

All external interfaces (HTTP, CLI, UI) must wrap this entry point.

2. FLT — Flow & Planning Kernel

Responsibilities

Owns tutoring flow

Enforces one-Side-Kick-per-turn

Runs planning logic (pace, scaffolding, CFU frequency)

Applies onboarding gates

Enforces budgets

Emits audit events

Notable Properties

Deterministic

Domain-agnostic

Side-Kick agnostic

Does not generate content

FLT decides what happens next, never how it is said.

3. PK1 — Persistent Profile Kernel

Responsibilities

Stores learner profile and topic state

Enforces consent on all writes

Applies deterministic merge rules

Provides least-privilege projections to Side-Kicks

Maintains hash-chained audit state

Key Invariant

Storage ≠ visibility

Side-Kicks can only see their own scoped state via projections.

4. MSK — Math Side-Kick

Responsibilities

Implements math tutoring stages:

intro → identify → plan → apply → solve

Emits bounded performance signals (CFU, error counts)

Produces a topic_state delta for continuity

Delegates all natural-language expression to a renderer

Important

MSK does not own flow

MSK does not own long-term memory

MSK does not decide correctness globally

LLM Usage (Non-Authoritative)
Design Position

This system does not require an LLM to function.

When enabled, an LLM is used only as a Tutor Renderer — effectively the voice of the tutor.

The LLM:

explains

asks guiding questions

adapts tone and phrasing

The LLM does not:

decide progression

store memory

judge mastery

modify state

control flow

bypass invariants

All authority remains with deterministic kernels.

Tutor Renderer Boundary
Renderer Interface
TutorRenderer.render(input) → {
  reply: string
  checks: string[]
  next_hint: string
  verification_checks: string[]
}

Renderer Implementations

DeterministicRenderer (default)

Fully deterministic

Used for replay and tests

MockLLMRenderer

Deterministic LLM-shaped renderer

Safe for tests and dry runs

LLMRenderer

API-token-based

Inert until explicitly implemented and enabled

Safety Guarantees

All renderer output is:

schema-validated

strictly bounded (character budget)

audited via a dedicated renderer budget audit event

Renderer output is never trusted implicitly.

Prompt Contract

When an LLM renderer is enabled, it is bound by a formal prompt contract:

Receives:

current stage

planning hints

scoped topic context

explicit user input

Produces:

JSON only

no extra fields

no markdown

no side effects

Violations are detectable and rejected.

Audit & Replay Guarantees
Audit Spine

Append-only

Hash-chained

Covers:

planning updates

state writes

refusals

renderer budget usage

emissions

Replay Guarantee

Identical inputs produce identical decisions, state, and audit hashes.

Natural-language phrasing produced by an LLM is explicitly non-authoritative and is not required to be bitwise replayable.

Refusal Model

All refusals are:

explicit

typed

auditable

Examples:

consent revoked

budget exceeded

schema violation

onboarding required

invariant violation

There are no silent failures.

Determinism & Safety Invariants

No hidden state

No background execution

No probabilistic control logic

No implicit memory

No Side-Kick authority over flow

No LLM authority over state or planning

Any future component must obey these invariants.

Current Scope (v1)

✅ Single Side-Kick: MSK (Math)

✅ Deterministic execution

✅ LLM-ready, but not LLM-dependent

✅ Production-sound architecture

❌ No additional domains enabled yet

❌ No persistence adapter (in-memory by default)

❌ No transport layer (HTTP/CLI wrappers are external)

This is an intentional stopping point.

Extensibility

Additional Side-Kicks (Language, Coding, Executive Skills, etc.) can be added by:

Implementing the Side-Kick interface

Defining scoped topic_states.{SK}

Wiring routing rules in FLT

No refactors to FLT, PK1, or audit are required.

Philosophy (Explicit)

This system is designed around a single architectural stance:

Do the hard work deterministically.
Let the LLM speak, not decide.

That choice:

minimizes guesswork

limits blast radius

preserves replayability

keeps the system small and understandable
