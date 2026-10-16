# Final combined Collections/history candidate — rollback-only rehearsal

Status: prepared for explicit maintenance approval; not executed by the agent.

The amount-only index correction already restored Collections in a rollback
rehearsal. The revised event query separately passed both company history
preflights under the runtime role. This command verifies their combination with
all five prior controls before release. It embeds the current local query helpers
in memory, including foldable event operands and preserved snapshot materialization.
It changes no deployed application code or immutable migration ledger.

This is a company analytics maintenance operation, not a read-only command.
It stops API/web, builds one candidate index inside a transaction, replaces the
current index within that uncommitted transaction, compares five SELECT results
and always rolls back. It verifies the original heap/index/RLS/serving/schema
state, then restarts the original images. No source/Odoo access, data reload,
table rewrite, permissions or Finance approval changes occur. The index build
uses disk/WAL and locks the fact table; the existing free-space/identity guards
remain mandatory. Do not run during other ingestion or migration work.

Each candidate must return exactly the baseline result and finish within the
existing 15-second bound, including source-membership preparation. Baselines use
a 30-second diagnostic bound and the index build is bounded at 180 seconds.
Estimated plans are printed for diagnosis; they do not measure node execution.
These sequential measurements are not a concurrency or cold-cache guarantee.
Successful rehearsal is not authorization to push, merge or deploy. Runtime and
browser QA still follow any separately approved deployment.

Run only after approving the short service pause and transactional index build.
Paste its JSON comparisons, restoration confirmation and service-health output.

```bash
(
set -e
cd /opt/el-dabboos/analytics
export STAGING_API_IMAGE="$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-api-1)"
printf 'API image: %s\n' "$STAGING_API_IMAGE"
export STAGING_WEB_IMAGE="$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-web-1)"
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
if [ "$STAGING_API_IMAGE" != "el-dabboos-api:74d7d48926a04041dc0af8f816087efd3b634d7e" ] || [ "$STAGING_WEB_IMAGE" != "el-dabboos-web:74d7d48926a04041dc0af8f816087efd3b634d7e" ]; then
  echo 'Unexpected release; stopped before maintenance.' >&2
  exit 1
fi
QA_INDEX_FREE_BYTES="$(df --output=avail -B1 /var/lib/docker | tail -n 1 | tr -d ' ')"
export QA_INDEX_FREE_BYTES
restart_original() {
  rehearsal_status=$?
  trap - EXIT
  if ! docker compose -f infra/staging/compose.yml up -d --wait api web; then
    echo 'Original application restart did not pass; operator intervention required.' >&2
    exit 1
  fi
  exit "$rehearsal_status"
}
trap restart_original EXIT
docker compose -f infra/staging/compose.yml stop web api
docker compose -f infra/staging/compose.yml run --env QA_INDEX_FREE_BYTES --rm --no-deps -T --entrypoint node operator \
  --experimental-transform-types --disable-warning=ExperimentalWarning --input-type=module <<'JS'
import{createRequire}from'node:module';
import{pathToFileURL}from'node:url';
const base=pathToFileURL(process.cwd()+'/');
const {Pool}=createRequire(new URL('packages/data/package.json',base))('pg');
const {groupedReviewRows}=await import(new URL('packages/data/src/review/grouped-query.ts',base));
const {reviewEventRows}=await import(new URL('packages/data/src/review/event-rows.ts',base));
const {requiredMeasures,semanticCatalog,compatibleQuantityMetrics}=await import(new URL('packages/domain/src/index.ts',base));
const {bind}=await import(new URL('packages/data/src/postgres/sql.ts',base));
const {dimensionLabelField,sourceDisplayLabel}=await import(new URL('packages/data/src/postgres/query-labels.ts',base));
const {groupedValueExpression,groupedUnsafeExpression}=await import(new URL('packages/data/src/postgres/grouped-value.ts',base));
const {readGroupedSql}=await import(new URL('packages/data/src/postgres/result-window.ts',base));
const {businessDefinitionVersion}=await import(new URL('packages/data/src/business/definitions.ts',base));
const {reviewDefinitionVersion}=await import(new URL('packages/data/src/review/definitions.ts',base));
/** Parameters: tenant, required measures, cutoff day, serving family, definition version.
 * Freeze eligible identities before dimension/policy filters; later fetches stay in that partition.
 * Validated snapshots have one contribution per entity/measure/day. The bounded lookup prevents
 * the planner from replacing latest-row fetches with a second scan of all historical envelopes.
 */
const reviewSnapshotBase=`WITH published_partitions AS MATERIALIZED (
 SELECT member.partition_id FROM mart.analytics_trusted_serving trusted
 JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=$1 AND member.family=$4 AND extraction.definition_version=$5
 AND member.month<=date_trunc('month',$3::date)
 ),latest AS MATERIALIZED (
 SELECT DISTINCT ON(fact.measure_id,fact.entity_id) fact.tenant_id,fact.partition_id,fact.measure_id,fact.entity_id,fact.business_day
 FROM mart.review_facts fact
 WHERE fact.tenant_id=$1 AND fact.measure_id=ANY($2::text[]) AND fact.entity_id IS NOT NULL
 AND fact.business_day<=$3::text AND fact.partition_id=ANY(ARRAY(SELECT partition_id FROM published_partitions))
 ORDER BY fact.measure_id,fact.entity_id,fact.business_day DESC
 ),base AS (
 SELECT latest.measure_id,operand.* FROM latest JOIN LATERAL (
 SELECT fact.amount value,fact.dimensions,fact.display_labels labels,fact.business_day business_date
 FROM mart.review_facts fact WHERE fact.tenant_id=latest.tenant_id AND fact.partition_id=latest.partition_id
 AND fact.measure_id=latest.measure_id AND fact.entity_id=latest.entity_id AND fact.business_day=latest.business_day
 LIMIT 1
 ) operand ON true
 )`;

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

const tenant='el-dabboos-iq',context={tenantId:tenant,locale:'en'};
let target;
try{target=new URL(process.env.MART_MIGRATOR_URL);if(target.pathname!=='/el_dabboos_analytics_staging')throw new Error();}
catch{console.log(JSON.stringify({diagnostic:'Expected protected analytics owner configuration missing; stopped'}));process.exit(1);}
const pool=new Pool({connectionString:target.toString(),max:1,connectionTimeoutMillis:5000,options:'-c statement_timeout=30000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=60000'});
let client,original,active=false,restored=false;
async function state(){return(await client.query(`SELECT current_database() database,
 pg_relation_filenode('mart.review_facts') source_heap,
 'mart.review_facts_typed_access'::regclass::oid typed_oid,
 pg_relation_filenode('mart.review_facts_typed_access') typed_file,
 pg_get_indexdef('mart.review_facts_typed_access'::regclass) typed_definition,
 pg_get_indexdef('mart.review_facts_snapshot_identity'::regclass) identity_definition,
 (SELECT max(version) FROM mart_admin.mart_schema_migrations) schema_version,
 (SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1) serving_revision,
 (SELECT jsonb_build_array(relrowsecurity,relforcerowsecurity) FROM pg_class WHERE oid='mart.review_facts'::regclass) source_rls`,[tenant])).rows[0];}
async function capture(selection,candidate=false){
 let statement;
 const observer={query:async(text,params)=>{if(selection.kind==='events'||text.startsWith('WITH original AS MATERIALIZED')){statement={text,params};return{rows:[]};}return client.query(text,params);}};
 const {query,family,kind}=selection;
 if(kind==='events')await reviewEventRows(observer,{query,context,range:query.dateRange,family});
 else await (candidate?candidateGroupedReviewRows:groupedReviewRows)(observer,{query,context,range:query.dateRange,family,revision:original.serving_revision,maxGroups:4000,...(query.analysis?{}:{read:{window:{limit:100,queries:[query],order:'identity'}}})});
 if(!statement)throw new Error('Missing captured query');return statement;
}
function planNodes(plan,depth=0){return[{depth,type:plan['Node Type'],relation:plan['Relation Name'],index:plan['Index Name'],rows:plan['Plan Rows'],cost:plan['Total Cost']},...(plan.Plans??[]).flatMap(child=>planNodes(child,depth+1))];}
const september={from:'2026-09-01',to:'2026-09-30'},history={from:'2024-06-01',to:'2026-10-15'};
const selections=[
 {name:'Collections due Top100',family:'review',query:{metric:'receivables_due_for_collection',groupBy:'customer',dateRange:september,analysis:{topN:{limit:100,direction:'top'}}}},
 {name:'History salesperson',family:'business',query:{metric:'period_net_sales',groupBy:'salesperson',dateRange:history}},
 {name:'History governorate',family:'business',query:{metric:'period_net_sales',groupBy:'state',dateRange:history}},
 {name:'Customer debt balance',family:'business',query:{metric:'review_customer_balance',groupBy:'customer',dateRange:september}},
 {name:'Monthly sales totals',kind:'events',family:'business',query:{metric:'period_net_sales',groupBy:'month',dateRange:history}}
];
try{
 client=await pool.connect();await client.query("SELECT set_config('mart.tenant_id',$1,false)",[tenant]);
 const identity=(await client.query("SELECT pg_has_role(current_user,'dabboos_migrator','MEMBER') owner_member,(SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user) privileged_bypass,pg_relation_size('mart.review_facts_typed_access')::float8 current_index_bytes")).rows[0];
 original=await state();
 if(original.database!=='el_dabboos_analytics_staging'||original.schema_version!==51||!identity.owner_member||identity.privileged_bypass||JSON.stringify(original.source_rls)!=='[true,true]'||!original.serving_revision||!original.typed_definition.includes('INCLUDE (entity_id, amount)'))throw new Error('Unexpected database, role, schema or index');
 if((await client.query("SELECT to_regclass('mart.review_facts_amount_only_probe') existing")).rows[0].existing)throw new Error('Probe index already exists');
 const free=Number(process.env.QA_INDEX_FREE_BYTES),budget=Math.ceil(identity.current_index_bytes*2+2147483648);
 console.log(JSON.stringify({diagnostic:'analytics only; existing owner; no source connection; index-only rollback rehearsal',database:original.database,schema:original.schema_version,servingRevision:original.serving_revision,currentIndexBytes:identity.current_index_bytes,estimatedScratchAndWalBytes:budget,availableDiskBytes:free}));
 if(!Number.isSafeInteger(free)||!Number.isSafeInteger(budget)||budget>free*0.6)throw new Error('Insufficient verified scratch headroom');
 const cases=[];
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');active=true;
 for(const selection of selections){
  const statement=await capture(selection),start=performance.now();
  const rows=(await client.query(statement.text,statement.params)).rows;
  const elapsedMs=performance.now()-start;
  cases.push({selection,statement,rows,elapsedMs});
  console.log(JSON.stringify({name:selection.name,phase:'current index; read-only SELECT',elapsedMs:Number(elapsedMs.toFixed(3)),rows:rows.length}));
 }
 await client.query('COMMIT');active=false;
 if(JSON.stringify(await state())!==JSON.stringify(original))throw new Error('Baseline state changed');
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');active=true;
 await client.query("SELECT set_config('statement_timeout','180000',true)");
 await client.query('CREATE INDEX review_facts_amount_only_probe ON mart.review_facts(tenant_id,partition_id,measure_id,business_day) INCLUDE(amount)');
 await client.query('DROP INDEX mart.review_facts_typed_access');
 await client.query('ALTER INDEX mart.review_facts_amount_only_probe RENAME TO review_facts_typed_access');
 await client.query("SELECT set_config('statement_timeout','15000',true)");
 console.log(JSON.stringify({diagnostic:'candidate index exists only inside this uncommitted transaction; next statements are SELECT/EXPLAIN only'}));
 for(const {selection,rows:baseline,elapsedMs:baselineMs} of cases){
  const preparationStart=performance.now(),statement=await capture(selection,true),preparationMs=performance.now()-preparationStart;
  await client.query("SELECT set_config('statement_timeout',$1,true)",['15000']);
  const estimated=(await client.query('EXPLAIN (FORMAT JSON) '+statement.text,statement.params)).rows[0]['QUERY PLAN'][0];
  console.log(JSON.stringify({name:selection.name,phase:'candidate estimated plan only',nodes:planNodes(estimated.Plan)}));
  const start=performance.now(),rows=(await client.query(statement.text,statement.params)).rows,selectMs=performance.now()-start,elapsed=preparationMs+selectMs;
  if(JSON.stringify(rows)!==JSON.stringify(baseline))throw new Error('Exact result comparison failed');
  if(elapsed>=15000)throw new Error('Application deadline not met');
  console.log(JSON.stringify({name:selection.name,phase:'candidate',status:'result and application deadline passed',exactResultsMatch:true,baselineMs:Number(baselineMs.toFixed(3)),preparationMs:Number(preparationMs.toFixed(3)),selectMs:Number(selectMs.toFixed(3)),elapsedMs:Number(elapsed.toFixed(3)),changeMs:Number((elapsed-baselineMs).toFixed(3)),withinApplicationDeadline:elapsed<15000,rows:rows.length}));
 }
}catch(error){process.exitCode=1;console.log(JSON.stringify({diagnostic:'Rehearsal not accepted; sensitive details withheld',code:error.code??null,reason:['Unexpected database, role, schema or index','Probe index already exists','Insufficient verified scratch headroom','Baseline state changed','Exact result comparison failed','Application deadline not met'].includes(error.message)?error.message:error.code==='57014'&&String(error.message).includes('statement timeout')?'statement timeout':'Operation failed'}));}
finally{
 if(client){
  try{
   if(active){await client.query('ROLLBACK');active=false;}
   if(original){restored=JSON.stringify(await state())===JSON.stringify(original);if(!restored)process.exitCode=1;}
   console.log(JSON.stringify({diagnostic:'rollback and original index verification',originalIndexHeapRlsSchemaAndServingRestored:restored}));
  }catch{process.exitCode=1;console.log(JSON.stringify({diagnostic:'Connection failed; explicit restoration verification unavailable; closing connection rolls back any open transaction'}));}
  client.release(true);
 }
 await pool.end();
}

JS
)
```
