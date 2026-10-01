# ADR-009: Structured-output LLM provider abstraction

Status: Accepted (amended October 2026)

Context: A free-text completion port did not express JSON Schema constrained generation or preserve the validation boundary. Local llama.cpp/Bonsai can now be connected through an OpenAI-compatible HTTP endpoint without moving provider details into routes or domain contracts.

Decision: `LLMProvider` accepts messages and a named, strict JSON Schema response format. It returns an unknown structured value plus provider ID, latency, and attempts. `StructuredDashboardPlanner` supplies only authorized capabilities, controlled tenant/market context, available semantic metadata, compatible template metadata, and the governed v2 schemas. It projects the canonical schemas to a bounded provider-facing keyword set and validates generated DashboardSpec objects and DashboardPatch edits with the unchanged canonical schema, semantic, and authorization checks; edits also validate the spec resulting from patch application. Invalid structured output receives at most two configured repair requests. The provider interface has no vendor SDK types, and the API composition root selects the implementation. Mock planning remains the default.

Alternatives: Free-text completion followed by ad hoc parsing; provider-specific planner contracts; provider logic inside API routes.

Consequences: A generic HTTP adapter can target a local llama.cpp OpenAI-compatible server. Fake HTTP tests verify protocol and validation boundaries without a model in CI. Real model quality and schema adherence require separate local evaluation. No provider may bypass the deterministic analytics engine or produce SQL, React, or chart-library configuration.
