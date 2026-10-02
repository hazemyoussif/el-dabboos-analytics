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
| LLM_TIMEOUT_MS | 120000 | Decimal integer 1..600000 |
| LLM_REPAIR_ATTEMPTS | 1 | Decimal integer 0..2; malformed structured-output repair only |
| LLM_DEBUG_STRUCTURED_OUTPUT | false | Exact true/false; opt-in terminal validation + sanitized HTTP error diagnostics; no browser internals |

Bounded numeric settings reject blank, fractional, negative, scientific notation and out-of-range values. Nonempty endpoint settings are URL-validated even outside structured mode. Model presence is required only in structured mode. Path syntax checks do not promise filesystem permissions or connectivity; SQLite startup must still succeed. Configuration errors report the field and safe advice, never the supplied value/secret. The API fails before DB creation for malformed settings.

## Loading precedence

`shell > .env.local > .env > defaults`. Node dev/start flags load optional root .env then .env.local. A shell variable set to an empty string is still an override; required fields can then fail. A changed env file requires restarting the process. Direct test/Node composition does not load developer files unless explicitly invoked with flags.

Verify with the allowlisted startup summary and safe field names; do not dump process.env, requests or .env.local. Structured startup summary includes llmTimeoutMs and llmRepairAttempts alongside safe model/endpoint identity. It strips URL credentials/query content and redacts the configured key. Keep .env and .env.local ignored; .env.example contains placeholders. Never diagnose configuration by printing secrets.

## Health and model mode

[Health semantics](../architecture/runtime-and-deployment.md#health) distinguish process responsiveness from required storage readiness. Structured planner construction validates config but does not ping a model server at startup. A correctly configured unavailable model starts the API and only planning fails safely; analytics remains available. Mock and disabled are explicit modes, not automatic fallbacks on provider failure.
