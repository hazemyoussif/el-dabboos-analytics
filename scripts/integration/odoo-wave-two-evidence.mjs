import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { compareFrozenGroups } from './wave-two-group-controls.mjs';
const { Pool } = createRequire(new URL('../../packages/data/package.json', import.meta.url))('pg');
const [operatorEnvironment, outputDirectory, sourceControlsFile] = process.argv.slice(2);
if (!operatorEnvironment || !outputDirectory) throw new Error('Protected operator env and NEW private output directory required; optional preserved Wave 1 source-control JSON');
const tenant = 'el-dabboos-iq';
const dataset = 'el-dabboos-staging-comparison-202609-v1';
const from = '2026-09-01', to = '2026-09-30';
const recipes = new Set(['net_invoiced_revenue', 'invoiced_revenue', 'refund_value', 'order_revenue', 'order_count']);
async function preservedSource() {
 if (!sourceControlsFile) return null;
 if ((await stat(sourceControlsFile)).size > 32 * 1024 * 1024) throw new Error('Source-control artifact bound');
 const bytes = await readFile(sourceControlsFile);
 const artifact = JSON.parse(bytes);
 if (artifact.tenantId !== tenant || artifact.datasetId !== dataset || artifact.period?.from !== from || artifact.period?.to !== to || artifact.period?.timeZone !== 'Asia/Baghdad' || artifact.sourceSnapshot?.read_only !== 'on' || !Number.isFinite(Date.parse(artifact.sourceSnapshot.observed_at)) || !Array.isArray(artifact.controls)) throw new Error('Independent source-control provenance/scope required');
 return { artifact, sha256: createHash('sha256').update(bytes).digest('hex') };
}
async function inspect(client) {
 const scope = [tenant, dataset];
 const mapping = (await client.query('SELECT specification,approval_status,cardinality(approval_case_ids) approval_cases FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2', scope)).rows[0];
 if (!mapping) throw new Error('Existing immutable release required');
 const controls = (await client.query("SELECT specification->>'measureId' metric,specification->>'grouping' grouping,status,group_completeness,count(*)::text cases FROM mart.reconciliation_evidence WHERE tenant_id=$1 AND dataset_id=$2 GROUP BY 1,2,3,4 ORDER BY 1,2", scope)).rows;
 const facts = (await client.query("SELECT measure_id metric,count(*)::text facts,count(DISTINCT customer)::text customer_groups,count(*) FILTER(WHERE customer IS NULL OR customer='unassigned')::text unknown_customer,count(*) FILTER(WHERE product IS NOT NULL)::text product_facts,count(*) FILTER(WHERE transaction_evidence IS NULL)::text missing_transaction FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 AND business_date BETWEEN $3::date AND $4::date GROUP BY 1 ORDER BY 1", [...scope, from, to])).rows;
 const fields = (await client.query('SELECT DISTINCT jsonb_object_keys(transaction_evidence) field FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 ORDER BY 1', scope)).rows.map(row => row.field);
 return { approvalCases: mapping.approval_cases, mapping: { mappingId: mapping.specification.mappingId, version: mapping.specification.mappingVersion, measures: mapping.specification.measures.map(measure => ({ id: measure.measureId, object: measure.sourceObject, dimensions: measure.dimensionMappings })), capabilities: mapping.specification.capabilities }, controls, facts, transactionFields: fields };
}
async function replay(client, preserved) {
 if (!preserved) return [];
 const results = [];
 for (const metric of recipes) {
  const control = preserved.artifact.controls.filter(item => item.metric === metric && item.grouping === 'customer');
  const total = preserved.artifact.controls.filter(item => item.metric === metric && item.grouping === null);
  if (control.length !== 1 || total.length !== 1 || total[0].sourceCases?.length !== 1 || !control[0].sourceCases?.length) throw new Error('Complete independent customer and summary control sets required');
  const scope = [tenant, dataset, metric, from, to];
  const groups = (await client.query('SELECT customer key,sum(value)::numeric(30,6)::text value,count(*)::text count FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=$3 AND business_date BETWEEN $4::date AND $5::date GROUP BY customer ORDER BY customer LIMIT 5001', scope)).rows;
  const sum = (await client.query('SELECT coalesce(sum(value),0)::numeric(30,6)::text value,count(*)::text count FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=$3 AND business_date BETWEEN $4::date AND $5::date', scope)).rows[0];
  const expected = control[0].sourceCases.map(row => ({ key: row.groupKey, value: row.expectedValue, count: row.expectedCount }));
  const expectedTotal = total[0].sourceCases[0];
  const result = compareFrozenGroups({ source: expected, mart: groups, sourceTotal: { value: expectedTotal.expectedValue, count: expectedTotal.expectedCount }, martTotal: sum, identityPrefix: 'el-dabboos-odoo18-pg:' });
  // Full identity vectors remain protected; stdout contains no customer keys or names.
  results.push({ metric, grouping: 'customer', ...result });
 }
 return results;
}
const output = resolve(outputDirectory);
await mkdir(output, { mode: 0o700 }); // Existing directories are refused; no evidence overwrite.
const source = await preservedSource();
const environment = parseEnv(await readFile(operatorEnvironment, 'utf8'));
if (!environment.MART_MIGRATOR_URL) throw new Error('Explicit operator mart URL required');
const pool = new Pool({ connectionString: environment.MART_MIGRATOR_URL, max: 1, connectionTimeoutMillis: 3000 });
let client;
try {
 client = await pool.connect();
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await client.query("SELECT set_config('mart.tenant_id',$1,true),set_config('statement_timeout','15000',true),set_config('lock_timeout','1000',true)", [tenant]);
 if ((await client.query("SELECT current_setting('transaction_read_only') read_only")).rows[0]?.read_only !== 'on') throw new Error('Read-only transaction required');
 const audit = await inspect(client);
 const comparisons = await replay(client, source);
 await client.query('ROLLBACK');
 const report = { tenantId: tenant, datasetId: dataset, from, to, observedAt: new Date().toISOString(), readOnly: true, sourceControlSha256: source?.sha256 ?? null, sourceControlObservedAt: source?.artifact.sourceSnapshot.observed_at ?? null, independentSourceControlsPresent: !!source, audit, comparisons, newReconciliationCases: 0, newApprovals: 0, newPublishedCapabilities: 0 };
 await writeFile(join(output, 'evidence.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
 console.log(JSON.stringify({ output, independentSourceControlsPresent: !!source, existingCases: audit.approvalCases, customerCases: audit.controls.filter(row => row.grouping === 'customer').reduce((total, row) => total + Number(row.cases), 0), comparedGroups: comparisons.reduce((total, result) => total + result.sourceGroups, 0), allComparedExact: comparisons.length ? comparisons.every(result => result.technicalExact) : null, newPublishedCapabilities: 0 }));
 if (comparisons.some(result => !result.technicalExact)) process.exitCode = 1;
} catch (error) {
 console.error(JSON.stringify({ failed: true, code: error.code ?? 'wave_two_evidence_check' }));
 process.exitCode = 1;
} finally {
 if (client) { await client.query('ROLLBACK').catch(() => {}); client.release(); }
 await pool.end();
}
