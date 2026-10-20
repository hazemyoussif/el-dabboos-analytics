# Operational dependency release — 20 October 2026

Status: company deployment pending. Local rehearsal passed; remote publication
is reported with delivery. This is not permission to retry company sync. GitHub
CI remains disabled by owner instruction.

## Scope and evidence

Branch: `codex/bounded-ingestion-overlap`, based on
`0aaaa731192758a2fa65593d216aa59866c0f70a`.
Release code: `2edef2993c90d69feec3a34a9270a5b30a59fe02`. Do not use the base
SHA as this release's image tag. Later handoff-only commits do not change the
tested production tree or the pinned release image.

- Execute each source object query once, using bounded transaction-scoped cursor
  fetches in the existing retained read-only snapshot.
- Track receivable identities and previous/current effective dates. After complete
  initialization, recheck only cutoffs affected by those dates.
- Track mapped lookup content separately from modification timestamps. After
  complete initialization, timestamp-only changes do not fan out document reads;
  actual names/assignments and independent header edits remain discoverable.
- Reuse prior partial-day partitions only with both immutable exact proofs. Keep
  all new-partition database exactness and publication guards.

Migrations **062 then 063** create empty, ingestor-only forced-RLS metadata tables
and guarded checkpoints. Migration 063 shares the successful audit/cursor guard
without breaking migration 062's trigger identity. Neither migration extracts
source records or populates these caches. Runtime has no cache privileges.
Facts, publication, audit, successful cursor and dependency evidence still commit
atomically; failure preserves previous accepted state. Source deadlines, statement
limits, systemd deadlines, exact controls and company filters remain unchanged.
No web, semantic metric, credential or company configuration changes are included.

Approved focused synthetic evidence, reused without rerunning:

- Four aggregate-proof safety checks passed.
- Six cursor/source checks and six receivable dependency checks passed.
- Nine lookup checks passed; the cursor/receivable checks also passed alongside
  the lookup implementation. Tests use disposable databases, not developer envs.
- The single approved local refresh measurement completed **13 months / 178,249
  active facts / 364 dates in 70.994 seconds**, then rolled back. Trusted revision
  and partition count were unchanged. See [stage costs and limits](local-refresh-measurement-2026-10-20.md).
- Frozen-lockfile installation, full lint, full typecheck, API/web production
  builds, architecture, baseline-aware quality and diff checks passed. The web
  build retains its large-chunk warning. Full-suite results follow below.

After explicit owner approval, both complete suites ran once against code commit
`2edef2993c90d69feec3a34a9270a5b30a59fe02`: **973 regular tests passed** in
65.808 seconds and **411 PostgreSQL tests passed** in 700.334 seconds, with zero
failures, cancellations or skips. PostgreSQL used the isolated synthetic container
on port 55436. No developer env file, company source or GitHub CI was used. These
results complete the local pre-push gates; they do not establish company runtime.
The Docker build uses a clean archive of the tested commit.
The unrelated uncommitted performance fixture experiment is excluded.

## Limits that must survive delivery

The first sync must initialize both caches and catch up document history. That
initial cost is unmeasured. The local refresh run excludes source discovery,
initialization, revision persistence, comparison and prepared publication. It has
no before/after baseline. Company coverage is 29 months and its history/storage
are different; this result cannot establish company runtime or a speedup.
Timestamp polling still cannot promise detection of hard lookup deletions or
changes without reliable modification timestamps. Existing sweep controls remain;
a source change log or governed catch-up is needed for those cases.
Business-family automatic refresh and remaining command-measure publication are
separate work. Do not report the dashboard's company rollout as complete.

## Deployment order after release verification

1. Local rehearsal completed for code `2edef29`: API Docker build from a clean
   archive, coordinated control/mart backups, migrations 062/063, operator role/
   schema verification and API replacement all passed. HTTPS readiness returned
   ready with persistence/analytics available. Web `6caf30e` was retained. No source
   sync, browser QA or dependency initialization was run. Local backup is
   `/home/hazem/.config/el-dabboos-local-staging/backups/dependencies-2edef29-20261020T185455Z`;
   checksums and readable archive inventories were saved, not restore-rehearsed.
2. Supply the verified merged SHA for the user to deploy on the company host.
   Preserve current web `6caf30e` and the existing protected configuration.
3. Keep both company timers paused and confirm no running sync/daily job. Use the
   shared maintenance lock, existing mounted backup disk and coordinated backup
   procedure from the [company rollout](sales-command-center-company-rollout-2026-10-20.md).
   A prior archive inventory/checksum is not a new restore rehearsal. Review free
   space before building and before migration; the old 2 GiB stop threshold does
   not establish enough space for initialization or a full sync.
4. Build only the API. Under the maintenance lock, stop the API/web writers for
   backup, record current image identities, take the coordinated control/mart
   backup, then run `operator migrate` followed by `operator verify`. The migrator
   applies 062 before 063 and checks immutable migration history. Do not use the
   historical code-only command, whose migration guard intentionally rejects this
   release. No bootstrap, provisioning or Business exposure is required.
5. Start the new API and retained web artifact, verify readiness, then leave source
   jobs and timers paused. Failed migration or readiness requires inspection; do
   not automatically retry or launch sync. A matching code/schema ledger is needed
   for recovery; do not blindly start an old image after migration.
6. Review application deployment evidence and remaining capacity before separately
   authorizing one initial sync. Preserve its journal/result. No retry loop or
   larger deadline is part of this release. The dependency checkpoints advance
   only with complete initialization and successful publication/audit/cursor.
7. After a successful exact sync, use the existing fresh schedule gate before
   restoring timers. The services resolve the deployed API image automatically;
   no image-pin timer change is required. Their workload still excludes automatic
   Business-family refresh.

## Company application deployment command

Use only after delivery confirms the local rehearsal and remote publication. The
user runs this on the company host. It builds only the API, takes fresh coordinated
backups on the existing mounted disk, applies 062/063, checks roles/readiness and
retains the web image. The historical 2 GiB reserve is a stop threshold, not a claim
that source initialization will fit. It does not start source work or timers.
Backup failure before migration leaves stopped old containers, which can be
resumed with `docker start el-dabboos-staging-api-1 el-dabboos-staging-web-1`.
After migration starts, inspect failures and use reviewed recovery; do not blindly
resume old code against a newer schema ledger. Checksums and archive inventories
do not replace a restore rehearsal.

```bash
export OPERATIONAL_DEPENDENCY_RELEASE=2edef2993c90d69feec3a34a9270a5b30a59fe02
export OPERATIONAL_DEPENDENCY_BACKUP_ROOT=/mnt/HC_Volume_107192875
(
set -euo pipefail
cd /opt/el-dabboos/analytics
for unit in el-dabboos-analytics-sync.timer el-dabboos-analytics-daily.timer; do
 test "$(systemctl show "$unit" -p ActiveState --value)" = inactive
done
for job in sync daily; do
 state=$(systemctl show "el-dabboos-analytics@$job.service" -p ActiveState --value)
 case "$state" in inactive|failed) ;; *) printf 'Analytics job is still running: %s\n' "$job" >&2; exit 1 ;; esac
done
: "${OPERATIONAL_DEPENDENCY_RELEASE:?Set the exact reviewed merged SHA from delivery}"
: "${OPERATIONAL_DEPENDENCY_BACKUP_ROOT:?Set the verified existing backup mount point}"
[[ "$OPERATIONAL_DEPENDENCY_BACKUP_ROOT" = /* ]]
mountpoint -q "$OPERATIONAL_DEPENDENCY_BACKUP_ROOT"
root_device=$(findmnt -n -o MAJ:MIN --target /)
backup_device=$(findmnt -n -o MAJ:MIN --target "$OPERATIONAL_DEPENDENCY_BACKUP_ROOT")
test "$backup_device" != "$root_device"
[[ "$OPERATIONAL_DEPENDENCY_RELEASE" =~ ^[0-9a-f]{40}$ ]]
test -z "$(git status --porcelain --untracked-files=all)"
for file in staging-runtime.env staging-operator.env; do
 test "$(stat -c '%a:%U' "/opt/el-dabboos/secrets/$file")" = 600:root
done
reserve_bytes=2147483648
check_reserve() {
 local available location
 for location in /var/lib/docker /opt/el-dabboos/state "$OPERATIONAL_DEPENDENCY_BACKUP_ROOT"; do
  available=$(df --output=avail -B1 "$location" | tail -n 1 | tr -d ' ')
  [[ "$available" =~ ^[0-9]+$ ]] && (( available >= reserve_bytes )) || return 1
 done
}
check_reserve
git fetch origin main
git merge --ff-only "$OPERATIONAL_DEPENDENCY_RELEASE"
test "$(git rev-parse HEAD)" = "$OPERATIONAL_DEPENDENCY_RELEASE"
expected_migrations=$'packages/data/migrations/postgres/062_receivable_dependencies.sql\npackages/data/migrations/postgres/063_lookup_dependencies.sql'
test "$(git diff --name-only 0aaaa731192758a2fa65593d216aa59866c0f70a HEAD -- packages/data/migrations)" = "$expected_migrations"
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
export STAGING_API_IMAGE="el-dabboos-api:$OPERATIONAL_DEPENDENCY_RELEASE"
export STAGING_WEB_IMAGE=$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-web-1)
[[ "$STAGING_WEB_IMAGE" =~ ^el-dabboos-web:[0-9a-f]{40}$ ]]
compose() { docker compose -f infra/staging/compose.yml "$@"; }
compose build api
check_reserve
source infra/staging/analytics-lock.sh
acquire_analytics_lock wait 300
umask 077
backup_dir="$OPERATIONAL_DEPENDENCY_BACKUP_ROOT/el-dabboos-backups/dependencies-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
docker inspect --format '{{.Config.Image}} {{.Image}}' el-dabboos-staging-api-1 el-dabboos-staging-web-1 > "$backup_dir/previous-images.txt"
backup_identity=$(docker exec dabboos-analytics-mart-postgres-1 sh -c 'psql -X -At -U "$POSTGRES_USER" -d postgres -c "SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user"')
test "$backup_identity" = t
compose stop web api
for database in el_dabboos_control_staging el_dabboos_analytics_staging; do
 available=$(df --output=avail -B1 "$backup_dir" | tail -n 1 | tr -d ' ')
 [[ "$available" =~ ^[0-9]+$ ]] && (( available > reserve_bytes ))
 backup_limit=$((available-reserve_bytes))
 # pipefail stops on a truncated dump; the archive stays .partial and migration cannot start.
 docker exec dabboos-analytics-mart-postgres-1 sh -c 'exec pg_dump -U "$POSTGRES_USER" --format=custom "$1"' sh "$database" | head -c "$backup_limit" > "$backup_dir/$database.dump.partial"
 mv "$backup_dir/$database.dump.partial" "$backup_dir/$database.dump"
 docker exec -i dabboos-analytics-mart-postgres-1 pg_restore --list < "$backup_dir/$database.dump" > "$backup_dir/$database.contents"
 test -s "$backup_dir/$database.contents"
 check_reserve
done
sha256sum "$backup_dir"/*.dump > "$backup_dir/SHA256SUMS"
printf 'Backup checksums and archive inventories saved: %s\n' "$backup_dir"
compose run --rm --no-deps operator migrate
compose run --rm --no-deps operator verify
compose up -d --wait --no-deps api web
docker exec el-dabboos-staging-api-1 node -e "fetch('http://127.0.0.1:3001/health/ready').then(async r=>{console.log('Readiness',r.status);process.exit(r.ok?0:1)})"
curl --fail --silent --show-error --max-time 10 --output /dev/null http://127.0.0.1:8088/
printf 'Dependency API deployment healthy: %s. Source exposure and timer changes were not performed.\n' "$OPERATIONAL_DEPENDENCY_RELEASE"
systemctl list-timers --all 'el-dabboos-analytics-*' --no-pager
)
```

Stop after application readiness and review the result. Initial source sync needs
separate review because cache initialization cost remains unmeasured. No company
sync/retry command or automatic timer activation is included here.
