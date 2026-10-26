import test from 'node:test';
import assert from 'node:assert/strict';
import {categoricalDimensions,factMeasureIds,requiredMeasures,semanticCatalog} from '../src/catalog.ts';
import {validateSourceMapping} from '../src/production-data.ts';
import type {SourceMapping} from '../src/production-data.ts';

function mapping():SourceMapping {
 return {tenantId:'synthetic',sourceId:'fixture',datasetId:'release',mappingId:'test',mappingVersion:'1',businessBasis:'SYNTHETIC ONLY',businessOwner:'synthetic',reportingCurrency:'IQD',approval:{status:'pending'},
  measures:factMeasureIds.map(measureId=>({measureId,sourceObject:'fixture',grain:'record',eligibleStates:['active'],recognitionRule:'date',timeZone:'UTC',amountBasis:'signed',taxTreatment:'none',signConvention:'signed',identityRule:'record',correctionRule:'replace',currencyPolicy:'native',dimensionMappings:{}})),
  capabilities:[{metric:'order_count',dimensions:[]}]};
}

test('dimension index preserves the catalog intersection for every measure and categorical dimension',()=>{
 const candidate=mapping();
 for(const rule of candidate.measures)for(const dimension of categoricalDimensions){
  rule.dimensionMappings={[dimension]:'synthetic identity'};
  const consumers=Object.values(semanticCatalog).filter(metric=>requiredMeasures(metric.id).includes(rule.measureId));
  const allowed=consumers.every(metric=>metric.dimensions.includes(dimension));
  if(allowed)assert.doesNotThrow(()=>validateSourceMapping(candidate),`${rule.measureId}/${dimension}`);
  else assert.throws(()=>validateSourceMapping(candidate),/capability/,`${rule.measureId}/${dimension}`);
  rule.dimensionMappings={};
 }
});

test('validating a mapping never caches approval of a subsequently mutated mapping',()=>{
 const candidate=mapping();validateSourceMapping(candidate);
 candidate.reportingCurrency='invalid';assert.throws(()=>validateSourceMapping(candidate),/currency/);
 candidate.reportingCurrency='IQD';validateSourceMapping(candidate);
 candidate.measures[0]!.dimensionMappings={unexpected:'identity'} as SourceMapping['measures'][number]['dimensionMappings'];
 assert.throws(()=>validateSourceMapping(candidate),/capability/);
});
