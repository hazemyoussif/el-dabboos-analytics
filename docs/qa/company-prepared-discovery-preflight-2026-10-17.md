# Prepared discovery preflight — 17 October 2026

The deployed inventory hit its 120-second statement bound. This runs the existing metadata discovery candidate as one read-only SELECT, without installing a function, applying a migration or starting preparation. It uses accepted manifest/control/aggregate metadata instead of detailed fact envelopes. It prints safe counts, dates and timing only. No Odoo, data writes, settings, timer changes, restart or CI. Run the complete block in the same company terminal. The 120-second statement and 150-second process bounds remain.

```bash
(
set -e
cd /opt/el-dabboos/analytics
export STAGING_API_IMAGE=el-dabboos-api:401456b28b4b403211ae5c1e73661506ad669feb
export STAGING_RUNTIME_ENV_FILE=/opt/el-dabboos/secrets/staging-runtime.env
export STAGING_OPERATOR_ENV_FILE=/opt/el-dabboos/secrets/staging-operator.env
export STAGING_DATABASE_NETWORK=dabboos-analytics-mart_default
df -B1 /
docker compose -f infra/staging/compose.yml run --rm --no-deps -T --entrypoint node operator --input-type=module <<'JS'
import {createRequire} from 'node:module';
const {Pool}=createRequire(process.cwd()+'/packages/data/package.json')('pg');
const url=new URL(process.env.MART_INGESTOR_URL);
if(url.pathname!=='/el_dabboos_analytics_staging')throw new Error('Unexpected database');
const pool=new Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:5000,options:'-c default_transaction_read_only=on -c statement_timeout=120000'});
const deadline=setTimeout(()=>process.exit(124),150000);deadline.unref();
try{
 await pool.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await pool.query("SELECT set_config('mart.tenant_id','el-dabboos-iq',true)");
 const identity=(await pool.query("SELECT current_database() database,current_setting('transaction_read_only') read_only,pg_has_role(current_user,'dabboos_ingestor','MEMBER') ingestor,rolsuper OR rolbypassrls bypass FROM pg_roles WHERE rolname=current_user")).rows[0];
 if(!identity.ingestor||identity.bypass||identity.read_only!=='on')throw new Error('Unexpected identity');
 const revision=(await pool.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='el-dabboos-iq'")).rows[0]?.revision_id;
 if(!revision)throw new Error('Trusted revision missing');
 console.log(JSON.stringify({stage:'Metadata inventory started; no source access or writes',...identity,revision}));
 const began=performance.now();
 const chunks=(await pool.query(`SELECT family,kind,count(*)::int chunks,min(period)::text first_period,max(period)::text last_period FROM (
WITH members AS MATERIALIZED (
  SELECT member.family,member.month,member.partition_id,part.capabilities,
   CASE WHEN member.family='facts' THEN baseline.specification ELSE jsonb_build_array(extraction.mapping) END mappings
  FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
  JOIN mart.analytics_baselines baseline USING(tenant_id) LEFT JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
  WHERE member.tenant_id=$1 AND member.revision_id=$2
 ),events AS (
  SELECT DISTINCT family,'event'::text kind,month period,(month+interval '1 month - 1 day')::date through
  FROM members WHERE family<>'receivables' AND EXISTS(
   SELECT 1 FROM jsonb_array_elements(mappings) mapping,jsonb_array_elements(mapping->'measures') rule
   JOIN mart.measure_definitions definition ON definition.measure_id=rule->>'measureId' WHERE definition.kind='event')
 ),fact_cutoffs AS MATERIALIZED (
  SELECT DISTINCT member.month,base.business_date
  FROM members member JOIN mart.analytics_aggregate_bases base ON base.tenant_id=$1 AND base.partition_id=member.partition_id
  WHERE member.family='facts' AND base.kind='snapshot'
 ),snapshots AS (
  SELECT 'facts'::text family,'snapshot'::text kind,business_date period,business_date through FROM fact_cutoffs
  UNION SELECT sources.family,'snapshot',observation.business_day,observation.business_day
  FROM (SELECT DISTINCT family FROM members WHERE family<>'facts') sources
  CROSS JOIN LATERAL mart.prepared_snapshot_observations($1,$2,sources.family) observation
 ),empty_facts AS (
  SELECT member.family,'snapshot'::text kind,cutoff.through period,cutoff.through
  FROM members member CROSS JOIN LATERAL (
   SELECT least((member.month+interval '1 month - 1 day')::date,max((release->'period'->>'to')::date)) through
   FROM jsonb_array_elements(member.capabilities->'releases') release
  ) cutoff
  WHERE member.family='facts' AND cutoff.through>=member.month AND EXISTS(
   SELECT 1 FROM jsonb_array_elements(member.mappings) mapping,jsonb_array_elements(mapping->'measures') rule
   JOIN mart.measure_definitions definition ON definition.measure_id=rule->>'measureId' WHERE definition.kind='snapshot')
  AND NOT EXISTS(SELECT 1 FROM fact_cutoffs WHERE month=member.month)
 ) SELECT * FROM events UNION SELECT * FROM snapshots UNION SELECT * FROM empty_facts
) inventory GROUP BY family,kind ORDER BY family,kind`,['el-dabboos-iq',revision])).rows;
 const storage=(await pool.query("SELECT pg_database_size(current_database())::text database_bytes,pg_total_relation_size('mart.prepared_cells')::text prepared_cells_bytes,EXISTS(SELECT 1 FROM mart.prepared_activation WHERE tenant_id='el-dabboos-iq') prepared_active")).rows[0];
 await pool.query('COMMIT');
 console.log(JSON.stringify({stage:'Metadata inventory completed; deployed function unchanged',ms:Math.round(performance.now()-began),revision,chunks,totalChunks:chunks.reduce((total,row)=>total+row.chunks,0),...storage}));
}catch(error){await pool.query('ROLLBACK').catch(()=>{});console.error(JSON.stringify({stage:'Inventory stopped; no changes',code:error.code??null}));process.exitCode=1;}
finally{clearTimeout(deadline);await pool.end();}
JS
)
```

## Company result and isolated release scope

On the deployed `401456b` image, the original inventory hit its 120-second statement deadline. The replacement SELECT completed in **1,670 ms**, using the existing read-only, non-bypass ingestion identity in `el_dabboos_analytics_staging`. Trusted revision: `5f9efbc7-5ff4-4e60-8557-295f23b1f341`.

| Family | Event chunks | Snapshot chunks |
| --- | ---: | ---: |
| Business | 29 | 29 |
| Facts | 29 | 28 |
| Exact Finance | 0 | 28 |
| Review | 28 | 28 |
| Total | 86 | 113 |

There are **199 required chunks**, not 114 (the latter is native serving membership). Prepared serving is inactive. Existing prepared-cells relation occupies only 32,768 bytes; no company preparation was performed. Available filesystem space was 20,834,230,272 bytes. The inventory does not establish final prepared storage or chunk execution times.

Forward migration **056_prepared_chunk_discovery.sql** replaces only chunk discovery with the measured metadata query. Migrations 053–055 retain their applied checksums. This does not change metric calculations, source contracts, controls, request deadlines, timer definitions or activation. The old and new inventories match on synthetic empty, historical and current populations; existing prepared-serving/workspace coverage additionally checks exact outputs, empty Finance cutoffs, scope and validation guards. The same metadata SELECT returned the existing 43 local chunks in 2,140 ms.

The unfinished source-refresh candidate remains excluded. Its unpublished migration numbers must be resequenced against this release when that separate work resumes; no applied history may be edited.
