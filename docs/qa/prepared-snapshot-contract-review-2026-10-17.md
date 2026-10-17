# Snapshot population contract review — 17 October 2026

Status: source-contract correction explicitly approved by the user on 17 October 2026; implemented locally and focused regression verification passed. No company diagnosis or mutation is implied. This source review is independent of performance tuning.

The draft prepared builder retains the existing generic latest-entity carry convention for review/business snapshots. That convention is valid for delta feeds. It is not sufficient for complete source observations when missing rows mean an item no longer qualifies.

## Concrete source evidence

- `packages/data/src/business/stock-recipes.ts`: current stock includes company-owned internal quants only when quantity is nonzero (or invalid/null to fail quality). A quant reaching zero can disappear from the next complete extraction.
- The same file's unbilled recipes include only fulfilled quantity above invoiced quantity. Completing the invoice removes the item from a subsequent full exception population.
- The same file's payable recipe excludes zero residuals. Settling the payable can remove it from the next complete observation.
- `packages/data/src/business/source.ts` supplies complete bounded source recipes and exact grouped/company controls; for a mapped measure with an empty population it explicitly adds a zero/count-zero summary control.
- `packages/data/src/review/source.ts` likewise adds authoritative zero/count-zero summary controls for a mapped empty population.
- `packages/data/src/review/exposure.ts` publishes controlled complete-month partitions rather than an item-level delta feed.

A synthetic two-cutoff example makes the conflict concrete: an exception item is 100 in cutoff A, then absent with a source summary of zero/count-zero in complete cutoff B. Generic latest-entity selection retains 100; the complete cutoff control says zero. A zero cannot be invented merely from missing data: it requires the accepted complete observation/control. Customer reassignment and explicit-zero delta records remain separate cases.

## Proposed universal correction

Record population mode as a governed source-publication property, independent of report IDs:

- **Complete population:** select the accepted whole cutoff population, including verified empty observations. Do not carry missing identities across complete observations. Date maxima remain null for no eligible date; ratios retain zero-denominator null; quantities retain their UOM restrictions.
- **Delta population:** resolve latest entity state before authorization filters, with explicit zero/tombstone handling. Missing entities may carry only under this declared feed contract.

Both modes use the same prepared cells, native controls, immutable revision, source cutoff, policy-grain selection and atomic publication. A source correction that affects later complete observations requires revalidating those source cutoffs; preparing an old mart observation again does not prove fresh source data.

The initial 492-query/71-metric single-cutoff matrix does not cover this disappearance edge. It therefore does not authorize activation. Keep the installed release unchanged until this contract and its multi-cutoff controls are resolved and tested.

## Implemented correction and evidence

The unapplied migration 053 now stores immutable, versioned source-family population contracts in `mart_admin.prepared_source_contracts`. The canonical facts protocol keeps its dated delta/latest-entity behavior; review, business and exact Finance publications declare complete observations. This is adapter metadata, independent of dashboard identifiers, viewer filters and company values. The mode is copied into the immutable prepared configuration and therefore its input/content fingerprints.

Complete observation points come from accepted independent review/business summary controls or exact Finance evidence. The background builder selects the whole latest accepted population per measure before applying rollup grains. A verified empty observation supplies a zero/count-zero numeric cell without inventing a customer identity. Date maxima retain null; zero-denominator ratios retain null; quantity reductions still require a compatible UOM grain.

Binding validation independently compares stored total cells and counts with the accepted source controls. It also retains exact set comparison against canonical materialization and exact grain row statistics. Deliberately incorrect totals and deliberately incorrect counts both fail the independent control guard and roll back; the trusted pointer is unchanged. Runtime cannot execute observation reconstruction or control-building functions. All tenant serving tables retain forced RLS. Preparation identities receive only schema usage and SELECT on the new global contract metadata; no Odoo permissions change.

Focused PostgreSQL verification: **12 tests passed, zero skips/failures/cancellations**. This includes complete review/business disappearance, explicit zero, customer reassignment before policy filtering, an older-cutoff correction that must not alter the later accepted complete population, an authoritative empty cutoff, delta carry-forward, date/ratio/quantity empty behavior, independent bad-total/count rejection, explicit activation/resume guards and a 100,000-item scale sample. The 492-selection / 71-metric / four-family matrix still matches existing single-cutoff values, metadata and capabilities.

A separate targeted upgrade/security rerun passed **14 tests** (with overlap with the focused delta case). The first broad run reported 312 passes / 13 failures out of 325; the failures were fixed historical migration fixtures and expected ACL counts that assumed migration 52 was the last version. The complete broad suite has not yet been rerun on the final corrected candidate; do not describe that first run as green.

The final local synthetic scale sample prepared 100,000 items into 1,000 customer rows in 8,166.5 ms; prepared Top 100 reads measured 31.3 / 15.5 / 15.8 ms. Source relation/index storage was 177,397,760 bytes versus 868,352 bytes for prepared cells/indexes. These are local samples, not company dashboard timings, p95, concurrency results or an all-dataset storage forecast.

Company staging remains unchanged. The later explicitly approved local staging migration/preparation is recorded in [the local evidence](local-prepared-serving-2026-10-17.md); its failed exact-proof transaction rolled back and prepared serving remains inactive. No source connection, credentials, real schema, data, timers, CI, push, merge or deployment were used. Activation and the remaining compatibility, freshness and company-scale gates in ADR 040 remain open.

Additional focused prepared-reader checks passed for multi-identity policy intersections, global Pareto/Top N pagination, selected output identities and publication-change rejection. Existing semantic outputs are compared against the established reader.

Final local unit/API/web/engineering regression run: **934 passed, zero failed/skipped/cancelled**. Lint, types, architecture, quality, diff and API/web builds passed. The web build retains its existing large-chunk warning; no UI changes were made. This does not replace the final complete PostgreSQL or company-scale release gates.
