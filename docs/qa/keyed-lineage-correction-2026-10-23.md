# Keyed lineage and exact Business control comparison

## Company evidence

The independent Command background worker sealed October invoice capture and committed all 11 fact pages, 6 control pages and 104 baseline-control pages. Its first canonical seal repeatedly reached the unchanged 120-second statement timeout inside `business_sparse_controls_exact`. Ordinary sync remained healthy. The background retry timer was paused when this failure was discovered.

Company EXPLAIN under the staging ingestor showed the nullable-key predicate scanning the entire raw facts relation before applying the explicit identity array. The sparse proof also paired dimension groups with a non-hashable null-safe condition and used a slow bidirectional EXCEPT ALL comparison for retained versus stored controls.

## Correction

Migration 085 keeps keyed and unkeyed lineage reads in separate SQL statements. Explicit keys are deduplicated and joined by the existing tenant/partition/fact primary key. NULL keys still mean the complete lineage; empty keys mean no facts. Existing root replacement/deletion masking, selected-measure filters, security-invoker access and forced tenant RLS remain.

Exact group comparison joins on measure, a NULL-summary flag, and JSONB dimension equality. The NULL flag distinguishes a summary from an empty dimension object. This is null-safe equality expressed with hashable predicates; no probabilistic digest comparison replaces exact dimensions. Legacy and current physical scope-key encodings need not match. Expected controls remain grouped; stored duplicate groups are explicitly rejected, and bidirectional comparison rejects missing/extra groups or differing values/counts. Independent source controls, source metadata, lineage and publication guards remain active.

No raw or prepared history is copied or reset. Captured pages and the pending candidate remain reusable. No timeout increase, source mutation or changed metric definition is introduced.

## Verification

Owner-approved focused synthetic PostgreSQL tests cover dense/keyed equivalence; duplicate/empty/missing keys; measure filters; tenant isolation; sparse replacement/deletion and ancestor immutability; exact and zero controls; NULL summaries versus empty-object dimension groups; mismatched dimensions/values/counts; and missing, extra or duplicate stored groups.

The proposed final function definitions were verified on the actual saved company candidate under `staging_mart_ingestor_login`, inside an explicitly rolled-back transaction with a 15-second statement bound. `business_partition_exact` returned **true in 1,827 milliseconds**. Earlier scoped diagnostics measured the explicit-key read at 62 ms and scoped comparison at 110 ms. Initial SQL branching and comparison variants that remained slow or rejected valid legacy controls were discarded before deployment. Company deployment/publication remains pending at this checkpoint.

No broad suite, local rehearsal or GitHub CI was run. Synthetic results and company diagnostics are distinct evidence.
