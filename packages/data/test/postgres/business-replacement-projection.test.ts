import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {enabled} from './support.ts';
import {deltaFixture,deltaSource,changedInvoice,observedFact} from './business-delta-fixture.ts';
import {exposeBusinessDeltaMonth} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

type Fixture=Awaited<ReturnType<typeof deltaFixture>>;
async function compareCells(fixture:Fixture,revision:string,kind:'event'|'snapshot'){
 return tenantTransaction(fixture.db.ingestor,'a',async client=>{
  const parameters=(await client.query(`SELECT current.configuration config,previous.configuration base_config
   FROM mart.prepared_bindings binding JOIN mart.prepared_datasets current USING(tenant_id,data_id)
   JOIN mart.analytics_serving_revisions revision USING(tenant_id,revision_id)
   JOIN mart.prepared_bindings parent ON parent.tenant_id=revision.tenant_id AND parent.revision_id=revision.parent_revision
    AND parent.family='business' AND parent.kind=binding.kind
   JOIN mart.prepared_datasets previous ON previous.tenant_id=parent.tenant_id AND previous.data_id=parent.data_id
   WHERE binding.tenant_id='a' AND binding.revision_id=$1 AND binding.family='business' AND binding.kind=$2
   ORDER BY binding.period DESC,parent.period DESC LIMIT 1`,[revision,kind])).rows[0];
  const args=['a',revision,JSON.stringify(parameters.config),JSON.stringify(parameters.base_config)];
  const order=' ORDER BY time_grain,grain_id,business_date,measure_id,dimensions::text';
  const expected=await client.query('SELECT * FROM mart.synthetic_reference_replacement($1,$2,$3,$4)'+order,args);
  const actual=await client.query('SELECT * FROM mart.business_prepared_replacement_cells($1,$2,$3,$4)'+order,args);
  assert.deepEqual(actual.rows,expected.rows,'cells, counts, extrema, provenance and labels must match the original query');
  return actual.rows;
 });
}
test('projected replacement cells equal original cells for moved corrections, deletion and empty snapshots',{skip:!enabled},async()=>{
 const fixture=await deltaFixture();try{
  const migration=await readFile(new URL('../../migrations/postgres/071_business_prepared_impacts.sql',import.meta.url),'utf8');
  const reference='CREATE FUNCTION mart.synthetic_reference_replacement'+migration.split('CREATE FUNCTION mart.business_prepared_replacement_cells')[1]!.split('$$;')[0]+'$$;';
  await fixture.db.admin.query(reference);
  const cutoff='2026-10-20T10:00:00.000Z';
  const moved=changedInvoice(fixture.initial,cutoff).map(fact=>observedFact(fact,cutoff,'2026-10-14'));
  const changed=await exposeBusinessDeltaMonth(fixture.db.ingestor,deltaSource(fixture.source,cutoff,[{object:'command_invoice',id:'10',facts:moved},{object:'command_invoice',id:'11',facts:changedInvoice(fixture.initial,cutoff,'11')}]));
  const corrected=await compareCells(fixture,changed.revisionId,'event');
  assert.ok(corrected.some(cell=>cell.minimum!==null&&cell.maximum!==null));
  const removed=await exposeBusinessDeltaMonth(fixture.db.ingestor,deltaSource(fixture.source,'2026-10-20T11:00:00.000Z',[{object:'command_invoice',id:'10',facts:[]}]));
  await compareCells(fixture,removed.revisionId,'event');
  const empty=deltaSource(fixture.source,'2026-10-21T10:00:00.000Z',[{object:'command_receivable',id:'10',facts:[]}],['command_receivable']);
  const snapshot=await exposeBusinessDeltaMonth(fixture.db.ingestor,{...empty,replaceObjects:['command_receivable']});
  await compareCells(fixture,snapshot.revisionId,'snapshot');
 }finally{await fixture.db.close();}
});
