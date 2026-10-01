# Problem-oriented debugging

Use actual code/tests as current behavior; prefer the smallest owning layer. Capture synthetic safe evidence, run targeted tests, then full verification. [Handbook](handbook.md), [test guide](testing-guide.md), [config](configuration.md).

## Metric value is wrong

DashboardSeries → query → requiredMeasures() → adapter → canonical facts → engine semantics → AnalyticsResult. Compare raw canonical measure totals with an agreed fixture, not chart text. Check denominator, catalog scale, state/date/currency mapping and authorized context. Add data engine/repository regression before changing renderer.

## Widget has no data

Check selected tenant/date range (fixture ends September 2026), supported metric/group/filter, enforced policy intersection and nullable semantic meaning. Inspect safe status/metadata and authorized synthetic fixture. Empty, null and failed are distinct; never fill everything with zero.

## Dashboard shows partial

Inspect per-series status before alignment. A successful series survives another failure; first-series top-N failure prevents unrestricted selected keys. Shared query failures still produce independent dependent-series errors. Check repository errors and source availability without logging customer rows.

## Metric missing from builder

ProductMetric registry → availability → authorization domain → authorized API catalog. Planned metrics cannot execute. A catalog formula alone does not make a metric available to the user. Inspect route metadata and demo membership.

## Template is restricted

Find template metric dependencies, available registry entries and authorized capabilities. A restriction is expected when any required metric is unavailable/unauthorized. Do not weaken policy just to enable a template.

## 403 / permission denied

IdentityProvider → validated membership → permissions → metricDomains → enforcedFilters. Inspect x-demo-user-id/x-tenant-id only with synthetic identities. Shared record visibility does not grant all metrics or update ownership; no production IdP exists yet.

## Wrong branch data

Trace analyticsContext.enforcedFilters and adapter/engine intersection. User filters must be ANDed, not overwrite policy. Snapshot selection must not resurrect a prior branch when latest entity moved. Add tenant/policy contract coverage.

## Snapshot value is wrong

Check required entityId and measure/date uniqueness; latest eligible entity/measure at cutoff precedes dimension filtering. Sum eligible entities once, not all dates. Missing snapshot is null. Backdated correction rules must be source-approved.

## AI generated invalid dashboard

Provider unknown output → portable schema → full canonical schema → semantic/layout/chart validation → authorization. Projection is only provider guidance. Use LLM_DEBUG_STRUCTURED_OUTPUT=true for bounded redacted API diagnostics; browser stays generic. Never weaken canonical validation to fit a model.

## AI edit fails

Validate canonical patch first, atomically apply allowed operations, validate completed spec and authorization. Check widget/series IDs and limits. Repair attempts are bounded and do not retry transport indefinitely. Working spec may contain sensitive identifiers: review privacy before external endpoints.

## Dashboard does not save

Check draft state/naming validation, dashboard:create/edit permission, owning record and metadata DB readiness. Generate/edit only previews. Inspect safe HTTP status; no auto-save is intended. First Save and Save As create records, not updates.

## 409 version conflict

Compare loaded expectedVersion with current record version. Preserve working draft, reload deliberately and reconcile changes. Do not suppress 409 or force overwrite. Test two clients on the same owned record.

## Folder/favorite is wrong

Tenant + user preferences are separate from DashboardRecord. Inspect selected library view and association IDs; validate accessible record/folder. Delete-folder clears personal associations, not dashboards. Search/sort is client-side.

## Chart looks wrong

Check domain visualization compatibility, aligned per-series nullable values/units and rendering composition. Central chart-theme owns colors/axis/tooltip presentation. Never persist Recharts props in spec or silently truncate categories.

## Theme isn't applied

Check ThemeProvider mode, persisted preference, OS mode and CSS token variables; focused chart components consume central theme. Theme change should produce no execute/save request. Do not insert arbitrary tenant CSS.

## Layout changed but analytics executed unexpectedly

Trace builder semantic-vs-layout change handling and draft comparison. Domain canonical grid adapter must strip RGL runtime fields. Layout-only move/resize/arrange should reuse execution and never save; semantic edits may preview. Add web product-flow/layout regression.

## Environment variable isn't taking effect

Check shell > .env.local > .env > defaults, API cwd, Node flags and restart. Verify only allowlisted startup fields. Tests do not load local env. Empty shell values override files. Do not print env files, process.env or credentials.

## API live but not ready

Required persistence probe must exist and required dashboard/library tables be available; root analytics SQLite probes analytics_facts shape. Model outage does not affect readiness. Custom buildApi without persistence probe is not ready. Probe deadline cannot interrupt synchronous DatabaseSync work.
