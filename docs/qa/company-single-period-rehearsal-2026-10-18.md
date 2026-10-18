# One-period prepared-data rehearsal — existing pipeline

Status: prepared for review, **not executed on company staging**. Requires the reviewed candidate image and forward migration 057 to be deployed through the normal approved staging workflow first. It deliberately refuses the current unpatched release. Publishing/deployment still requires the user's approval.

This is the existing guarded runner restricted to the failed May 2025 Business-event chunk, calling the same tested `prepareChunk`. The transaction is rolled back after successful exact validation. No new checkpoint, revision seal or activation is committed. Prior checkpoints and source/native data remain intact. Rollback still generates temporary work, IO and WAL; it is not a read-only query.

The exact frozen revision, original manifest fingerprint, candidate source hashes, updated trigger fingerprint, database and protected ingestor role are checked. A changed publication or an already-prepared May chunk stops the rehearsal instead of silently substituting another selection. Timers keep their definitions; their workers skip the existing shared maintenance lock while held.

All earlier limits remain: 18 GiB free at start, 12 GiB disk stop, two-hour runner limit, 120-second SQL statements, five-second lock timeout, one-million-cell/population bounds. No full-history retry, deadline increase, source refresh, grain change or schema operation occurs inside this runner. The systemd unit survives terminal disconnection. Logs contain stage durations and counts only.

After the approved deployment, set `PREPARED_CANDIDATE_API_IMAGE` to the exact deployed API image tag, then run the block. Do not set it to an unreviewed image.

```bash
(
set -e
: "${PREPARED_CANDIDATE_API_IMAGE:?Set the approved deployed candidate API image}"
umask 077
prepared_run_dir="/opt/el-dabboos/state/el-dabboos-prepared-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$prepared_run_dir"
cat > "$prepared_run_dir/run.sh" <<'PREPARED_RUNNER'
#!/usr/bin/env bash
set -euo pipefail
umask 077
cd /opt/el-dabboos/analytics
prepared_run_dir=${1:?Pass the private run directory}
prepared_job=$(basename "$prepared_run_dir")
[[ "$prepared_job" =~ ^el-dabboos-prepared-[0-9TZ]+$ ]] || exit 2
prepared_log="$prepared_run_dir/preparation.log"
prepared_expected=${PREPARED_CANDIDATE_API_IMAGE:?Set the approved deployed candidate API image}
prepared_deployed=$(docker inspect --format '{{.Config.Image}} {{.Image}} {{.State.Status}} {{.State.Health.Status}}' el-dabboos-staging-api-1)
read -r prepared_image prepared_digest prepared_state prepared_health prepared_extra <<< "$prepared_deployed"
[[ "$prepared_image" == "$prepared_expected" && "$prepared_digest" =~ ^sha256:[0-9a-f]{64}$ && "$prepared_state" == running && "$prepared_health" == healthy && -z "$prepared_extra" ]] || exit 2
[[ $(stat -c '%a:%U' /opt/el-dabboos/secrets/staging-operator.env) == 600:root ]] || exit 2
source infra/staging/analytics-lock.sh
acquire_analytics_lock wait 300
prepared_free(){ df --output=avail -B1 /var/lib/docker | tail -n 1 | tr -d ' '; }
prepared_available=$(prepared_free)
[[ "$prepared_available" =~ ^[0-9]+$ && "$prepared_available" -ge 19327352832 ]] || { echo 'Less than 18 GiB free; stopped before preparation.'; exit 2; }
prepared_worker=''
prepared_cleanup(){
 if [[ -n "$prepared_worker" ]] && kill -0 "$prepared_worker" 2>/dev/null; then
  docker kill --signal TERM "$prepared_job" >/dev/null 2>&1 || true
  # The owned Node signal handler terminates only its own named PostgreSQL backend.
  wait "$prepared_worker" || true
 fi
}
trap prepared_cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
printf 'Preparation log: %s\nInitial free bytes: %s\n' "$prepared_log" "$prepared_available"
prepared_started=$SECONDS
prepared_stopped=0
docker run --rm --pull never -i --name "$prepared_job" \
 --label el-dabboos.staging.analytics-job=true \
 --network dabboos-analytics-mart_default \
 --env-file /opt/el-dabboos/secrets/staging-operator.env \
 -e ENVIRONMENT=staging -e PREPARED_JOB_NAME="$prepared_job" \
 --read-only --tmpfs /tmp --entrypoint node "$prepared_digest" \
 --experimental-transform-types --disable-warning=ExperimentalWarning --input-type=module > "$prepared_log" 2>&1 <<'PREPARED_NODE' &
import {createRequire} from 'node:module';
import {prepareChunk,requiredPreparedChunks} from './packages/data/src/prepared/preparation.ts';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {Pool}=createRequire(process.cwd()+'/packages/data/package.json')('pg');
const tenant='el-dabboos-iq',database='el_dabboos_analytics_staging';
const url=new URL(process.env.MART_INGESTOR_URL);
if(url.hostname!=='postgres'||url.pathname!=='/'+database)throw new Error('Unexpected preparation target');
const job=process.env.PREPARED_JOB_NAME;
if(!/^el-dabboos-prepared-[0-9TZ]+$/.test(job??''))throw new Error('Explicit owned job identity required');
url.searchParams.set('application_name',job);
const pool=new Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:5000});
const monitorUrl=new URL(url);monitorUrl.searchParams.set('application_name',job+'-guard');
const guard=new Pool({connectionString:monitorUrl.toString(),max:1,connectionTimeoutMillis:5000,options:'-c default_transaction_read_only=on -c statement_timeout=5000'});
let client;
let stopping=false,cancellation;
const connectionFailed=()=>{stopping=true;process.exitCode=1;};
for(const owned of [pool,guard]){owned.on('error',connectionFailed);owned.on('connect',client=>client.on('error',connectionFailed));}
function stop(){
 if(stopping)return;stopping=true;
 cancellation=guard.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND datname=current_database() AND usename=current_user AND application_name=$1",[job]).catch(()=>{process.exitCode=1;});
}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
const expectedSources={"packages/data/src/prepared/preparation.ts":"a76c3107c9e8f6ba16cbaa977d7f181bfd93841a315268ae291ea431059a7330","packages/data/src/prepared/workspace.ts":"559a47f2f444e494d60980b2d59dcf148d917049a59b5d73e526a5a7b22a404a","packages/data/src/prepared/diagnostics.ts":"46184909dc9687af50432a20e86316ba55fc96c966e228ccbfc81d544aa09fe9"};
async function manifest(){
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{
  await client.query("SELECT set_config('mart.tenant_id',$1,true),set_config('statement_timeout','120000',true)",[tenant]);
  const identity=(await client.query("SELECT current_database() database,(SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') FROM pg_proc WHERE oid='mart.prepared_required_chunks(text,text)'::regprocedure) discovery_hash,(SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') FROM pg_proc WHERE oid='mart.guard_prepared_binding()'::regprocedure) guard_hash,pg_has_role(current_user,'dabboos_ingestor','MEMBER') ingestor,rolsuper OR rolbypassrls bypass FROM pg_roles WHERE rolname=current_user")).rows[0];
  if(identity.database!==database||identity.discovery_hash!=='84539ec45c2a39b1a43e78d1ff82d7d131e4c487416c9079c58e6edfb4815158'||identity.guard_hash!=='2be00ae1f2516e9f33ba9b1106a55fce7cc51021e5fe9813512ed1bd322f59f7'||!identity.ingestor||identity.bypass)throw new Error('Unexpected preparation identity/schema');
  const row=(await client.query(`SELECT trusted.revision_id,count(*)::int members,
   encode(sha256(convert_to(string_agg(member.family||':'||member.month::text||':'||member.partition_id,',' ORDER BY member.family,member.month),'UTF8')),'hex') fingerprint,
   EXISTS(SELECT 1 FROM mart.prepared_activation WHERE tenant_id=$1) activated
   FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
   WHERE trusted.tenant_id=$1 GROUP BY trusted.revision_id`,[tenant])).rows[0];
  if(!row||row.activated)throw new Error('Expected established, inactive prepared publication');
  await client.query('COMMIT');return row;
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
}
let locked=false;
try{
 client=await pool.connect();
 for(const [path,expected] of Object.entries(expectedSources)){
  if(createHash('sha256').update(await readFile(path)).digest('hex')!==expected)throw new Error('Candidate source mismatch');
 }
 const lock=await client.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) locked',[`analytics:${tenant}`]);
 locked=Boolean(lock.rows[0]?.locked);if(!locked)throw new Error('Tenant writer busy');
 const before=await manifest();
 if(before.revision_id!=='5f9efbc7-5ff4-4e60-8557-295f23b1f341'||before.members!==114||before.fingerprint!=='e993c188dcf00592b36a8116762f00b3fcd9dae40be9dd5ef9c42100c487319f')throw new Error('Input publication changed');
 console.log(JSON.stringify({stage:'Single-period rehearsal input frozen; no Odoo access',...before,period:'2025-05',mode:'rollback',statementBoundMs:120000}));
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
 await client.query("SELECT set_config('mart.tenant_id',$1,true),set_config('statement_timeout','120000',true),set_config('lock_timeout','5000',true)",[tenant]);
 const scope={tenantId:tenant,revisionId:before.revision_id,observeStep:event=>{console.log(JSON.stringify({stage:'preparation step',...event}));if(stopping)throw new Error('Stopped');}};
 const bounds={maxCellsPerChunk:1000000,maxChunks:256};
 const chunks=await requiredPreparedChunks(client,scope,bounds);
 const chunk=chunks.find(chunk=>chunk.family==='business'&&chunk.kind==='event'&&chunk.period==='2025-05-01'&&chunk.through==='2025-05-31');
 if(!chunk)throw new Error('Expected failed period absent');
 const existing=await client.query("SELECT 1 FROM mart.prepared_bindings WHERE tenant_id=$1 AND revision_id=$2 AND family='business' AND kind='event' AND period='2025-05-01'",[tenant,before.revision_id]);
 if(existing.rowCount)throw new Error('Period already prepared; no new measurement');
 const started=performance.now();
 const result=await prepareChunk(client,scope,chunk,bounds);
 if(stopping)throw new Error('Stopped');
 await client.query('ROLLBACK');
 const elapsedMs=performance.now()-started;
 const after=await manifest();
 if(before.revision_id!==after.revision_id||before.fingerprint!==after.fingerprint)throw new Error('Input publication changed');
 console.log(JSON.stringify({stage:'Single-period rehearsal complete; ROLLED BACK; NOT activated',...result,elapsedMs,originalManifestUnchanged:true}));
}catch(error){
 if(client)await client.query('ROLLBACK').catch(()=>{});
 console.error(JSON.stringify({stage:'Single-period rehearsal stopped; rollback requested; no activation',code:typeof error.code==='string'&&/^[A-Z0-9_]+$/.test(error.code)?error.code:'REHEARSAL_FAILED'}));process.exitCode=1;
}finally{
 if(cancellation)await cancellation;
 if(locked&&client)await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[`analytics:${tenant}`]).catch(()=>{});
 if(client)client.release(true);
 await Promise.all([pool.end(),guard.end()]);
}

PREPARED_NODE
prepared_worker=$!
while kill -0 "$prepared_worker" 2>/dev/null; do
 sleep 2
 prepared_available=$(prepared_free)
 if [[ ! "$prepared_available" =~ ^[0-9]+$ ]] || ((prepared_available<12884901888 || SECONDS-prepared_started>=7200)); then
  printf 'Guard stop: free_bytes=%s elapsed_seconds=%s\n' "$prepared_available" "$((SECONDS-prepared_started))" | tee -a "$prepared_log"
  prepared_stopped=1
  docker kill --signal TERM "$prepared_job" >/dev/null 2>&1 || true
  break
 fi
done
prepared_status=0
wait "$prepared_worker" || prepared_status=$?
prepared_worker=''
if ! grep -Fq '"stage":"Single-period rehearsal complete; ROLLED BACK; NOT activated"' "$prepared_log"; then prepared_status=1; fi
tail -n 8 "$prepared_log"
df -B1 /
if ((prepared_stopped!=0 || prepared_status!=0)); then
 echo 'Rehearsal stopped; no new chunk was committed. Inspect the log before any retry.'
 exit 1
fi
echo 'Single-period rehearsal finished and rolled back. No activation performed.'
PREPARED_RUNNER
chmod 700 "$prepared_run_dir/run.sh"
systemd-run --unit="$(basename "$prepared_run_dir")" --collect \
 --property=RuntimeMaxSec=7500 --property=TimeoutStopSec=180 \
 --setenv="PREPARED_CANDIDATE_API_IMAGE=$PREPARED_CANDIDATE_API_IMAGE" \
 /bin/bash "$prepared_run_dir/run.sh" "$prepared_run_dir"
printf '\nLog: %s/preparation.log\nUnit: %s\n' "$prepared_run_dir" "$(basename "$prepared_run_dir")"
)
```

Success requires the final `Single-period rehearsal complete; ROLLED BACK; NOT activated` marker. Preserve the log for stage-budget review. This one-period result cannot establish all-family storage capacity, refresh throughput or dashboard latency.
