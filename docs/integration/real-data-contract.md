# Proposed production source contract

Implemented pilot extension, 5 October 2026: the approved Odoo comparison adapter maps explicit order and invoice/refund recipes, stable customer/salesperson/Business Line IDs and immutable transaction/tax/lineage evidence. [ADR 029](../architecture/adr/029-ingestion-certification-lifecycle.md) defines immutable candidate certification and completed paged extraction. [Pilot operations](odoo-postgres-pilot.md) distinguish synthetic verification, live DB controls and the still-required Invoice Analysis sign-off. The requirements below continue to govern other future sources.

**Future / unresolved until approved.** No Odoo tables or direct source access are assumed. This describes canonical requirements, not a claim that current demo facts have all production envelope fields. [Current model](../developer/data-model.md), [questions](questions-for-malik.md).

## Canonical row envelope

| Requirement | Event facts | Snapshot facts |
| --- | --- | --- |
| tenant | Stable approved company→tenant mapping, enforced before reading | Same; entity identity is tenant-scoped |
| measure | Approved canonical input measure ID, not a precomputed ratio output | Approved snapshot input ID |
| event/effective date | Approved business recognition date and timezone/calendar mapping | Snapshot effective date and cutoff meaning |
| numeric value | Finite agreed units and sign; no silently parsed/null/defaulted values | Finite eligible entity balance; zero differs from absent |
| stable identity | Source event ID/version for idempotency and correction ownership | Mandatory stable entity ID per measure; same-date duplicate resolution approved |
| dimensions | Stable canonical IDs; approved unknown/missing handling and attribution | Dimension assignment of latest entity snapshot, not an older match |
| currency | Transaction/base/reporting currency where monetary; approved conversion before incompatible aggregation | Currency for monetary balances under same policy |
| watermark/version | Source extraction/sync timestamp, revision/batch and correction/deletion semantics when applicable | Same plus snapshot completeness/as-of guarantee |

Current AnalyticsFact has tenantId/measureId/date/value/entityId/dimensions; it lacks currency and source event/version fields. Implement approved transform/envelope validation at source boundary without pretending display currency proves fact currency. Adapter sourceAsOf is a known sync timestamp; dataThrough is latest business coverage of relevant authorized measures. Preserve both meanings and disclose missing watermark.

## Families and canonical measures

| Family | Required inputs | Key dimensions / agreements |
| --- | --- | --- |
| Sales | revenue, net_revenue, order_count, units_sold, gross_profit | date/month/quarter/year, customer, branch, region, salesperson, product, product_category subject to metric supportedDimensions; order vs line grain, tax/discount/returns/cost states |
| CRM | opportunity_count, pipeline_value, weighted_pipeline, won_opportunity_count, closed_opportunity_count | customer/branch/region/salesperson and time where supported; won/closed eligibility and weighted probability |
| Finance | invoiced_amount, collected_amount, outstanding_amount, overdue_amount | customer/branch/time where supported; event amounts vs entity balance snapshots, ageing/cutoff/currency |
| Inventory | stock_on_hand, inventory_value, low_stock_count | product/product_category/warehouse and stable stock-position entity; latest snapshot and threshold meaning |
| Maintenance | maintenance_requests, failure_count, operating_hours, repair_hours, completed_repair_count, maintenance_cost | equipment/equipment_category/technician/branch/time where supported; duration units and work-order/failure grain |

The domain catalog is authoritative for current supported dimensions and whether an input is event or snapshot. A family table is not permission to enable every dimension on every metric. Mapping approvals must identify each measure grain and avoid joins that multiply amounts/counts. Never send average_order_value, gross_margin, win_rate, mtbf or mttr as independently summable facts; derive from required inputs. Sales growth is comparison-derived.

## Events vs snapshots

Events contribute once to additive period totals according to approved recognition date and state. Corrections require an idempotent source-owned update/reversal policy; deletion/tombstone rules cannot be guessed.

Snapshots represent an entity/measure balance at an effective point in time. Select latest eligible row per entity/measure at or before cutoff, then apply dimension/policy visibility without resurrecting older assignments; aggregate entities once. Duplicate same entity/measure/date is ambiguous and currently rejected. Define missing snapshot, zero balance, movement and late correction rules before ingestion.

## Required adapter evidence

Tenant and enforced filter isolation; canonical mock-equivalent contract tests; supported dimensions/value lookup under policy; calendar/leap/month-end comparisons; ratio nulls; source metadata truth; duplicate/missing/correction handling; source-native resource limits. Reconcile approved reports before pilot. No arbitrary tolerances or SQL generation. [Reconciliation plan](reconciliation-plan.md), [future acceptance cases](../qa/real-data-acceptance-tests.md).

## Executable offline boundary

The separate [production contracts](../../packages/domain/src/production-data.ts) and [ADR 027](../architecture/adr/027-production-data-foundation.md) define exact decimal text, required currency evidence, versioned business-basis releases, event/snapshot identities, ordered corrections, strict certification and batch lineage. These are not extensions to demo AnalyticsFact and do not select an Odoo source. A new mapping basis/version requires a separate reconciled release; queries cannot mix releases. PostgreSQL writer/serving and frozen reconciliation are implemented and integration-tested with synthetic data; approved source mapping and protocol evidence remain prerequisites. [Operations](postgres-mart-operations.md).
