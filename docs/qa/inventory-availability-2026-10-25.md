# Inventory availability extension — 25 October 2026

Branch: `codex/products-warehouses`, continuing `354f5b5`. This is a candidate
extension to the deployed six-table report (`2316d66`); company migration,
preparation and deployment have not occurred for this extension.

## Scope and engineering review

Three canonical stock snapshot metrics add reserved quantity, free quantity and
standard-cost value. Source rules use a separate versioned additive recipe; old
Business/Sales Command definitions and facts remain intact. Domain owns meaning,
data owns read-only extraction and controlled publication, application owns report
composition, and web owns bilingual presentation. Runtime still reads the shared
prepared repository with tenant/policy and immutable-revision checks.

The explicit protected `analytics observe-inventory` operator uses existing complete
Business observation/replacement controls and publication. It does not run from a
report request or alter timers. Generic replacement identities are bounded opaque
strings; the inventory adapter validates product/warehouse tuple syntax while old
adapters retain numeric identity validation. Failed controls preserve publication.

No dependency change, schema rewrite, permission expansion, raw-history fallback,
source write or GitHub Actions invocation was introduced. Migration 095 only adds
the three registered snapshot operands. Existing definition fingerprints remain
unchanged; additive mappings preserve accepted rules/capabilities byte-for-byte.

## Automated verification

The final complete regular suite passed **1,009 tests, zero failures/skips**.
Frozen installation, lint, architecture, quality, typecheck, API/web build and diff
gates passed. The build retains the existing large-bundle warning.

Focused source SQL tests cover warehouse-level clamping after negative/positive
quant reduction, company and owner isolation, unassigned warehouses, current-only
dates, zero/default costs and invalid reservations. The default-cost review follows
Odoo's unconditional defaults, company precedence and ascending identity priority;
conditional defaults do not apply to unconditional reads. Ambiguous user-specific
fallback is rejected.

The PostgreSQL publication test covers registered additive mapping, tuple discovery,
exact prepared/native parity, warehouse filters, value, immutable baseline facts,
old stock cutoff preservation, complete replacement of vanished positions, tenant
isolation, bounded identity rejection and rollback on bad controls. The initial
rollover attempt timed out during severe laptop memory pressure; rerunning with
the unchanged statement deadline passed in 25.8 seconds. This is synthetic evidence,
not a company throughput claim.

The complete PostgreSQL suite passed **456 tests, zero failures/skips**. After the
final isolated unconditional-default/priority SQL correction, both inventory SQL
and publication tests were rerun and passed (18.7 seconds total). The final regular
suite includes the additional independent full-population discovery check, including
explicit zero counts for an empty observation. No statement deadline was increased.
Logs are retained in the ignored `.local-state/inventory-availability/` directory.

## Manual source evidence

Bounded `REPEATABLE READ READ ONLY` transactions used the restored company tunnel;
no ingestion, synchronization, publication or source write was invoked. Required
partner/tag/stock/cost columns were present. Forecast `product_qty`, pending states,
source/destination/final destination and UOM rounding columns were also verified.
The company standard-price field is company-dependent Float. No applicable
configured defaults were found; 13 stocked products lacked an explicit company
JSON entry, so Odoo's source Float default is relevant.

At **25 October 2026 08:13:28 UTC**, the new stock recipe produced **756
product/warehouse positions per measure, zero invalid rows**. Only aggregate quality
evidence was retained. This establishes source-query compatibility for this recipe,
not exact company prepared acceptance or compatibility of every baseline recipe.
The final SQL was reprobed at **09:01:40 UTC** with the same 756 positions per
measure and zero invalid rows, explicitly confirming read-only execution.

## Dashboard quality AFTER review

The isolated synthetic preview loaded no developer env files and used no company
records. English/Arabic and Light/Dark were exercised. Screenshots and DOM checks
covered desktop 1280px, tablet 1024px and phone 390px; no page-level horizontal
overflow was present. Tables retain intentional inner scrolling at narrow widths.
All nine tables rendered; zeros, signed on-hand values and currency remained distinct.
Choosing a warehouse reduced all seven stock tables from 24 to 12 product rows while
both invoice tables remained at 24. Native mobile navigation opened and Escape
closed it. The temporary viewport override was reset.

1. **No material finding in the changed presentation:** existing renderer, tokens,
   table scrolling and bilingual hierarchy are reused. The new copy distinguishes
   on-hand, reserved, free and the future forecast-based customer universe.
2. **Remaining manual coverage:** Excel download, complete keyboard traversal and
   company rendering of the new prepared observations remain unconfirmed. A later
   attempt to inspect a definition control found the temporary preview tab closed;
   no result is claimed for that attempted interaction.

Phone screenshot: `inventory-availability-phone-ar.jpg` in this chat's visualization
artifact folder. It is a local synthetic preview, not the deployed company report.

## Remaining business/report work

The owner confirmed forecasted stock for the eligible customer-product universe.
Zero/negative forecast eligibility remains unanswered because the handoff does not
state the original export's filter. The handoff defines sold/unsold per customer;
a combined selection view was also asked about and is not silently substituted.
Current customer owner/governorate, actual tag predicates and complete prepared
customer-product coverage/status filtering remain unimplemented. Source recovery
is no longer the blocker. See [implementation scope](../integration/products-warehouses.md).

Company release status: migration 095, new observations and application deployment
have not been applied. Source access is restored; the stock extension is a verified
candidate, while the requested customer coverage remains unfinished. No merge requested.
