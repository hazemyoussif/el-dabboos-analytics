# OpenAI-compatible provider

The API defaults to `MockDashboardPlanner`. Structured generation uses a configured OpenAI-compatible endpoint supporting `response_format.type=json_schema` on `/v1/chat/completions`.

Generation follows **prompt → compact DashboardGenerationPlan → plan validation → deterministic application compiler → canonical DashboardSpec v2 validation (including semantics/visualization/layout) → authorization → execution**. The plan is a transient application intent object; it is never persisted, executed, or returned as the dashboard contract. Canonical schemas optimize application correctness; provider contracts optimize constrained model communication. Endpoint schema limitations must not weaken the canonical application contract.

The shallow `dashboard_generation_plan` schema contains bilingual titles, bounded widgets/series, optional date preset or explicit range, business filters, flattened analysis flags/top-N and bounded visualization intent. It contains no IDs, version, grid positions, persistence/security metadata or chart-library properties. Metric choices are restricted to authorized capabilities. The application validates with AJV and additional pairing/date rules, then creates stable `generated-dashboard`, `widget-N`, and `widget-N-series-M` IDs, canonical analysis/presentation objects, and `defaultDashboardLayout` on 12 columns. False flags and empty presentation objects are omitted. Missing dates use `current_year`; presets use existing tenant-timezone semantics. Date pairs cannot mix with presets; top-N requires both direction and a valid integer limit. Incompatible visualization intent is rejected by full canonical validation.

Provider schemas use the existing portable keyword projection; original application-plan and domain spec/patch validators retain all constraints. Compact contracts improve portability across constrained endpoints, including Gemini, OpenAI-compatible services and smaller/self-hosted models; live adherence still requires endpoint testing.

**AI edit is unchanged:** the provider generates `dashboard_patch_v2` using the portable projection of canonical DashboardPatch v2. Patch validation, application to the current draft, full resulting-spec validation and authorization remain required. A separate edit-plan compiler is deferred until actual endpoint evidence requires it.

Repair remains bounded by `LLM_REPAIR_ATTEMPTS` (0–2; default 1); generation repairs the plan, edits repair the patch. Transport failures bypass repair. The provider never executes analytics, SQL, or UI code.

## Configuration

[API configuration](../developer/configuration.md) is the owning reference for exact variables, defaults, bounds and safe startup behavior. Structured mode requires LLM_BASE_URL and LLM_MODEL_ID; analytics and saved-dashboard persistence are independent of planner mode.

## Example: self-hosted Bonsai 2 via llama.cpp

Obtain a compatible Bonsai 2 GGUF file and a `llama-server` build separately. In one terminal, replace the model path with the actual local file:

```bash
llama-server -m /absolute/path/to/bonsai-2.gguf --alias bonsai-2 --host 127.0.0.1 --port 8080
```

In the repository root, seed the demo database if needed, then start the API in another terminal:

```bash
pnpm run seed demo.db
DASHBOARD_PLANNER=structured \
LLM_BASE_URL=http://127.0.0.1:8080/v1 \
LLM_MODEL_ID=bonsai-2 \
LLM_TIMEOUT_MS=120000 \
LLM_REPAIR_ATTEMPTS=1 \
pnpm run dev:api
```

Start the web app with `pnpm run dev:web`. The server's [OpenAI-compatible chat endpoint and JSON Schema response format](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) are the intended protocol. For a server that requires authentication, set `LLM_API_KEY` in the API process environment. Do not append `/chat/completions` to `LLM_BASE_URL`.

The repository and CI do not include a model endpoint. Fake HTTP tests verify the request and response protocol, bounded repair, authorization checks, and timeout behavior. Actual model adherence to the schemas, output quality, and latency depend on the selected model and server build and need evaluation against the selected endpoint.

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

`LLM_DEBUG_STRUCTURED_OUTPUT=true` enables terminal-only validation and HTTP diagnostics at the API composition root; default false. Validation diagnostics report generation/edit, attempt, schema/provider identity, schema/semantic/authorization stage, safe AJV details and a redacted bounded output shape. HTTP diagnostics inspect at most 16 KiB of an error envelope, allowlist known error code/type/status values, and classify messages into fixed safe descriptions. Arbitrary upstream strings, prompts, filter values, customer data and request/response bodies are never echoed. Oversized/unreadable envelopes retain status only. Callback failures cannot alter normal transport classification. Browser errors remain safe codes (timeout 504; upstream/unavailable 502; invalid structured output 422).

Structured startup summary includes actual `llmTimeoutMs` and `llmRepairAttempts`, model ID and sanitized endpoint, never credentials. No application code reads environment variables.

The web planner owns idle/generating/editing state and a real elapsed timer independent of workspace loading. Create/edit retain the instruction and show a polite status, a quiet elapsed timer, and Lucide loading icon respecting reduced motion. They expose one truthful waiting state, not fabricated backend phases. Success/failure/reset/stale requests stop the timer; failures do not apply a draft or persist anything. Known provider codes receive safe English/MSA copy. There is no streaming progress or server-side cancellation contract.
