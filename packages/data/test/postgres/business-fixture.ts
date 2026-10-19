import {semanticCatalog,requiredMeasures,validateProductionFact} from '@el-dabboos/domain';
import type {ProductionFact,FactMeasureId} from '@el-dabboos/domain';
import {withSalesCommandMapping} from '../../src/business/sales-command-mapping.ts';
import {businessMapping} from '../../src/business/definitions.ts';
import {reviewMapping} from '../../src/review/definitions.ts';
import type {ReviewControl} from '../../src/review/source.ts';
const values:Partial<Record<FactMeasureId,string>>={period_net_sales:'120.000000',period_invoice_sales:'125.000000',period_invoice_refunds:'5.000000',period_cash_collections:'150.000000',period_collection_sales:'120.000000',customer_period_sales:'120.000000',review_customer_balance:'30.000000',internal_stock_quantity:'13.000000'};
export function fixture(month='2026-09',current=false,family:'review'|'business'='business',salesCommand=false){
 const original=(family==='business'?businessMapping:reviewMapping)({tenantId:'a',sourceId:'fixture',currency:'IQD',timeZone:'Asia/Baghdad',datasetId:`SYNTHETIC BUSINESS ${month}`,current});
 const mapping=salesCommand?withSalesCommandMapping(original,current):original;
 const end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10),cutoff='2026-11-02T09:00:00.000Z';
 const facts:ProductionFact[]=mapping.measures.map(rule=>{
  const snapshot=Object.values(semanticCatalog).some(metric=>metric.semantics.kind==='snapshot'&&metric.semantics.measure===rule.measureId),monetary=Object.values(semanticCatalog).some(metric=>metric.type==='currency'&&metric.semantics.kind!=='ratio'&&requiredMeasures(metric.id).includes(rule.measureId));
  const dimensions=Object.fromEntries(Object.keys(rule.dimensionMappings).map(dimension=>[dimension,`fixture:${dimension}`]));
  const value=rule.measureId.endsWith('_date')?`${Date.parse(month+'-05T00:00:00Z')/86400000}.000000`:values[rule.measureId]??'1.000000';
  const fact:ProductionFact={tenantId:'a',datasetId:mapping.datasetId,measureId:rule.measureId,kind:snapshot?'snapshot':'event',businessDate:snapshot?end:month+'-15',value,dimensions,sourceId:'fixture',sourceObject:rule.sourceObject,sourceRecordId:'10',componentId:'whole',sourceVersion:cutoff,sourceRevision:'1',mappingId:mapping.mappingId,mappingVersion:mapping.mappingVersion,batchId:mapping.datasetId,sourceAsOf:cutoff,frozenRevision:'SYNTHETIC ONLY',status:'active',...(snapshot?{entityId:`${rule.sourceObject}:10`}:{}),...(monetary?{currency:{mode:'native',transactionCurrency:'IQD',transactionValue:value,reportingCurrency:'IQD',policyReference:rule.currencyPolicy}}:{})};
  validateProductionFact(fact,mapping);return fact;
 });
 const controls:ReviewControl[]=facts.flatMap(fact=>[{measure:fact.measureId,dimensions:fact.dimensions,value:fact.value,count:'1'},{measure:fact.measureId,dimensions:null,value:fact.value,count:'1'}]);
 return {tenantId:'a',month,mapping,cutoff,revision:'SYNTHETIC ONLY',facts:pages(facts),controls:async()=>controls,assertAlive:async()=>{}};
}
export async function* pages(facts:ProductionFact[]){for(let offset=0;offset<facts.length;offset+=1000)yield facts.slice(offset,offset+1000);}
