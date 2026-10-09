# Database migration boundary and current inventory

## Current heads

Migration SQL is immutable accepted repository history. PostgreSQL manifests are
loaded from ordered contiguous filenames; SQLite metadata uses an explicit file
registry. Each runner computes SHA-256 from the SQL and verifies ledger version,
filename and checksum. Unknown/newer history, gaps or checksum mismatch fail
closed. No accepted SQL or checksum is changed by milestone finalization.

| Store | Current head | Registration / readiness | Explicit execution |
| --- | --- | --- | --- |
| PostgreSQL analytics mart | 037 `drill_revision_range` | [Manifest/runner](../../packages/data/src/postgres/migrations.ts), [runtime readiness](../../packages/data/src/postgres/readiness.ts) | `pnpm mart:migrate`; staging uses `pnpm staging migrate` |
| PostgreSQL control | 008 `analyst_conversations` | [Manifest/runner/readiness](../../packages/data/src/control/migrations.ts) | `pnpm control migrate`; staging uses `pnpm staging migrate` |
| SQLite governed metadata | 005 `analyst` | [Explicit registry/readiness](../../packages/data/src/metadata/migrations.ts) | `pnpm metadata:migrate <metadata-db-path>` against approved metadata storage |

The mart history includes production roles/forced RLS (001–008), certification,
published capabilities and exact receivable proofs (009–024), historical and
operational trusted serving (025–030), Finance snapshot invariants/freeze
(031–033), event rollups (034), and drill lineage/access paths (035–037).
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
