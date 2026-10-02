# OpenAI-compatible provider

The API defaults to `MockDashboardPlanner`. Structured generation uses a configured OpenAI-compatible endpoint supporting `response_format.type=json_schema` on `/v1/chat/completions`.

Generation follows **prompt → compact DashboardGenerationPlan → plan validation → deterministic application compiler/resolver → canonical DashboardSpec v2 validation (including semantics/visualization/layout) → authorization → execution**. The plan is a transient application intent object; it is never persisted, executed, or returned as the dashboard contract. Canonical schemas optimize application correctness; provider contracts optimize constrained model communication. Endpoint schema limitations must not weaken the canonical application contract.

The shallow `dashboard_generation_plan` schema contains bilingual titles, bounded widgets/series, optional date preset or explicit range, business filters, flattened explicitly requested analysis flags/top-N and sparse `requestedPresentation` intent. Widget root type/style fields are rejected. Unrequested type, palette, orientation, legend, labels, curve and analysis must be omitted by the model. It contains no IDs, version, grid positions, persistence/security metadata or chart-library properties. Metric choices are restricted to authorized capabilities. The application validates with AJV and additional pairing/date rules, then creates stable `generated-dashboard`, `widget-N`, and `widget-N-series-M` IDs, canonical analysis/presentation objects, and `defaultDashboardLayout` on 12 columns. False flags and empty presentation objects are omitted. Missing dates use `current_year`; presets use existing tenant-timezone semantics. Date pairs cannot mix with presets; top-N requires both direction and a valid integer limit. The resolver supplies KPI for one ungrouped series, Line for compatible time series, Bar for compatible categorical series, and Table for mixed single-axis type/unit series. Explicit types use current canonical policy (categorical Line remains supported). It supplies bar orientation, line curve, pie variant, legend behavior and combo marks; incompatible explicit fields remain present and fail canonical semantic validation, eligible for bounded repair. No palette request leaves the token absent.

Provider schemas use the existing portable keyword projection; original application-plan and domain spec/patch validators retain all constraints. Compact contracts improve portability across constrained endpoints, including Gemini, OpenAI-compatible services and smaller/self-hosted models; live adherence still requires endpoint testing.

**AI edit is unchanged:** the provider generates `dashboard_patch_v2` using the portable projection of canonical DashboardPatch v2. Patch validation, application to the current draft, full resulting-spec validation and authorization remain required. A separate edit-plan compiler is deferred until actual endpoint evidence requires it.

Repair remains bounded by `LLM_REPAIR_ATTEMPTS` (0–2; default 1); generation repairs the plan, edits repair the patch. Transport failures bypass repair. The provider never executes analytics, SQL, or UI code.

## Configuration

[API configuration](../developer/configuration.md) is the owning reference for exact variables, defaults, bounds and safe startup behavior. Structured mode requires LLM_BASE_URL and LLM_MODEL_ID; analytics and saved-dashboard persistence are independent of planner mode.

## Evaluated development example: Bonsai 2 27B via llama.cpp

Bonsai 2 27B (`Ternary-Bonsai-2-27B-PTQ1_0.gguf`) is the project's currently preferred evaluated local/development model. This is deployment guidance only; application and transport contain no model-name or server-specific branches. Obtain a compatible GGUF and llama.cpp build separately; supply your own model file to `llama-server`. Read `/v1/models` for the exact model ID and configure:

```dotenv
DASHBOARD_PLANNER=structured
LLM_BASE_URL=http://<llama-server-host>:8080/v1
LLM_MODEL_ID=<exact model id returned by /v1/models>
LLM_TEMPERATURE=0
LLM_MAX_TOKENS=2048
LLM_REASONING_BUDGET_TOKENS=1024
LLM_TIMEOUT_MS=120000
LLM_REPAIR_ATTEMPTS=1
LLM_DEBUG_STRUCTURED_OUTPUT=false
# Optional reproducible evaluation, normally unset:
# LLM_SEED=42
```

User-reported controlled runs with temperature 0, thinking budget 1024 and maximum output 2048 completed around 42–43 seconds at approximately 33 tokens/sec. Three seed-42 runs were effectively identical; a seed-43 run produced the same high-level result with similar timing. These are reported endpoint observations, not a repository benchmark, CI guarantee or new live verification of this plan revision.

The adapter sends `temperature` and `max_tokens` on every request. It sends `thinking_budget_tokens` and `seed` only when explicitly configured; endpoints may not support the optional fields. `response_format.type=json_schema`, `strict=true` remains the only path: no JSON text/object fallback. Only `message.content` supplies the structured result; `reasoning_content` is ignored. Seed is normally unset. Start the web app with `pnpm run dev:web`; seed synthetic analytics if needed. For an authenticated endpoint supply `LLM_API_KEY` in the API process environment. Never append `/chat/completions` to `LLM_BASE_URL`.

Repository/CI fake HTTP tests require no model/key. Live schema adherence, output quality, latency and server capabilities remain a separate configured-endpoint acceptance gate.

## Governed presentation

`requestedPresentation` contains optional type, palette, orientation, pieVariant, legend show/hide, dataLabels show/hide and curve. It represents explicit user intent only. Canonical WidgetPresentation supports the finite `default|blue|green|orange|purple|red|neutral` palette vocabulary through generation and normal patch widget replacement. Actual Light/Dark colors, hover/selection styling and deterministic series assignment remain in web `chart-theme.ts`; no raw hex/RGB, CSS, fill/stroke, axis, animation or renderer properties are accepted. Global UI theme preference stays outside saved content. Named palette intent may be saved as a bounded widget preference, without changing analytics queries.

Copy [.env.example](../../.env.example) to an ignored `.env.local` file if your development runner loads it, or export the variables in the API process environment. Never commit credentials. The debug switch does not alter browser responses and should remain off outside development.

## Native API environment loading (Node 24)

`pnpm dev:api` / `pnpm --filter @el-dabboos/api dev` and
`pnpm --filter @el-dabboos/api start` load optional repository-root `.env`, then
`.env.local`, using Node's `--env-file-if-exists`. Precedence is the real shell
 environment, `.env.local`, `.env`, then application defaults. Workspace scripts
run from `apps/api`; the explicit `../../` paths refer to the repository root.
Tests intentionally do not use these flags or load developer env files.
Copy `.env.example` to `.env` for a mock analytics/mock planner demo without
endpoint credentials. Both local env files remain ignored by Git.

See [configuration](../developer/configuration.md) for the full validated settings, including execution concurrency.

Relative database paths resolve from the API process working directory
(`apps/api` for workspace scripts); use absolute paths to choose a fixed location.
The startup summary uses an explicit allowlist, caps text fields, redacts the
configured API key, and removes endpoint userinfo, query and fragment. It never
serializes environment variables, HTTP headers, requests or prompts.

Reference: [Node CLI env-file support](https://nodejs.org/docs/latest-v24.x/api/cli.html#--env-file-if-existsconfig).

## Safe development diagnostics and UI progress

`LLM_DEBUG_STRUCTURED_OUTPUT=true` enables terminal-only validation and HTTP diagnostics at the API composition root; default false. Validation diagnostics report generation/edit, attempt, schema/provider identity, schema/semantic/authorization stage, safe AJV details and a redacted bounded output shape. HTTP diagnostics inspect at most 16 KiB of an object `{error:{...}}` or first array entry `[{error:{...}}]` error envelope, allowlist known error code/type/status values, and classify messages into fixed safe descriptions. Arbitrary upstream strings, prompts, filter values, customer data and request/response bodies are never echoed. Oversized/unreadable envelopes retain status only. Callback failures cannot alter normal transport classification. Browser errors remain safe codes (rate limit `LLM_RATE_LIMITED` 429; timeout 504; upstream/unavailable 502; invalid structured output 422).

Structured startup summary includes actual temperature, max tokens, timeout and repair limits, optional reasoning budget/seed only when configured, model ID and sanitized endpoint, never credentials. No application code reads environment variables.

The web planner owns idle/generating/editing state and a real elapsed timer independent of workspace loading. Create/edit retain the instruction and show a polite status, a quiet elapsed timer, and Lucide loading icon respecting reduced motion. They expose one truthful waiting state, not fabricated backend phases. Success/failure/reset/stale requests stop the timer; failures do not apply a draft or persist anything. Known provider codes receive safe English/MSA copy. There is no streaming progress or server-side cancellation contract.
