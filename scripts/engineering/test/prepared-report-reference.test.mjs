import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {referenceAnalyticsResultForWindow,referenceExecutionForWindow} from '../../../docs/qa/maintenance/prepared-report-reference-2026-10-19.mjs';
import {canonical,differences} from '../../../docs/qa/maintenance/prepared-report-acceptance-2026-10-19.mjs';
const window={from:'2025-01-01',to:'2026-12-31'};
const result={metric:'review_customer_balance',rows:[{key:'synthetic',value:0},{key:'nullable',value:null}],metadata:{executedAt:'synthetic-time',dataThrough:'2024-12-31',snapshotAsOf:'2024-12-31',sourceAsOf:'2026-10-19T07:00:00Z',dimensionLabels:{synthetic:'Synthetic'},coverage:{from:'2024-06-01',through:'2026-10-19',status:'partial',cutoff:'2026-10-19T07:00:00Z'},release:{datasetId:'synthetic-source',mappingId:'synthetic-map',certificationReference:'synthetic-cert',period:{from:'2024-06-01',to:'2026-10-15'}}}};
function execution(value){return {widgetResults:{widget:{status:'success',alignedRows:[{key:'synthetic',values:{balance:0}}],seriesResults:{balance:{status:'success',result:value}}}},metadata:{servingRevision:'synthetic-revision'}};}
test('report reference projects only the registered eligibility dates and retains an independently owned exact result',()=>{
 const original=structuredClone(result),expected=referenceAnalyticsResultForWindow(result,window);
 assert.deepEqual(result,original);assert.notEqual(expected,result);
 const known=structuredClone(original);known.metadata.coverage.from=window.from;known.metadata.release.period.from=window.from;
 assert.deepEqual(expected,known);
 const projected=referenceExecutionForWindow(execution(result),window);
 assert.deepEqual(projected,execution(known));
 assert.deepEqual(differences(projected,execution(known)),[]);
 assert.ok(differences(execution(result),projected).some(row=>row.fields.includes('metadata.coverage')));
 assert.deepEqual(canonical(referenceAnalyticsResultForWindow(result)),canonical(result));
});
test('full equality still refuses changed values, nulls, membership, labels, cutoff, status and source authority after date projection',()=>{
 const expected=referenceExecutionForWindow(execution(result),window);
 for(const mutate of [
  value=>{value.rows[0].value=1;},value=>{value.rows[1].value=0;},value=>{value.rows.pop();},
  value=>{value.metadata.dimensionLabels.synthetic='Wrong';},value=>{value.metadata.coverage.cutoff='2026-10-18T07:00:00Z';},
  value=>{value.metadata.coverage.status='complete';},value=>{value.metadata.release.datasetId='different';},
  value=>{value.metadata.release.mappingId='different';},value=>{value.metadata.release.certificationReference='different';},
  value=>{value.metadata.snapshotAsOf='2025-01-01';},value=>{value.metadata.sourceAsOf='2026-10-18T07:00:00Z';}
 ]){
  const actual=referenceAnalyticsResultForWindow(result,window);mutate(actual);
  assert.ok(differences(expected,execution(actual)).length>0);
 }
});
test('opening snapshot reporting period moves into eligibility while its accepted cutoff and source identifiers stay exact',()=>{
 const opening=structuredClone(result);delete opening.metadata.coverage;
 opening.metadata.release.selectionSemantics='latest_snapshot';opening.metadata.release.period={from:'2024-12-31',to:'2024-12-31'};
 const expected=referenceAnalyticsResultForWindow(opening,window);
 assert.deepEqual(expected.metadata.release.period,{from:window.from,to:window.from});
 assert.equal(expected.metadata.snapshotAsOf,'2024-12-31');assert.equal(expected.metadata.release.datasetId,'synthetic-source');
 const invalid=structuredClone(opening);invalid.metadata.release.selectionSemantics='period';
 assert.throws(()=>referenceAnalyticsResultForWindow(invalid,window),/intersection/);
 assert.throws(()=>referenceAnalyticsResultForWindow(result,{from:'2025-02-30',to:'2026-12-31'}),/Valid/);
});


test('durable company acceptance embeds the tested exact comparison, preserves the native diff and pins the catalog and bounds',()=>{
 const base=new URL('../../../docs/qa/maintenance/',import.meta.url);
 const reference=readFileSync(new URL('prepared-report-reference-2026-10-19.mjs',base),'utf8').replace("import assert from 'node:assert/strict';\n",'');
 const acceptance=readFileSync(new URL('prepared-report-acceptance-2026-10-19.mjs',base),'utf8').split('\n').filter(line=>!line.startsWith('import {latencyGate}')&&!line.startsWith('import {referenceExecutionForWindow}')).join('\n');
 const command=readFileSync(new URL('prepared-company-acceptance-2026-10-19.sh',base),'utf8');
 assert.ok(command.includes(reference));assert.ok(command.includes(acceptance));
 assert.match(command,/expectedReports:27/);assert.match(command,/expectedBindings:154/);
 assert.match(command,/nativeDifferences:nativeDiff/);assert.match(command,/RuntimeMaxSec=960/);
 assert.match(command,/Math.min\(configuredTimeout,15000\)/);assert.match(command,/600000/);
 assert.match(command,/default_transaction_read_only=on/);
 assert.doesNotMatch(command,/activatePreparedRevision|preparePublishedRevision|ALTER SYSTEM/);
});
