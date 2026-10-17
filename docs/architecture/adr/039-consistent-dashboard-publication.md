# ADR 039 — Consistent publication for one dashboard execution

Status: implemented local candidate; not released. Extends ADR 023 with an optional domain execution scope. No permanent schema, RLS or source changes.

## Context

Independent parallel repeatable-read transactions can observe different trusted publications when an import completes during a dashboard load. Individual transactions remain correct, but their combined widgets need not describe one publication. Finance summary reuse alone cannot ensure cross-family consistency. Serving roles intentionally see only current trusted membership; retaining a revision identifier does not authorize an older publication.

## Decision

The application resolves business dates once, then asks the adapter for an optional asynchronous execution scope bound to the authorized tenant, locale and enforced policy. The trusted adapter resolves its shared published revision in a short read-only transaction. Every data transaction verifies that revision within the same repeatable-read snapshot as its selection. A fresh transaction verifies the publication again after all jobs settle. This optimistic check retains parallel reads and current-only RLS; it neither holds a tenant publication lock nor grants access to superseded partitions.

The application owns one retry for the complete execution on the typed publication-conflict error. A conflict caught by normal per-series isolation is recorded at the request boundary, so a mixed partial response cannot escape. The failed attempt's results and cached operands are discarded. The second attempt has a fresh scope, deduplication and operands, but uses the original resolved dates and policies. Repeated conflicts surface as a safe 503 with `ANALYTICS_REVISION_CHANGED`. Other errors retain their existing ownership and series isolation. A genuinely stale page cursor remains a result-window error; publication retry does not convert it into a different page.

The result exposes the common serving revision. Per-series business cutoff, source watermark, definitions and release evidence remain distinct: a common manifest does not imply equal source freshness or interchangeable Finance/debt definitions. The context-bound scope is not a persistent cache or an authorization grant. Membership/metric permission remains the API/application boundary's responsibility; adapters continue validating metric/capability and policy intersection before data reads.

## Consequences

Each successful execution adds an initial and final short revision read, plus transaction-local checks. Publication churn can double a dashboard's query work once; repeated churn fails visibly rather than serving mixed results. This does not guarantee the latest revision at the instant an HTTP response arrives, only that the completed reads belong to one verified publication. It does not solve data-family freshness, debt scan cost or concurrent-user capacity.

A shared exported PostgreSQL snapshot would require a retained transaction owner, coordinated connection lifecycle and additional pool/lifetime management. This smaller change uses current authorization and transaction boundaries. Reconsider snapshot sharing only if measured publication churn makes the bounded retry costly.

[Verification evidence](../../qa/pinned-publication-2026-10-17.md).
