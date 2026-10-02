# OpenAI-compatible provider

The API defaults to `MockDashboardPlanner`. Structured generation uses a configured OpenAI-compatible endpoint supporting `response_format.type=json_schema` on `/v1/chat/completions`.

Generation follows **prompt → compact DashboardGenerationPlan → plan validation → deterministic application compiler/resolver → canonical DashboardSpec v2 validation (including semantics/visualization/layout) → authorization → execution**. The plan is a transient application intent object; it is never persisted, executed, or returned as the dashboard contract. Canonical schemas optimize application correctness; provider contracts optimize constrained model communication. Endpoint schema limitations must not weaken the canonical application contract.

The shallow `dashboard_generation_plan` schema contains bilingual titles, bounded widgets/series, optional date preset or explicit range, business filters, flattened explicitly requested analysis flags/top-N and sparse `requestedPresentation` intent. Widget root type/style fields are rejected. Without explicit presentation intent, requestedPresentation must be omitted entirely. When present it requires type and only type-valid options. Unrequested analysis and presentation decoration must be omitted by the model. It contains no IDs, version, grid positions, persistence/security metadata or chart-library properties. Metric choices are restricted to authorized capabilities. The application validates with AJV and additional pairing/date rules, then creates stable `generated-dashboard`, `widget-N`, and `widget-N-series-M` IDs, canonical analysis/presentation objects, and `defaultDashboardLayout` on 12 columns. False flags are omitted; empty requestedPresentation objects are rejected. Missing dates use `current_year`; presets use existing tenant-timezone semantics. Date pairs cannot mix with presets; top-N requires both direction and a valid integer limit. The resolver supplies KPI for one ungrouped series, Line for compatible time series, Bar for compatible categorical series, and Table for mixed single-axis type/unit series. Explicit types use current canonical policy (categorical Line remains supported). It supplies bar orientation, line curve, pie variant, legend behavior and combo marks; type-incompatible presentation fields fail plan schema validation; deeper semantic incompatibilities still fail canonical validation and remain eligible for bounded repair. No palette request leaves the token absent. GenerationSeries has no `mark` field: code assigns the first Combo series Bar and remaining series Line. Canonical DashboardSeries.presentation.mark remains supported for templates, manual editing and canonical AI patches.

Explicit "top N" maps to topNDirection=top and topNLimit=N; "bottom N" maps to bottom/N. The selection metric belongs first in the widget series, with Top-N only on that anchor series. Prompt guidance includes one compact Top-5 revenue/branch/horizontal/blue Bar example and prohibits invented decoration. The generation schema enforces type-valid presentation fields; canonical validation still rejects deeper incompatible intent.

For generation visualization failures, the compiler first invokes the unchanged canonical validator. It then enriches the existing generic semantic failure with at most four deduplicated fixed `visualizationIssues` reasons for bounded repair and opt-in terminal diagnostics (maximum 800 characters). Public API errors keep their existing generic validation message; no model text, customer values, prompts or credentials enter these reasons.

Provider schemas use the existing portable keyword projection; original application-plan and domain spec/patch validators retain all constraints. Compact contracts improve portability across constrained endpoints, including Gemini, OpenAI-compatible services and smaller/self-hosted models; live adherence still requires endpoint testing.

**AI editing:** instruction + bounded current DashboardSpec → transient `DashboardEditPlan` → deterministic compiler → canonical DashboardPatch v2 → applyDashboardPatch → full canonical validation → authorization. The provider receives the projected `dashboard_edit_plan` schema, never the full canonical patch schema. The public planner/API still returns a canonical patch and resulting dashboard; plans are not persisted.

For example, "make the branch chart blue" needs only:

```json
{"operations":[{"op":"update_widget","widgetId":"widget-1","changes":{"presentation":{"palette":"blue"}}}]}
```

The compiler clones the existing widget, preserving dimension, metrics, stable series IDs, analyses/Top-N, title, other presentation fields, filters and layout. Omitted values preserve; null clears optional presentation/title/dimension or whole analysis, and false clears analysis flags. Changes compose in order on a clone and only the final patch is validated atomically. Type changes must explicitly clear now-incompatible inherited presentation fields; they do not implicitly discard business intent.

Operations are update_widget, update_series, add_widget, remove_widget, set_title, set_filters and explicit update_layout. Series edits reference widgetId/seriesId; presentation:null is a clear-only option for inherited Combo marks. They support metric plus flattened comparison/movingAverageWindow/boolean flags/topNDirection/topNLimit under changes.analysis. Adding Top-N requires both fields; changing one preserves the other; clearing either removes selection and cannot be mixed with a supplied non-null counterpart. Additions use business intent, optional type/presentation and per-series analysis; code owns collision-free widget-N/series IDs, defaults, Combo marks and canonical placement. Sparse set_filters preserves omitted dateRange/dimensions; dateRange null and an empty dimensions array clear their respective user filters. Only explicit layout requests use update_layout to update an existing widget's x/y/w/h; normal edits never emit layout.

Schema membership/compatibility and allowed metrics are checked by the original canonical validators and post-output authorization, as on the prior patch path. Only authorized semantic/template metadata is supplied. Sparse presentation uses governed values, without generation's required type discriminator, because the current widget supplies type. Projected edit plan: 4,165 bytes/depth 16 versus canonical patch 4,196 bytes/depth 18; the serialized saving is modest, while output reconstruction is removed. See [ADR-025](adr/025-compact-dashboard-edit-plan.md).

Repair remains bounded by `LLM_REPAIR_ATTEMPTS` (0–2; default 1); generation repairs DashboardGenerationPlan; edits repair DashboardEditPlan. Transport failures bypass repair. The provider never executes analytics, SQL, or UI code.

## Configuration

[API configuration](../developer/configuration.md) is the owning reference for exact variables, defaults, bounds and safe startup behavior. Structured mode requires LLM_BASE_URL and LLM_MODEL_ID; analytics and saved-dashboard persistence are independent of planner mode.

## Local evaluation / tested profile: Bonsai 2 27B via llama.cpp

Bonsai 2 27B (`Ternary-Bonsai-2-27B-PTQ1_0.gguf`) is the project's currently preferred evaluated local/development model. This is deployment guidance only; application and transport contain no model-name or server-specific branches. Obtain a compatible GGUF and llama.cpp build separately; supply your own model file to `llama-server`. Read `/v1/models` for the exact model ID and configure:

```dotenv
DASHBOARD_PLANNER=structured
LLM_BASE_URL=http://<llama-server-host>:8080/v1
LLM_MODEL_ID=<exact model id returned by /v1/models>
LLM_TEMPERATURE=0
LLM_MAX_TOKENS=2048
LLM_REASONING_BUDGET_TOKENS=512
LLM_TIMEOUT_MS=120000
LLM_REPAIR_ATTEMPTS=1
LLM_DEBUG_STRUCTURED_OUTPUT=false
# Tested reproducible evaluation only; normally unset:
LLM_SEED=42
```

Earlier user-reported simple runs at budget 1024 took around 42–43 seconds. The current useful local evaluation profile is budget 512/seed 42 with temperature 0/max_tokens 2048/strict json_schema: the hard three-widget case succeeded first pass around 23 seconds across three repeats. Prior 1024 hard-case output omitted required month/branch dimensions and failed canonical validation, including repair. Higher budgets are not assumed to improve this constrained planner; these are user observations, not a universal inverse-quality claim, repository benchmark or production guarantee. No new live run of the tightened schema is claimed here. Reasoning budget and seed remain optional, unset generic defaults.

The adapter sends `temperature` and `max_tokens` on every request. It sends `thinking_budget_tokens` and `seed` only when explicitly configured; endpoints may not support the optional fields. `response_format.type=json_schema`, `strict=true` remains the only path: no JSON text/object fallback. Only `message.content` supplies the structured result; `reasoning_content` is ignored. Seed is normally unset. Start the web app with `pnpm run dev:web`; seed synthetic analytics if needed. For an authenticated endpoint supply `LLM_API_KEY` in the API process environment. Never append `/chat/completions` to `LLM_BASE_URL`.

Repository/CI fake HTTP tests require no model/key. Live schema adherence, output quality, latency and server capabilities remain a separate configured-endpoint acceptance gate.

## Governed presentation

`requestedPresentation` represents explicit user intent only and requires `type` when present. Summary permits only KPI; grouped presentation uses five disjoint `oneOf` branches for the other seven types. Each object has `additionalProperties: false`:

| Required type | Optional fields |
| --- | --- |
| bar | palette, orientation, legend |
| line / area / combo | palette, curve, legend |
| pie | palette, pieVariant, dataLabels, legend |
| treemap | palette, dataLabels, legend |
| kpi / table | palette |

Type choices use disjoint enums, with shared palette/dimension definitions through existing `$defs`/`$ref` support. No `const`, custom discriminator, conditional schema or new provider-specific keyword is needed. The current unrestricted projected generation schema is 3,534 serialized bytes with reference-expanded depth 13, versus projected DashboardSpec at 3,458 bytes/depth 14. This is a modest increase from the prior 3,088 bytes/depth 11 to prevent impossible grouping states; it is 2.2% larger than canonical in bytes and one level shallower. Tests bound size to at most 105% of canonical and depth to at least one fewer level, alongside infrastructure exclusion. Actual requests restrict the shared metric enum to authorized capabilities. Compact model output and code-owned infrastructure remain the purpose; this revision does not claim a serialized size saving. Canonical compatibility and authorization still run after compilation.

Canonical WidgetPresentation supports the finite `default|blue|green|orange|purple|red|neutral` palette vocabulary through generation and normal patch widget replacement. Actual Light/Dark colors, hover/selection styling and deterministic series assignment remain in web `chart-theme.ts`; no raw hex/RGB, CSS, fill/stroke, axis, animation or renderer properties are accepted. Global UI theme preference stays outside saved content. Named palette intent may be saved as a bounded widget preference, without changing analytics queries.

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

## Summary/grouped generation and manual parity

Summary generation widgets forbid dimension, require exactly one series and allow only optional explicit KPI presentation (palette only). Grouped widgets require dimension and 1–8 series; their optional type-specific presentation excludes KPI. Two closed, disjoint oneOf branches enforce this in the original and projected schemas; TypeScript mirrors the categories. Dimensionless Line/Bar/Area/Pie/Treemap/Combo/Table and grouped KPI cannot be represented. Deeper metric/dimension, unit, analysis, composition, Combo count and Top-N anchor rules remain canonical. Defaults remain code-owned: implicit summary KPI, compatible time Line, compatible category Bar, mixed units Table. No model/provider conditional or new schema keyword was introduced.

Manual and sparse AI palette edits converge on `WidgetPresentation.palette`; generation can supply the same governed token. The centralized web ChartTheme resolves actual Light/Dark colors. Builder and provider plans never store resolved colors, CSS or chart-library options. Global theme/locale remain preferences outside saved content. The manual builder offers a native localized Palette / لوحة الألوان selector for the domain governed palette vocabulary. Existing widgets preview a palette change immediately through normal BuilderCommand/canonical replacement, without another analytics request. Metrics, dimension, analyses, filters, layout and unrelated presentation remain unchanged; pending editor settings are retained. Undo/Redo participates in normal bounded history. Changes remain unsaved until explicit Save and survive record reopening. A new widget retains its chosen palette in the editor until Apply adds it. Selecting Default writes `palette: "default"`; omission from older specs or unrequested AI intent resolves to the same default colors. No raw color picker is exposed.
