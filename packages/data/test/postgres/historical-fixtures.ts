import type { SourceMapping,ReconciliationCase } from '@el-dabboos/domain';
import { PostgresMappingReleases } from '../../src/postgres/mapping-releases.ts';
import { PostgresMartWriter } from '../../src/postgres/writer.ts';
import { PostgresExtractionRuns } from '../../src/postgres/extractions.ts';
import { PostgresReconciliation } from '../../src/postgres/reconciliation.ts';
import { PostgresReleaseCertification } from '../../src/postgres/release-certification.ts';
import { PostgresDerivedMetricCertification } from '../../src/postgres/derived-certification.ts';
import {receivableMeasures} from '../../src/receivable-aging.ts';
import { tenantTransaction } from '../../src/postgres/session.ts';
import { database } from './support.ts';
import { mapping,batch,fact,evidence,clock } from './fixtures.ts';
type Database=Awaited<ReturnType<typeof database>>;
export async function historicalMember(db:Database,month:string,kind:'events'|'aging',value:string,options?:string|{publicationOnly:true;finance?:boolean;customer?:boolean;orders?:string;approvalReference?:string}) {
  const orders=typeof options==='string'?options:options?.orders;
  const from=`${month}-01`,to=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10);
  const datasetId=`synthetic-${month}-${kind}`,measureId=kind==='events'?(orders?'order_revenue':'revenue'):'net_aged_receivable';
  const baseline=mapping('a');
  const candidate:SourceMapping={...baseline,datasetId,mappingId:kind,approval:{status:'pending'},measures:baseline.measures.filter(rule=>rule.measureId===(kind==='events'?'revenue':'outstanding_amount')).map(rule=>({...rule,measureId,dimensionMappings:kind==='events'?rule.dimensionMappings:{}})),capabilities:[{metric:measureId,dimensions:kind==='events'?['branch','month']:[]}]};
  const finance=typeof options==='object' && options.finance;
  if(finance){candidate.measures=receivableMeasures.map(measureId=>({...candidate.measures[0]!,measureId}));candidate.capabilities=receivableMeasures.map(metric=>({metric,dimensions:[]}));}
  const customer=typeof options==='object' && options.customer;
  if(customer){candidate.measures=candidate.measures.map(rule=>({...rule,dimensionMappings:{customer:'Synthetic stable customer'}}));candidate.capabilities=[{metric:measureId,dimensions:['customer','month']}];}
  if(orders) {
    candidate.capabilities=[{metric:measureId,dimensions:['salesperson','month']}];
    candidate.measures=[...candidate.measures,{...baseline.measures.find(rule=>rule.measureId==='order_count')!}];
    candidate.measures=candidate.measures.map(rule=>({...rule,dimensionMappings:{salesperson:'test salesperson'}}));
    candidate.capabilities=[...candidate.capabilities,{metric:'order_count',dimensions:['salesperson','month']},{metric:'average_confirmed_order_value',dimensions:['salesperson','month']}];
  }
  const releases=new PostgresMappingReleases(db.migrator);await releases.registerCandidate(candidate);
  const extractionId=datasetId,batchId=datasetId;
  await new PostgresExtractionRuns(db.migrator,{a:['1']}).begin({tenantId:'a',datasetId,sourceId:'fixture',mappingId:kind,mappingVersion:'1',extractionId,sourceObjects:['fixture'],companyIds:['1'],from,to,sourceAsOf:'2026-10-01T10:00:00.000Z',frozenRevision:'freeze-1',freezeReference:'synthetic-only',completeness:'complete_scope'});
  const facts=candidate.measures.filter(rule=>rule.measureId!=='order_count').map(rule=>fact(datasetId,{datasetId,mappingId:kind,batchId,measureId:rule.measureId,businessDate:to,value:finance&&!['net_aged_receivable','aged_at_date','gross_open_receivable_components'].includes(rule.measureId)?'0.000000':value,dimensions:kind==='events'?(customer?{customer:'historical-only'}:orders?{salesperson:'cairo'}:{branch:'cairo'}):{},...(customer?{displayLabels:{customer:'Historical Customer'}}:{}),...(kind==='aging'?{entityId:'company-1'}:{})}));
  if(orders)facts.push(fact(datasetId,{datasetId,mappingId:kind,batchId,measureId:'order_count',businessDate:to,value:orders,dimensions:{salesperson:'cairo'}}));
  await new PostgresMartWriter(db.migrator,{a:['1']},clock).commit({...batch(batchId,1),datasetId,mappingId:kind,companyIds:['1']},[{facts}],{...evidence,completeness:'complete_scope',page:{extractionId,pageNumber:1}});
  const cases:ReconciliationCase[]=[null,...(kind==='events'?[customer?'customer' as const:orders?'salesperson' as const:'branch' as const]:[])].map(grouping=>({tenantId:'a',datasetId,mappingVersion:'1',caseId:`${datasetId}-${grouping ?? 'summary'}`,measureId,sourceReportReference:'SYNTHETIC independent control',frozenRevision:'freeze-1',batchIds:[batchId],from,to,grouping,groupKey:grouping?(customer?'historical-only':'cairo'):null,expectedValue:value,actualValue:value,expectedCount:'1',actualCount:'1',tolerance:{status:'approved',absoluteValue:'0.000000',absoluteCount:'0',approvalReference:'SYNTHETIC ONLY'}}));
  if(orders)cases.push(...cases.map(control=>({...control,caseId:`${control.caseId}-count`,measureId:'order_count' as const,expectedValue:orders,actualValue:orders})));
  if(finance)cases.push(...facts.filter(row=>row.measureId!==measureId).map(row=>({...cases[0]!,caseId:`${datasetId}-${row.measureId}`,measureId:row.measureId,expectedValue:row.value,actualValue:row.value})));
  for (const control of cases) await new PostgresReconciliation(db.migrator).record([control],'IQD');
  const reference=typeof options==='object'&&options.approvalReference?options.approvalReference:`synthetic-cert-${datasetId}`,caseIds=cases.map(control=>control.caseId);
  await new PostgresReleaseCertification(db.migrator).record({tenantId:'a',datasetId,mappingVersion:'1',reference,approverReference:'SYNTHETIC ONLY',approvedAt:clock().toISOString(),companyIds:['1'],from,to,caseIds,technicalReference:'SYNTHETIC exact controls',evidenceKind:'authorized_business_approval',approvedValues:[{measureId,value}],businessSemantics:['SYNTHETIC ONLY']});
  await releases.approve({tenantId:'a',datasetId,caseIds,reference,approvedAt:clock().toISOString()});
  if(orders)for(const grouping of [null,'salesperson' as const])await new PostgresDerivedMetricCertification(db.migrator).record({tenantId:'a',datasetId,mappingVersion:'1',metric:'average_confirmed_order_value',grouping,from,to,caseIds:cases.filter(control=>control.grouping===grouping).map(control=>control.caseId),reference:`${datasetId}-ratio-${grouping??'summary'}`,approvalReference:'SYNTHETIC ONLY',approvedAt:clock().toISOString(),businessSemantics:'SYNTHETIC governed ratio',technicalReference:'SYNTHETIC exact bases'});
  if(typeof options!=='object')await tenantTransaction(db.migrator,'a',client=>client.query('INSERT INTO mart.historical_release_members VALUES($1,$2,$3,$4,$5,$6)',['a','synthetic-history',datasetId,from,to,kind]));
  return datasetId;
}
