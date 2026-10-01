# Database migration boundary

## Current

SQLite analytics, dashboard and library schemas initialize with idempotent CREATE statements. There is no version table, ordered migration runner or supported automatic downgrade. This branch intentionally adds no schema changes to analytics facts and no migration framework. Re-running CREATE does not migrate a changed existing column. Treat all stored demo metadata as development storage until the production migration gate is satisfied.

## Proposed production contract

Migration ownership belongs to the metadata adapter/deployment layer, never HTTP routes/domain or browser. The composition root calls a dedicated migration/bootstrap boundary **before accepting traffic**; source mart migrations belong to its separate approved source owner. Do not couple analytics ingestion upgrades to dashboard metadata versions.

1. Add an internal schema-version ledger per owned metadata database with version, appliedAt and immutable migration checksum. Establish and test a legacy-baseline detection path before adopting it; never label an unknown schema current automatically.
2. Apply ordered forward-only migrations with transactions where supported, explicit invariants, and compatibility tests against prior populated versions. Separate data transformation from DDL when operations cannot be atomic.
3. Back up and verify restore before migration, with approved retention/encryption, RPO/RTO and maintenance/concurrency policy. SQLite files must be backed up consistently, not copied during writes without an approved mechanism.
4. Fail closed on unknown version, checksum mismatch or partial migration; do not start API against uncertain metadata shape. Emit safe version/stage errors, not rows/secrets. Record recovery steps and owner.
5. Rollback philosophy: prefer tested forward fix; restore an approved backup when necessary. Do not promise destructive automatic down migrations. Coordinate binary/schema compatibility and expected-version record semantics.
6. Migration owner reviews scripts and evidence; operations executes controlled deployment; product owner approves potential data loss/downtime. Restore rehearsal is required before pilot.

## Next implementation gate

Decide SQLite vs production metadata DB and replica strategy first. Add a small versioned runner only for the chosen store with upgrade/failure/restore tests; a heavy framework is not justified just for this demo. Existing repository boundaries are the migration extension point. [Readiness](../integration/production-readiness.md), [runtime](runtime-and-deployment.md).
