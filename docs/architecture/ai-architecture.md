# AI architecture

## Current contract

DashboardPlanner generates DashboardSpec v2 and edits DashboardPatch v2. MockDashboardPlanner remains a bounded demo implementation. StructuredDashboardPlanner receives authorized PlannerCapabilities, controlled tenant/market profile, approved semantic/template metadata and canonical schemas. It calls LLMProvider with a portable schema projection and accepts **unknown JSON**, never trusted domain objects. No provider generates SQL or React.

The provider-neutral projection removes unsupported schema keywords and translates constants for portable constrained generation. Canonical DashboardSpec/Patch schemas remain unchanged and authoritative. Output passes full JSON Schema, semantic/layout/visualization validation, patch application validation for edits, and authorized metric checks. API performs post-planning authorization again before execution. Compatible operation vocabulary is bounded, not an expression language.

Bounded repair attempts default to one and may be configured 0..2. Validation failures can request constrained repair; transport failures are surfaced without unlimited retries. Optional application diagnostics callbacks report generation/edit, attempt, schema name, stage and safe issues; API config alone reads environment and redacts/caps development diagnostics. Browser sees generic safe errors only.

## Provider boundary

OpenAI-compatible HTTP adapter in apps/api accepts base URL, model ID, optional API key and timeout. Application does not know endpoint hosting location or a specific model runtime. llama.cpp/Ollama/Bonsai are deployment examples only. See [endpoint setup](openai-compatible-provider.md), [configuration](../developer/configuration.md) and [privacy boundary](source-integration.md#llm-privacy-boundary).

Generate/edit execute previews and change working drafts; they never save records. Planner availability does not determine analytics liveness/readiness. Fake HTTP providers exercise transport and validation in CI; no running model server/customer data is required. [Tests](../../packages/application/test/structured-planner.test.ts), [transport tests](../../apps/api/test/openai-compatible.test.ts), [AI QA](../qa/ai-tests.md).
