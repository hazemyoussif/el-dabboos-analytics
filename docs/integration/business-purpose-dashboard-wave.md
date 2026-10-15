# Source-backed delivery for the ten requested dashboards

Scope: El Dabboos, existing protected Odoo source `accounting`, Company 1, IQD. Source remains read-only. Technical exactness is required; Finance reviews after exposure. See [ADR 037](../architecture/adr/037_source_business_dashboard_purposes.md) and [source acceptance audit](required-dashboards-source-audit.md).

## Delivered report purposes

| Requested purpose | Delivered source-backed report | Explicit limits |
| --- | --- | --- |
| Executive | Executive Monthly Overview | Matching-source invoice/cash ratios, signed debt and unknown maturity; provisional customer segments and native Brand. Stock/physical movements use separately dated reports. |
| Customer 80/20 | Customer Positive-Sales Pareto | Cumulative positive net share; raw nonpositive values retained; no automatic “20% of customers” assumption. Native segment filter, not invented four-department mapping. |
| Governorate/rep/A/B/C | Governorate, Salesperson & Calendar ABC; Customer ABC Detail | Invoice governorate/rep; calendar YTD thresholds. ABC detail provides working class C filtering; customer history geography is current-at-extraction. |
| Agency/product contributions | Product & Brand Positive-Sales Pareto | Native Brand/Category and customer/product monetary contribution, net invoiced base quantity. Official agency mapping unresolved; stock separately dated. |
| Debt/aging | Customer Debt & Aging | Known positive due 0–30/31–60/61–90/>90; future/unknown due separately; signed balance/month sales; Top 100 balances and genuine last invoice/cash dates. Original signed aging remains available unchanged. |
| Customer movement | Customer Movement in Observed History | First observed invoice, one confirmed order, inactivity ≥ three calendar months; observed source history, not company lifetime. |
| Stock/expiry | Current Stock & Expiry Coverage | Company-owned internal base quantities, expired/next two months/unknown expiry, negative positions; no fake prior-month snapshot or exact expiry cost. |
| Returns | Physical Returns & Internal Transfers | Done return/delivery quantities and same-period flow rate, warehouse/brand filters, internal movements once. Credit-note/sales percentage remains financial; no inferred damaged-return classification/value. |
| Unbilled/order age | Current Unbilled Quantities & Order Age | Delivered/received above invoiced in base units; investigation indicators. More than 24-hour order age with undelivered positive product lines, not a promised-date SLA. |
| Liquidity | Book Liquidity & Payable Due Coverage | Posted cash/bank book balance, next-month contractual receivable/payable schedules, unknown maturity and supplier advances. No guaranteed forecast, recurring-expense plan, available-bank claim or invented budget. |
| Cross-year history | Sales & Collections History | Consecutive published event months only; annual totals show selected coverage. Choose equal elapsed periods for comparisons; no snapshot summing. |

These twelve report views reuse the governed templates, filters, Save/version lifecycle, tenant/policy checks and metric-definition popup. They do not auto-save. Available views depend on exact stored capabilities, rather than source SQL ingredients alone.

## Metric contract

42 new public metric IDs; 38 new input measures plus one internal matching sales operand. Each publication records source snapshot, mapping/definition versions and exact independent summary/tuple/count controls. The separate business family does not reload or replace the 28 completed review months or original facts/receivables partitions.

- Invoice/cash: period net/gross invoice sales, credit-note value, cash, cash/net-sales %, credit-note/invoice-sales %, net invoiced base quantity.
- Customers: month sales, calendar YTD monthly average, observed customers/orders/new/single/inactive cohorts, last posted invoice and positive cash dates.
- Debt: signed ledger balance, balance/month-sales %, unknown maturity, future due, positive due 0–30/31–60/61–90/>90, next-calendar-month maturity schedule.
- Stock: internal, expired, near-expiry, unknown-expiry base quantities and negative position count.
- Movements/operations: done customer returns/deliveries/internal transfer quantities, return/delivery flow %, delivered/received above invoiced quantities and open order-age exceptions.
- Book liquidity: cash/bank ledger, supplier due/next-month/unknown-maturity credit residuals and separate supplier debit advances.

Amounts retain exact company-currency operands. Quantity conversion has an explicit six-decimal boundary; product UOM configuration is current-at-extraction. Quantity output groups cannot mix base UOMs. Ratios divide matching aggregate operands; zero denominator returns null. Dates use a maximum reducer and render as dates, never sums of day codes.

## Source and verification evidence

The October 14 protected source audit found the usable ingredients and documented missing classifications/history. Follow-up live extraction attempts validated source facts but hit the bounded source lease/large-control response limits. No incomplete attempt was exposed. Record-vector transport, one-time caption hydration and streamed independent controls address that overhead while retaining the same source records, facts, lineage and read-only checks. The final September 2026 read-only audit passed at `2026-10-14T20:43:30.499Z`: 258,963 canonical facts and 162,615 exact source summary/tuple controls, including invoice-header reconciliation. The October current-month audit passed at `2026-10-14T21:00:14.336Z`: 164,668 facts and 103,972 independent controls.

Private source-verification aggregates: `/tmp/business-source-final-2026-09.json` and current-month equivalent. No source credentials, customer extracts or captions are committed. Automated checks use isolated synthetic Odoo-shaped tables; that evidence is distinct from live source controls.

## Manual hosted rollout

Use the normal repository pull, image build, protected operator migration/verification and API/web restart workflow already used on hosted staging. Keep the build number numeric (for example the existing `git rev-list --count HEAD` convention); descriptive image tags are not valid web build numbers. Migration 046 is analytics-only. Keep the existing PostgreSQL volume, backups and restored comparison containers. Never restore over the live databases or reload original/review families to install these reports.

After the merged release is built and ready, run the existing operator image with the protected operator and Odoo-source configuration, using the existing approved source connection and in-memory `ODOO_SOURCE_STAGING_PILOT=true`. For this bounded business extraction use `ODOO_SOURCE_BATCH_SIZE=1000`, `ODOO_SOURCE_STATEMENT_TIMEOUT_MS=120000`, `ODOO_SOURCE_SNAPSHOT_MAX_DURATION_MS=600000`. These are per-command read bounds, not credential or source-server changes.

The existing analytics entry point adds:

```bash
node --experimental-transform-types --disable-warning=ExperimentalWarning \
  apps/api/src/analytics-status-cli.ts expose-business \
  --tenant el-dabboos-iq --month 2026-09
```

Use the operator's `/workspace` working directory and repository entry point, avoiding the earlier unsupported root package import. A successful output names the immutable business partition/revision and `financeReview: pending`. Current stock/order/payable inputs load only when the month is the actual source business month; historical closed months omit them.

Backfill only missing **business** months in the existing facts coverage; all existing review months remain preserved. Use a new protected source snapshot for each bounded month, stop on the first error, and verify each returned exposure. Historical views become available only after consecutive business coverage exists. Do not replay successful months merely to install a report.

Preservation check: compare `facts`, `receivables` **and `review`** month/partition membership against the trusted revision captured before this rollout; the changed/missing count must be zero. Independently compare the new business summary/tuple controls and exercise the published reports, tenant/policy boundaries, unknown buckets, date/null behavior and quantity filters. Rebuilding images alone does not materialize this new serving family.

Current stock quality follow-up found 1,028 positive and 47 negative positions whose matching-product lots have `company_id NULL`, meaning shared lots, not a foreign-company assignment. The reader permits shared lots only with a matching product and a company-scoped quant, and rejects explicit different-company lots. No source lot or permission was edited.

## Laptop acceptance

Protected laptop staging received migration 046, September and current October business partitions through the existing operator. September revision `bdd7e44e-573d-432b-a76f-ec5220660dd7` contains 258,963 facts/162,615 controls. October revision `3b5f517c-a1a4-4eda-9da3-45c975d3b03e` contains 164,668 facts/103,972 controls. Both retain Finance review pending. All 26 original facts/receivables/review partition IDs remain unchanged. Company-hosted staging is not changed by laptop acceptance.

Live report verification exposed a customer cohort larger than the legacy 4,000-group bound. The separate business reader defaults to a bounded 10,000 groups; legacy bounds remain unchanged and explicit configured bounds still apply. A synthetic 5,001-customer date regression verifies this boundary. Publication and report verification use separate writer/read-only runtime identities.

The UI AFTER review exercised English/Arabic, Light/Dark, 390/1024/1440 widths, date-dialog keyboard/focus behavior, six-decimal ABC averages, fractional base quantities and cumulative Pareto percentage headers/help. Temporary previews were explicitly synthetic and removed after review.

All twelve laptop report views executed against the published source-backed manifest: 120 series, zero execution failures. Complete-month views bind September 2026; current-only views bind October 1–15, 2026; the history view binds consecutive published September–October coverage. Older historical business months still require the explicit missing-month backfill on the intended staging target.

### Hosted missing-month check

After migration 046, inspect the trusted manifest with the existing analytics database operator. This queries the analytics database, never Odoo:

```sql
WITH membership AS (
  SELECT member.month, member.family
  FROM mart.analytics_trusted_serving trusted
  JOIN mart.analytics_serving_members member USING (tenant_id, revision_id)
  WHERE trusted.tenant_id = 'el-dabboos-iq'
)
SELECT to_char(month, 'YYYY-MM') AS missing_business_month
FROM membership WHERE family = 'facts'
EXCEPT
SELECT to_char(month, 'YYYY-MM') FROM membership WHERE family = 'business'
ORDER BY missing_business_month;
```

Load only those returned months with `expose-business`, stopping on any failure. The successful hosted review backfill does not create this new family. Historical months omit current-only stock, unbilled/order-age and payable inputs; those arrive with the actual current-month publication.

## Final verification

Frozen install, lint, architecture, quality, typecheck, API/web build and diff gates passed. The final unit/API/web suite passed 895 tests with zero failures/skips. The full disposable PostgreSQL 18.6 suite passed 289 checks with zero failures/skips and a clean exit; an additional two-case business exposure/capacity run passed, including the new 5,001-customer date boundary and explicit-bound refusal. The full suite also verifies PostgreSQL Pareto parity. Owned disposable test containers were removed afterward.

Laptop API readiness and HTTPS readiness returned ready after the normal API/web rebuild/restart. Live source verification, 120-series report execution, original membership preservation and synthetic browser evidence are distinct from automated fixture coverage. Existing operational definition `b186c03dba16e55843d34f1a2cef4081b5ece9e905787537d1477eb144636bc0` and review definition `c6216bfea28db777a628391149e6585307ff558fff0684da32497ee7abe01593` remain unchanged. Business definition is `5c60b1323a9b5f41202d4850932db3300933b03e0e7e59280a85b475072f1d57`. No source credentials/customer extracts are committed.

## Backfill insert performance (migration 047)

Hosted backfill published June 2024–January 2025 and February returned SQLSTATE 57014 from an analytics INSERT, with statement timeout. Source timeout was not the reported failure. Copying inherited review/business members re-ran full exact reconciliation for every unchanged partition. This cost grows with retained manifest history; the tenant/partition lookup index already exists from migration 038.

Migration 047 uses the existing tenant/partition index and reuses exact membership for the same immutable tenant, partition, family and month. First-time membership still requires exact independent controls; changed-partition trusted promotion, tenant RLS, partition identity, exposed-content locks, immutable history and rollback remain enforced. No source SQL, source permission, source infrastructure, financial definition or timeout is changed. Earlier migration bytes remain unchanged.

Apply through the normal protected staging migrate/verify workflow and retry only missing business months, starting with February 2025. Keep the original pre-backfill membership evidence and compare original facts, receivables and review partition IDs afterward. Hosted completion must be confirmed by the resumed load; synthetic regression evidence does not establish a hosted retry result.


## Shared report serving and discovery (migration 048)

Event reads select trusted business members by the requested month range before aggregating exact numeric inputs. Only requested grouping, policy/filter and quantity-compatibility dimensions survive aggregation. Snapshot selection and monetary/ratio definitions are unchanged. Migration 048 adds the shared tenant/partition/measure/date expression index on analytics review facts; it does not mutate facts, source data, published membership or earlier migration history.

Categorical filter discovery is lazy, bounded and scoped to an authorized metric and effective report period. `DimensionDiscoveryRequest.dateRange` carries that transient period; `asOf` remains compatible. Continuations are bound to tenant, locale, enforced policy, metric, dimension, period and search. Selected identities hydrate separately from the page, including duplicate display names, and an unavailable label never becomes a source ID. Snapshot discovery uses the latest eligible cutoff rather than applying event-period lower bounds to balances; absent history remains empty. Reports no longer eagerly enumerate unrelated catalogue dimensions at opening or language changes.

Failed widgets remain visible. Stable error codes drive English/Arabic feedback; arbitrary database errors never reach report copy. A failed table series shows Unavailable, while a legitimate null remains a dash. Report provenance uses the executed effective dates rather than an unresolved relative preset. Query row, group, concurrency and statement-time limits remain in force; this release does not implement unbounded execution or backend result pagination. A grouped result exceeding its configured bound still requires a narrower selection. No report-specific IDs, calendar periods, tenant shortcuts or data substitutions govern these changes.

Synthetic verification is distinct from hosted acceptance: 60,000 exact fractional event facts across three months verify selected-month totals, consecutive-month totals, policy scope, keyset continuation, selected-ID hydration and unsupported-dimension rejection under the runtime identity. PostgreSQL 18.6 selected `review_facts_measure_date` by tenant/partition (20,024 candidate facts in the selected month; other months excluded); the observed local plan executed in 68.466 ms. This is not a company-staging timing claim. Existing runtime RLS remains active.

The UI quality gate exercised lazy opening, Load more, retry after failure, stable selection and keyboard focus in a temporary explicitly synthetic preview. English/Arabic, Light/Dark and 390/1024/1440px layouts showed no page overflow. Failed cells and valid nulls remained distinct. The preview is not shipped. Company staging needs the normal migration/build/restart workflow and a subsequent browser check; no source reload is required for these serving changes.


## Shared read and delivery performance

The exact event aggregation path is shared by both review and business families. PostgreSQL selects only trusted members, requested measures and dates, then sums decimal operands at the required date/month and dimension grain. Ratios and weighted durations retain their separate summed operands. Snapshots retain their entity-based read path. Certified non-sum aggregation restrictions remain enforced. A separate metadata row carries the published observation cutoff for an exactly empty event selection; no synthetic fact is manufactured.

Readiness validates the trusted baseline, definition and reporting currency without constructing the fact capability catalogue. Review/business reads avoid that unrelated catalogue. Legacy fact reads authorize their current capabilities inside the read transaction, while Finance keeps its independently published snapshot capabilities. Capability discovery can read the three independent published families concurrently through the existing bounded pool. No cross-request result cache, higher query bounds or source changes are involved.

A local 5,000-customer synthetic summary fixture observed 201.831 ms / 5,000 returned fact rows / 3,867,781 bytes / 11 database calls before this extension, and 81.700 ms / one aggregate plus one cutoff row / 260 bytes / nine calls after it. These are local observations, not hosted latency guarantees. The regression also retains exact weighted days, snapshot cutoff, explicit Top-N contribution denominators, rejection of uncertified aggregations and provenance for empty selections.

The staging web server compresses public hashed build assets and marks them immutable for repeat visits. Entry HTML, including SPA deep links, revalidates; personalized API responses do not receive this asset cache policy. A local Nginx test observed the main JavaScript asset shrink from 1,298,102 to 430,747 transfer bytes (66.82%), verified gzip round-trip integrity, fresh entry headers and a real 404 for missing assets. Actual company network and database timings remain a post-deployment check.


## Grouped result windows and history access

[ADR 038](../architecture/adr/038-grouped-result-windows.md) adds shared source-owned SQL result windows for operational, Finance, review and business categorical reads. Customer counts above a response cap no longer prevent loading a bounded page. Multi-series pages share identity selection, and Top-N/Pareto anchors select peer output without changing business filters or global denominators. Counts remain unknown when an exact multi-series union count has not been calculated. Exports explicitly cover displayed loaded rows. No report IDs, tenant IDs or fixed periods control execution.

Migration 049 adds generated typed fields and an index over existing review facts. Full historical event reductions use exact SQL operands at the requested time grain. This preserves immutable payloads and trusted membership, requires no source reload and does not depend on Odoo. Generated-column population can require a table rewrite/lock and additional disk space; run it in the normal stopped-API migration workflow. The performance fixture exercises 300,000 synthetic facts over three months, summary/month/year/salesperson/governorate queries and exact fractional totals. Its observations are local evidence, not a hosted latency promise.

The browser audit on build 259 confirmed grouped limits in customer detail, collections, margin, Pareto, ABC and movement; Top-100 peer failures; history query timeouts; and a transient readiness failure. The source-specific business mapping limitations remain. After this change is deployed, recheck those reports at their default scope and record effective periods and failures; successful local tests alone do not establish hosted completion.
