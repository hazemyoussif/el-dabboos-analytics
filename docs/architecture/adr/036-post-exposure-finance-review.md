# ADR 036: Finance review after metric exposure

## Decision — October 13, 2026

The user explicitly changed the delivery policy: implement and expose usable metrics first; Finance compares the results afterward. Finance sign-off is not an availability prerequisite for the new Collections, Order Margin and Product contribution wave. Do not manufacture an approval or relabel technical evidence as Finance certification.

Technical checks remain mandatory: explicit business definitions, canonical validation, exact independent source controls, completed bounded extraction, compatible currency, truthful date/dimension scope, tenant membership and policy filters. Source-only observations and planned concepts are not executable facts.

## Serving and ownership

Add an immutable `review` partition family to the existing tenant trusted serving manifest. There is one serving pointer. Existing fact and receivables members are copied unchanged; only the selected review month can be replaced by the explicit exposure operation. Tenant RLS, runtime read-only privileges, the shared writer lock, parent comparison, immutable membership and append-only evidence remain intact.

The eight new executable metrics are `customer_cash_collected`, `cash_applied_to_invoices`, `unallocated_customer_receipts`, `customer_collection_ratio`, `weighted_collection_days`, `receivables_due_for_collection`, `order_margin`, and `order_margin_percentage`. The legacy generic `collected_amount` is preserved. Invoice monetary measures gain line-level Product/Product Category support only through the new exact mapping; invoice/order counts and invoice averages do not gain Product serving permissions.

The new release carries `financeReview: pending` and a `technical-exact` reference. The existing portable `certificationReference` field names technical evidence on this path, not business sign-off. Metric definitions, report status and capability rows display **Finance review pending**. Synthetic composition remains explicitly demo data.

The old fact/aging baseline fingerprint continues to cover the unchanged pre-wave execution definitions and approved dimensions. The review family has a separate definition fingerprint including the new semantics and Product attribution. Adding a new independent family does not silently invalidate or broaden existing certified releases.

Domain owns formulas, IDs, business help and supported dimensions. Data owns fixed read-only Odoo recipes, exact decimal mapping, source controls and manifest exposure. API owns configuration and the explicit operator command. Web owns localized status/units. No browser source access or model-generated SQL is introduced.

## Limits

This first implementation exposes one complete bounded month per operation. Cross-month query ranges are not granted by stitching separate monthly releases. Allocations are observed at extraction cutoff for the selected payment cohort; repeating the operation refreshes that cohort. Continuous payment/allocation sync is not added. Receivables Due for Collection is a complete month-end snapshot of positive known-maturity balances due on/before cutoff, including overdue balances; it is not a forecast or a future collection schedule. Unknown maturity and negative credits remain excluded and disclosed.

Review data is executed through the existing deterministic fact engine after bounded, policy-filtered mart reads. Derived outputs are calculated from aggregate operands, not persisted as independently summable facts. Product invoice lines must reconcile to headers. Company-currency receipts must agree with payment amounts; conversions and ambiguous joins fail instead of using an invented FX rate or allocation.

Further Finance review and corrections will require explicit versioned definitions and replacement evidence. The initial implementation records pending review; it does not add a Finance approval workflow.
