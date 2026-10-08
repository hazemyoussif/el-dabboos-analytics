# Production and real-data readiness

Pilot status, 5 October 2026: source adapter and immutable-candidate/paged-extraction controls are implemented and synthetically verified under [ADR 029](../architecture/adr/029-ingestion-certification-lifecycle.md), including its approved retained PostgreSQL snapshot extension. The user approved one September company-1 comparison pilot for `el-dabboos-iq`. Local source/mart configuration and authoritative Invoice Analysis evidence remain outstanding; actual snapshot evidence is derived by the retained source transaction. [Pilot operations](odoo-postgres-pilot.md) own these concrete gates; this does not close general production readiness or authorize serving.

Status is evidence-based, not a claim that the prototype is production-ready. Owners named by role are proposed; Malik/business must assign individuals. [Questions](questions-for-malik.md), [source contract](real-data-contract.md), [reconciliation](reconciliation-plan.md).

## P0 — before real data

| Gate | Current state | Required decision/evidence / proposed owner |
| --- | --- | --- |
| Metric/business definition approval | Synthetic canonical formulas and available/planned registry | Eligible states, tax/discount/returns/cost definitions signed by finance/domain owners |
| Currency policy | Tenant IQD/EGP display; no FX and no fact currency field | Transaction/base/reporting currency and approved conversion before aggregation; finance |
| Tenant/company mapping | Validated demo membership and tenant-scoped facts | Stable source company/tenant/branch mapping and multi-company rules; source/security owners |
| Production identity contract | Governed local credentials/cookie sessions; shared bootstrap remains inactive | Verified IdP/SSO principal, memberships, revocation and policy owner; identity/security |
| Source adapter architecture | Owned PostgreSQL mart, writer and SQL serving tested with synthetic data; no connector | Approve source boundary, mapping and implementation evidence; integration |
| Data-quality checks | Canonical finite/date/measure/snapshot validation | Missing/duplicate/state/unit/entity rules, rejects and correction processing; source owner |
| Reconciliation | Deterministic synthetic contract tests | Approved source report, watermark, date/group totals and tolerance sign-off; business |
| Bounded query execution | Implemented request dedup + default 8 unique concurrent calls (1..64) | Source-specific timeout/cancellation, process-wide capacity and scale evidence still needed; platform |
| LLM privacy/data sharing | Authorized context and safe diagnostics; edit spec can contain identifiers | Endpoint policy for prompts/spec titles/filter IDs and retention/residency; security/tenant |
| DB migration strategy | Five migrations with ledger/checksum/session lock and transaction rollback tested on PostgreSQL 18.6 | Runner/container/CI, grants/forced RLS and synthetic migration evidence implemented; production hosting, restore drills and metadata-store migration remain separate; platform |

A document alone does not close a business gate. Do not ingest real data or send customer specs to external endpoints before approval.

## P1 — before customer pilot

| Item | Current state | Next evidence |
| --- | --- | --- |
| Structured logging | Safe allowlisted startup summary and opt-in bounded diagnostics | Approved structured operational fields and retention |
| Request/trace IDs | Design only | Edge validation, propagation, adapter/provider spans, safe correlation |
| Persistent audit | In-memory AuditSink | Durable sink, access, retention and tamper/recovery policy |
| Liveness/readiness | Implemented live/ready plus health compatibility | Deployment probe wiring; source probe deadlines/cancellation |
| Config schema validation | Implemented bounded root parser, safe fail-fast | Secret-manager/deployment override verification |
| Query timeouts/cancellation | LLM timeout and PostgreSQL-native statement timeout implemented; SQLite remains synchronous | Source-native cancellation and bounded resource cleanup |
| Connection pooling | DatabaseSync SQLite; opt-in mart pool with bounded size and checkout timeout | Real source pool/backpressure sized to concurrency |
| Load/performance | Functional synthetic tests only | Expected rows/users/dashboards, p95 target and sustained-load evidence |
| Deployment architecture | Local API + Vite; built API/web available | TLS/proxy/API replicas/durable DB and migration ownership |
| Production CORS/security headers | Development permissive setup | Approved origin/session/CSRF/header policy |
| Backup/recovery | Strategy proposed, no restore evidence | Approved RPO/RTO, encrypted consistent backup and drill |

Readiness says storage shape available, not reconciled source/business freshness. Concurrency is per execution, not a global throttle. SQLite is synchronous and loads relevant tenant measures in memory.

## P2 — future product work

| Item | Current state |
| --- | --- |
| Delete/archive dashboards | Not implemented; folder deletion exists and preserves dashboards |
| Server-side search | Library title filtering is client-side |
| Nested folders | Flat personal folders only |
| Scheduled reports | Not implemented |
| Dashboard export | Not implemented |
| Public links | Auth-scoped deep links only, no public links |
| Collaboration | Shared view scope exists; no simultaneous collaborative editing |
| Custom branding | Central Light/Dark/System tokens only; no arbitrary tenant CSS |
| Additional visualizations | Governed eight types and supported variants; additions need invariants/tests |
| Bundle optimization | Vite/Recharts build warning remains a capacity/usability follow-up |

## Recommended first vertical slice

One approved pilot tenant, revenue/net_revenue/order_count, monthly and one certified organizational grouping (branch only when supported), explicit reporting currency and a fixed source watermark. Implement canonical source adapter contract tests, verify branch intersection and a second-tenant isolation control, then reconcile one closed month and a correction case against the signed source report. Disable external LLM use until privacy approval. Expand to ratios/snapshots only after input mappings are certified.

[ADR 027](../architecture/adr/027-production-data-foundation.md) records the offline foundation. None of its contracts or synthetic tests close source, currency, business approval or operational gates. Legacy systems remain read-only; no credentials or production connection are part of this milestone.

Control persistence milestone: [PostgreSQL control plane](postgres-control-plane.md) provides schema/role separation, versioned product metadata, source/mapping authoring and exact SQLite cutover verification. This closes the persistence implementation path, not shared deployment, trusted identity, approved metadata migration, publication governance, backup/restore or business certification gates. Persistent local mart evidence remains independent and unchanged.

Local identity milestone: [local authentication](../security/local-authentication.md) and ADR 030 provide governed offline initial setup, framework-owned hashing, revocable sessions, safe security audit and fresh authorization. This closes the local implementation slice; HTTPS deployment, approved employee credential handoff/activation, MFA/recovery policy, privacy/retention and upstream security review remain launch gates. No Odoo auth, invitation email or source sync is enabled.

Phase 1 certification policy update, 6 October 2026: [ADR 031](../architecture/adr/031-certified-release-promotion.md) accepts explicit authorized business/product approval combined with exact source-to-mart reconciliation. Odoo UI labels/filter screenshots are supporting evidence, not a mandatory prerequisite on this path. Failed reconciliation remains unpublishable. Certified promotion and serving are explicit offline operations; broader production readiness gates remain separate.

## Local operational v1 evidence

Concrete incremental jobs, transactional cursor/promotion guards, stored exact
reconciliation, affected aggregate refresh and governed presence sweeps are now
executable locally. See [operational v1](operational-analytics-v1.md) and the
[acceptance handoff](../qa/operational-analytics-acceptance.md). This evidence does
not approve an online rollout, an external scheduler, a longer source lease or a
new business mapping. Fixed overlap still needs a validated production source
transaction/watermark policy. Component-level Finance operational promotion is
future scope; current September customer outputs retain their original anchor.
