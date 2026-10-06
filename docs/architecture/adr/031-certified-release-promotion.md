# ADR 031 — Authorized business certification and explicit mart promotion

Status: accepted by explicit user instruction, 6 October 2026. Extends ADR 029's business evidence and publication path; technical reconciliation, immutable candidates, completed extraction and separate serving authorization remain mandatory.

## Business authority

Business certification may use either exact external-report evidence or explicit approval by the authorized business/product approver over an exactly reconciled dataset. Exact Odoo UI labels, filters and screenshots are optional supporting evidence for the authorized approval path. They must never be fabricated or silently substituted for source controls. Human approval cannot override a failed, incomplete, pending-tolerance, nonzero-tolerance or non-exact technical comparison.

The offline dedicated migrator attests the externally authorized approver. This is a privileged operational trust boundary, not an HTTP endpoint or an automatic permission inferred from a tenant-admin role. The event records the approver reference, approval timestamp, tenant/company, dataset/version, period, exact approved values, selected technical case IDs/reference and business interpretation. External-report certification additionally names its report reference. PostgreSQL audits insertion using the database actor and server timestamp. Events are immutable and tenant-scoped; runtime and ingestor cannot author them. A new event appends history rather than changing existing evidence.

Migration 009 requires linked business certification for mapping approval, serving binding and runtime release visibility. Existing reconciliation checks remain, and certification additionally requires exact value/count equality, zero tolerances, complete selected cases covering every mapped measure, matching company/period and approved values matching overall controls. Existing candidates, facts, batches and reconciliation specifications are unchanged. Previously approved mappings without the additional business evidence fail closed until separately certified.

For the September 2026 Iraq Phase 1 release, the user explicitly approves company 1, IQD, Posted Invoice Value 1,465,712,000; Refund Value 18,545,500; Net Invoiced Revenue 1,447,166,500. Executive revenue is Net Invoiced Revenue; sales orders remain separate; refunds use their own issue date; Business Line is official; salesperson is governed res_users.id rather than create_uid. FIN-OIA-STAGING-2026-09-V1 identifies the completed append-only approval event. The operator recording timestamp is not represented as an earlier Finance Manager action time.

## Promotion

The pilot mart and staging mart retain separate databases and credentials. An explicit offline operation reads one approved, business-certified release under repeatable-read tenant scope. It copies exact persisted rows and lineage, with no remapping, recalculation, source extraction or source writes. Only that tenant/dataset is selected. Historical dependencies in that release, including incomplete attempts referenced by immutable revisions, are retained; runtime continues to refuse incomplete histories.

A fixed dependency manifest transfers mapping, extraction runs, batches, revisions, heads, snapshot owners, batch links, safe rejects, reconciliation evidence/links and business certifications. Numeric values and timestamps are transferred as PostgreSQL-generated JSON text and reconstructed in PostgreSQL, avoiding JavaScript number conversion. UTC serialization, per-table limits of 100,000 rows and an aggregate 128 MiB bound keep this initial promotion bounded. Larger releases need a separately reviewed streaming implementation.

The target has the same immutable migration manifest. One target transaction acquires a release lock, registers the same pending candidate, inserts exact evidence, applies the existing metadata-only approval checks, compares a SHA-256 fingerprint of every transferred row, and records an immutable promotion receipt. Any error rolls back the entire target transaction. Existing target data is never overwritten. Repeating an unchanged promotion verifies both source and target against the receipt and returns already-promoted; drift is refused.

Promotion does not activate serving. A separate authorized bind operation requires an approved certified promoted release and an immutable receipt; the existing SQL serving guard remains authoritative. One binding per tenant remains. Its identity is the existing tenant/dataset pair, not a new dashboard source selector. Application and query contracts, authentication and policy intersections are unchanged. No sync service, distributed write transaction, public publication API or general source migration framework is introduced.

## Verification

Synthetic PostgreSQL tests cover authorized exact approval, failure refusal, immutable audited events, pending serving refusal, exact atomic transfer, rollback, idempotency, explicit binding and cross-tenant runtime isolation. Tests use only the disposable foundation_test database and never load developer configuration. Operational pilot and authenticated browser evidence are reported separately.
