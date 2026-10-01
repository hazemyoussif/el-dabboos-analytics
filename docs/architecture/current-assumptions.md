# Current assumptions and limits

## Implemented / synthetic

- Two validated demo tenant profiles, IQ/IQD and EG/EGP; synthetic dates October 2024–September 2026. No actual company geography/customer identity.
- Header-based demo identity directory with membership, permissions, domains and enforced branch policy. Production authentication, token verification and revocation are future work.
- Canonical v2 schemas and semantics, market-neutral templates, eight widget types, bounded analyses and manual/AI working drafts.
- Explicit saved-record lifecycle with owner checks and optimistic versions; personal flat folders/favorites separate from record content.
- UI locale/theme preferences survive refresh without spec changes; browser working draft does not survive refresh until saved.
- Default execution concurrency 8 with request-local deduplication. No shared cache, query cancellation or source pool.
- SQLite DatabaseSync and in-memory deterministic engine; source-scale pushdown and multi-process production capacity are unproven.
- dataThrough is business coverage; sourceAsOf is only explicit known extraction time. No FX conversion or source currency column in current canonical demo facts.
- Idempotent schema initialization, no version tracking/migration runner; in-memory audit, no persistent tracing stack.

## Unresolved / proposed

Business states/formulas, tenant/company mapping, transaction/base/reporting currency rules, IdP and policy ownership, real source shape, deletes/backfills, watermark, expected scale, privacy, latency, backups and migrations need confirmation. Do not infer real Odoo tables, ingestion freshness, permission mappings or tolerances from synthetic examples. [Malik questions](../integration/questions-for-malik.md), [production readiness](../integration/production-readiness.md).
