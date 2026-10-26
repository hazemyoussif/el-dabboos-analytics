# ADR 045 — Complete prepared populations

Status: implementation in progress; no company migration or serving cutover.

The owner requires the complete Products & Warehouses request, including current
customer salesperson/governorate, actual tags, and sold/unsold products per customer.
The owner confirmed forecasted quantity **greater than zero** for eligibility.
The handoff excludes display stands and uses signed posted invoice/credit quantities.

Read-only source sizing on 25 October found 3,315 qualifying customer identities
in 2026 and 339 eligible products, requiring 1,123,785 complete customer/product
states. The two selected calendar years have 6,697 customer/year identities and
2,270,283 states. Sparse invoiced combinations are much smaller. Existing source
capture bounds must remain; the source must not manufacture millions of zero facts.

Extend the **existing** background preparation, exact validation, immutable
binding/sealing and atomic trusted publication lifecycle with a generic prepared
population-completion grain. The definition declares an entity axis, item axis,
partition dimension and sparse contribution measure. This is selected by semantic
definition, never a report ID. Existing event/snapshot datasets remain unchanged.

Canonical source inputs contain current customer/year membership, positive forecast
products, signed sparse customer/product quantities, actual tag relationships and
counts of invoiced products outside eligibility. An immutable versioned population
basis records years and excluded category identities. Existing source leases,
bounded private capture and source-control seals remain mandatory.

Preparation expands missing pairs to exact zero in bounded entity chunks. A compact
prepared relation stores partition/entity/item, exact quantity and whether a real
contribution existed; customer/product captions and current attributes stay in the
already prepared source axes. This avoids copying their labels into millions of
rows. Chunk completeness, exact contents, unique keys, source UOM agreement and
full axis coverage must be independently validated before a population seal.
Missing input evidence never certifies zero.

Reuse is based on complete normalized axis/contribution states, not summary totals.
Bindings pin the same immutable input revision as ordinary prepared bindings. New
population bindings must exist before the shared revision can seal or become
trusted; failure preserves the prior trusted publication. Existing statement,
source-page, capture and preparation limits are not raised. No new publication
pointer, raw-history fallback, source query or Cartesian expansion is permitted
inside a report request.

Runtime selects already prepared pairs, joins the prepared caption/attribute axes,
and applies actual-tag membership through EXISTS so multiple tags never multiply
quantities or coverage. Every page retains tenant, authorization filters, source
basis, cutoff and immutable revision checks. Sold is net quantity > 0; zero,
negative and completed missing pairs are unsold. Unsupported access dimensions
remain unavailable. Paging is bounded and source-independent.

The shared preparation coordinator and private recipe initialization worker must
both honor the population phase before sealing, including manifest rebases. Old
reports, accepted inputs and their observation clocks remain unchanged. No source
timer or permission is changed by this work.
