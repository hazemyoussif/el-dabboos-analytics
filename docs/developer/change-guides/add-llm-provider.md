# Add an LLM provider

Current extension checklist; inspect implementation and [system design](../../architecture/system-design.md) before changing contracts.

1. Implement LLMProvider structured output contract; return unknown output and safe transport metadata.
2. Keep HTTP/runtime-specific implementation at adapter composition boundary, not routes/application.
3. Use portable provider schema while preserving full canonical spec/patch validators and semantic/post-output authorization.
4. Bound timeout/response/repair behavior; redact credentials and prompts from logs/errors.
5. Approve privacy of authorized metadata, user instructions and working-spec identifiers before external deployment.
6. Test fake HTTP transport + invalid output/patch/authorization + disabled/mock fallback configuration; no live model required in CI.
7. Do not add model-runtime fields, SQL, React or arbitrary expressions to DashboardSpec.

**File path starting points:** domain LLMProvider; application/structured-planner.ts; API providers/. Paths under packages/ or apps/ as named. Use [repository map](../../architecture/repository-map.md).

Run owning-layer targeted tests while developing, then [full verification](../testing-guide.md) and applicable [manual smoke](../../qa/smoke-tests.md). Document intentional new invariants in an ADR; no unrelated redesign.
