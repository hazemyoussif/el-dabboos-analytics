# API configuration — owning reference

Current parser: [startup-config.ts](../../apps/api/src/startup-config.ts). Root [server.ts](../../apps/api/src/server.ts) calls it once before opening DBs/listening. Application/domain never read process.env. Parse tests use supplied maps, not developer files.

| Variable | Default | Validation / meaning |
| --- | --- | --- |
| ANALYTICS_PROVIDER | sqlite | sqlite or mock |
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
