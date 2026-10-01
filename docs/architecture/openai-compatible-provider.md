# OpenAI-compatible provider

The API defaults to `MockDashboardPlanner`. To use a configured model endpoint, run an OpenAI-compatible server that supports strict JSON Schema responses on `/v1/chat/completions`, then select the structured planner. The adapter sends a portable projection of the existing DashboardSpec v2 or DashboardPatch v2 schema as `response_format.type=json_schema`. The application validates the returned object against the unchanged canonical schema, semantic rules, and authorized planner capabilities before using it. A malformed object can receive one repair request by default. The provider never executes analytics, SQL, or UI code.

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

`pnpm dev:api` / `pnpm --filter @el-dabbous/api dev` and
`pnpm --filter @el-dabbous/api start` load optional repository-root `.env`, then
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
