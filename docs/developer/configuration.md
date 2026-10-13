# API configuration — owning reference

Current parser: [startup-config.ts](../../apps/api/src/startup-config.ts). Root [server.ts](../../apps/api/src/server.ts) calls it once before opening DBs/listening. Application/domain never read process.env. Parse tests use supplied maps, not developer files.

| Variable | Default | Validation / meaning |
| --- | --- | --- |
| ANALYTICS_PROVIDER | sqlite | sqlite, mock or explicitly configured postgres; see [mart operations](../integration/postgres-mart-operations.md) |
| DASHBOARD_PLANNER | mock | mock, structured or disabled |
| SQLITE_DB_PATH | repository demo.db | Nonblank, no NUL; analytics DB; explicit relative paths use process cwd |
| DASHBOARD_DB_PATH | repository dashboards.db | Nonblank, no NUL; required metadata persistence even for mock analytics |
| PORT | 3001 | Decimal integer 1..65535 |
| ANALYTICS_EXECUTION_CONCURRENCY | 8 | Decimal integer 1..64; unique queries per dashboard execution, not global process budget |
| LLM_BASE_URL | absent | Required when structured; HTTP(S), no embedded credentials/query/hash |
| LLM_MODEL_ID | absent | Required nonblank when structured |
| LLM_API_KEY | absent | Optional provider secret; never startup-logged |
| LLM_TEMPERATURE | 0 | Finite decimal 0..2; controlled planner sampling |
| LLM_MAX_TOKENS | 2048 | Decimal integer 1..65536; output ceiling |
| LLM_REASONING_BUDGET_TOKENS | absent | Optional decimal integer 0..65536; send thinking_budget_tokens only when configured |
| LLM_SEED | absent | Optional decimal integer 0..2147483647; send seed only when configured; 42 is evaluation guidance, not a default |
| LLM_TIMEOUT_MS | 120000 | Decimal integer 1..600000 |
| LLM_REPAIR_ATTEMPTS | 1 | Decimal integer 0..2; malformed structured-output repair only |
| LLM_DEBUG_STRUCTURED_OUTPUT | false | Exact true/false; opt-in terminal validation + sanitized HTTP error diagnostics; no browser internals |

Integer settings reject blank, fractional, negative, scientific notation and out-of-range values. Temperature accepts ordinary decimals (e.g. 0.5), rejects blank, scientific notation, NaN/Infinity and values outside 0..2. The 65536 token ceilings and nonnegative 32-bit seed bound deliberately limit runtime configuration; they do not promise support from every endpoint. Optional settings must be omitted rather than assigned empty strings. Nonempty endpoint settings are URL-validated even outside structured mode. Model presence is required only in structured mode. Path syntax checks do not promise filesystem permissions or connectivity; SQLite startup must still succeed. Configuration errors report the field and safe advice, never the supplied value/secret. The API fails before DB creation for malformed settings.

## Loading precedence

`shell > .env.local > .env > defaults`. Node dev/start flags load optional root .env then .env.local. A shell variable set to an empty string is still an override; required fields can then fail. A changed env file requires restarting the process. Direct test/Node composition does not load developer files unless explicitly invoked with flags.

Verify with the allowlisted startup summary and safe field names; do not dump process.env, requests or .env.local. Structured startup summary includes llmTemperature, llmMaxTokens, llmTimeoutMs and llmRepairAttempts, plus llmReasoningBudgetTokens/llmSeed only when configured, alongside safe model/endpoint identity. It strips URL credentials/query content and redacts the configured key. Keep .env and .env.local ignored; .env.example contains placeholders. Never diagnose configuration by printing secrets.

## Health and model mode

[Health semantics](../architecture/runtime-and-deployment.md#health) distinguish process responsiveness from required storage readiness. Structured planner construction validates config but does not ping a model server at startup. A correctly configured unavailable model starts the API and only planning fails safely; analytics remains available. Mock and disabled are explicit modes, not automatic fallbacks on provider failure.

## Local evaluation / tested profile — user-supplied Bonsai observations

For the user's evaluated Bonsai deployment: temperature 0, max_tokens 2048, thinking_budget_tokens 512, seed 42, strict json_schema. The hard three-widget case (revenue KPI; monthly revenue with 3-month moving average Line; Top-5 branches by gross profit as horizontal blue Bars) succeeded first pass around 23 seconds in three repeated runs. Prior budget 1024 output omitted month/branch grouping and canonical validation correctly rejected it; repair repeated the omission. This evidence motivated structural summary/grouped tightening.

These are user-supplied local observations, not new runs by this implementation, a benchmark or a production guarantee. Larger reasoning budgets are not presumed better for this constrained task; there is no universal inverse relationship between budget and quality. Generic defaults remain temperature 0/max_tokens 2048, with reasoning budget and seed optional and omitted when unset. Endpoint support and revised schema acceptance still require deployment verification. For this evaluation only, configure `LLM_REASONING_BUDGET_TOKENS=512` and `LLM_SEED=42`; neither becomes an application default.

## Workspace AI settings

Workspace administrators without row restrictions can open **AI settings** and
explicitly Save provider URL, model, maximum output tokens, temperature (default
**0**), provider-supported reasoning and an optional seed. Local compatible
providers expose an optional numeric thinking budget; no model-name presets or
Bonsai-specific branches are introduced. OpenRouter model discovery returns only
models advertising structured outputs, temperature and output-token controls;
reasoning/seed controls follow available model capabilities and output limits.
The same saved settings apply to subsequent dashboard generation, editing and
Ask Business requests without restarting the API. Unsaved workspaces retain the
existing server planner configuration. A saved provider failure never falls back
to synthetic planning.

The masked API-key field accepts a replacement, an empty field retains the key,
and Clear removes the workspace override. Changing the provider endpoint clears
an existing workspace key unless explicitly replaced. Keys are encrypted with
AES-256-GCM and tenant-bound authenticated data. The encryption key is derived
with a separate purpose from protected `AUTH_SECRET`; local/synthetic deployments
can supply `WORKSPACE_AI_SECRET` (at least 32 characters). No reusable key or
ciphertext is returned to the browser or included in audit events. Keep this
server secret stable and backed up; after rotating it, re-enter saved provider
keys. Optional `OPENROUTER_API_KEY` is a server-side fallback for OpenRouter;
`LLM_API_KEY` remains bound to the server-configured local endpoint.

OpenRouter's accepted base URL is `https://openrouter.ai/api/v1`; the local option
uses the deployment's existing `LLM_BASE_URL`. Workspace settings cannot redirect
server credentials to arbitrary endpoints. Outbound model/provider requests
refuse redirects. API-key entry and model discovery go through the authenticated
API, never directly from the browser to a provider.

Workspace settings are versioned control metadata, with fresh actor authorization
and atomic audit/CAS writes. Apply SQLite metadata migration 006 or PostgreSQL
control migration 009 explicitly before deploying the updated runtime. Existing
mart migrations and analytics semantics are unchanged.

The catalog loads when the settings form opens and can be refreshed with **Load models**. The **Free compatible models** selector is built from the current OpenRouter
catalog's zero prompt and completion prices after strict capability filtering.
It has no embedded model list and removes models that become paid or incompatible
when the catalog is reloaded. The searchable/manual model-ID field remains
available for other compatible models. Catalog compatibility is not a live
accuracy benchmark; validate chosen models with synthetic prompts first. Free
endpoint limits and provider data-use terms still apply.

On 2026-10-13 the live catalog advertised compatible free routes including
[Nemotron 3 Super](https://openrouter.ai/nvidia/nemotron-3-super-120b-a12b:free),
[Apodex 1.1 Mini](https://openrouter.ai/apodex/apodex-1.1-mini:free) and
[LFM2.5-2.6B](https://openrouter.ai/liquid/lfm-2.5-2.6b:free).
These are trial candidates, not hardcoded defaults or an accuracy certification.
NVIDIA's free endpoint terms prohibit confidential/personal inputs; its option
should be evaluated with synthetic data. Runtime model/provider settings continue
to be explicit workspace-admin choices, with no automatic model switching.
