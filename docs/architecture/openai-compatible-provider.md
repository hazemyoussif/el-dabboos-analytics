# OpenAI-compatible provider

The API defaults to `MockDashboardPlanner`. To use a local model, run an OpenAI-compatible server that supports strict JSON Schema responses on `/v1/chat/completions`, then select the structured planner. The adapter sends a portable projection of the existing DashboardSpec v2 or DashboardPatch v2 schema as `response_format.type=json_schema`. The application validates the returned object against the unchanged canonical schema, semantic rules, and authorized planner capabilities before using it. A malformed object can receive one repair request by default. The provider never executes analytics, SQL, or UI code.

## Configuration

| Variable | Meaning | Default |
| --- | --- | --- |
| `DASHBOARD_PLANNER` | `mock`, `structured`, or `disabled` | `mock` |
| `LLM_BASE_URL` | OpenAI-compatible API root, including `/v1`; required for `structured` | none |
| `LLM_MODEL_ID` | Model ID sent in the chat completion request; required for `structured` | none |
| `LLM_API_KEY` | Optional bearer token, if the server requires one | omitted |
| `LLM_TIMEOUT_MS` | Positive integer request timeout in milliseconds | `120000` |
| `LLM_REPAIR_ATTEMPTS` | Number of extra requests after invalid structured output; integer `0`–`2` | `1` |

`ANALYTICS_PROVIDER` (`sqlite` by default, or `mock`) selects the deterministic analytics source independently of the planner. `SQLITE_DB_PATH` selects the SQLite file. `DASHBOARD_PLANNER=disabled` keeps templates and manual dashboards available while disabling generation and editing through the planner.

## Example: local Bonsai 2

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

The repository and CI do not include a Bonsai 2 model or a live llama.cpp server. Fake HTTP tests verify the request and response protocol, bounded repair, authorization checks, and timeout behavior. Actual model adherence to the schemas, output quality, and latency depend on the selected model and server build and need a separate local evaluation.
