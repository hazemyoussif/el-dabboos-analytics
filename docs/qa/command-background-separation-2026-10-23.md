# Independent sync and Command background preparation

Base: `204271b5b48007595bc7cc8239d6ca3eea2dbe9f`, branch `codex/bounded-ingestion-overlap`. This release separates ordinary sync from Command preparation; no company deployment is represented here.

## Implemented

Ordinary operational sync no longer calls Command refresh or initialization before starting its existing lifecycle. Its response identifies Business work as background managed; its operational cursor does not certify Business freshness. An explicit allocation sweep is routed by the CLI to the background path.

The independent worker captures one missing registered recipe under a live read-only source snapshot, commits private pages, and seals complete source evidence against independent controls. An interrupted unsealed capture is abandoned. A sealed capture resumes without source resolution: canonical page replay, one prepared chunk, seal, then atomic publication. The API drains at most ten canonical replay pages within a ten-second budget, returning after source capture, prepared work, publication or idle. It never loops through 29 historical months in one invocation. Existing ordinary-sync/service deadlines are unchanged.

Current-period missing recipes precede historical gaps. Published Command measures retain scoped changed-root refresh for one initialized month per background unit, plus the separate allocation presence sweep. Dependencies have their own progress events. Scheduling checks do not replace metric observation clocks. An active sealed initialization finishes before a subsequent refresh or missing recipe is selected.

Accepted raw/prepared data remains serving until publication. Partial recipe coverage exposes only capabilities whose required operands are complete. Private source pages, canonical rows and prepared bindings/seals are hidden from runtime. Accepted sparse ancestors remain readable through their trusted roots. A same-Business-base publication reuses prepared and raw payloads, rebasing only metadata onto the latest other-family publication. A changed Business base rejects the candidate and records a conflict. The prior second-membership early-return bypass is closed.

## Verification

The owner approved focused synthetic PostgreSQL tests. On disposable PostgreSQL 18.6, the final five tests passed with zero skips (about 20 seconds):

```bash
PG_TEST_ADMIN_URL=<isolated foundation_test URL> node --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-concurrency=1 \
 packages/data/test/postgres/command-background-capture.test.ts \
 packages/data/test/postgres/command-background-new-month.test.ts \
 packages/data/test/postgres/command-background-rebase.test.ts \
 packages/data/test/postgres/command-sync-members.test.ts
```

Assertions include incomplete seal rejection, sealed append rejection, interrupted/unsealed abandonment, tenant isolation, offline replay across repeated invocations, hidden private canonical/prepared content, complete-only capabilities, a new month without a Business base, unchanged historical raw bytes, unrelated parent advance, atomic rollback and retry, retained unrelated membership, and rejection of a second membership after the Business base changes. The changed-base regression failed before migration 078 and passed afterward.

TypeScript (`pnpm exec tsc --noEmit`), lint for changed code/tests, architecture, quality and diff gates passed. Full application/PostgreSQL suites were not run; no previous full-suite result is claimed for these changes. No company data, source connection, browser rehearsal, Docker application rebuild or GitHub CI was used.

## Limits and rollout

Company performance remains unmeasured. Source capture still needs a live snapshot for that single recipe; pages from an expired source snapshot are not falsely resumed. Ordinary operational catch-up and the existing scoped Command delta publication retain their previous internal bounds. This correction removes historical initialization as a prerequisite; it does not prove their current company workload fits the service deadline. Initial allocation dependency inventory is explicit background work and must not be described as a completed or already measured step.

A release needs the new API image and migrations 077–081 together. Stop all three timers/jobs before migration, check both ordinary and background container labels, retain a coordinated backup on the separate mounted disk, run migration and staging verification, then replace the API while retaining the web image. Do not use a same-schema API-only rollout script. Only after successful deployment should ordinary sync and one background unit be started independently under supervision; enable their separate timers after observing their outcomes. The new timer file is `infra/staging/el-dabboos-analytics-command-background.timer`; the background service instance uses the existing template with `command-background`.

Deployment entry point: `docs/qa/maintenance/deploy-command-background-2026-10-23.sh`. It requires the previously deployed API image `el-dabboos-api:204271b5b48007595bc7cc8239d6ca3eea2dbe9f`, all timers/jobs paused, and the separate mounted backup volume. It builds only the API, backs up both databases, applies migrations, verifies staging roles/schema, retains the current web image, and installs the new timer without enabling or starting it. It does not run full role provisioning. Root must retain at least 2 GiB before and after the build; this reserve is a guard, not a measured workload-size guarantee.

On the company host, from a clean checkout fast-forwarded to the pinned release commit:

```bash
COMMAND_BACKGROUND_PREVIOUS_IMAGE=el-dabboos-api:204271b5b48007595bc7cc8239d6ca3eea2dbe9f \
COMMAND_BACKGROUND_BACKUP_ROOT=/mnt/HC_Volume_107192875 \
bash docs/qa/maintenance/deploy-command-background-2026-10-23.sh
```

No source jobs, company service/timer changes, company database writes or merge were performed while preparing this release. The deployment script is syntax-checked; its company execution remains pending.
