# Exact company query plans — read-only follow-up

The first profile established expensive SQL (not metadata) and an approximately 43-second sequential aging table workload. It did not reproduce the timeout when metrics ran alone.
This follow-up executes three exact SELECT query plans once each: the near-deadline balance/sales ratio, full-history monthly net sales, and full-history salesperson net sales.
Each EXPLAIN ANALYZE has a **30-second diagnostic-only bound**; the application remains at 15 seconds. It uses one read-only session at a time and never connects to Odoo.
The selected customer identities stay in memory and are never printed. Output contains only aggregate plan statistics, index names and optional JIT timing. Parent/child buffer counters must not be added together.
Please run the block in the same company terminal and paste its JSON output. It can take roughly two minutes if queries hit the diagnostic deadline.

The recorded baseline used release `f5c1ed21fa349fd5716429664c15713087afde1d`.
For a repeat after deployment, the block selects the images actually configured
on the running API/web containers; it does not rebuild or restart them. Record
those image tags with the output so results are attributable to that release.

```bash
(
set -e
cd /opt/el-dabboos/analytics
export STAGING_API_IMAGE="$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-api-1)"
export STAGING_WEB_IMAGE="$(docker inspect --format '{{.Config.Image}}' el-dabboos-staging-web-1)"
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
export STAGING_WEB_PORT=8088
docker compose -f infra/staging/compose.yml run --rm --no-deps -T --entrypoint node operator \
  --experimental-transform-types --disable-warning=ExperimentalWarning --input-type=module <<'JS'
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const base=pathToFileURL(process.cwd()+'/');
const {Pool}=createRequire(new URL('packages/data/package.json',base))('pg');
const {TrustedAnalyticsRepository}=await import(new URL('packages/data/src/operational/repository.ts',base));
const {verifyMartRuntimeRole,tenantTransaction}=await import(new URL('packages/data/src/postgres/session.ts',base));
const {groupedReviewRows}=await import(new URL('packages/data/src/review/grouped-query.ts',base));
const {reviewEventRows}=await import(new URL('packages/data/src/review/event-rows.ts',base));
const tenant='el-dabboos-iq',context={tenantId:tenant,locale:'en'};
let target;
try{target=new URL(process.env.MART_RUNTIME_URL);if(target.pathname!=='/el_dabboos_analytics_staging')throw new Error();}
catch{console.log(JSON.stringify({diagnostic:'Protected analytics URL missing or unexpected; stopped'}));process.exit(1);}
const pool=new Pool({connectionString:target.toString(),max:1,connectionTimeoutMillis:5000,options:'-c default_transaction_read_only=on -c statement_timeout=15000'});
function nodes(plan,depth=0){return [{depth,type:plan['Node Type'],relation:plan['Relation Name'],index:plan['Index Name'],rows:plan['Actual Rows'],loops:plan['Actual Loops'],estimatedRows:plan['Plan Rows'],heapFetches:plan['Heap Fetches'],sharedHits:plan['Shared Hit Blocks'],sharedReads:plan['Shared Read Blocks'],tempReads:plan['Temp Read Blocks'],tempWrites:plan['Temp Written Blocks'],sortMethod:plan['Sort Method'],sortSpace:plan['Sort Space Used'],sortSpaceType:plan['Sort Space Type']},...(plan.Plans??[]).flatMap(child=>nodes(child,depth+1))];}
async function capture(operation){let sql;await operation({query:async(text,params)=>{sql={text,params};return{rows:[]};}});if(!sql)throw new Error('No SQL captured');return sql;}
async function measure(name,statement){
 try{const plan=await tenantTransaction(pool,tenant,async client=>(await client.query('EXPLAIN (ANALYZE,BUFFERS,TIMING OFF,FORMAT JSON) '+statement.text,statement.params)).rows[0]['QUERY PLAN'][0],true,30000);console.log(JSON.stringify({name,diagnostic:'one exact read-only execution; 30-second diagnostic bound; application timeout unchanged',executionMs:plan['Execution Time'],planningMs:plan['Planning Time'],jit:plan.JIT,nodes:nodes(plan.Plan)}));}
 catch(error){console.log(JSON.stringify({name,diagnostic:'bounded plan execution stopped; sensitive details withheld',category:error.name}));}
}
try{
 await verifyMartRuntimeRole(pool);
 await tenantTransaction(pool,tenant,async client=>{const identity=(await client.query("SELECT current_database() database,current_setting('transaction_read_only') read_only")).rows[0];if(identity.database!=='el_dabboos_analytics_staging'||identity.read_only!=='on')throw new Error('Unexpected identity');const visibility=(await client.query("SELECT relpages,relallvisible,reltuples::bigint estimated_rows FROM pg_class WHERE oid='mart.review_facts'::regclass")).rows[0];console.log(JSON.stringify({diagnostic:'analytics only; no source access or writes',...identity,visibility}));},true,5000);
 const repository=new TrustedAnalyticsRepository(pool,{statementTimeoutMs:15000,maxGroups:4000,reportingCurrencies:{[tenant]:'IQD'}}),range={from:'2026-09-01',to:'2026-09-30'};
 const anchor=await repository.execute({metric:'review_customer_balance',groupBy:'customer',dateRange:range,analysis:{topN:{direction:'top',limit:100}}},context);
 const query={metric:'customer_balance_sales_percentage',groupBy:'customer',dateRange:range},read={outputKeys:anchor.rows.map(row=>row.key).filter(key=>key!==null),revision:anchor.metadata.servingRevision};
 await measure('snapshot ratio, same Top100 anchor identities',await capture(client=>groupedReviewRows(client,{query,context,range,family:'business',revision:anchor.metadata.servingRevision,maxGroups:4000,read})));
 const historyRange={from:'2024-06-01',to:'2026-10-15'},monthly={metric:'period_net_sales',groupBy:'month',dateRange:historyRange};
 await measure('business full-history monthly net sales',await capture(client=>reviewEventRows(client,{query:monthly,context,range:historyRange,family:'business'})));
 const grouped={metric:'period_net_sales',groupBy:'salesperson',dateRange:historyRange};
 await measure('business full-history salesperson net sales',await capture(client=>groupedReviewRows(client,{query:grouped,context,range:historyRange,family:'business',revision:anchor.metadata.servingRevision,maxGroups:4000,read:{window:{limit:100,queries:[grouped],order:'identity'}}})));
}catch(error){console.log(JSON.stringify({diagnostic:'Preflight or anchor failed; sensitive details withheld',category:error.name}));process.exitCode=1;}
finally{await pool.end();}
JS
)
```
