import {validateProductionFact} from '@el-dabboos/domain';
import type {ProductionFact,SourceMapping,FactMeasureId,DimensionId} from '@el-dabboos/domain';
import {exactOdooAmount} from '../odoo/mapper.ts';
export interface ReviewSourceRow {
 source_record_id:string;source_object:string;component_id:string;business_date:string;company_id:string;currency:string;
 measure_id:FactMeasureId;value:string;invalid:boolean;
 customer:string|null;salesperson:string|null;business_line:string|null;product:string|null;product_category:string|null;labels?:ProductionFact['displayLabels'];
}
export function mapReviewRow(row:ReviewSourceRow,mapping:SourceMapping,source:{cutoff:string;revision:string;companyIds:readonly string[]}):ProductionFact {
 if(row.invalid||row.currency!==mapping.reportingCurrency||!source.companyIds.includes(row.company_id))throw new Error('Review source quality/scope failure');
 const rule=mapping.measures.find(rule=>rule.measureId===row.measure_id&&rule.sourceObject===row.source_object);
 if(!rule)throw new Error('Review source measure mapping required');
 const dimensions:Partial<Record<DimensionId,string>>={};
 for(const dimension of Object.keys(rule.dimensionMappings) as Array<keyof Pick<ReviewSourceRow,'customer'|'salesperson'|'business_line'|'product'|'product_category'>>){
  const id=row[dimension];dimensions[dimension]=id===null?'unassigned':`${mapping.sourceId}:${dimension==='business_line'?row.company_id+':':''}${id}`;
 }
 const snapshot=row.measure_id==='receivables_due_for_collection';
 const value=exactOdooAmount(row.value),monetary=!['collection_amount_days','collection_applied_amount','order_untaxed_value'].includes(row.measure_id);
 const fact:ProductionFact={tenantId:mapping.tenantId,datasetId:mapping.datasetId,measureId:row.measure_id,kind:snapshot?'snapshot':'event',businessDate:row.business_date,value,dimensions,
 sourceId:mapping.sourceId,sourceObject:row.source_object,sourceRecordId:row.source_record_id,componentId:row.component_id,sourceVersion:source.cutoff,sourceRevision:String(BigInt(Date.parse(source.cutoff))*1000n),
 mappingId:mapping.mappingId,mappingVersion:mapping.mappingVersion,batchId:mapping.datasetId,sourceAsOf:source.cutoff,frozenRevision:source.revision,status:'active',
 ...(row.labels?{displayLabels:row.labels}:{}),
 ...(snapshot?{entityId:`${mapping.sourceId}:${row.company_id}:${row.source_record_id}`} : {}),
 ...(monetary?{currency:{mode:'native',transactionCurrency:row.currency,transactionValue:value,reportingCurrency:mapping.reportingCurrency,policyReference:rule.currencyPolicy}}:{})};
 validateProductionFact(fact,mapping);return fact;
}
