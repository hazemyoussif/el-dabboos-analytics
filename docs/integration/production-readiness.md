# Production and real-data readiness

Status is evidence-based, not a claim that the prototype is production-ready. Owners named by role are proposed; Malik/business must assign individuals. [Questions](questions-for-malik.md), [source contract](real-data-contract.md), [reconciliation](reconciliation-plan.md).

## P0 — before real data

| Gate | Current state | Required decision/evidence / proposed owner |
| --- | --- | --- |
| Metric/business definition approval | Synthetic canonical formulas and available/planned registry | Eligible states, tax/discount/returns/cost definitions signed by finance/domain owners |
| Currency policy | Tenant IQD/EGP display; no FX and no fact currency field | Transaction/base/reporting currency and approved conversion before aggregation; finance |
| Tenant/company mapping | Validated demo membership and tenant-scoped facts | Stable source company/tenant/branch mapping and multi-company rules; source/security owners |
| Production identity contract | Demo headers only | Verified IdP/SSO principal, memberships, revocation and policy owner; identity/security |
| Source adapter architecture | Mock/SQLite canonical facts only | Confirm Python mart vs normalized source/API/replica and ownership; integration |
| Data-quality checks | Canonical finite/date/measure/snapshot validation | Missing/duplicate/state/unit/entity rules, rejects and correction processing; source owner |
| Reconciliation | Deterministic synthetic contract tests | Approved source report, watermark, date/group totals and tolerance sign-off; business |
| Bounded query execution | Implemented request dedup + default 8 unique concurrent calls (1..64) | Source-specific timeout/cancellation, process-wide capacity and scale evidence still needed; platform |
| LLM privacy/data sharing | Authorized context and safe diagnostics; edit spec can contain identifiers | Endpoint policy for prompts/spec titles/filter IDs and retention/residency; security/tenant |
| DB migration strategy | Documented boundary; idempotent CREATE only | Choose production metadata store, versioned runner, backup/restore rehearsal; platform |

A document alone does not close a business gate. Do not ingest real data or send customer specs to external endpoints before approval.

## P1 — before customer pilot

| Item | Current state | Next evidence |
| --- | --- | --- |
| Structured logging | Safe allowlisted startup summary and opt-in bounded diagnostics | Approved structured operational fields and retention |
| Request/trace IDs | Design only | Edge validation, propagation, adapter/provider spans, safe correlation |
| Persistent audit | In-memory AuditSink | Durable sink, access, retention and tamper/recovery policy |
| Liveness/readiness | Implemented live/ready plus health compatibility | Deployment probe wiring; source probe deadlines/cancellation |
| Config schema validation | Implemented bounded root parser, safe fail-fast | Secret-manager/deployment override verification |
| Query timeouts/cancellation | LLM timeout exists; analytics lacks cancellation | Source-native cancellation and bounded resource cleanup |
| Connection pooling | DatabaseSync SQLite; no source pool | Real source pool/backpressure sized to concurrency |
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

One approved pilot tenant, revenue/net_revenue/order_count, monthly and branch grouping, explicit reporting currency and a fixed source watermark. Implement canonical source adapter contract tests, verify branch intersection and a second-tenant isolation control, then reconcile one closed month and a correction case against the signed source report. Disable external LLM use until privacy approval. Expand to ratios/snapshots only after input mappings are certified.
