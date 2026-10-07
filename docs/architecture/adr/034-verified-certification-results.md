# ADR 034: Reuse verified certification results with transactional invalidation

Implemented during the authorized local runtime incident recovery on 7 October 2026. Extends ADRs 029, 031 and 033 without changing business approval, metric definitions, exact proof predicates or serving authorization.

Ordinary report requests previously re-executed technical and derived exact-set SQL repeatedly through publication checks, provenance and restrictive RLS. A business certificate is immutable, but facts and links can still be appended to its release. Therefore an immutable certificate alone is insufficient to suppress every live input check.

Migration 021 retains the authoritative proof implementations as private `reconciliation_certified_uncached` and `derived_inputs_exact_uncached` functions. A dedicated offline migrator can run `refresh_proof_results(tenant,dataset)` in a tenant-scoped read-committed transaction. Refresh locks all mutable dependencies in SHARE mode before reading a fresh snapshot, runs the full proofs and stores only positive results. It neither authors certification nor changes approval or facts. Result identity includes the exact case array and technical version, or derived metric/grouping/period. Other inputs fall back to the full proof.

Verified results are private tenant-scoped tables with ENABLE/FORCE RLS. Runtime and ingestor cannot read/write them or invoke refresh/private proofs. Existing tenant, binding, approved mapping and business certificate checks remain live. Ordinary proof functions reuse a matching positive result or execute the original full guard. There is no TTL or process-local cache.

Input writes invalidate both results in the same transaction. Dependencies are mapping releases, reconciliation evidence and batch links, ingestion batches, extraction runs, fact revisions and batch links, and business/derived certification ledgers. Migration 022 uses statement transition tables for INSERT/UPDATE/DELETE, covering old and new scopes. Privileged TRUNCATE clears all results. Migration 023 skips transition-table delete planning once the scoped tenant has no reusable results. A rolled-back write also rolls back invalidation. Repeatable-read requests see a consistent pair of input facts and proof results under MVCC; later requests see invalidation and re-proof.

After publication or an intentional input change, an authorized operator can refresh again. No runtime path refreshes or writes results. Until refresh, the full guards remain authoritative, including refusal of an unexpected zero-value operand/group. Serving withdrawal still takes effect immediately through the live binding join. Promotion transfers evidence/facts rather than private reusable results; refresh proves the target's own state.

The offline SQL sequence is:

```sql
BEGIN;
SELECT set_config('mart.tenant_id', '<authorized tenant>', true);
SELECT mart.refresh_proof_results('<authorized tenant>', '<certified dataset>');
COMMIT;
```

This does not extend SQL deadlines, publish additional metrics or grant authority to bypass a failed proof. Incident measurements and verification are recorded in [the runtime incident report](../../integration/runtime-incident-20261007.md).

October 7 follow-up: migration 024 preserves the live business certification
exact-set guard but tests ordinary one-dimensional arrays for nulls using
`array_position` instead of materializing `unnest`. The original null predicate
remains for multidimensional arrays; array equality and unordered set fallback,
tenant/reference checks, proof-result invalidation and SQL deadlines are unchanged.
