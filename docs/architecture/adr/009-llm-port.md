# ADR-009: Structured-output LLM provider abstraction

Status: Accepted (amended October 2026)

Context: A free-text completion port did not express JSON Schema constrained generation or preserve the validation boundary. A configured OpenAI-compatible model endpoint can now be connected without moving provider details into routes or domain contracts.

Decision: `LLMProvider` accepts messages and a named, strict JSON Schema response format. It returns an unknown structured value plus provider ID, latency, and attempts. `StructuredDashboardPlanner` supplies only authorized capabilities, controlled tenant/market context, available semantic metadata, compatible template metadata, and a compact application-owned DashboardGenerationPlan schema for generation (ADR 024). The application validates the plan and deterministically compiles canonical DashboardSpec v2. Editing requests sparse DashboardEditPlan (ADR-025), then deterministically compiles governed canonical DashboardPatch v2 internally. It projects these provider contracts to a bounded keyword set and validates compiled DashboardSpec objects and DashboardPatch edits with the full canonical schema, semantic, and authorization checks; edits also validate the spec resulting from patch application. Invalid structured output receives at most two configured repair requests. The provider interface has no vendor SDK types, and the API composition root selects the implementation. Mock planning remains the default.

Alternatives: Free-text completion followed by ad hoc parsing; provider-specific planner contracts; provider logic inside API routes.

Consequences: A generic HTTP adapter can target self-hosted, company-hosted, or external OpenAI-compatible endpoints. Fake HTTP tests verify protocol and validation boundaries without a model in CI. Model quality and schema adherence require evaluation against the selected endpoint. No provider may bypass the deterministic analytics engine or produce SQL, React, or chart-library configuration.
