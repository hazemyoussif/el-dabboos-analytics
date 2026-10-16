# Read-only company query profile — 16 October 2026

Run the following block in your existing company staging terminal at `/opt/el-dabboos/analytics`, then paste the JSON output into the chat.
It uses the already deployed image. It does not build, migrate, reload source data, restart applications or use GitHub CI.
It requires the dedicated analytics runtime identity, forces read-only sessions, limits each statement to 15 seconds and executes queries sequentially.
Only metric identifiers, durations, row counts, SQLSTATE and estimated plan nodes are printed. Customer rows, amounts, labels and credentials are not printed.
A complete pass can take over a minute if multiple statements reach the existing deadline. Leave it running until the operator exits.
The local validation reached the expected older-schema failure (`42703`); that is a local compatibility limit, not a company result.

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
const tenant='el-dabboos-iq',context={tenantId:tenant,locale:'en'};
let active=null,lastRead=null;
let target;
try{target=new URL(process.env.MART_RUNTIME_URL);if(target.pathname!=='/el_dabboos_analytics_staging')throw new Error();}
catch{console.log(JSON.stringify({diagnostic:'Protected analytics database URL missing or unexpected; stopped before connection'}));process.exit(1);}
const pool=new Pool({connectionString:target.toString(),max:1,connectionTimeoutMillis:5000,options:'-c default_transaction_read_only=on -c statement_timeout=15000'});
pool.on('connect',client=>{
 const query=client.query.bind(client);
 client.query=async(text,params,callback)=>{
  const data=typeof text==='string'&&/mart\.(review_facts|finance_snapshot_customers)/.test(text)&&!/^EXPLAIN/.test(text);
  if(active&&data)lastRead={text,params};
  const began=performance.now();
  try{return await query(text,params,callback);}
  catch(error){if(active)active.sqlstate=error.code??null;throw error;}
  finally{if(active)active.statements.push({kind:data?'data':'metadata_or_transaction',ms:Math.round(performance.now()-began)});}
 };
});
function nodes(plan,depth=0){return [{depth,type:plan['Node Type'],relation:plan['Relation Name'],index:plan['Index Name'],rows:plan['Plan Rows'],width:plan['Plan Width'],cost:plan['Total Cost']},...(plan.Plans??[]).flatMap(child=>nodes(child,depth+1))];}
async function profile(query,read){
 active={metric:query.metric,groupBy:query.groupBy,statements:[]};lastRead=null;
 const began=performance.now();let result;
 try{result=await repository.execute(query,context,read);active.status='passed';active.rows=result.rows.length;active.nullRows=result.rows.filter(row=>row.value===null).length;}
 catch(error){active.status='failed';active.category=error.name;}
 const summary={...active,totalMs:Math.round(performance.now()-began)},captured=lastRead;active=null;
 console.log(JSON.stringify(summary));
 if(captured){try{const plan=await tenantTransaction(pool,tenant,async client=>(await client.query('EXPLAIN (FORMAT JSON) '+captured.text,captured.params)).rows[0]['QUERY PLAN'][0].Plan,true,5000);console.log(JSON.stringify({metric:query.metric,diagnostic:'estimated plan only; no ANALYZE',nodes:nodes(plan)}));}catch(error){console.log(JSON.stringify({metric:query.metric,diagnostic:'estimated plan unavailable',category:error.name}));}}
 return result;
}
const repository=new TrustedAnalyticsRepository(pool,{statementTimeoutMs:15000,maxGroups:4000,reportingCurrencies:{[tenant]:'IQD'}});
try{
 if(!process.env.MART_RUNTIME_URL)throw new Error('Missing protected runtime configuration');
 await verifyMartRuntimeRole(pool);
 await tenantTransaction(pool,tenant,async client=>{const identity=(await client.query("SELECT current_database() database,current_setting('transaction_read_only') read_only")).rows[0];if(identity.database!=='el_dabboos_analytics_staging'||identity.read_only!=='on')throw new Error('Unexpected database/read-only identity');console.log(JSON.stringify({diagnostic:'company analytics only; source not contacted',...identity}));},true,5000);
 const dateRange={from:'2026-09-01',to:'2026-09-30'};
 const anchor=await profile({metric:'review_customer_balance',groupBy:'customer',dateRange,analysis:{topN:{direction:'top',limit:100}}});
 if(anchor){const read={outputKeys:anchor.rows.map(row=>row.key).filter(key=>key!==null),revision:anchor.metadata.servingRevision};for(const metric of ['customer_period_sales','customer_balance_sales_percentage','customer_last_invoice_date','customer_last_collection_date'])await profile({metric,groupBy:'customer',dateRange},read);}
 else console.log(JSON.stringify({diagnostic:'Anchor failed; dependent metrics not executed'}));
}catch(error){console.log(JSON.stringify({diagnostic:'Preflight or diagnostic stopped; sensitive details withheld',category:error.name}));process.exitCode=1;}
finally{await pool.end();}
JS
)
```
