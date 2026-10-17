# Local preparation investigation — 17 October 2026

Status: read-only investigation completed; no forward migration, prepared activation, company change, source access, CI or publication performed. The installed local schema remains 54. Candidate SQL lives only in temporary diagnostic files. Source and trusted-publication fingerprints remain the required invariant.

## Measured evidence

All measurements use the frozen local revision `3b5f517c-a1a4-4eda-9da3-45c975d3b03e`, the original first business/event chunk for September 2026, existing protected identities and unchanged 120-second background statement limits. They are background preparation measurements, not dashboard SLAs.

| Measurement | Result | Limit of evidence |
| --- | --- | --- |
| Unchanged complete canonical builder, standalone SELECT | statement timeout | The cost is not confined to comparing stored cells. |
| Numeric reduction branch (still carries expanded label projections) | 53,065.879 ms; 182,156 source rows; 4,007,432 expanded rows; 298,850 reduced cells | Does not execute the final label reduction/join. Expanded estimate was only 1,200 rows; source estimate was one row. |
| Grouping-sets candidate, three-day exact comparison | 20,987 expected and actual cells; every field matches using both directions of `EXCEPT ALL` | Combined comparison took 44,334 ms. This is a partial source window, not full-month proof. |
| Same three-day grouping-sets SELECT with node timing | 3,654.686 ms | No statistical SLA or full-month acceptance. |
| Full-month candidates | all exceeded the statement bound | Label min/max alone, finer-state reduction, grouping sets, typed input, bound partition IDs and binary-label min/max were not accepted solutions. |

The numeric branch recorded 446,109 temporary blocks read and 327,316 written (8 KiB blocks). The pipeline expands rows before reduction and its row estimates are severely low. A source-level estimate improvement alone was insufficient: the bound-partition candidate increased estimated output from 88 to 46,222 rows but still timed out. No candidate should be published based on the smaller-window success.

The database uses deterministic libc `en_US.utf8`. A bounded audit found zero published business-row kind mismatches against the governed measure definitions. Neither observation authorizes changing source contracts or label semantics. The original native source and complete/delta population construction remain the comparison reference.

## Approved private rehearsal protocol

The user approved the laptop-only rehearsal after requesting explicit acceptance budgets and a size ladder. No migration, permanent write, restart, source access or prepared activation is included.

Freeze revision `3b5f517c-a1a4-4eda-9da3-45c975d3b03e`; test September 1, September 1–7, then September 1–30 in order. Do not advance after a candidate correctness or resource failure. Compare the unchanged canonical generation statement against one frozen native population, physical working columns, explicit ANALYZE and a shared grouping reduction. The baseline measures generation, not the complete production operator. Validate all twelve cell fields in both EXCEPT ALL directions for each governed grain.

Predeclared bounds: 120 seconds per statement; five-second lock wait; 180 seconds for candidate population copy, ANALYZE, generation and exact checks; 300 seconds per rung including baseline; 900 seconds for the ladder. This is one business/event chunk, not an all-dataset monthly SLA. Maximum 250,000 native rows, one million cells, 2 GiB private relations, 2 GiB cumulative candidate temporary spill and 12 GiB free-disk reserve. Maximum sampled worker RSS is 1 GiB, conservatively including Node and PostgreSQL mapped shared pages. Spill is measured from root plan temporary blocks, not a changed server temp-file setting. No resource or request deadline is relaxed.

Record stage wall time, execution plans, rows, buffer reads and temporary blocks. A timed-out statement has no actual plan; preserve its stage and cancellation category. Cancel only the named private backend on resource failure. Three private temporary tables hold population, candidate cells and proof counters; each enforces tenant RLS. Source copying and measured queries use repeatable-read read-only transactions. TEMP setup and ANALYZE affect only private objects, which disappear when the session ends.

Rehearsal script `/tmp/el-dabboos-local-population-rehearsal.mjs`: SHA-256 `4dce2c81bacff4920b99e76b8ac695506b7c473bf8c603cf9efa4a04d730d117`. Helper `/tmp/el-dabboos-grouping-sets-candidate.mjs`: SHA-256 `651ec930ba5dbe950b176bc7b6e0eb991c5eee7dfd6dbd670f4c93c240bbcce6`. Syntax checked before execution.

The intended production lifecycle uses temporary work only within a chunk, then commits validated persistent output and its existing binding checkpoint before the next chunk. This private rehearsal does not test permanent checkpoint recovery. A killed-job resume test, fresh independent Odoo controls, per-dataset freshness limits and persistent prepared_at metadata, all-family reconciliation and measured shadow serving remain open gates. Prepared serving stays inactive.

## Execution evidence

Executed the approved ladder, sequentially, in 220.472 seconds. Stopped at the predeclared memory guard; no tuning or retry followed.

| Window | Native rows | Cells | Baseline generation | Candidate generation | Candidate including copy, ANALYZE and exact proof | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| One day | 2,173 | 6,198 | 6.946 s | 0.121 s | 15.978 s | All 11 grains exact; within bounds |
| One week | 35,365 | 64,139 | 24.640 s | 2.264 s | 147.298 s | All 11 grains exact; within bounds |
| Full month | Not completed | Not completed | Cancelled at 25.173 s | Not run | Not run | Conservative worker RSS exceeded 1 GiB |

The generation and end-to-end columns measure different work. The candidate generation numbers alone exclude copying and correctness validation and must not be presented as total preparation latency or dashboard-read latency. Baseline ordering also differs from the candidate, so these are diagnostic measurements, not repeated cold/warm benchmarks.

One-day candidate spill: 13,688,832 bytes; private relations: 6,660,096 bytes. One-week candidate spill: 990,732,288 bytes; private relations: 95,518,720 bytes. Sampled maximum RSS for each entire rung, including baseline, was 229,093,376 and 912,986,112 bytes respectively. RSS includes shared mapped pages; the month cancellation is a conservative budget failure, not evidence of 1 GiB of private query allocations.

The one-week widest-grain exact proof took 114.729 seconds and wrote 751,173,632 bytes of spill, dominating the candidate pipeline. A read-only activity sample during this statement showed active execution with no wait event. Its actual plan is retained in the sanitized plan artifact. This identifies validation as the measured bottleneck after fast candidate generation; it does not justify removing or weakening the proof. The full-month baseline was cancelled by the resource guard with SQLSTATE 57014, not by its statement deadline; no completed actual plan exists for that cancelled statement.

Evidence: `/tmp/el-dabboos-local-population-rehearsal-result.json`, `/tmp/el-dabboos-local-population-rehearsal-plans.json`, and `/tmp/el-dabboos-local-population-rehearsal.log`. Source cutoff remained `2026-10-14T20:59:08.053Z`, an accepted mart watermark, not a fresh Odoo control. No full-month candidate correctness or timing claim is established.

Post-run checks: original baseline, immutable source row counts, trusted revision and manifest fingerprint matched the pre-run record exactly. Schema remains 54; prepared datasets, bindings and activations are zero. No rehearsal sessions or private work relations remain. Local HTTPS readiness returned ready with persistence and analytics available.

Next implementation decision must address bounded exact validation and the full-month resource budget before another full-month run. No migration, activation, 43-chunk retry or company release is authorized by these partial results.

## Approved follow-up: day → month, exact validation batches

The user selected day → month and approved proceeding. The revised private rehearsal partitions the canonical exact comparison by grain and measure, both already included in every output grouping key. It never partitions a monthly population by source day. Worklists include candidate-only measures; unknown candidate grains fail validation. All twelve fields and duplicate multiplicities are compared using EXCEPT ALL in both directions. Tenant/source population construction is unchanged. Temporary indexes select the native measure and candidate grain/measure populations; no permanent index or planner setting changes.

Before real data, a synthetic fault matrix checks valid cells, altered values/counts/extrema/dates/time grains/dimensions/labels/conflicts, missing and duplicate cells, extra measures and extra grains. Credits, changed monthly labels, missing dimensions and explicit JSON null are represented. The matrix runs only in private temporary tables.

Keep the previous 120-second statement, 180-second candidate, 300-second rung, 1 GiB conservative RSS, 2 GiB spill/private-relation and 12 GiB free-space bounds. Reuse recorded baseline evidence instead of rerunning the known full-month baseline resource failure. This is a candidate validation experiment, not a production migration or activated serving path. Stop if the day or month fails; do not weaken the gates.

Reviewed artifacts: `/tmp/el-dabboos-local-batched-rehearsal.mjs` SHA-256 `4a91d04c6957484e0adac631337779217d265c8f814e04d92b24b263bd7cff40`; `/tmp/el-dabboos-exact-validation-batches.mjs` SHA-256 `0f3800654edf53244bafd1e1737e6ca115a17e6e8ba59e09786c09d067196722`; `/tmp/el-dabboos-batched-validation-fixture.mjs` SHA-256 `9ef4a01c05606d3ee4368efca331cdb7e1dd35350cd76e3d90194109b9100b31`. Syntax checks passed. Production functions 053/054 remain immutable and unchanged.

The synthetic-only fault matrix uses an explicit transaction for SAVEPOINT and temporary TRUNCATE. Two harness setup errors (25006 and 25P01) were corrected before real-data execution; they were not preparation performance failures. Real source copying and measured validation remain repeatable-read read-only. The synthetic matrix subsequently passed valid output plus all fourteen fault cases.

## Staged exact-reference follow-up (user approved)

The grain/measure experiment was rejected: the day matched but regressed to 72.176 seconds; the month hit the unchanged 180-second candidate budget during exact batch 20. It was not promoted. This evidence remains in `/tmp/el-dabboos-local-batched-rehearsal-{result,plans}.json`. Cleanup confirmed original data/publication unchanged, schema 54, zero prepared datasets/bindings/activations, no rehearsal sessions/private tables and healthy local HTTPS readiness.

The user approved proceeding after clarification of the objective. The next private test retains the original canonical expansion, sum/count/extrema/date rules, and distinct-label/conflict rules. It stages one grain's expansion, ANALYZEs it, stages numeric groups, ANALYZEs them, then reduces labels against narrow cell identifiers. Hashes only accelerate joins; exact dimensions are also compared. Both directions of EXCEPT ALL still check every output field and multiplicity. This tests intermediate statistics and narrower sorting rather than relaxing proof or changing semantics.

Run the synthetic fault matrix, then one day and the full month with the same declared resource/deadline bounds. No permanent write, permission change, source access, migration, service restart, activation, CI or company change. Five tenant-RLS private temporary relations are used and removed on disconnect. Reuse the already recorded baseline; do not rerun its known resource failure. This is not yet the production single-materialization implementation.

Reviewed artifacts: `/tmp/el-dabboos-local-staged-rehearsal.mjs` SHA-256 `626b6327742b259c426107a21b04317e32cefc5a06a164e286b2bd4100c748f5`; `/tmp/el-dabboos-staged-exact-validation.mjs` SHA-256 `bc131d1ac60f5a2bdd0db8fbbf764f73fadf8abf5a619a57a1b834bffb488e4e`; `/tmp/el-dabboos-staged-validation-fixture.mjs` SHA-256 `1f7d997b39a8b0e2934838df91a2106df3ef11066f5fea011c69851afc7919f7`. Syntax checked before execution.

### Staged reference refinement: reuse indexed exact comparison

The first staged reference matched its synthetic fault matrix and all real day cells in 9.167 seconds. Month candidate generation completed in 17.99 seconds, and exact comparisons completed through grain 9, but cumulative completed-plan spill exceeded 2 GiB. The private backend was cancelled; no full-month pass is claimed. The diagnostic artifact `/tmp/el-dabboos-staged-spill-guard.json` records this cancellation. The original spill check was only at the end of a rung; the refined harness enforces it after each completed stage.

The measured wide-grain EXCEPT ALL comparison alone wrote 2,144,370,688 bytes. Reuse the existing migration-054 exact key/content/cardinality proof with a private unique candidate-key index, exact JSON dimensions, every remaining field and equal cardinality. Hashes are lookup accelerators, never value proofs; a collision causes rejection, not acceptance. Duplicate candidates are rejected by the private unique index, matching the production primary-key prerequisite. The synthetic matrix requires this rejection. Remove the single-use expansion CTE's redundant materialization. Stage label groups and ANALYZE them before their final join; the previous plan estimated 100 label groups against 228,498 actual groups. No schema, serving, source-contract, authorization or deadline change is proposed.

The revised private run retains the day → month ladder and all budgets. Six private tenant-RLS tables are used. Artifacts: indexed harness SHA-256 `574392d3a76146bbbd37c6af5e62d2df3a68f8d6db02400655b6a8768ea5b848`; staged-reference helper `75a45f4f29afcdd82868634ea8c2e57085ebed2b346bc63a56288ac9dceb8374`; synthetic fixture `ec2299130f9c804f45878d561b5d26bd0402e890eca9ffabfb8f6cc5ebdd3b06`. Previous helper versions are retained with v1 suffixes. Syntax checked before execution.

The first indexed variant stopped automatically when completed month spill reached 2,187,329,536 bytes. Its comparison hashed a broad candidate population (a small grain's comparison alone spilled 227,934,208 bytes). It was not accepted. The final private comparison uses a bounded unique-key lookup, with explicit grain/tenant predicates, exact dimensions and full content equality. LIMIT 1 cannot hide duplicate valid keys because the private unique index rejects them, including in the fault matrix. Equal cardinality still rejects extras. Original native population and reduction rules are unchanged. Day → month and every existing bound remain required.

Final harness `/tmp/el-dabboos-local-keyed-rehearsal.mjs` SHA-256 `2038de43c2c27eb10ac106be22467dbe06933cbddeaec21c692e67c4d2fa74d6`; reference helper `7327a1eb596d6ef9c8f9d960b8b36fa1b22cc2dda0bd90206a1b262c9f9c2da7`; synthetic fixture `886694d285c0d97c4f25d3b377509ba0079de582d6ce1553ab6b0f96fb588d4f`. Synthetic date/time-key corruptions change one row to avoid an unrelated transient uniqueness collision; duplicate corruption explicitly must fail the unique index. Earlier synthetic-only uniqueness failures occurred before any real-data load. Six private work tables, no permanent changes.


The bounded expression-index lookup variant also failed the 180-second month budget during its wide-grain comparison. The final diagnostic restores a stored dimension-key column, matching the physical-key prerequisite of the existing 054 proof. A generated private column keeps the key synchronized with dimensions; exact dimensions and content are still compared, and uniqueness rejects duplicates or hash collisions. Before each measured comparison, an estimated plan must show the stored dimension key in the candidate index condition; otherwise the test stops without executing that comparison. This prevents claiming that an index exists when the query does not use its intended access path.

Final reviewed files: `/tmp/el-dabboos-local-physical-rehearsal.mjs` SHA-256 `be7452de1ad7381ab39f72a012471764975466cb7171aab377e8b36d5482f5b1`; reference helper `92f194525b81b0a30960abab8b642d4b1594e9c1c0921e775a792e23d0bb7fd5`; fixture `0654300f652249331f56715d1b798e5b025d790b97916f1b9e368b4be0d8ff71`. The synthetic fault matrix passed before real-data execution. All earlier failed variants remain rejected. No applied SQL function, schema or serving activation has changed.

## Final physical-key rehearsal — passed (limited scope)

The final run passed the synthetic valid population and fourteen corruption cases, then one day and one full month on the same frozen local publication. Each real exact comparison passed the pre-execution stored-key index-condition check. No deadline, tenant policy, source contract or resource bound was relaxed.

| Window | Native rows | Prepared cells | Governed grains | Preparation and exact validation | Cumulative spill | Peak sampled RSS | Final private storage |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| September 1 | 2,173 | 6,198 | 11 | 9.900 s | 827,392 B | 245,633,024 B | 9,445,376 B |
| September 1–30 | 182,156 | 298,850 | 11 | 155.579 s | 1,921,622,016 B | 551,718,912 B | 652,132,352 B |

The month remains below the declared 180-second candidate, 2 GiB spill/private-relation and 1 GiB conservative RSS budgets. This is one observation, with limited headroom, not a repeated production SLA. The month phase totals were: source copy 6.298 s, candidate generation 20.914 s, reference expansion 70.330 s, numeric reference reduction 15.424 s, reference labels 17.478 s, label attachment 5.657 s, and indexed exact comparison 10.219 s; remaining time includes ANALYZE, metadata and bookkeeping. Exact comparison itself spilled zero blocks. All twelve canonical cell fields and cardinality matched under unique keys; the synthetic duplicate case was rejected by the unique index.

Evidence: `/tmp/el-dabboos-local-physical-rehearsal-result.json`, `/tmp/el-dabboos-local-physical-rehearsal-plans.json`, `/tmp/el-dabboos-local-physical-rehearsal.log`. Current reviewed file fingerprints are recorded immediately above. Failed alternatives are not accepted implementations.

Post-run checks confirmed the original baseline, source row counts, trusted revision and manifest fingerprint unchanged; schema remains 54 with zero prepared datasets, bindings or activations. No diagnostic sessions or any of the six private work relations remain. Local HTTPS readiness is ready with persistence and analytics available. Applied 053/054 source-file checksums remain unchanged. No CI, push, merge, source contact, company deployment or serving cutover occurred.

### Integration boundary and remaining work

This proves a private local business/event September chunk only. The protected owner-only harness is not a deployed production implementation and must not be copied into the ingestor role by granting it TEMP or owner privileges. The production integration must preserve existing privilege boundaries, build from one frozen population, reuse prepared output for fingerprint/persist/content checks rather than rebuilding source history, and retain independent source controls. A separately reviewed forward migration and adapter change are still needed before a local staging retry; neither is applied here.

All-family real-data coverage, complete/delta snapshot and empty-observation cases, source freshness/prepared_at gates, interrupted-chunk recovery, storage/write amplification and prepared dashboard shadow-read latency remain required before activation. Fresh Odoo controls were not obtained in this rehearsal. The accepted input watermark remained 2026-10-14T20:59:08.053Z. Dashboard load times were not measured and no three-second dashboard claim follows from this result.
