# Database migration boundary and current inventory

## Current heads

Migration SQL is immutable accepted repository history. PostgreSQL manifests are
loaded from ordered contiguous filenames; SQLite metadata uses an explicit file
registry. Each runner computes SHA-256 from the SQL and verifies ledger version,
filename and checksum. Unknown/newer history, gaps or checksum mismatch fail
closed. No accepted SQL or checksum is changed by milestone finalization.

| Store | Current head | Registration / readiness | Explicit execution |
| --- | --- | --- | --- |
| PostgreSQL analytics mart | 063 `lookup_dependencies` (candidate; not applied to staging) | [Manifest/runner](../../packages/data/src/postgres/migrations.ts), [runtime readiness](../../packages/data/src/postgres/readiness.ts) | `pnpm mart:migrate`; staging uses `pnpm staging migrate` |
| PostgreSQL control | 010 `tenant_source_settings` | [Manifest/runner/readiness](../../packages/data/src/control/migrations.ts) | `pnpm control migrate`; staging uses `pnpm staging migrate` |
| SQLite governed metadata | 007 `tenant-source-settings` | [Explicit registry/readiness](../../packages/data/src/metadata/migrations.ts) | `pnpm metadata:migrate <metadata-db-path>` against approved metadata storage |

The mart history includes production roles/forced RLS (001–008), certification,
published capabilities and exact receivable proofs (009–024), historical and
operational trusted serving (025–030), Finance snapshot invariants/freeze
(031–033), event rollups (034), drill lineage/access paths (035–038), historical anchor correction (039), unified serving (040), bounded historical imports (041), independently proven empty Finance snapshots (042), dataset-scoped exact ratio reconstruction (043), post-exposure Finance review (044), grouped exact review controls (045), the separate source-backed business family (046), and indexed immutable review/business membership reuse (047), and the shared review fact access index (048), and generated typed review-fact projections (049), and the narrow snapshot identity access index (050), followed by replacement of typed access with a narrow covering index (051).
Control 007 owns local authentication; 008 owns private analyst conversations and
atomic question audit. SQLite metadata 005 provides the compatibility analyst
history path. Demo analytics initialization is separate from governed metadata;
idempotent CREATE statements are not a supported schema upgrade mechanism.

`pnpm staging migrate` invokes both current PostgreSQL manifests and installs
scoped staging grants. `pnpm staging verify` checks exact histories/checksums and
runtime roles; API readiness uses the same current-schema boundaries. Startup
never repairs/migrates the governed schema. Apply all migrations before starting
a current image; a previously accepted local database may still need explicit
operator migration. This inventory records repository heads, not an inspection
or mutation of a live database.

## Execution and recovery contract

The adapter/deployment layer owns migrations, never routes/domain/browser.
PostgreSQL runners hold a session advisory lock, apply each forward migration in
a transaction, and record its checksum atomically. SQLite metadata has a separate
ledger, legacy-baseline reconciliation and explicit backup requirements. Read
[metadata operations](../security/administration-operations.md),
[control operations](../integration/postgres-control-plane.md),
[mart operations](../integration/postgres-mart-operations.md) and
[staging operations](../integration/shared-staging.md) before execution.

Back up and verify restore, define maintenance/concurrency ownership and record
image digests alongside schema heads. Prefer reviewed forward fixes. Application
rollback requires compatibility with the current immutable history; otherwise an
approved coordinated restore is needed. Never edit released migrations, delete
history or promise automatic destructive down migrations. Source/company mapping
and serving promotion remain separately governed operations.

Control 009 and SQLite metadata 006 add versioned workspace AI settings with encrypted API-key storage and the immutable `ai.settings_changed` audit action.

Migration 050 is additive: it builds a non-unique index of validated snapshot
identities without copying labels or source payloads, rewriting the fact heap,
changing policies, or replacing publications. Allow disk for index construction
and temporary sort files. After the index migration, ordinary `VACUUM (ANALYZE)
mart.review_facts` maintenance is required for the initial index-only history
read acceptance; run it outside a transaction as an authorized analytics database
owner. This is distinct from source extraction and never targets Odoo.

Migration 051 replaces the existing typed-access index, retaining its key order and
adding only entity identity and exact numeric amount as included columns. It does
not copy labels/dimensions/source envelopes, rewrite the heap, change policies or
replace publications. The replacement is transactional: the old index remains
until the new index has built, and a failure rolls back both schema and ledger.
Allow disk for both indexes during construction, sort files and WAL; the covering
index is larger and cannot use B-tree deduplication. There is one typed-access
index after success. Index-only reads depend on existing visibility coverage.
See the [measured query evidence](../qa/report-query-optimization-2026-10-16.md)
and [staging maintenance](../integration/shared-staging.md#typed-covering-index-migration-051).


Migration 052 replaces the typed-access index with the same keys and `INCLUDE(amount)`.
It retains scalar event coverage while leaving ordered snapshot identities on the
existing snapshot index. No canonical facts, heap, controls, serving history, RLS
or permissions change. Construction needs temporary index/WAL headroom and a
maintenance window for table locks. The runner commits index replacement and its
ledger row atomically; a schema-51 failure after the old-index drop restores the
original index OID/file/definition and data state. Older migration bytes remain
unchanged. Company index-only rehearsal restored Collections below its deadline;
acceptance of the combined history query remains pending.

Migration 057 scopes snapshot identity validation to snapshot bindings. Event bindings
retain configuration/signature, exact content, row-statistics and immutability
checks; snapshot identity failures still reject snapshot bindings. It changes no
existing cells, input membership, activation, roles or preparation deadlines.
Applied migrations 053–056 remain unchanged. Company application is pending.

### Pending prepared reporting window (060)

The local060candidate adds forced-RLS `mart.prepared_reporting_windows` and
metadata-only scoped chunk discovery. Registration is explicit, protected by the
existing tenant lock, current revision, READ COMMITTED and pre-seal/pre-activation
lifecycle checks. Existing unsealed prepared checkpoints are preserved. Earlier
snapshot anchors remain preparation dependencies while runtime reporting and
comparison periods obey the configured month-aligned window. Unconfigured
coverage remains unchanged. No native data deletion or automatic activation.
This records a candidate; company staging is still on059until separately approved
deployment. Original053–059files/checksums remain unchanged.

Migration 061 adds Sales Command Center operands and state columns, extends the canonical view without changing its security properties, and admits the explicitly versioned command mapping under the existing exact Business controls. It performs no extraction, preparation, activation or source writes. Prepared-serving migrations 053–060 remain unchanged.

Migration 062 is a candidate for source dependency metadata with focused
synthetic PostgreSQL evidence; company application remains pending. It adds
forced-RLS receivable identity/date heads and a checkpoint scoped by tenant,
source, definition and mapping. Only the ingestor can read or update them; the
runtime has no access. Writes require the successful matching sync audit and
source cursor. A missing/mismatched checkpoint requires a complete initialization
and the existing all-cutoff check. It performs no source access, data population,
preparation or publication. Existing migration bytes are unchanged. The six approved focused PostgreSQL checks passed for initialization, forward
and backdated corrections, current-period narrowing, isolation and rollback. This
does not establish real-data initialization cost or company performance.

Migration 063 is a lookup dependency candidate with focused synthetic evidence. It adds ingestor-only,
forced-RLS business fingerprints and a projection-aware checkpoint. It shares the
statement-level successful audit/cursor/version guard introduced by 062, retaining
the existing function identity and receivable triggers. Identity columns cannot be
updated by the ingestor. It performs no source extraction or initialization and
changes no published facts or labels. Missing/stale projection evidence requires a
complete lookup/document catch-up before enabling timestamp-only skips. First-run
cost and company performance remain unmeasured. Nine approved lookup tests and
twelve cursor/receivable regression tests passed in disposable PostgreSQL
databases. Local staging applied 062/063 successfully with tested API `2edef29`;
operator role/schema verification and HTTPS readiness passed. Company application
is pending.
No cache initialization or source sync ran during this rehearsal.
