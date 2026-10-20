# Prepared report correction rollout — 19 October 2026

Status: `154dd69` deployed; current revision prepared; activation blocked by two strict performance regressions. Reader follow-up under verification.
The user's priority is enabling prepared serving for actual company reports. The
current publication was prepared by the authorized enablement job. Its exact
27-report comparison stopped before activation on two performance regressions;
the follow-up reuses those outputs if the publication remains current.
No company shell is authenticated in this chat; the user runs company commands.
No deployment or activation is implied by this document.

## Candidate

Branch: `codex/prepared-acceptance-fixes`, based on feature commit
`921482a53f883347c374556281cb2141e35a6896` whose product tree matches the deployed
release `6d400594998d2b9e5fae42cd7e33045ec688c619`. Resolve the final reviewed commit
from the branch after local packaging; deploy that exact commit. The branch is
limited to this investigation and preserves both unrelated original checkouts.

- Prepared query transactions disable JIT locally; commit/rollback restores the
  connection setting. Company on/off/on plans establish the measured cause.
- Prepared report requests reuse an immutable publication projection while keeping
  tenant/policy context, live revision guards, result ownership and final verification.
- Native Review/Business snapshots use accepted complete populations and exact
  decimal aggregation. This fixes the independently proven extra-customer and
  floating-point defects rather than making prepared results copy an old bug.
- Full-report acceptance derives its expected reporting dates from the registered
  2025–2026 window. Only coverage bounds and release reporting period are projected.
  Values, identities, order, nulls, labels, source cutoffs, snapshot anchors, source
  IDs and certifications remain exact. Native diffs are emitted separately.

Company JIT-off diagnostic timings (installed old code; no persistent settings changed):
debt first/repeat 1334.371 / 1146.844 ms versus baseline 19249.347 ms; product
900.176 / 829.578 ms versus 977.670 ms, exact product results. All five checked
prepared debt totals and all 2214 customer rows match accepted controls. The old
baseline retains 1546 extra customers. Candidate timing against the corrected
baseline and all 27 reports is not yet accepted.

Product-source verification: all required gates and builds passed, including the
full 353-test PostgreSQL suite. The final regular suite passed 949 tests. Later changes are acceptance tooling and tests: four
reference/runner unit tests and three actual PostgreSQL window/snapshot tests pass.
The latter demonstrate that a native publication cutoff differing from a selected
opening-source cutoff remains a failure; the date projection does not hide it.
The exact product source is unchanged since the 353-test run.

## Authorized rollout sequence

Execute only after explicit release authorization. Publish the candidate branch
and a reviewable PR, with CI skipped as previously requested. No merge is required
for this candidate deployment; do not merge without explicit authorization.
Use a clean checkout of the exact reviewed candidate commit and the existing
protected configuration. Do not reset or clean a dirty company checkout. Preserve
the original deployed image tags for recovery.

Company preconditions: expected currently running API/web images from the old
release above; schema 060; tenant `el-dabboos-iq`; database
`el_dabboos_analytics_staging`; existing database network
`dabboos-analytics-mart_default`. Verify free disk before building, since the last
reported free space was only about 5.59 GiB; do not prune images or data on an
assumption. The deployment script builds while the old service is available, then
uses the shared maintenance lock, runs migration/role verification and restarts
API/web with health checks. There are no new migrations in this candidate.

```bash
# In the clean reviewed company checkout, after verifying its exact candidate SHA:
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
bash infra/staging/deploy.sh
```

Check API readiness, web running state and actual HTTP response. The web container
has no Docker healthcheck; do not invent one. Confirm the deployed API image tag
is exactly the candidate SHA. Do not print protected env contents or credentials.

## Same-data full report acceptance

The [durable acceptance runner](maintenance/prepared-company-acceptance-2026-10-19.sh)
is self-contained and starts a systemd unit, preserving its log across shell
disconnection. It expects the deployed candidate SHA as its only argument:

```bash
bash docs/qa/maintenance/prepared-company-acceptance-2026-10-19.sh REVIEWED_CANDIDATE_SHA
```

It checks the image, acquires the maintenance lock, verifies read-only runtime
identity, pins sealed inactive revision `6eb4a954-7437-4774-98f2-dae23d60bd81`,
154 bindings and exactly 27 supported reports. It refuses an altered registered
window. SQL stays capped at 15 seconds, pool/concurrency at eight, worker at ten
minutes and host service at sixteen minutes. Prepared raw-history access is blocked.
Every report must return exact expected results, remain stable, have successful
pinned series and satisfy first ≤ 5 s / repeat ≤ 3 s AND both no slower than the
same report through the corrected native baseline. Original native differences
remain in the log alongside the registered-window comparison. All four existing
boundary/policy checks must pass. Nothing is activated by the runner.

If the pinned revision changed, stop and reconcile the new publication; do not
rebuild or silently change the pin. If a report fails, use its exact categorized
difference or timing to repair it; do not relax gates or exclude provenance.

## Activation and actual user reports

The user explicitly authorized enabling prepared serving on 19 October. The
enablement job may activate automatically only after the strict full-catalog
receipt passes for that same current revision and deployed reader. Verify the same image/revision/window and zero history attempts again
under the shared maintenance lock. Use the existing `activate-prepared` operator
command, not manual SQL or another preparation run. Existing finite bounds from
company preparation are max cells 1000000 and max chunks 256. The activation
command validates operator identity and the same trusted revision before its
atomic insert; no backfill or migration runs as a side effect.

Then verify authenticated HTTP/browser reports in English and Arabic, including
debt, product invoices, executive/history views, customer restrictions, date
filters and refresh. Confirm the normal API selected the prepared repository and
that displayed source cutoffs remain truthful. This is the step that makes the
prepared speed benefit available to actual report users; memory-only executor
QA is not browser evidence.

If API/web deployment health fails, recover the previously recorded image tags
using the existing compose configuration only after confirming schema compatibility
(schema remains 060). Preserve logs and avoid data changes. If catalog QA fails
while API/web are healthy, leave prepared serving inactive; acceptance cannot
trigger activation. Once activation occurs, recovery must use the governed
operator/database lifecycle, not an ad hoc activation-row deletion.

Hourly current Finance/Collections/Business and nightly historical corrections
remain unfinished work. Source freshness, browser latency and concurrent-user
acceptance must be recorded separately; this release must not be described as
complete ongoing-freshness delivery.
