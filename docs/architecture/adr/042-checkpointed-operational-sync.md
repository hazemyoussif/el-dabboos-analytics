# ADR 042 — Checkpointed operational sync

Status: implementation approved by the owner on 21 October 2026 and released in
`8d449b9df9fca8ae7f94c16541c96718e805daa1`. Local staging migration rehearsal
passed; company deployment subsequently passed. The initial company run failed
before a capture checkpoint with Node heap exhaustion. See the
[capture memory correction](../../qa/sync-capture-memory-correction-2026-10-21.md).
Company catch-up and performance verification remain pending.
Extends ADR 029 and ADR 040 for operational `sync` only.

## Problem and decision

The company catch-up completed source observation but could not finish all mart
work within one job deadline. Its transaction rolled back even completed months,
so the next invocation repeated discovery, dependency initialization and refresh.
The diagnostic run identified real canonical label changes, not timestamp-only
updates that could be discarded.

Keep a complete immutable source capture privately, then commit exact reconciliation,
affected months and prepared chunks independently. Reuse the existing tenant
advisory-lock key for a dedicated connection across those transactions. Source
snapshot and job deadlines do not increase. Other job kinds retain their existing
atomic path and cannot alter accepted state while a sync candidate is pending.

## Boundaries

- Capture retains the existing RR/RO source observation and independent controls.
  Source closure must succeed before capture commits. A failed or partial capture
  is not resumable; snapshot tokens are not persisted for reuse.
- A capture stores source lineage, the original request, accepted parent/cursor,
  baseline versions, next cursor, immutable revisions, final candidate heads,
  impact dates/partitions, exact controls and complete dependency observations.
- Comparison and refresh use a private overlay of accepted heads plus staged
  replacements. Real labels, locations, moves and tombstones remain canonical.
- Every transaction rechecks the accepted parent, cursor and definition versions.
  A month checkpoint includes exact aggregate and drill proofs and membership.
  Prepared chunks use existing bounds, input signatures and exact binding guards.
- Runtime RLS hides unpublished revisions, memberships, daily bases and partition
  metadata. Existing downstream membership/prepared policies hide their facts and
  prepared values. Runtime can read only the safe pending candidate ID.
- Final acceptance atomically writes the successful audit, accepted heads, trusted
  pointer, cursor, both dependency families and acceptance marker. A deferred guard
  requires the complete accepted state; setting the transaction acceptance flag
  alone cannot bypass it. Exact rejection records failed evidence and clears the
  pending pointer without changing accepted state.

Migration 064 replaces the operational revision-to-run FK with a deferred guard
that also permits a sealed private candidate with matching tenant, parent,
run/revision identity and source cutoff. The original final promotion guards are
retained. No historical table rewrite or source write is required.

## Recovery and limits

The same sync command checks pending capture before resolving source configuration.
It resumes committed evidence, months and chunks; it does not change the captured
cutoff to the retry time. Freshness continues to describe accepted data. A later
successful sync is needed to observe changes after that capture.

Only committed checkpoints survive interruption. Capture and final acceptance
remain indivisible transactions. A single expensive statement, capture or acceptance
that exceeds its existing bound still needs investigation; this change is not a
company completion-time guarantee. No automatic immediate retry loop is added.
The runner waits on its Docker child in the background so TERM/INT can promptly
execute cleanup instead of leaving an outlived worker.

Conflicting restored metadata fails closed. This release does not introduce an
operator command to abandon a stale sealed candidate or prune immutable history.
Additional storage capacity must be established before company rollout. Migration
and staging role/policy provisioning must finish while API/web and jobs are stopped;
the old API-only rollout is insufficient for this schema change.

See the [implementation and verification record](../../integration/proposals/checkpointed-sync-candidate-2026-10-21.md).
