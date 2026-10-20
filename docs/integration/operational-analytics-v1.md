# Operational analytics v1

The deterministic Odoo-to-mart operational path is implemented. Operator jobs use
read-only retained PostgreSQL source snapshots, versioned approved mappings,
immutable operational fact revisions, independent exact controls, affected-month
aggregate refresh and a pinned trusted manifest. Dashboard reads use that stored
manifest and capability projection. No model, source connection, synchronization
or certification reconstruction runs on the bootstrapped tenant's normal reads.

## Operator setup and commands

Apply migrations through the existing local staging migration command and grants
workflow. Migration 030 includes an atomic owner-only scalar projection backfill;
forced tenant RLS is restored before commit. Provisioning does not create an online
service. Bootstrap is explicit, uses the publication operator, validates existing
certified releases once and copies their facts into separate operational storage:

```bash
pnpm analytics bootstrap --tenant el-dabboos-iq
pnpm analytics sync --tenant el-dabboos-iq
pnpm analytics sweep --tenant el-dabboos-iq
pnpm analytics reconcile --tenant el-dabboos-iq --mode affected
pnpm analytics reconcile --tenant el-dabboos-iq --mode daily
pnpm analytics reconcile --tenant el-dabboos-iq --mode deep
pnpm analytics status --tenant el-dabboos-iq
```

These commands require protected operator configuration for the intended local
mart. Bootstrap uses `MART_MIGRATOR_URL`; jobs use `MART_INGESTOR_URL`; status uses
and verifies `MART_RUNTIME_URL`. All three must be loopback destinations. The API
uses the existing runtime role and membership/analytics authorization. Source
credentials are resolved by the approved connection adapter. The existing broader
staging credential exception requires explicit `ODOO_SOURCE_STAGING_PILOT=true`;
all source transactions still run `REPEATABLE READ READ ONLY`. Do not put secrets
in arguments, logs or Git. Operator output includes bounded scope metadata and omits partition identities
and labels; exact cases remain in the governed evidence store. A failed
reconciliation prints its stored result and
exits nonzero. A technical failure returns a generic CLI error and separately
records its run ID, kind, actor and timestamps. Concurrent tenant jobs fail fast
instead of waiting out a source lease.

For the acceptance environment, the protected file supplied by the operator was
loaded after the repository defaults. The exact command shape was:

```bash
ODOO_SOURCE_STAGING_PILOT=true node \
  --env-file-if-exists=.env --env-file-if-exists=.env.local \
  --env-file=/home/hazem/.config/el-dabboos-local-staging/operator-host.env \
  --experimental-transform-types --disable-warning=ExperimentalWarning \
  apps/api/src/analytics-status-cli.ts sync --tenant el-dabboos-iq
```

Replace `sync` with `sweep`, or `reconcile` plus `--mode affected|daily|deep`.
For status, source configuration and the staging source exception are unnecessary.
Protected files are never loaded by automated tests.

## Discovery, revisions and transactions

Discovery uses composite `(write_date,id)` paging, an explicit upper source cutoff
and inclusive 120-second overlap from the last successful cutoff. Business dates
do not bound change discovery. Old/new fact revisions determine analytics months
and dimension identities. An October modification of a January record refreshes
January; a business-date move refreshes both months. Immutable fact payloads and
old certifications remain intact. Equivalent overlap replays create no revision.
Stored per-object positions and the successful cutoff advance only after audit,
reconciliation, refresh and promotion succeed in one tenant transaction.

Date-less ineligible invoice drafts retire an existing identity's old footprint;
unseen drafts do not invent dated facts. Newly encountered business months are
initialized with a bounded complete source-month read under the same snapshot.
Otherwise independent whole-partition controls would correctly reject a partial
new-month candidate. Existing months use incremental revision changes.

The tenant transaction owns all mart writes. A candidate savepoint allows a failed
exact reconciliation to roll back heads and serving changes while retaining the
failed source/mart cases and audit. Technical failures roll back the transaction
and record a separate failure. Discovery validates and plans changes against locked
mart heads without inserting revisions or updating heads. Pending identity state
preserves sequential decisions across incremental and complete-month pages. Exact
source controls are captured under the same frozen snapshot, then the application
verifies and releases its source handle before candidate persistence, mart comparison,
refresh and prepared publication. Revision/head writes and exact-case inserts use
bounded batches; large historical control sets use multiple bounded queries without
truncation. The existing candidate change buffer is reused; no durable staging store
or resumable source snapshot is introduced. The handoff stays inside the same mart
transaction: source loss or handoff failure prevents candidate writes; later write,
comparison, refresh, preparation, audit or cursor failure rolls everything back.
Expiry during subsequent offline work cannot invalidate an already captured source
observation. Retained handles can
deliberately share one cutoff for a bounded replay; each closes independently and
the final handle releases the owner.

The protected operator CLI prints phase names and elapsed milliseconds for source
observation, handoff, offline refresh/preparation, audit and commit. These progress
events contain no credentials, queries, source/customer rows or business values.
HTTP composition remains silent unless its caller explicitly supplies an observer.
Existing source lease, statement and systemd deadlines are unchanged.

A fixed overlap cannot prove discovery of arbitrarily long source transactions
whose write timestamps predate the overlap. Presence sweeps detect deletion, not
all such missed content updates. The production source watermark/transaction
policy remains a deployment prerequisite; no exactly-once discovery claim is made.

## Reconciliation and receivables

Affected reconciliation uses the deterministic old/new impact footprint, filtered
to approved metric/dimension capabilities. Controls batch requested months by
measure and grouping, retaining distinct month/identity cases and explicit zero
complements. Source sums/counts and mart sums/counts compare exact decimal values,
with no tolerance. The immutable case set carries source cutoff/revision, mapping
and definition versions; the database hashes the persisted ordered content.

`affected` rechecks the last nonempty operational footprint. `daily` checks every
current trusted event month and all published snapshot cutoffs, for all approved
summary metrics. `deep` invokes the same bounded summary profile in v1; it does
not grant a new business certificate or imply a full categorical certification.
The existing deeper release/certification workflow remains separate. Categorical
changes receive exact affected-case controls during sync.

Receivable dependencies poll receivable lines, partial reconciliations, moves and
payments independently of invoice-header timestamps. The existing historical
Phase-A baseline contains company summaries, without a previous component-date
ledger. Therefore a changed receivable input requires rechecking all published
month-end cutoffs: that is the complete provable dependency set for a possible
accounting-date move. Only changed balances create revisions, impact and aggregate
refresh. Event months are not rebuilt by this conservative snapshot check.

Full counterpart/state/company/date/current-residual quality is validated once
for the complete published cutoff scope within the retained snapshot. Earlier
cutoffs are subsets of that scope. Currency completeness includes settled
components that can be open earlier. Canonical summary SQL independently sums
signed debit/credit effects; the Finance control reconstructs a union of signed
links and uses separate report bucket expressions. The optimized projection is
verified against the canonical component mapper's maturity boundaries, credits,
settlements and company isolation. Statement timeout stays 15 seconds; source
lease stays 120 seconds. No optimizer setting is changed in the delivered path.

## Trusted serving and current reports

Immutable month partitions contain daily additive bases and complete categorical
policy tuples. A new manifest reuses unaffected partition references. Deferred
promotion guards require exact passed evidence, correct parent/version/cutoff,
complete affected-month membership and unchanged unaffected references. Runtime
RLS exposes only the current trusted manifest and its aggregates; candidate facts
and unpublished aggregates cannot enter normal report SQL.

Stored coverage uses the approved business timezone. Categorical keys are scoped
to the selected event range or snapshot cutoff; label metadata is restricted to
returned keys. Stored reporting currency and executable metric-definition version
must match the runtime configuration; changes require an explicit certified
migration. Capability discovery intersects enforced policy dimensions.

Ratios divide summed full-period bases. Snapshots select one latest eligible
cutoff per requested period, without summing dates. Monthly comparisons retain
null outside certified prior coverage. Historical comparisons and moving averages
require complete monthly buckets and supported windows. Group bounds remain
explicit and configurable, without truncating accepted output.

Original September categorical Finance outputs outside Phase A's summary scope
remain independently pinned to their original certified anchor, including all
2,217 customer identities. They are **not incrementally refreshed by this summary
adapter**. Their metadata identifies that original release. The anchor path uses
stored positive proofs only and fails closed if a proof is absent; it never
reconstructs a full proof on a normal read. September as-of queries retain their
certified month interval and compile categorical balances to the fixed cutoff.
A future component-level operational scope is required to promote corrected
customer Finance outputs together with their summaries. Do not represent this
v1 summary scope as full component or drill-through serving.

## Presence and status

The sweep pages distinct active governed `sale_order` and `account_move` IDs, at
most 1,000 per source check. It loads fact payloads only for missing identities,
then writes governed tombstones retaining the previous business footprint and
immutable revisions. Forced snapshot checks also detect deleted accounting inputs
that cannot appear in `write_date` polling. Sweeps do not advance the sync cursor.

Stored status includes latest sync, batch/affected and daily reconciliation,
presence sweep, cursor, trusted serving revision, unresolved failed candidate,
latest technical failure, source cutoff and freshness age/target (600 seconds by
default). `GET /api/analytics/status` remains authorized and read-only. Daily audit
success does not resolve a rejected sync candidate or advance source freshness.

The staging systemd units in `infra/staging` invoke sync after five idle minutes
and daily reconciliation followed by presence sweep at 00:00 UTC (03:00 Baghdad).
They reuse this CLI and record `trigger: scheduled`; all formulas, mapping, cursor
and promotion decisions remain in this repository. The units are delivered disabled
and must not be enabled until hosted loading and one successful sync/replay are
verified. See [staging schedules](staging-schedules.md). Runtime sync/reconciliation/serving LLM
dependency = zero. See the operational acceptance handoff for results and limits.

Daily event base reconciliation, monthly rollups and exact hybrid range planning
are now owned by [event aggregate operations](event-serving-aggregates.md).

## Manual operational UX

The report header exposes separate trusted serving, source freshness (inclusive
600-second target), reconciliation and certification details. The Data &
Certification Status view reads stored tenant evidence, aggregate coverage and
published Finance snapshot dates. Current source staleness does not revoke
closed-period certification. Receivables displays its executed `snapshotAsOf`
separately from source freshness.

Refresh View only re-executes the current dashboard with its transient viewer
filters against the runtime trusted repository. It performs no source access,
reconciliation, cursor mutation or promotion. Operational jobs keep that report
visible; Refresh View explicitly retrieves promoted results afterwards.

Manual commands are opt-in: `ANALYTICS_MANUAL_OPERATIONS=enabled` requires the
PostgreSQL provider, a separate `MART_INGESTOR_URL`, and the existing read-only
Odoo source configuration/resolver. Keep these credentials in protected runtime
configuration, never in the browser, images, specs or logs. Report/status reads
continue using the separate runtime role and tenant RLS. Enabling commands does
not enable a scheduler. Disabled or absent configuration presents unavailable
operator controls without synthetic results.

`POST /api/analytics/operations` accepts only `{kind:"sync"}`, `{kind:"affected"}`
or `{kind:"daily"}`. Fresh session membership, `analytics:query` and `tenant:manage`
are required. Role/account names have no special authority. Platform authority
alone does not bypass tenant membership. The route derives actor and tenant;
caller-supplied identity, deep reconciliation and sweep are rejected. It invokes
exactly the same named composition and `AnalyticsOperations` lifecycle as the CLI.

Execution is synchronous: the UI shows running/syncing/validation intent and
completion/failure, without pretending to observe intermediate phases. Configure
an ingress timeout appropriate to the existing bounded source lease when enabling
commands. A transport failure means completion could not be confirmed; status
must be refreshed before retrying. Stored rejected candidates and technical
failures show previous-trusted-data feedback. The pipeline's immutable run/failure
audit records actor, tenant, operation, timestamp, run ID and result; successful
evidence/promotion/cursor/audit remain one transaction. HTTP authorization results
also use the existing safe audit sink.

### Approved local source availability

The local manual-operation composition fixes `ANALYTICS_SOURCE_TENANT_ID` and
`ANALYTICS_SOURCE_ID` in protected configuration. An optional externally managed
`ANALYTICS_SOURCE_RELAY_SOCKET=/run/dabboos-source/source.sock` connects a private
mode-0600 host Unix socket to an API-container loopback bridge. The bridge listens
only on 127.0.0.1 inside that container and is recreated with API startup. It adds
no public port, source destination input or browser connection. Source connection
configuration defaults every PostgreSQL session to read-only; existing identity
validation and operation READ ONLY snapshots remain required.

A background monitor checks relay reachability and the governed source identity
every 30 seconds. Source probes have independent short timeouts. HTTP status,
report reads and Refresh View read cached evidence or the trusted mart; they never
trigger source probes. Cached evidence includes relay/source availability, last
check and last successful connection, without connection strings or credentials.
Evidence older than 75 seconds disables source-dependent commands. An unavailable
source leaves trusted-serving readiness healthy, rejects authorized operations
with `ANALYTICS_SOURCE_UNAVAILABLE`, and automatically re-enables controls after
a successful background check. Other tenants cannot use the configured source.

The source reader uses the governed related-model `write_date` columns directly
for composite revisions and bounded keyset ordering. Optional customer location
columns are discovered from a closed allowlist once per source pool, inside its
read-only snapshot transaction. Missing fields remain null and existing fallback
fields remain supported. This avoids serializing unrelated binary/large partner
fields for timestamp predicates and presentation projection; it does not change
filters, tenant/company scope, cutoffs or safety bounds.

Manage relay recovery outside Git/images using the existing approved local SSH
or Teleport authentication mechanism. Restarting a socket bridge does not replace
SSH authentication: reconnecting an expired/disconnected upstream session requires
a valid approved unattended identity. Never bypass host verification or store a
password in source, argv or container images.

### Governed dimension filter presentation

Dimension discovery preserves `{id, label}`: stable IDs drive queries and saved
filters, while governed labels drive controls. Trusted serving resolves label
evidence from the same tenant, metric and policy tuples as option identities.
The categorical discovery endpoint `/api/dimensions/:dimension/search` reuses the
existing bounded request/response contract. Customer discovery keeps bounded
keyset search and independent selected-ID hydration; other dimensions reuse their
existing bounded value lists without adding pagination. Restored selections can
hydrate labels even when absent from the initial options. Missing or technical
labels use the existing safe fallback. Business Line uses governed EN/AR names;
actual customer and person names remain unchanged unless localized evidence exists.
Branch, Region and other categorical controls inherit the shared behavior.

Customer Historical reports present one bounded-scope guidance message per
execution. The existing date/customer safety policy and result bounds are unchanged.

## Governed detail serving

[Mart drill-through](governed-drill-through.md) adds immutable partition-to-fact
lineage under migration 035, exact publication guards and bounded detail reads.
Event details require the summary's trusted release and source-as-of; changed
state requires Refresh View. Finance details pin the originating immutable
customer snapshot, with per-point lineage for historical trends. No source
transport, source verification or export runs during drill-through.
