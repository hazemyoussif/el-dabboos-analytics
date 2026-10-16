# History event folding — read-only company preflight

Status: prepared for user approval; not executed on company staging by the agent.

The prior combined rehearsal restored Collections but still timed out on history;
it was rolled back and is rejected. This candidate keeps the proven amount-only
index correction separate and allows single-use event operands to be folded by
the planner. Snapshot operands retain their materialization boundary. It adds no
statistics objects, planner overrides, extra index or data projection.

This command uses the deployed API container and its existing dedicated read-only
analytics login. It starts no service and stops none. It creates no temporary or
permanent objects, rebuilds no indexes, changes no permissions and never contacts
Odoo. Candidate code is compiled from the local source and runs only in memory.
The company application continues serving release 74d7d48 unchanged.

For each of the same two failing history selections it runs three SELECT operations
sequentially in one repeatable-read, read-only transaction: deployed raw results
with a 30-second diagnostic bound; one actual candidate plan with the same bound;
and candidate raw results at the unchanged 15-second application deadline.
The command stops on the first failed selection. Worst-case query bounds total
150 seconds for both selections, plus connection and metadata checks. Concurrent
application activity and cache state can affect these measurements.

Output contains plan statistics and comparison booleans, never customer values,
labels, bound parameters or credentials. The candidate membership lookup is timed
separately and included in the acceptance duration. Actual node times are
inclusive: do not add parent/child times or buffer counters. Profiling overhead
and worker timing may differ from the separately timed raw SELECT. No diagnostic
limit changes the application's configured timeout.

Passing this preflight is not deployment or full-report QA approval. It tests the
event query on the unchanged current index; the final combined amount-only index
and runtime release still require verification before release acceptance. If this
fails, its actual plan should establish remaining work without another index
rebuild or scratch-data copy.

Run only after approving these bounded company analytics reads, then paste JSON.

```bash
(
set -e
API_IMAGE="$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-api-1)"
if [ "$API_IMAGE" != "el-dabboos-api:74d7d48926a04041dc0af8f816087efd3b634d7e" ]; then
  echo 'Unexpected deployed image; stopped before query execution.' >&2
  exit 1
fi
docker exec -i el-dabboos-staging-api-1 node \
  --experimental-transform-types --disable-warning=ExperimentalWarning --input-type=module <<'JS'
import{createRequire}from'node:module';
import{pathToFileURL}from'node:url';
const base=pathToFileURL(process.cwd()+'/');
const {Pool}=createRequire(new URL('packages/data/package.json',base))('pg');
const {groupedReviewRows}=await import(new URL('packages/data/src/review/grouped-query.ts',base));
const {reviewSnapshotBase}=await import(new URL('packages/data/src/review/snapshot-selection.ts',base));
const {verifyMartRuntimeRole}=await import(new URL('packages/data/src/postgres/session.ts',base));
const {requiredMeasures,semanticCatalog,compatibleQuantityMetrics}=await import(new URL('packages/domain/src/index.ts',base));
const {bind}=await import(new URL('packages/data/src/postgres/sql.ts',base));
const {dimensionLabelField,sourceDisplayLabel}=await import(new URL('packages/data/src/postgres/query-labels.ts',base));
const {groupedValueExpression,groupedUnsafeExpression}=await import(new URL('packages/data/src/postgres/grouped-value.ts',base));
const {readGroupedSql}=await import(new URL('packages/data/src/postgres/result-window.ts',base));
const {businessDefinitionVersion}=await import(new URL('packages/data/src/business/definitions.ts',base));
const {reviewDefinitionVersion}=await import(new URL('packages/data/src/review/definitions.ts',base));
/** Build source-grain operands on the caller's repeatable-read transaction. */
async function groupedReviewBase(client, scope, params) {
    if (scope.snapshot)
        return reviewSnapshotBase;
    const from = bind(params, scope.range.from), partitions = bind(params, await publishedEventPartitions(client, scope));
    return `WITH facts AS (
 SELECT fact.measure_id,fact.amount value,fact.dimensions,fact.display_labels labels,fact.business_day business_date,fact.entity_id
 FROM mart.review_facts fact WHERE fact.tenant_id=$1 AND fact.partition_id=ANY(${partitions}::text[])
 AND fact.measure_id=ANY($2::text[]) AND fact.business_day<=$3::text AND fact.business_day>=${from}::text
 ),base AS (SELECT * FROM facts)`;
}
/** Resolve approved membership before planning the event scan; never cache across requests. */
async function publishedEventPartitions(client, scope) {
    const rows = (await client.query(`SELECT member.partition_id FROM mart.analytics_trusted_serving trusted
 JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=$1 AND member.family=$2 AND extraction.definition_version=$3
 AND member.month BETWEEN date_trunc('month',$4::date) AND date_trunc('month',$5::date)`, [scope.tenantId, scope.family, scope.definitionVersion, scope.range.from, scope.range.to])).rows;
    return rows.map(row => row.partition_id);
}

async function candidateGroupedReviewRows(client, scope) {
    const { query, context, range, family, revision, maxGroups, read } = scope;
    const definitionVersion = (family === 'business' ? businessDefinitionVersion : reviewDefinitionVersion)();
    const semantics = semanticCatalog[query.metric].semantics, snapshot = semantics.kind === 'snapshot' || semantics.kind === 'ratio' && semantics.basis === 'snapshot';
    const params = [context.tenantId, requiredMeasures(query.metric), range.to, ...(snapshot ? [family, definitionVersion] : [])];
    const filters = [...(query.filters ?? []), ...(context.enforcedFilters ?? [])].map(filter => `base.dimensions->>${bind(params, filter.dimension)}=ANY(${bind(params, filter.values)}::text[])`);
    const group = bind(params, query.groupBy), label = bind(params, dimensionLabelField(query.groupBy));
    const unsafe = groupedUnsafeExpression(query, params), value = groupedValueExpression(query, params), quantities = compatibleQuantityMetrics.includes(query.metric) && query.groupBy !== 'uom';
    const invalid = quantities ? `min(base.uom) IS DISTINCT FROM max(base.uom) OR bool_or(coalesce(base.uom,'unassigned')='unassigned')` : 'false';
    const base = await groupedReviewBase(client, { tenantId: context.tenantId, family, definitionVersion, range, snapshot }, params);
    // Reduce full attribution to grouping operands after authorization filters.
    // Single-use event operands may fold into a parallel aggregate; snapshots keep
    // their existing materialization boundary after latest-row selection.
    const distinctDimension = semantics.kind === 'distinct_count' ? bind(params, semantics.dimension) : null;
    const dimensions = distinctDimension ? `jsonb_build_object(${distinctDimension}::text,base.dimensions->${distinctDimension}::text)` : "NULL::jsonb";
    const text = `${base},operands AS ${snapshot ? 'MATERIALIZED' : 'NOT MATERIALIZED'} (
 SELECT base.dimensions->>${group} key,base.labels->>${label} label,base.value,base.measure_id,base.business_date,
 ${quantities ? "base.dimensions->>'uom'" : "NULL::text"} uom,${dimensions} dimensions
 FROM base WHERE base.dimensions->>${group} IS NOT NULL ${filters.length ? 'AND ' + filters.join(' AND ') : ''}
 )
 SELECT base.key,${value} value,${invalid} invalid,${unsafe} unsafe,
 CASE WHEN min(base.label)=max(base.label) THEN min(base.label) END label,max(base.business_date)::date through
 FROM operands base GROUP BY 1`;
    const selected = await readGroupedSql(client, { query, context, input: { text, params }, revision, maxGroups, ...(read ? { read } : {}) });
    return { ...selected, labels: Object.fromEntries(Object.entries(selected.labels).map(([key, label]) => [key, sourceDisplayLabel(label, context.locale)])) };
}

const tenant='el-dabboos-iq',context={tenantId:tenant,locale:'en'},range={from:'2024-06-01',to:'2026-10-15'};
let target;
try{target=new URL(process.env.MART_RUNTIME_URL);if(target.pathname!=='/el_dabboos_analytics_staging')throw new Error();}
catch{console.log(JSON.stringify({diagnostic:'Expected protected analytics runtime URL missing; stopped'}));process.exit(1);}
const pool=new Pool({connectionString:target.toString(),max:1,connectionTimeoutMillis:5000,options:'-c default_transaction_read_only=on -c statement_timeout=5000'});
let client,active=false,passed=0,original;
function nodes(plan,depth=0){return [{depth,type:plan['Node Type'],relation:plan['Relation Name'],index:plan['Index Name'],strategy:plan.Strategy,actualRows:plan['Actual Rows'],estimatedRows:plan['Plan Rows'],loops:plan['Actual Loops'],width:plan['Plan Width'],startupMs:plan['Actual Startup Time'],totalMs:plan['Actual Total Time'],workersPlanned:plan['Workers Planned'],workersLaunched:plan['Workers Launched'],sharedHits:plan['Shared Hit Blocks'],sharedReads:plan['Shared Read Blocks'],tempReads:plan['Temp Read Blocks'],tempWrites:plan['Temp Written Blocks'],heapFetches:plan['Heap Fetches'],peakMemoryKb:plan['Peak Memory Usage'],hashBatches:plan['HashAgg Batches'],diskKb:plan['Disk Usage'],sortMethod:plan['Sort Method'],sortSpace:plan['Sort Space Used'],sortSpaceType:plan['Sort Space Type'],ioReadMs:plan['I/O Read Time']??plan['Shared I/O Read Time']},...(plan.Plans??[]).flatMap(child=>nodes(child,depth+1))];}
async function state(){return(await client.query(`SELECT current_database() database,
 (SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1) revision,
 pg_relation_filenode('mart.review_facts') heap_file,
 (SELECT oid FROM pg_class WHERE oid='mart.review_facts_typed_access'::regclass) index_oid,
 pg_get_indexdef('mart.review_facts_typed_access'::regclass) index_definition,
 (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='mart.review_facts'::regclass) forced_rls`,[tenant])).rows[0];}
async function capture(operation,scope){
 let statement;
 await operation({query:async(text,params)=>{if(text.startsWith('WITH original AS MATERIALIZED')){statement={text,params};return{rows:[]};}return client.query(text,params);}},scope);
 if(!statement)throw new Error('No governed query captured');return statement;
}
try{
 await verifyMartRuntimeRole(pool);client=await pool.connect();
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');active=true;
 await client.query("SELECT set_config('mart.tenant_id',$1,true)",[tenant]);
 original=await state();
 if(original.database!=='el_dabboos_analytics_staging'||!original.revision||!original.forced_rls||!original.index_definition.includes('INCLUDE (entity_id, amount)'))throw new Error('Unexpected database, serving, RLS or index');
 console.log(JSON.stringify({diagnostic:'analytics only; existing runtime role; no source access, writes or service changes',database:original.database,readOnly:(await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only}));
 await client.query('ROLLBACK');active=false;
 for(const groupBy of ['salesperson','state']){
  const name=groupBy==='state'?'History governorate':'History salesperson',query={metric:'period_net_sales',groupBy,dateRange:range};
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');active=true;
  await client.query("SELECT set_config('mart.tenant_id',$1,true),set_config('statement_timeout','30000',true)",[tenant]);
  if(JSON.stringify(await state())!==JSON.stringify(original))throw new Error('Serving or schema changed');
  const scope={query,context,range,family:'business',revision:original.revision,maxGroups:4000,read:{window:{limit:100,queries:[query],order:'identity'}}};
  const baseline=await capture(groupedReviewRows,scope),baselineStart=performance.now(),previous=(await client.query(baseline.text,baseline.params)).rows,baselineMs=performance.now()-baselineStart;
  const captureStart=performance.now(),candidate=await capture(candidateGroupedReviewRows,scope),membershipMs=performance.now()-captureStart;
  const plan=(await client.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+candidate.text,candidate.params)).rows[0]['QUERY PLAN'][0];
  console.log(JSON.stringify({name,phase:'candidate exact SELECT plan; diagnostic bound only',executionMs:plan['Execution Time'],planningMs:plan['Planning Time'],jit:plan.JIT,nodes:nodes(plan.Plan)}));
  await client.query("SELECT set_config('statement_timeout','15000',true)");
  const start=performance.now(),current=(await client.query(candidate.text,candidate.params)).rows,selectMs=performance.now()-start;
  const exactResultsMatch=JSON.stringify(previous)===JSON.stringify(current),elapsedMs=membershipMs+selectMs;
  console.log(JSON.stringify({name,phase:'raw result comparison and application deadline',exactResultsMatch,rows:current.length,baselineMs:Number(baselineMs.toFixed(3)),membershipMs:Number(membershipMs.toFixed(3)),candidateSelectMs:Number(selectMs.toFixed(3)),candidateIncludingMembershipMs:Number(elapsedMs.toFixed(3)),withinApplicationDeadline:elapsedMs<15000}));
  if(!exactResultsMatch||elapsedMs>=15000)throw new Error('Candidate acceptance failed');
  await client.query('ROLLBACK');active=false;passed++;
 }
}catch(error){process.exitCode=1;console.log(JSON.stringify({diagnostic:'Read-only preflight did not pass; no deployment performed',code:error.code??null,reason:['Unexpected database, serving, RLS or index','No governed query captured','Serving or schema changed','Candidate acceptance failed'].includes(error.message)?error.message:error.code==='57014'?'statement timeout':'Operation failed; sensitive details withheld'}));}
finally{
 if(client){
  if(active)await client.query('ROLLBACK').catch(()=>{});
  let unchanged=false;
  try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await client.query("SELECT set_config('mart.tenant_id',$1,true)",[tenant]);unchanged=!!original&&JSON.stringify(await state())===JSON.stringify(original);await client.query('ROLLBACK');}catch{process.exitCode=1;}
  if(!unchanged)process.exitCode=1;
  console.log(JSON.stringify({diagnostic:'read-only preflight complete; no writes, index changes or service restarts',passedSelections:passed,expectedSelections:2,originalServingHeapIndexAndRlsUnchanged:unchanged}));
  client.release(true);
 }
 await pool.end();
}

JS
)
```
