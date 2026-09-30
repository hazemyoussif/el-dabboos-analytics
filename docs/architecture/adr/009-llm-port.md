# ADR-009: Structured-output LLM provider abstraction

Status: Accepted (amended September 2026)

Context: Local llama.cpp/Bonsai and Muse Spark may be evaluated later. A free-text completion port did not express JSON Schema constrained generation or preserve the validation boundary.

Decision: LLMProvider accepts messages and a named, strict JSON Schema response format. It returns an unknown structured value plus provider ID, latency, and attempts. DashboardPlanner validates that value against DashboardSpec or DashboardPatch schema and semantic rules before use. The provider interface contains no vendor SDK types.

Alternatives: Free-text completion followed by ad hoc parsing; provider-specific planner contracts.

Consequences: Adapters must support or emulate the structured-output contract when implemented. No provider adapter is included in this pass; correctness evaluations remain provider-neutral.
