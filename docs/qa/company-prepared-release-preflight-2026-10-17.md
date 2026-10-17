# Company prepared-release preflight — 17 October 2026

Run this read-only block in the existing company terminal before publishing or deploying the prepared-serving candidate. It captures the installed release, protected-file permissions, timer state, free storage and tenant-scoped publication coverage. Database relation sizes/statistics are physical all-tenant/history estimates, not prepared-output cardinalities. No credential contents, customer values or source connection are printed. It does not install, build, migrate, prepare, activate, change timers, contact Odoo or run CI. The analytics identity is the existing deployed read-only runtime role; the intended database is checked. Each database statement has a 10-second limit and the database process has a 45-second overall bound.

```bash
(
set -e
cd /opt/el-dabboos/analytics
git rev-parse HEAD
git status --porcelain
docker inspect --format '{{.Name}} {{.Config.Image}} {{.State.Status}}' el-dabboos-staging-api-1 el-dabboos-staging-web-1
df -B1 / /var/lib/docker
systemctl list-timers --all 'el-dabboos-analytics-*' --no-pager
systemctl show el-dabboos-analytics@sync.service el-dabboos-analytics@daily.service --property=Id,ActiveState,SubState,Result,ExecMainStartTimestamp,ExecMainExitTimestamp --no-pager
for file in staging-runtime.env staging-operator.env odoo-source.env staging-jobs.env; do
  if test -f "/opt/el-dabboos/secrets/$file"; then
    stat -c '%n mode=%a owner=%U' "/opt/el-dabboos/secrets/$file"
  else
    printf 'Missing protected file: %s\n' "$file"
  fi
done
docker exec -i el-dabboos-staging-api-1 node --input-type=module <<'JS'
import{createRequire}from'node:module';
const{Pool}=createRequire('/workspace/packages/data/package.json')('pg');
const target=new URL(process.env.MART_RUNTIME_URL);
if(target.hostname!=='postgres'||target.pathname!=='/el_dabboos_analytics_staging')throw Error('Unexpected intended analytics database');
const pool=new Pool({connectionString:target.toString(),max:1,connectionTimeoutMillis:5000,options:'-c default_transaction_read_only=on -c statement_timeout=10000 -c lock_timeout=2000'});
let client;const deadline=setTimeout(()=>{console.log(JSON.stringify({diagnostic:'Read-only preflight overall deadline reached'}));process.exit(1);},45000);
try{
client=await pool.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
await client.query("SELECT set_config('mart.tenant_id','el-dabboos-iq',true)");
const identity=(await client.query("SELECT current_database() database,current_setting('transaction_read_only') read_only,rolsuper OR rolbypassrls bypass,pg_has_role(current_user,'dabboos_runtime','MEMBER') runtime FROM pg_roles WHERE rolname=current_user")).rows[0];
if(identity.database!=='el_dabboos_analytics_staging'||identity.read_only!=='on'||identity.bypass||!identity.runtime)throw Error('Unexpected analytics identity');
console.log(JSON.stringify({diagnostic:'Analytics metadata only; no source connection, writes or ANALYZE',...identity}));
const publication=(await client.query("SELECT trusted.revision_id,(SELECT count(*)::int FROM mart.analytics_serving_members member WHERE member.tenant_id=trusted.tenant_id AND member.revision_id=trusted.revision_id) members FROM mart.analytics_trusted_serving trusted WHERE tenant_id='el-dabboos-iq'")).rows[0];
console.log(JSON.stringify({publication}));
const coverage=(await client.query("SELECT member.family,count(*)::int members,min(member.month)::text first_month,max(member.month)::text last_month FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id) WHERE trusted.tenant_id='el-dabboos-iq' GROUP BY member.family ORDER BY member.family")).rows;
console.log(JSON.stringify({coverage}));
const relations=(await client.query("SELECT relname relation,reltuples::bigint::text estimated_rows,pg_table_size(oid)::text data_bytes,pg_indexes_size(oid)::text index_bytes,pg_total_relation_size(oid)::text total_bytes FROM pg_class WHERE relnamespace='mart'::regnamespace AND relkind='r' AND relname=ANY($1::text[]) ORDER BY relname",[['review_facts','review_controls','analytics_fact_revisions','analytics_aggregate_bases','finance_snapshot_customers','prepared_cells','prepared_datasets','prepared_bindings']])).rows;
console.log(JSON.stringify({diagnostic:'Physical relation estimates include all tenants and immutable history; not an output-size guarantee',relations}));
console.log(JSON.stringify((await client.query("SELECT pg_database_size(current_database())::text database_bytes,to_regclass('mart.prepared_activation') IS NOT NULL prepared_schema_present")).rows[0]));
await client.query('COMMIT');
}catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});console.log(JSON.stringify({diagnostic:'Preflight stopped; no changes; sensitive details withheld',code:error.code??null}));process.exitCode=1;}
finally{clearTimeout(deadline);if(client)client.release(true);await pool.end();}
JS
)
```

## Release gates

The laptop candidate is active with 43 chunks/1,833,541 cells and 1,789 MiB prepared storage. This does not establish company storage, first-preparation duration or serving latency. Do not extrapolate it as a production SLA. Company rollout must retain the existing reader until the company revision is fully prepared, source-controlled and verified. Never roll back applied schema history or delete immutable evidence to make room.

Existing sync/daily timers follow the healthy deployed image, verify schema/roles and share the maintenance lock with deployment. They currently cover operational sync/reconciliation/sweep. The prepared publication hook prevents an activated revision publishing before its prepared coverage is complete, but does not refresh exact Finance, review or business source evidence. Those source-refresh schedules are still an implementation gate. Do not schedule the existing monthly exposure repeatedly: it can duplicate unchanged immutable populations. Add complete population equality/reuse and explicit correction/dependency coverage before recurring exposure. A successful facts sync must not mark other families fresh.

A migration/deployment must preflight the expected schema and retain the same protected identities. Schedule verification must be rerun using the newly deployed image; no schedule may bypass incomplete prepared coverage or recreate data during a dashboard request. Source controls, current-only snapshot semantics and independently labelled per-family freshness remain required.
