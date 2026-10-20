# Company sync diagnostics — 21 October 2026

Status: diagnostic code and approved focused tests completed; not pushed, built
or deployed for this change.
No source call, company retry, timer change or new measurement is authorized by
this document. GitHub CI remains disabled. The unrelated performance fixture
experiment remains excluded from this patch.

## Company evidence received

The company deployed API `2edef2993c90d69feec3a34a9270a5b30a59fe02`, applied
062/063, verified roles and returned readiness 200. Web remained `6caf30e`.
Coordinated backups and archive inventories were saved at
`/mnt/HC_Volume_107192875/el-dabboos-backups/dependencies-20261020T192418Z`.
After rebuildable-cache and obsolete-image cleanup, root had 4.2 GiB free. This
was not a capacity guarantee for initialization or publication.

The controlled run started 20 October at 19:54:54 UTC and timed out at 20:09:54
UTC during offline refresh. Systemd subsequently killed the bash/Docker clients
at 20:11:24 UTC. Logs alone did not establish the final transaction outcome.
The later runtime status reported a new sync failure at 20:14:49.806 UTC,
`pendingCandidateRun: null`, the unchanged trusted revision
`887a79fe-df49-44c7-951b-217db4b1f688` and the unchanged successful source
cutoff `2026-10-20T07:24:09.590Z`. No successful accepted-state advance occurred.
The user has not supplied the requested container-list output; absence of an
outlived job container is not independently established.

Observed operation timings (nested totals must not be summed):

| Work | Seconds |
| --- | ---: |
| Lookup discovery | 2.113 |
| Source object pages | 62.578 |
| Candidate planning, including nested head reads | 112.699 |
| Receivable dependency initialization | 114.361 |
| All 28 receivable snapshot cutoffs | 64.904 |
| Source handoff reached, elapsed from operation start | 468.755 |
| Offline fact persistence | 222.415 |
| Candidate comparison | 61.837 |
| Offline refresh reached, elapsed from operation start | 769.830 |

The source read stream completed 286 pages. Persistence completed 57 revision and
57 head batches. At the existing 10,000-entry write bound this implies between
560,001 and 570,000 candidate entries, not necessarily unique identities. Existing
business-content equality already skips observation-only metadata changes. These
logs cannot establish whether inserts, labels, lineage, statuses, amounts or other
content differences caused the candidate population.

Astra's read-only review confirmed that both dependency caches remain cold after
failed acceptance because they commit with the successful audit/cursor transaction.
The first lookup catch-up and receivable initialization therefore repeat. Simply
committing the caches earlier would break their successful-cursor/completeness
contract. Resumability requires separate lifecycle design if later evidence shows
that it is needed; it is not implemented by this patch.

## Diagnostic code prepared

- Summarize already planned entries after source closure and before fact writes.
  Report previous/no-previous and active/tombstone counts by closed source object
  bucket and next business month. Classify existing-entry differences using fixed
  schema field paths and the existing canonical comparator. Do not collect or emit
  customer identities, values or arbitrary property names. Unknown object names
  are bucketed as `other`. Parent/child field counts deliberately overlap.
- Emit each refresh SQL substep's start/completion/failure immediately, including
  its month where applicable. Enclosing month events report index/total. This
  makes the last started step visible even if client termination prevents the
  final observation flush. All events describe uncommitted candidate work.
- Preserve SQL, parameters, order, exact guards, source lifetime, successful cursor
  and atomic publication. No migration, checkpoint relocation, longer deadline or
  additional source/mart query is introduced.
- Observation is optional. Classification is absent without an observer. Its
  synchronous CPU overhead is visible as `classificationMs`, but unmeasured at
  company scale. No zero-overhead or runtime improvement claim is made.

Astra reviewed the actual diagnostic diff read-only and found no blocking
correctness/privacy defect. It identified repeated nested serialization as an
unmeasured CPU cost; that caveat remains. TypeScript, targeted lint, architecture,
baseline-aware quality and diff checks passed. Static checks are separate from the focused
verification below. The earlier 973 regular / 411 PostgreSQL passes apply to release
`2edef29`, not to this diagnostic patch.

## Approved focused verification

After explicit owner approval, 13 focused synthetic unit tests passed with zero
failures, cancellations or skips. They used in-memory query clients and local
stderr capture, without a database connection, developer env file or source call.
Coverage:

1. Previous/no-previous, active/tombstone and repeated-key entry counts; nested
   business-field differences, canonical key-order equality and observation-field
   exclusion; malformed/unknown names never appear in diagnostic output.
2. Operator stderr includes aggregate counts and fixed names, excludes fixture
   sentinel values/identities, and emits refresh boundaries immediately rather
   than waiting for periodic progress or final cleanup.
3. Refresh observer enabled/disabled preserves SQL text, bound values and order;
   the failing substep is reported and its error propagates without downstream
   month completion. These stubs verify error propagation and ordering, not actual
   PostgreSQL guard execution or transactional rollback.

Exact command (run once, 13 passed):

```bash
node --experimental-transform-types --disable-warning=ExperimentalWarning --test \
  packages/data/test/operational-change-summary.test.ts \
  packages/data/test/operational-refresh-observation.test.ts \
  apps/api/test/analytics-job-observation.test.ts
```

No full suite, production build or container rehearsal ran for this diagnostic
patch. Repository pre-push gates remain outstanding; approval for these focused
checks does not authorize running the full suites. No company retry follows
automatically from focused verification. Review code,
verification results, container state and capacity before any deployment or
separately authorized source run.
