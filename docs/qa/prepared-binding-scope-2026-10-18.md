# Scoped prepared-binding correction — local verification

## Scope

Branch: `codex/prepared-binding-scope`, based on feature commit `33e1e55` whose tree matches deployed merge `6ac3fcb`.

Forward migration 057 changes only the condition surrounding snapshot identity uniqueness in `guard_prepared_binding`: run it for snapshot bindings. No data rewrite, permission change, deadline change, activation, grain modification or source refresh is included. Applied migrations 053–056 are preserved byte-for-byte.

Company evidence justifying this correction: binding INSERT timed out at the final statistics IF; the whole INSERT shares a 120-second statement deadline. A committed April comparison measured its count at 1.583 seconds, input signature at 0.003 seconds, and the unrelated snapshot-history check exceeded 15 seconds. This does not prove that the scope correction alone resolves company preparation.

## Diagnostics

Protected CLI preparation now opts into stage start/completion/failure observations. Stages cover configuration, input signature, reuse lookup, population construction, aggregation, each grain validation step, workspace seal, fingerprinting, persistence and binding. Events contain stage/grain names, elapsed time and safe SQLSTATE classifications; they exclude SQL text, arguments, raw errors and customer values. Timing observations are provisional until transaction commit. The existing committed-chunk callback remains the durable checkpoint evidence.

## Regression evidence

Synthetic corruption fixtures give accepted inputs missing or duplicate snapshot identities while preserving event inputs. The previous trigger rejects the event chunk. The corrected trigger accepts and commits that event chunk, rejects a binding with incorrect event row statistics, and still rejects actual snapshot preparation with invalid identities. Failed snapshot work leaves the committed event binding intact. Existing exact multiset/content tests and controlled-workspace/role-access tests remain in the matrix.

A separate unit regression verifies diagnostic stage ordering, error identity preservation, classification of cancellation versus statement timeout, finite elapsed timings, and omission of raw private error details.

## Verification status

Frozen install, lint, architecture, baseline-aware quality, full typecheck, 935 regular tests (zero failures/skips), API/web builds and diff checks passed. Build retains the existing large-bundle warning. Full disposable PostgreSQL regression passed: 334 tests, zero failures, zero skips (722.06 seconds). It includes the new before/after scope checks, malformed-snapshot rejection, event statistics protection, exact-content comparison, resumed checkpoints, role/RLS boundaries and the existing 100,000-item fixture. No second full database run was performed.

## Limits and release boundary

At verification time, no push, merge, GitHub CI, persistent local staging migration, company deployment, company preparation retry or activation had occurred. The user subsequently approved publishing this exact candidate with CI skipped for manual staging deployment and the single-period rehearsal. Unfinished all-family freshness and summary-grain sizing are outside this patch. A representative company period must still prove the end-to-end preparation time and storage budget before any full retry/cutover. The local synthetic scale fixture is not a company SLA.

## Synthetic scale sample from this verification run

Existing 100,000-item snapshot fixture completed. Its required customer rollup
contains 1,000 rows; preparation took 5,515.58 ms. Three backend query executions
measured 32.35, 16.80 and 16.77 ms. All values/count assertions passed. This is
not a before/after event-preparation comparison or a company/browser/concurrent
performance claim.

Summed observed preparation stage durations: population 954.00 ms, aggregation
158.78 ms, validation 3,825.05 ms, binding 458.28 ms, fingerprint 16.47 ms and
persistence 62.52 ms. In this fixture validation dominates; it would be unjustified
to call application-side hashing/JSON persistence the main bottleneck from code
inspection alone. The company event-history check exceeding 15 seconds remains
a separate measured finding.
