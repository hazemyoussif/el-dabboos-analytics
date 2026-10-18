# Complete snapshot: exact proof by accepted observation

Astra approved decomposing the canonical proof into its disjoint accepted
measure/date populations. The prior combined comparison timed out and must not
be repeated. The reference keeps every published membership and canonical field;
it does not acquire the candidate's month restriction. Every column and duplicate,
including accepted-empty markers, is compared using symmetric EXCEPT ALL.

Before executing any population, this block checks all 30 reference plans for
selective tenant/partition/measure index access. If any plan lacks that access,
it stops immediately. It does not change planner settings. It then compares each
observation sequentially in the same pinned repeatable-read/read-only transaction,
requires all 30 including the empty observation to pass, and measures the exact
candidate full population SELECT. Counts/timings/structural plans only are printed.

Fixed failed revision/cutoff; protected ingestor; 120-second statement and
260-second total bounds unchanged. No preparation, schema/data/permission/service/
timer changes, deployment, activation or Odoo access. This proves neither the old
path's timing nor full preparation completion. Full failed-cutoff rollback
preparation remains a later gate requiring the approved candidate deployment.

```bash
(
set -e
expected_image=el-dabboos-api:b09ec6d15872153dfe95a3fd04b48605ae217147
actual_image="$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-api-1)"
if test "$actual_image" != "$expected_image"; then printf 'Unexpected deployed image; stopped\n'; exit 1; fi
docker run --rm --read-only -i --pull never \
 --network dabboos-analytics-mart_default \
 --env-file /opt/el-dabboos/secrets/staging-operator.env \
 --entrypoint node "$expected_image" --input-type=module <<'SNAPSHOT_OBSERVATION_COMPARISON'
import {createRequire} from 'node:module';
const {Pool}=createRequire('/workspace/packages/data/package.json')('pg');
const statements={"referencePlan": "WITH observations AS MATERIALIZED (\n SELECT DISTINCT ON(measure_id) * FROM mart.prepared_snapshot_observations($1,$2,$3::jsonb->>'family')\n WHERE business_day<=($3::jsonb->>'through')::date ORDER BY measure_id,business_day DESC\n),empty_marker AS (\n SELECT measure_id,'snapshot'::text kind,business_day,NULL::text entity_id,0::numeric amount,'{}'::jsonb dimensions,'{}'::jsonb labels,0::bigint item_count\n FROM observations WHERE measure_id=$4 AND business_day=$5::date AND expected_count=0 AND expected_value=0\n) SELECT fact.* FROM mart.prepared_input_rows($1,$2,$3::jsonb->>'family') fact\n WHERE fact.kind='snapshot' AND fact.measure_id=$4 AND fact.business_day=$5::date\n UNION ALL SELECT * FROM empty_marker", "comparison": "WITH observations AS MATERIALIZED (\n SELECT DISTINCT ON(measure_id) * FROM mart.prepared_snapshot_observations($1,$2,$3::jsonb->>'family')\n WHERE business_day<=($3::jsonb->>'through')::date ORDER BY measure_id,business_day DESC\n),empty_marker AS (\n SELECT measure_id,'snapshot'::text kind,business_day,NULL::text entity_id,0::numeric amount,'{}'::jsonb dimensions,'{}'::jsonb labels,0::bigint item_count\n FROM observations WHERE measure_id=$4 AND business_day=$5::date AND expected_count=0 AND expected_value=0\n),reference AS MATERIALIZED (SELECT fact.* FROM mart.prepared_input_rows($1,$2,$3::jsonb->>'family') fact\n WHERE fact.kind='snapshot' AND fact.measure_id=$4 AND fact.business_day=$5::date\n UNION ALL SELECT * FROM empty_marker),candidate AS MATERIALIZED (SELECT fact.* FROM (\n WITH observations AS MATERIALIZED (\n  SELECT DISTINCT ON(measure_id) measure_id,business_day\n  FROM mart.prepared_snapshot_observations($1,$2,($3::jsonb->>'family'))\n  WHERE ($3::jsonb->>'family') IN ('review','business') AND business_day<=(($3::jsonb->>'through')::date)\n  ORDER BY measure_id,business_day DESC\n )\n SELECT fact.measure_id,fact.payload->>'kind',fact.business_day::date,fact.entity_id,fact.amount,fact.dimensions,coalesce(fact.display_labels,'{}'::jsonb),1::bigint\n FROM observations JOIN mart.analytics_serving_members member\n ON member.tenant_id=$1 AND member.revision_id=$2 AND member.family=($3::jsonb->>'family')\n AND member.month=date_trunc('month',observations.business_day)::date\n JOIN mart.review_facts fact ON fact.tenant_id=member.tenant_id AND fact.partition_id=member.partition_id\n AND fact.measure_id=observations.measure_id AND fact.business_day::date=observations.business_day\n WHERE fact.payload->>'kind'='snapshot'\n) fact(measure_id,kind,business_day,entity_id,amount,dimensions,labels,item_count) WHERE fact.measure_id=$4 AND fact.business_day=$5::date UNION ALL SELECT * FROM empty_marker),differences AS (\n (SELECT * FROM reference EXCEPT ALL SELECT * FROM candidate)\n UNION ALL (SELECT * FROM candidate EXCEPT ALL SELECT * FROM reference)\n) SELECT (SELECT count(*)::int FROM reference) reference_rows,(SELECT count(*)::int FROM candidate) candidate_rows,(SELECT count(*)::int FROM differences) mismatches", "candidate": "WITH source AS MATERIALIZED (\n  SELECT * FROM mart.prepared_work_input_rows($1,$2,$3::jsonb->>'family',$3::jsonb->>'kind',($3::jsonb->>'from')::date,($3::jsonb->>'through')::date) fact\n  WHERE NOT ($3::jsonb->>'family' IN ('review','business') AND $3::jsonb->>'kind'='snapshot' AND $3::jsonb->>'snapshotPopulation'='complete') AND fact.kind=$3::jsonb->>'kind' AND fact.business_day<=($3::jsonb->>'through')::date\n   AND (fact.kind='snapshot' OR fact.business_day>=($3::jsonb->>'from')::date)\n  UNION ALL SELECT * FROM (\n WITH observations AS MATERIALIZED (\n  SELECT DISTINCT ON(measure_id) measure_id,business_day\n  FROM mart.prepared_snapshot_observations($1,$2,($3::jsonb->>'family'))\n  WHERE ($3::jsonb->>'family') IN ('review','business') AND business_day<=(($3::jsonb->>'through')::date)\n  ORDER BY measure_id,business_day DESC\n )\n SELECT fact.measure_id,fact.payload->>'kind',fact.business_day::date,fact.entity_id,fact.amount,fact.dimensions,coalesce(fact.display_labels,'{}'::jsonb),1::bigint\n FROM observations JOIN mart.analytics_serving_members member\n ON member.tenant_id=$1 AND member.revision_id=$2 AND member.family=($3::jsonb->>'family')\n AND member.month=date_trunc('month',observations.business_day)::date\n JOIN mart.review_facts fact ON fact.tenant_id=member.tenant_id AND fact.partition_id=member.partition_id\n AND fact.measure_id=observations.measure_id AND fact.business_day::date=observations.business_day\n WHERE fact.payload->>'kind'='snapshot'\n) complete_snapshot\n  WHERE ($3::jsonb->>'family' IN ('review','business') AND $3::jsonb->>'kind'='snapshot' AND $3::jsonb->>'snapshotPopulation'='complete')\n ),observations AS (\n  SELECT DISTINCT ON(measure_id) * FROM mart.prepared_snapshot_observations($1,$2,$3::jsonb->>'family')\n  WHERE $3::jsonb->>'kind'='snapshot' AND business_day<=($3::jsonb->>'through')::date ORDER BY measure_id,business_day DESC\n ),latest AS (\n  SELECT DISTINCT ON(measure_id,entity_id) * FROM source WHERE kind='snapshot' AND $3::jsonb->>'snapshotPopulation'='delta'\n  ORDER BY measure_id,entity_id,business_day DESC\n ),population AS (\n  SELECT * FROM source WHERE kind='event'\n  UNION ALL SELECT * FROM latest\n  UNION ALL SELECT source.* FROM source JOIN observations USING(measure_id,business_day)\n   WHERE source.kind='snapshot' AND $3::jsonb->>'snapshotPopulation'='complete'\n  UNION ALL SELECT measure_id,'snapshot',business_day,NULL,0::numeric,'{}'::jsonb,'{}'::jsonb,0::bigint\n   FROM observations WHERE expected_count=0 AND expected_value=0 AND $3::jsonb->>'snapshotPopulation'='complete'\n ) SELECT $1,population.* FROM population LIMIT $4"};
const revision='63e7536d-884a-4cd5-a3a5-d271aec92938',tenant='el-dabboos-iq';
const target=new URL(process.env.MART_INGESTOR_URL);
if(target.hostname!=='postgres'||target.pathname!=='/el_dabboos_analytics_staging')throw new Error('Unexpected target');
const pool=new Pool({connectionString:target.toString(),max:1,connectionTimeoutMillis:5000,options:'-c default_transaction_read_only=on -c statement_timeout=120000 -c lock_timeout=2000'});
let client;const deadline=setTimeout(()=>{console.log(JSON.stringify({stage:'Snapshot comparison overall bound reached; no changes'}));if(client){client.release(true);client=undefined;}pool.end().finally(()=>process.exit(1));},260000);
function nodes(plan,depth=0){return [{depth,type:plan['Node Type'],relation:plan['Relation Name'],index:plan['Index Name'],estimatedRows:plan['Plan Rows'],rows:plan['Actual Rows'],loops:plan['Actual Loops'],sharedHits:plan['Shared Hit Blocks'],sharedReads:plan['Shared Read Blocks'],tempReads:plan['Temp Read Blocks'],tempWrites:plan['Temp Written Blocks']},...(plan.Plans??[]).flatMap(child=>nodes(child,depth+1))];}
try{
 client=await pool.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await client.query("SELECT set_config('mart.tenant_id',$1,true)",[tenant]);
 const identity=(await client.query("SELECT current_database() database,current_setting('transaction_read_only') read_only,pg_has_role(current_user,'dabboos_ingestor','MEMBER') ingestor,rolsuper OR rolbypassrls bypass FROM pg_roles WHERE rolname=current_user")).rows[0];
 if(identity.database!=='el_dabboos_analytics_staging'||identity.read_only!=='on'||!identity.ingestor||identity.bypass)throw new Error('Unexpected identity');
 const config=(await client.query("SELECT mart.prepared_configuration($1,$2,'business','snapshot','2026-10-15','2026-10-15') config",[tenant,revision])).rows[0]?.config;
 if(!config||config.family!=='business'||config.kind!=='snapshot'||config.snapshotPopulation!=='complete'||config.through!=='2026-10-15')throw new Error('Unexpected complete snapshot configuration');
 const configJson=JSON.stringify(config);
 const observations=(await client.query(`SELECT measure_id,business_day::text AS observation_day,expected_count::text FROM (
 SELECT DISTINCT ON(measure_id) * FROM mart.prepared_snapshot_observations($1,$2,'business')
 WHERE business_day<='2026-10-15'::date ORDER BY measure_id,business_day DESC) latest ORDER BY measure_id`,[tenant,revision])).rows;
 if(observations.length!==30||observations.filter(row=>row.expected_count==='0').length!==1)throw new Error('Frozen observation inventory changed');
 console.log(JSON.stringify({stage:'Read-only per-observation exact comparison started',...identity,revision,cutoff:config.through,observations:observations.length,emptyObservations:1,statementBoundMs:120000,overallBoundMs:260000,candidateMigrationSha256:'a04af6077113fdd59f9044f378a5d2232788b89e9d3f501e767569380fb87142',reference:'Canonical reader retains all published memberships; decomposed by accepted observation; no planner setting changes',noChanges:true,noOdoo:true}));
 let referenceRows=0,candidateRows=0,covered=0,emptyCovered=0;
 // Plan every reference first; do not execute comparisons if any fact scan is broad.
 for(let index=0;index<observations.length;index++){
  const observation=observations[index],params=[tenant,revision,configJson,observation.measure_id,observation.observation_day];
  const estimate=(await client.query('EXPLAIN (FORMAT JSON) '+statements.referencePlan,params)).rows[0]['QUERY PLAN'][0];
  const scanNodes=[];
  function inspect(plan){if(plan['Relation Name']==='review_facts')scanNodes.push(plan);for(const child of plan.Plans??[])inspect(child);}
  inspect(estimate.Plan);
  const selective=scanNodes.length>0&&scanNodes.every(plan=>['Index Scan','Index Only Scan','Bitmap Index Scan'].includes(plan['Node Type'])&&['tenant_id','partition_id','measure_id'].every(column=>new RegExp('\\b'+column+'\\b').test(plan['Index Cond']??'')));
  if(!selective){console.log(JSON.stringify({stage:'Reference plan rejected before population execution',observationIndex:index+1,nodes:nodes(estimate.Plan),reason:'Selective tenant/partition/measure index access not established'}));throw new Error('Nonselective reference plan');}
 }
 console.log(JSON.stringify({stage:'All reference plans passed selective index gate',observations:observations.length}));
 for(let index=0;index<observations.length;index++){
  const observation=observations[index],params=[tenant,revision,configJson,observation.measure_id,observation.observation_day];
  const start=performance.now(),result=(await client.query(statements.comparison,params)).rows[0];
  console.log(JSON.stringify({stage:'Observation exact comparison',observationIndex:index+1,emptyObservation:observation.expected_count==='0',...result,elapsedMs:performance.now()-start}));
  if(result.mismatches!==0)throw new Error('Population mismatch');
  referenceRows+=result.reference_rows;candidateRows+=result.candidate_rows;covered++;if(observation.expected_count==='0')emptyCovered++;
  if(referenceRows>1000000||candidateRows>1000000)throw new Error('Population bound exceeded');
 }
 console.log(JSON.stringify({stage:'Exact canonical population comparison, decomposed by accepted observation',covered,emptyCovered,referenceRows,candidateRows,mismatches:0,limitation:'Diagnostic execution shape; not old-path baseline timing'}));
 const params=[tenant,revision,configJson,1000001];
 const plan=(await client.query('EXPLAIN (ANALYZE,BUFFERS,TIMING OFF,FORMAT JSON) '+statements.candidate,params)).rows[0]['QUERY PLAN'][0];
 console.log(JSON.stringify({stage:'Candidate full population SELECT measured',executionMs:plan['Execution Time'],planningMs:plan['Planning Time'],nodes:nodes(plan.Plan),limitation:'Full rollback preparation including validation and binding remains required'}));
 await client.query('ROLLBACK');
 console.log(JSON.stringify({stage:'Read-only comparison complete; no preparation or activation'}));
}catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});console.log(JSON.stringify({stage:'Snapshot comparison stopped; no changes; no equivalence claimed unless explicitly measured',code:typeof error.code==='string'&&/^[A-Z0-9]{5}$/.test(error.code)?error.code:'COMPARISON_FAILED'}));process.exitCode=1;}
finally{clearTimeout(deadline);if(client)client.release(true);await pool.end();}
SNAPSHOT_OBSERVATION_COMPARISON
)
```

## Company result — accepted population proof

All 30 selective reference plans passed. Every observation then compared exactly,
including the one accepted empty observation: referenceRows=122404,
candidateRows=122404, mismatches=0. The exact full candidate population SELECT
measured executionMs=1584.401 and planningMs=6.942 after the comparison. Root
shared hits=69321, shared reads=46631; temporary read/write blocks=7756 each.
No preparation, deployment or activation occurred. This passes population
selection equivalence only; full rollback preparation remains unproved.
