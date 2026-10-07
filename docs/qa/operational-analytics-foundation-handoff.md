# Operational analytics foundation handoff

Branch: `codex/production-pilot-lifecycle`.
Base/final HEAD: `5abdfed0af082952083bd26fbdb55f1c9020e6a4`.
Changes remain uncommitted in the existing working tree, alongside the user's
pre-existing historical foundation. No worktree reset, push, merge or deployment.
No new CI run exists for this uncommitted state.

This delivery is incomplete relative to the requested full operational pipeline.
See [implementation status and remaining work](../integration/operational-analytics-v1.md).

## Delivered evidence

- Historical event ratios use sums of independently certified exact bases over
  one, six and twelve months. Additive totals and snapshot end-date selection
  are verified on synthetic PostgreSQL fixtures. The ratio fixture covers
  October 2024 through September 2025 to avoid fabricating the real September
  2026 anchors. The existing January–March historical/anchor fixture also passes.
- The September path, original certifications and historical membership remain
  intact. Actual September release values were not queried in this change.
- A current October synthetic sync corrects January, reconciles old/new dimension
  partitions and refreshes them before trusted promotion. New/current-period
  records and idempotent reruns are covered with transactional port fixtures.
- Mismatches preserve trusted state and cursor in the application fixture.
  Ingest/reconcile/refresh/promote/audit/cursor/source-close failures roll back.
- Migration 026 and PostgreSQL tests verify persisted exact evidence hashes,
  cursor cutoff guards, atomic rollback, immutable history, runtime write denial
  and tenant isolation. A concrete full PostgreSQL operational job adapter is
  still required; these tests do not certify a live sync pipeline.
- GET status validates membership/permission and reads only its resolved tenant.
  It does not execute report/source/model calls. Missing configuration returns 503.
- Coverage/as-of labels were manually inspected in a **synthetic SSR component
  preview**, using the actual components and project CSS. English/Arabic and
  Light/Dark were inspected at 390px, 1024px and 1280px. DOM checks found no
  page overflow in sampled phone/tablet/desktop states. This does not certify
  the complete live authenticated report flow or the new preset's pointer flow.
  Project quality AFTER review found no actionable visual issue in these labels.
- The web build retains its existing large-chunk warning. No timeout or quality
  baseline was raised. No model/source/customer service was used for testing.

## Synthetic timing sample

The diagnostic range fixture is tiny and the suite runs concurrent test work.
These are first-request/warm-request samples, **not** DB/OS cold measurements,
actual management-report benchmarks or before/after serving-layer evidence:

| Range | First request | Warm request |
| --- | ---: | ---: |
| 1 month | 1562 ms | 1664 ms |
| 6 months | 1388 ms | 1332 ms |
| 12 months | 1632 ms | 1445 ms |

No-change/small-batch operational and aggregate-refresh timings are outstanding.

## Safety confirmation with scope limits

| Requested assertion | Evidence/status |
| --- | --- |
| New and updated records synced | Application port tests pass; actual source/job adapter not delivered |
| Old-period correction updates old periods | Impact/lifecycle tests pass; actual mart/serving refresh not delivered |
| Historical certificates overwritten | No |
| Source modification time used as business date | No |
| Business date used as sync cursor | No |
| All history recomputed for each small change | Resolver targets affected partitions; concrete refresh adapter outstanding |
| Snapshot dependencies ignored | No silent default; explicit callback required; receivables dependency adapter outstanding |
| Derived dependencies ignored | No; catalog and analysis dependency tests pass |
| Failed reconciliation promoted | No in tested lifecycle; production promotion adapter outstanding |
| Dashboard triggers Odoo synchronization | No source call added to report/status reads |
| Dashboard triggers full certification proof | Existing proof fallbacks remain; cannot confirm this requirement yet |
| Hard deletes ignored permanently | Presence port exists; actual sweep/tombstone command not delivered |
| Timeouts raised to hide queries | No |
| RLS bypassed | No; forced tenant RLS and runtime denial tests |
| Metric definitions changed | No; query range support and snapshot metadata changed |
| LLM required | No LLM dependency in new runtime foundation |
| Odoo mutated | No actual Odoo source accessed or mutated; fixtures are disposable synthetic databases |
| Online staging/CD configured | No |
| Push / merge | No / no |

The complete requested mission must not be marked finished. Next work is the
concrete PostgreSQL operational transaction/source adapters and pinned trusted
serving revisions, followed by operational controls, detail/source verification,
presence/deletion handling and actual report/performance acceptance.

## Final verification

- `pnpm install --frozen-lockfile`: passed after the network sandbox prevented
  the first fetch attempt; lockfile was unchanged.
- `pnpm lint`, `pnpm typecheck`, `pnpm check:architecture`,
  `pnpm check:quality`, `pnpm check:diff`: passed; engineering gates report zero
  diagnostics, with no baseline edits by this work.
- `pnpm test`: 698 passed, zero failures/skips.
- `pnpm test:postgres` with the explicitly configured disposable synthetic
  PostgreSQL 18.6 database: 138 passed, zero failures/skips.
- A subsequent responsibility-only extraction of candidate discovery passed
  all static/engineering gates and 15 targeted lifecycle/status-security tests.
- `pnpm build`: API and web passed, retaining the existing large-chunk warning.
- No developer env files or real model/customer services were loaded by tests.
- Live historical release acceptance, actual source synchronization, complete
  operational/browser action acceptance and real performance evidence remain
  unverified or unimplemented as itemized above.
