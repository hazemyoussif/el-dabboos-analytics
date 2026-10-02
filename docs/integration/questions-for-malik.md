# Questions for Malik and business/source owners

All answers are pending. Original questions Q01–Q18 remain unresolved and are retained below; added questions extend discovery without assuming source architecture. Record answer, owner, evidence/date and status alongside each ID.

## Source architecture

**Q02 (original 2):** **Python processing:** Where would Python jobs run, and which transformations must happen before analytics?

**Q03 (original 3):** **Analytics source:** Should the product read Odoo, a replica, PostgreSQL mart, API, or exported files? Who owns it?

**Q19:** Does Python produce a canonical analytics mart, aggregated measures or normalized tables? Which system owns transforms and data-quality rejects?

## Odoo mapping

**Q01 (original 1):** **Odoo-to-Odoo integration:** Which Odoo versions, modules, company boundaries, and integration mechanism are in scope? Is direct access permitted?

**Q04 (original 4):** **PostgreSQL schema/API:** Are documented schemas, endpoints, credentials, sample payloads, and change notifications available?

**Q20:** Who owns PostgreSQL schemas, indexes, source API contracts and change notifications? Can we receive approved synthetic/anonymized samples before credentials?

## Identity

**Q05 (original 5):** **Tenant identity:** How is a customer/tenant identified and authorized? Can one account see multiple companies?

**Q13 (original 13):** Is Odoo the source of user identity? Are users shared between the two Odoo systems, or represented separately?

**Q14 (original 14):** Does El Dabboos use an external identity provider or SSO? Can the existing Python backend identify the authenticated Odoo user?

**Q17 (original 17):** How are inactive users and revoked memberships handled? What latency is required for revocation?

**Q21:** What verified principal, token/session contract and membership refresh/revocation behavior should replace demo headers?

## Authorization

**Q15 (original 15):** Which Odoo groups should map to analytics permissions? Should Odoo remain authorization source of truth, or should Analytics own additional roles?

**Q16 (original 16):** Are users scoped to companies or branches? Can one user access multiple customer companies or analytics tenants?

**Q18 (original 18):** Does existing PostgreSQL data contain company, tenant, and branch authorization attributes needed for enforcement?

**Q22:** Where are metric-domain permissions and branch policies owned, and which layer may administer them?

## Metrics

**Q07 (original 7):** **Metric definitions:** What are approved formulas for revenue, net revenue, gross margin, outstanding/overdue, stock snapshots, win rate, MTBF/MTTR, and currency conversion? Which order/invoice states count?

**Q10 (original 10):** **Localization:** Which Modern Standard Arabic terms are required in the UI, and which Iraqi/Egyptian colloquial phrases should planning recognize? What calendar, fiscal year, time zone, and number formatting apply in each market?

**Q23:** Which source report is authoritative for each metric family and eligible business states? Who signs the definition and tolerance?

## Currency

**Q11 (original 11):** **Currency policy:** Which transaction, company/base, and reporting currencies occur in each source? Where and when are rates applied, and who approves conversion before any aggregation?

**Q24:** Are monetary facts already normalized to reporting currency, with retained transaction/base lineage and approved rate dates?

## Sync/freshness

**Q06 (original 6):** **Synchronization:** Is ingestion push or pull? What are initial load, incremental update, deletion, retry, and reconciliation rules?

**Q08 (original 8):** **Data freshness:** What delay is acceptable for each domain? Are historical corrections expected?

**Q25:** What exact extraction watermark/sourceAsOf and completeness guarantee are available? How should partial batches and dataThrough be disclosed?

## Corrections/deletes

**Q26:** How do backfills and historical corrections restate periods? Are deletes physical, reversal events or tombstones? What stable event/version identity permits idempotent replay?

## Scale

**Q12 (original 12):** **Expected scale:** Tenants, users, fact volume, retention, query concurrency, and response-time targets?

**Q27:** Expected rows per tenant/family/day and retained history? Concurrent users/dashboards and series/query mix? What p95/p99 latency target and maximum report window are required?

## Security/privacy

**Q09 (original 9):** **Security:** What are data residency, PII masking, audit, encryption, and local/cloud model policies?

**Q28:** May an external LLM receive prompts, dashboard titles, filter values and customer/branch/product IDs? Which PII handling, residency, retention and diagnostic approvals apply to each endpoint policy?

## Infrastructure

**Q29:** Who operates PostgreSQL pools/indexes, API hosting, TLS, secrets, metadata persistence and migrations? What backup RPO/RTO and restore drill are required?

## Pilot acceptance

**Q30:** Which tenant, closed-month report and first metric family constitute the pilot vertical slice? Who signs reconciliation, approved tolerances, latency and privacy go/no-go?

Do not start real-data ingestion until the [P0 gates](production-readiness.md) have assigned approvals. Recommended first slice: approved revenue/net revenue/order count for one tenant, monthly/branch grouping and a frozen source watermark, plus isolation controls.
