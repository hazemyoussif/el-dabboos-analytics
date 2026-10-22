# Delta sync correction — 22 October 2026

Status: uncommitted code draft. No tests, rehearsals, builds, source jobs or
deployments were run for this change. It is not a release recommendation.

The owner requires the existing baseline to be reused: discover changed records,
compare their prior/current footprints, and prepare only affected outputs. The
failed company run on API `cffb5cf28c81f29163a65342246f283653469367` exhausted the
JavaScript heap after source handoff and classification, before a committed capture.
The previous synthetic memory result did not establish company completion.

## Code changes

- Lookup fingerprint absence no longer clears the accepted source cursor. Lookup
  discovery polls its normal timestamp window and treats an untracked polled
  identity as changed. Unmodified lookups do not trigger historical fan-out.
  A known projection-version change requires explicit migration; a checkpoint
  that conflicts with the accepted cursor fails closed. Fingerprints are populated
  lazily for changed identities and accepted with that cursor.
- Receivable input discovery also retains the accepted cursor without a metadata
  checkpoint. Known previous dates and current dates determine affected cutoffs.
  A source input created after the accepted cutoff has no prior footprint. An
  older changed input with no known previous date conservatively retains the full
  published-cutoff check. This does not manufacture previous dates from totals.
- Checkpoint capture consumes canonical pages of at most 1,000 facts. PostgreSQL
  transaction-local tables hold final candidate heads, distinct changed identities,
  dirty partitions/dates and dependency pages. A page reads only its staged heads,
  compares with accepted heads, computes old/new impact, and releases its payloads.
  Diagnostics retain aggregate counts, not all previous/next facts. Final revision
  writes also use bounded SQL pages. The frozen specification stores partitions
  once; acceptance reconstructs audit details.
- Existing exact controls, immutable capture sealing, private working heads,
  prepared dataset reuse and final atomic acceptance are retained. No stored
  migration, RLS policy, source deadline or heap limit is changed. Temporary-table
  permission and PostgreSQL temporary storage remain runtime prerequisites.

SQL staging is **not independently committed ingestion**. It disappears if capture
fails before sealing. Only the complete frozen capture is durable/resumable under
the existing lifecycle. This removes the full fact-payload memory buffer; it does
not prove capture duration, disk consumption or a constant total heap. Scope and
control metadata still scale with affected groups. No performance claim is made.

## Remaining dashboard refresh gap

Operational refresh still replaces `facts` members only. Sales Command Center
measures use the `business` family. Its existing loader is a complete-month source
extraction, not a changed-record merge. Its source watermark is the selected
`review_extractions.source_cutoff`, which can differ from the operational cursor.

Migration 061's `business_partition_exact` requires every fact's `sourceAsOf` and
`frozenRevision` to match the whole extraction. Copying old rows into a new
extraction or changing their timestamps would misstate what was observed. The
current draft does neither and does not claim business/report freshness.

A correct family merge must use each family's own accepted cutoff, discover all
input changes for its recipes (including payments, allocations, lines and lookup
ownership), retain old/new dependency edges, replace affected identities including
removed outputs, and prove the unchanged base plus delta before preparing affected
chunks. Current-cutoff debt also changes with the reporting date without an input
write. Those changes and their lineage guard are not implemented here. Ordinary
sync cannot be presented as a completed Sales Command Center refresh until they are.

## Basis

The pipeline follows established watermark discovery and incremental merge,
without introducing another orchestration platform:

- [Microsoft: incremental loading using old/new watermarks](https://learn.microsoft.com/en-us/azure/data-factory/tutorial-incremental-copy-overview).
- [dbt: retain built tables and merge selected new/updated records](https://docs.getdbt.com/docs/build/incremental-models).
- [PostgreSQL: transaction-bound cursors and bounded fetches](https://www.postgresql.org/docs/current/sql-declare.html).

Timestamp polling still cannot guarantee hard-delete detection or discover source
changes that do not update the governed timestamps. Existing sweep controls remain
separate. No CDC, source DDL or silent history rebuild is introduced.
