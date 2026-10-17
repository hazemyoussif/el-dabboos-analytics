# Prepared serving implementation — 17 October 2026

Status: local candidate under verification. Migration 053 and candidate containers were explicitly approved and applied to laptop staging; prepared serving remains inactive after a proof timeout. Not committed, published or deployed into company staging. No GitHub CI used. The installed company release remains `1c479727dc2857e3552a8f4da818ffd111f90239`.

## User-directed boundary

Background preparation → exact validation → immutable prepared cells → atomic trusted publication → authorized prepared reads. ADR 040 owns this constraint. Report identifiers do not select algorithms. The installed reader remains selected until a separate explicit operator activation; after activation there is no raw-history fallback.

## Implemented locally

- Domain grain selection requires all query, policy, distinct-population and compatible-unit dimensions plus every canonical operand.
- Draft migration 053 adds immutable prepared dataset headers, numeric cells, revision bindings, completion seals and a separate activation record. It changes no existing source tables or source permissions. It performs no preparation or activation itself.
- Events prepare daily and monthly grains. Versioned source contracts distinguish complete snapshot observations from dated delta feeds: complete observations replace absent identities; delta feeds resolve latest entity state before reduction and policy filtering. Independent complete-population controls include authoritative empty cutoffs.
- Each dataset prepares totals, individual dimension rollups and the full governed tuple. Cells retain exact numeric sum/count/min/max, dates and label-conflict evidence. Ratios preserve native operands and established scalar/grouped output behavior. Distinct identity and UOM dimensions cannot be discarded.
- Preparation streams bounded pages, has explicit cell/chunk limits and resumes committed chunks. Unchanged immutable input signatures reuse existing validated members; content-equal prepared cells can be reused under new input evidence. This reuse does **not** assert that raw source records were unchanged.
- Binding guards compare all prepared cells against canonical inputs with exact set equality; sealing requires every governed chunk. Runtime roles cannot call reconstruction functions.
- Once explicitly activated, every existing fact, Finance, review and business publisher prepares the candidate before updating the trusted pointer. Failure rolls back the candidate publication. Backdated input replacements invalidate dependent snapshot suffixes through input membership signatures.
- The prepared repository reuses existing capability projection, source priority, Top N/Pareto, keyset windows, permission filters and revision consistency. Metadata owners were separated from raw readers rather than importing an old repository to obtain metadata.
- A transitive architecture gate rejects raw-history/source reconstruction reachable from the prepared runtime, including through helper reexports. Its negative test demonstrates detection.
- The protected operator has separate `prepare` and `activate-prepared` actions. Both require an explicit intended database, expected revision and finite build budgets, verify the existing non-superuser identity and share the tenant writer lock. Neither opens an Odoo connection or applies migrations.

## Targeted evidence

The synthetic source contracts expose **71 metrics across four families**. The matrix compares **492 metric/grouping selections** against the existing reader: exact rows, existing metadata other than execution timestamp, and published capabilities match. This is a synthetic coverage inventory, not a claim that company data has been compared on the new schema.

Additional cases cover:

- declared delta carry-forward, explicit zero and customer reassignment before authorization;
- complete review/business populations replacing absent identities and independent stored-total/count proof;
- earlier-month corrections invalidating dependent preparation signatures without rewriting a later accepted complete population;
- complete Finance snapshots replacing an older customer population with authoritative empty zero;
- filtered Finance zeros and null ratios;
- distinct state retaining a zero-valued identity, while public execution still rejects a metric lacking its required certification;
- incomplete seals, forbidden runtime reconstruction, tenant isolation, immutable cells and explicit bounds;
- unprepared publication rejection and unchanged trusted pointer;
- resumable preparation, no duplicate cells on replay, wrong database/role/revision rejection and explicit cutover;
- all current business recipes, date maxima, quantities, time grains, partial edges and scalar/grouped ratios.

### Local scale sample

A disposable synthetic database held 100,000 receivable source items assigned to 1,000 customers. Preparation ran before the queries.

| Measurement | First sample |
| --- | ---: |
| Background preparation | 9,934.7 ms |
| Prepared customer population | 1,000 rows |
| Top 100 query samples | 37.9 / 19.7 / 20.2 ms |
| Source relation including indexes | 177,397,760 bytes |
| Prepared cells including indexes | 868,352 bytes |

The query returns 100 customers with exact value 100 each; the separate total is exactly 100,000. These measurements are local scale evidence, not a company dashboard SLA, p95, browser-load result or estimate for all company datasets. The full regression run includes this test again; its timings must be reported separately.

## Release gates still open

1. Finish full local regressions and build verification for this candidate. The earlier 926/316 checkpoint belongs to the scheduling/publication candidate and is not current prepared-serving coverage.
2. The [complete-versus-delta source contract](prepared-snapshot-contract-review-2026-10-17.md) was explicitly approved and its focused tests pass. Finish adversarial compatibility checks beyond the initial matrix: changing labels across cutoffs and Finance summary-only fallback versus customer evidence. Missing complete Finance months have passing exact-cutoff tests. Policy-scoped multi-identity Pareto/Top N pagination, selected identities and publication-change rejection now have additional passing prepared-reader checks. No cutover until these contracts are proved.
3. Assess actual company cardinality, preparation duration, temporary space, output storage and correction/write amplification before requesting permanent schema/backfill approval. Output row limits alone do not bound a grouping operation's temporary disk use. Do not copy the previous large temporary-table rehearsal or assume a storage estimate from this synthetic sample.
4. Company comparison and all-report cold/warm/concurrent QA must use the prepared candidate and the same immutable source publication. Routine three-second/heavy five-second goals are not yet established on company staging.
5. Complete the separately required per-family source freshness workflow. Existing sync/daily timers do not automatically refresh review/business/exact Finance snapshots. Preparation hooks cover a new accepted publication; they do not create a source change detector. Do not mark all dashboard families fresh because an operational sync passed.
6. Recurring source jobs need complete canonical no-change validation and its own durable validation watermark so repeated leases do not duplicate immutable raw envelopes. Do not simply schedule existing full-month loaders repeatedly. Finance's skip-existing loader is not a historical correction job.

No source connection, protected credential edit, local/company staging migration, new timer, push, merge or deployment has occurred in this implementation.

## Verification after the approved source-contract correction

- Focused prepared PostgreSQL tests: 12 passed, zero failures/skips/cancellations, including the independent control guard and 492-query parity matrix.
- Targeted migration/security rerun: 14 passed, with overlap with the delta case. Historical fixture manifests now derive their intended version ranges instead of leaving a new migration after an artificial version gap. New restrictive prepared-serving ACLs are included; the existing six runtime-release policies remain mandatory.
- The initial broad PostgreSQL run was 312 passed / 13 failed / 325 total. Its fixture/expected-policy failures were repaired and rerun. A final complete broad rerun remains a release gate; these counts must not be combined or described as an entirely green final suite.
- Latest local scale sample: background preparation 8,166.5 ms; prepared Top 100 reads 31.3 / 15.5 / 15.8 ms. These samples do not establish company performance.

Additional focused prepared checks passed for policy intersections, global Pareto values, Top N, continuation, selected-identity reads and publication-change rejection.

Final local unit/API/web/engineering regression run: **934 passed, zero failed/skipped/cancelled**. Lint, types, architecture, quality, diff and API/web builds passed. The web build retains its existing large-chunk warning; no UI changes were made. This does not replace the final complete PostgreSQL or company-scale release gates.

The user approved local staging migration 053, restart, preparation and verification after this initial synthetic checkpoint. See [the local staging evidence](local-prepared-serving-2026-10-17.md) for preserved-data fingerprints, the proof timeout, inactive serving and unapplied forward candidate 054.
