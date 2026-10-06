import { readFile,writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
const { Pool } = createRequire(new URL('../../packages/data/package.json',import.meta.url))('pg');
const [mode,environmentFile,outputFile] = process.argv.slice(2);
if (!['schema','profile'].includes(mode) || !environmentFile || !outputFile) throw new Error('Usage: odoo-discovery.mjs schema|profile operator-env output-json');
const environment = { ...parseEnv(await readFile(environmentFile,'utf8')),...process.env };
if (environment.ODOO_SOURCE_DATABASE!=='accounting' || environment.ODOO_SOURCE_COMPANY_IDS!=='1') throw new Error('Only approved accounting/company-1 discovery is allowed');
const pool = new Pool({ host: environment.ODOO_SOURCE_HOST,port: Number(environment.ODOO_SOURCE_PORT ?? 5432),database: environment.ODOO_SOURCE_DATABASE,user: environment.ODOO_SOURCE_USER,password: environment.ODOO_SOURCE_PASSWORD,max: 1,connectionTimeoutMillis: 5000 });
let client;
const result = { scope: { database: 'accounting',companyId: 1,reportingCurrency: 'IQD',samplePeriod: { from: '2026-09-01',to: '2026-10-01',timezone: 'Asia/Baghdad',timestampUtcBounds: ['2026-08-31T21:00:00Z','2026-09-30T21:00:00Z'] } },queries: {},plans: {},failures: [] };
async function select(name,sql,parameters=[]) {
 if (!/^\s*(SELECT|WITH|EXPLAIN)\b/i.test(sql)) throw new Error('Read-only discovery statement required');
 await client.query('SAVEPOINT discovery_query');
 try { if(mode==='profile' && name!=='transaction') { const plan=await client.query('EXPLAIN (FORMAT JSON) '+sql,parameters);result.plans[name]=plan.rows[0]['QUERY PLAN'][0].Plan; } const response=await client.query(sql,parameters);result.queries[name]=response.rows; await client.query('RELEASE SAVEPOINT discovery_query');return response.rows; }
 catch (error) { await client.query('ROLLBACK TO SAVEPOINT discovery_query');await client.query('RELEASE SAVEPOINT discovery_query'); result.failures.push({ name,code: error.code ?? 'query',reason: error.code==='57014' ? 'statement_timeout' : 'query_failed' });return []; }
}
try {
 client = await pool.connect();
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await client.query("SELECT set_config('statement_timeout','15000',true),set_config('lock_timeout','1000',true),set_config('idle_in_transaction_session_timeout','30000',true),set_config('TimeZone','UTC',true)");
 await select('transaction',"SELECT current_database() database,current_setting('server_version') postgres_version,current_setting('transaction_read_only') read_only,transaction_timestamp() observed_at");
 if(result.queries.transaction[0]?.read_only!=='on') throw new Error('Read-only transaction required');
 if(mode==='schema') {
  await select('tables',"SELECT c.relname table_name,c.reltuples::bigint estimated_rows FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname");
  await select('columns',"SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name ~ '^(sale_|account_|res_partner|product_|stock_|purchase_|crm_|utm_|sales_|visit|.*route|.*brand|.*business_line|fleet_|.*maidan)' ORDER BY table_name,ordinal_position");
  await select('constraints',"SELECT c.relname table_name,con.conname,con.contype,pg_get_constraintdef(con.oid) definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname ~ '^(sale_|account_|res_partner|product_|stock_|purchase_|crm_|utm_|sales_|visit|.*route|.*brand|.*business_line|fleet_|.*maidan)' AND con.contype IN ('p','f') ORDER BY 1,2");
  await select('indexes',"SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename ~ '^(sale_order|account_move|stock_quant|stock_move|stock_picking|purchase_order|crm_lead|res_partner)' ORDER BY 1,2");
  await select('models',"SELECT model,name::text,state,to_jsonb(m)->>'modules' modules FROM ir_model m WHERE model ~ '^(sale\.|account\.|res.partner|product\.|stock\.|purchase\.|crm\.|utm\.|sales\.|visit|.*route|.*brand|.*business.line|fleet\.|.*maidan)' ORDER BY model");
  await select('fields',"SELECT model,name,ttype,relation,state,to_jsonb(f)->>'store' stored,to_jsonb(f)->>'compute' compute,to_jsonb(f)->>'modules' modules,to_jsonb(f)->>'relation_table' relation_table,to_jsonb(f)->>'column1' column1,to_jsonb(f)->>'column2' column2 FROM ir_model_fields f WHERE model ~ '^(sale\.|account\.|res.partner|product\.|stock\.|purchase\.|crm\.|utm\.|sales\.|visit|.*route|.*brand|.*business.line|fleet\.|.*maidan)' ORDER BY model,name");
  await select('modules',"SELECT name,state,latest_version FROM ir_module_module WHERE state='installed' ORDER BY name");
  await select('field_modules',"SELECT split_part(d.name,'__',1) metadata_name,d.module,count(*)::text fields FROM ir_model_data d WHERE d.model='ir.model.fields' GROUP BY 1,2 ORDER BY 2,1");
 } else {
  const { runProfiles,runAdditionalProfiles } = await import('./odoo-discovery-profiles.mjs'); await runProfiles(select); await runAdditionalProfiles(select);
 }
 await client.query('ROLLBACK');
 await writeFile(outputFile,JSON.stringify(result,null,2)+'\n',{mode:0o600});
 if(result.failures.length) process.exitCode=1;
 console.log(JSON.stringify({ mode,completed: Object.keys(result.queries),failures: result.failures,output: outputFile }));
} catch(error) { await client?.query('ROLLBACK').catch(()=>{});console.error(JSON.stringify({ failed: true,code: error.code ?? 'discovery' }));process.exitCode=1; }
finally { client?.release();await pool.end(); }
