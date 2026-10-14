# ADR 037 — Source-backed business dashboard purposes

Status: implemented; September/current October technically verified and exposed in protected laptop staging. Finance review follows exposure under ADR 036.

## Decision

Publish the supported parts of the ten requested dashboards in a separate immutable `business` serving family. Preserve every `facts`, `receivables` and `review` member and its approvals, cursor and stored history. Source access stays on the existing protected Odoo connection in bounded repeatable-read/read-only snapshots; no source DDL/DML, privilege, credential or infrastructure changes.

New semantic IDs make the new invoice/cash/ledger basis explicit. Executive and debt ratios use operands from the same business extraction rather than silently mixing preserved operational sales with fresh receipts. Financial credit notes and physical warehouse returns remain different measures. Known positive maturity buckets, unknown maturity, signed credits and supplier debit advances remain separate.

Calendar-date metrics retain the numeric analytics wire contract by encoding integer UTC epoch days. Their snapshot reducer is maximum after latest-per-entity selection; missing dates remain null. Dates allow KPI/table presentation and no numeric analysis. UI and Excel render calendar dates, including ISO date values on export.

Quantities use each product's source base UOM, with conversion rounded to the canonical six-decimal boundary. Compatible quantities require product/UOM grouping or one selected compatible product/UOM. Different UOMs inside an output group fail closed, including across historical extractions. Quantity presentations are tables and cannot use ungoverned numeric transformations. Percentages based on quantity flows retain the same unit guard.

Pareto is a deterministic server-side named analysis: positive grouped contributions sorted descending with stable identity ties, cumulative positive share and rank. Nonpositive values are excluded from that transformation, retained in the separate raw-sales view. The first row reaching 80% is the smallest selected set; it is not assumed to contain 20% of customers. Canonical validation and post-planner authorization apply to transient generation/edit intent.

A/B/C uses source-observed January-through-selected-complete-month net invoice sales divided by elapsed calendar months, including zero months and new customers. A ≥ 1,000,000 IQD; B ≥ 400,000 and < 1,000,000; C < 400,000. Partial months have unknown class/no average. The detail report permits real class filtering and shows six-decimal averages.

Native customer-tag candidate families retain provisional meanings and Unknown/Ambiguous. Product Brand/Category are not renamed Agency. Document governorate and salesperson are invoice attributes; customer history uses current partner governorate at extraction. Classification and UOM configuration are not silently represented as historically versioned source master data.

## Serving and preservation

Migration 046 adds the business family, explicit measures and nullable canonical dimensions, and extends the invoker canonical view without altering old values. Existing migration bytes/checksums remain immutable. The generic writer emits only present governed dimensions, so legacy migration-stage fixtures remain writable with their old vocabulary. Old operational/review definition fingerprints remain compatible.

Business publications require exact summary and complete tuple controls, counts and lineage before an atomic trusted-pointer change. Each publication preserves all other families. The new business reader has a separate default 10,000-group bound; explicit configured bounds and all legacy limits remain enforced. Business fact/control limits are separately bounded at 500,000/500,128; original review limits stay 250,000/100,000. Source vectors transport shared record attributes once and reconstruct the same individual canonical facts in configured pages. Captions are fetched once per eligible identity in the same frozen source snapshot. No approval or reported value is fabricated.

Consecutive event months may stitch into historical releases. Exact event aggregation occurs in PostgreSQL before bounded deterministic analyses. Missing months are not bridged and snapshots never stitch or sum. Monthly reports choose the latest shared complete month; current stock/operational/book-liquidity reports choose the latest available publication; historical reports bind the actual consecutive coverage before authorization/execution.

## Limits

Current quants, open order-line exceptions and current payable residuals cannot load into past months. Book cash is not available bank cash. Known maturity schedules are contractual amounts, not guaranteed forecasts. Exact expiry valuation, historical warehouse comparisons, complete return-condition classification, agency mappings, freight attribution and actual-versus-plan liquidity remain unsupported until real definitions/inputs are available. These are data/meaning requirements, not a pre-exposure Finance approval process.

## Verification

See [delivery and source evidence](../../integration/business-purpose-dashboard-wave.md). Isolated tests exercise source SQL, current/past separation, money reconciliation, dates, tags, UOM conversion, preservation/rollback, tenant filters, history gaps, draft lifecycle and bilingual report rendering. Live source evidence is recorded separately from synthetic tests.
