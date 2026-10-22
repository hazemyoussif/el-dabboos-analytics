# Command delta verification — 23 October 2026

Implementation: `d5371491914e6aa60107e1c37cc04d0a3855f67a` on
`codex/bounded-ingestion-overlap`, based on
`4a82e932f9ff389d2131c0f648353082c45ca737`. The following documentation commit
records these results without changing the tested implementation.

Command refresh now discovers changed source roots against each recipe's accepted
observation, retains accepted Business raw/prepared ancestry, and replaces affected
identities and cell keys under independent scoped controls. Separate allocation
presence checks retain actual prior links. Missing optional dependency metadata
preserves the accepted operational cursor. Migrations 065–076 are additive.
See [the integration description](../integration/proposals/delta-sync-correction-2026-10-22.md).

## Local verification

The owner approved focused synthetic tests and local gates. Tests used disposable
PostgreSQL 18.6 through the existing `foundation_test` fixture. They loaded no
developer env files, company extracts, company source connection or model service.

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Pass; lockfile unchanged |
| `pnpm run lint` | Pass |
| `pnpm run check:architecture` | Pass; zero diagnostics |
| `pnpm run check:quality` | Pass; zero diagnostics |
| `pnpm run typecheck` | Pass |
| `pnpm test` | 988 passed; zero failures/skips |
| `pnpm run test:postgres` with the synthetic fixture URL | 426 passed; zero failures/skips |
| `pnpm run build` | API and web pass |
| `pnpm run check:diff` | Pass, including staged new files |

Focused checks establish backdated corrections, old/new dimension and date keys,
deletions, unchanged baseline bytes, fewer physical replacement cells, unaffected
snapshot reuse, no-op freshness, empty debt, day/month rollover, actual stock
observation dates, tenant isolation, missing/extra replacement rejection, independent
control mismatch rejection, and atomic promotion rollback. A sparse input without
its sealed prepared parent rejects instead of building the complete month.

Synthetic source SQL checks cover ownership changes, state exits, recognition
without a new write, company scope and future allocations in reconstructed debt.
Allocation checks cover old/new relink roots, recorded-identity sweep scope and
unknown prior-edge rejection. Existing report, policy and migration tests also pass.

The retained-history regression still uses the covering index and zero heap fetches
on its complete-partition scalar read. A separate code comparison against the base
commit confirms all five unscoped Command recipe SQL strings remain byte-identical.
These are local synthetic results, not company throughput measurements.

## Remaining work and limits

- Company deployment, migrations, source jobs and timer changes were not performed.
  Browser QA and local staging rehearsals were not run. GitHub CI remains disabled.
- Facts, receivables and review retain their existing materialization paths. Sparse
  physical raw/prepared ancestry in this change belongs to Business.
- Affected monthly summary cells may read all contributors to that measure.
  Recipe initialization calculates newly introduced outputs. Company initialization
  time, ancestry read cost and storage requirements remain unmeasured.
- Deletion coverage includes recorded allocation IDs only. Unknown prior links
  require explicit recovery; Odoo configuration remains unchanged.
- The web build retains its existing large-chunk warning. Concurrent DOM tests
  emitted the existing HMR port warning and completed successfully.

Next: review this branch and authorize company rollout separately. Keep jobs and
timers paused until the operator applies the release and measures one controlled
company sync. No company retry command or merge was performed during verification.
Push status and the final documentation revision are reported in the chat handoff.
