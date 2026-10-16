# Shared snapshot history reads — 2026-10-16

## Scope and observed failure

Base release: `524a2d7ce89814198b88a169f3372a666e1f4ec8`. Branch:
`codex/fix-snapshot-history-read`. The deployed Customer Performance detail page
advanced successfully to page 2, while Collections' Top 100 customers due for
collection reached a statement timeout. Existing freshness/reconciliation warnings
are separate from this query-performance finding.

An operator-executed read-only PostgreSQL plan used the actual application SQL
and runtime role, with a 30-second diagnostic bound and per-node timing disabled.
It completed in **17,860.174 ms**, with **6.814 ms** planning time. It processed
**1,847,416** historical snapshot rows into **149,380** latest entity balances,
then **4,465** customer groups. The fact index was already in use. PostgreSQL read
**371,349** shared 8-KiB blocks (about 2.83 GiB), and the history sort used an
external merge with **357,032 KiB** of disk space. The group sort used another
**28,192 KiB**. Root temporary counters were 92,778 blocks read and 92,891 written.
Plan-node buffer counters include descendants and are not added together. These
measurements do not attribute every millisecond between CPU and I/O.

Observed settings included 128 MiB shared buffers, 4 MiB work memory, JIT enabled
and two allowed parallel workers per gather. No server settings were changed.
These facts establish the shared history workload; they do not justify increasing
application timeouts or choosing a report-specific exception.

## Change and evidence

The review/business adapter selects trusted latest snapshot identities before
fetching their operands. Tenant and trusted family/definition/cutoff selection
remain enforced. Dimension and policy filters remain after latest selection.
Snapshot ratios retain matching exact operands; absent entities, zero balances,
latest assignments, labels, pagination and revision-bound continuation retain
their existing meaning. Event reads keep their existing path.

Migration 050 adds one narrow non-unique index containing tenant, measure, entity,
business day and partition identity. It does not index labels, unbounded source
envelopes or the wider serialized fact key. Released migrations are unchanged.
No trigger, rollup, policy change, serving activation or source reload is added.

Synthetic PostgreSQL 18.6 experiments used 478,824 rows over 24 months:

- A first candidate using a plain identity join was rejected: approximately
  3.6–3.7 seconds versus the original 1.5–1.6 seconds.
- With the covering identity index and bounded latest-row lookups, three runs
  returned identical grouped values at 372–390 ms versus 1,996–2,042 ms.
- Adding trusted-family partition membership, including an excluded newer
  partition, retained identical results at 511–526 ms versus 1,933–2,089 ms.
- The candidate index occupied 44 MiB in that synthetic fixture.
- A fresh-row fixture without vacuum visibility coverage did **not** reproduce
  the large improvement: 2,399–2,560 ms versus 2,136–2,465 ms. Therefore ordinary
  analytics-only `VACUUM (ANALYZE)` is an explicit initial deployment prerequisite,
  outside the migration transaction. Autovacuum remains enabled in real systems;
  its temporary suppression was limited to the disposable fresh-row experiment.

The focused repository regression initially passed two semantic cases and failed
the index-only history-read assertion. After the change, all five targeted
migration/history cases passed; the 60,000-snapshot fixture used zero history heap
fetches and completed the measured SQL in **110.216 ms** in the completed full-suite run (approximately 110 ms in
its focused run). A separate
populated schema-49 upgrade test passed, preserving the fact heap identity,
fact payloads, controls, complete serving membership, trusted revision and RLS.

## Verification and limits

Frozen installation, lint, type checking, architecture, baseline-aware quality
and diff gates passed. The architecture/quality/diff tools reported zero
diagnostics. The complete unit/API/web/engineering suite passed: **910 tests, zero failures
or skips**. API/web production builds passed with the existing Vite large-chunk
warning. A legacy migration-fixture update passed all 17 targeted Finance,
serving-history and security cases. The first broad database run was interrupted
when a fixture still assumed schema 49; only the completed final rerun will be
counted. The final complete PostgreSQL 18.6 rerun passed: **305 tests, zero failures or
skips**, in approximately **681.5 seconds**. The final source tree passed the
rechecked type/lint/quality gates after the legacy fixture updates. The four new
snapshot history/upgrade cases are included in that total. Local experiments used only an owned disposable PostgreSQL container
on loopback port 55436; laptop staging and Odoo were not modified.

No company performance improvement is claimed before the new release, index and
vacuum maintenance are deployed and the actual runtime plan/browser are checked.
The current company deployment still runs the base release. No push, merge,
company schema change or CI run is part of the local verification evidence.
