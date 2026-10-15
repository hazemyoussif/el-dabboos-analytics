# ADR 038 — Bounded delivery of complete grouped analytics

Status: Implemented; company-staging performance remains a deployment verification step.

## Problem

A categorical population larger than a response bound previously failed before values or Top-N could be calculated. Browser pages only sliced an already loaded array. Multi-series Top-N widgets could select 100 identities successfully while their peer queries failed over the full population. Historical event reads also repeatedly extracted fields from large source envelopes. A green summary benchmark did not cover these cases.

## Decision

`AnalyticsReadOptions` is transient repository execution input, separate from semantic `AnalyticsQuery`, business filters, saved DashboardSpec and AI plans. An output window or selected stable identities controls delivery. It never narrows authorization or changes the population used by percentage contribution, Pareto, ranking or explicit Top-N. SQL reduces exact source operands, applies global analyses, and then selects output rows. Existing bounded complete-result calls remain supported and still reject excessive responses.

Trusted operational, exact Finance and review/business adapters own their eligible input and evidence. A shared PostgreSQL selector owns analysis/output-window mechanics; it cannot choose a source, authorize a metric or publish data. Snapshots keep their source-specific cutoff/entity selection, and quantities retain compatible-UOM checks. Exact operand safety checks precede global analysis. Operational grouped results supply their already authorized labels to the repository result; no second label lookup is needed.

Application execution coordinates one identity selection across each widget. Ordinary pages use the union of eligible series identities. Counts are omitted when the exact union count is unknown. Explicit first-series Top-N and Pareto supply the anchor; peers evaluate output for those identities while retaining full-population analysis semantics. Failed anchors still fail dependent selection. Query/read identity includes the transient output options for request-local deduplication; no cache survives a dashboard execution.

Continuation contains an output position and an opaque fingerprint bound to the normalized widget queries, effective dates/filters, current tenant/policy, locale/search, delivery order and trusted serving revision. It conveys no authority. Every request reauthorizes the dashboard and every underlying metric; publication or scope changes invalidate continuation. The application explicitly selects delivery order for the whole widget: first-series Pareto anchors advance by global rank; ordinary union pages advance by stable identity, including when a secondary series computes Pareto. This transient order does not change global values or ranks. Direct single-query reads retain their existing default order. No transaction remains open between requests. SQL uses explicit C collation for identity tie ordering.

`POST /api/dashboards/widgets/:id/window` accepts the full validated dashboard, transient viewer overrides and a strictly bounded window. It executes only that widget. The shared renderer resets navigation on new execution/session context, ignores aborted page responses, and exports the displayed loaded pages with an explicit loaded-only label. Server errors and legitimate nulls remain distinct. Pie/treemap composition keeps complete-result behavior rather than recomputing proportions from a result page. Canonical saved content and explicit Save/version behavior are unchanged.

Migration 049 adds database-generated typed projections of immutable review-fact payload fields and a matching access index. Values cannot drift from payloads; source identities and publication history are unchanged. Event reads aggregate at the requested time grain before crossing the numeric boundary. Deployment requires an offline analytics migration; PostgreSQL must populate generated columns for existing rows, so migration time and disk use must be allowed for. No source reload or Odoo connection is needed.

Readiness distinguishes a confirmed absent baseline from a failed dependency check. Both fail closed; a transient check failure is not evidence that source data should be reloaded. Safe localized messages keep dependency details out of browser errors.

## Verification and limits

Focused tests cover published operational populations above configured bounds, asymmetric series, complete traversal above 5,000 groups, scoped continuations, full-population Top-N/Pareto/contribution, exact Finance dates, readiness failures, and a 300,000-fact multi-month workload. Full gate results belong in the delivery evidence, not this design decision.

This is bounded response delivery, not an unlimited source-query budget. PostgreSQL statement/pool bounds remain in place. Aborting a browser page request prevents stale UI updates; it does not establish cancellation of already running SQL. Large composed result sets can still encounter a resource failure and must report it honestly. Hosted SQL latency must be checked after deployment. Full-dataset streaming exports and persisted review rollups are not introduced.
