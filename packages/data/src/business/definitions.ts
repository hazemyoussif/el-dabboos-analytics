import {salesCommandSourceObject} from './sales-command-mapping.ts';
import {createHash} from 'node:crypto';
import {businessCatalog,businessMetricIds,semanticCatalog,compatibleQuantityMetrics,requiredMeasures,validateSourceMapping,timeDimensions} from '@el-dabboos/domain';
import type {BusinessMetricId,SourceMapping,PublishedAnalyticsCapabilities,FactMeasureId} from '@el-dabboos/domain';
export const currentBusinessMetrics:readonly BusinessMetricId[]=['supplier_payable_next_month','receivables_due_next_month','internal_stock_quantity','expired_stock_quantity','near_expiry_stock_quantity','unknown_expiry_stock_quantity','negative_stock_positions','delivered_unbilled_quantity','received_unbilled_quantity','order_age_exceptions','book_cash_balance','supplier_payable_due','supplier_payable_unknown_due','supplier_advance_balance'];
export function businessDefinitionVersion(){return createHash('sha256').update(JSON.stringify(businessCatalog)).digest('hex');}
export function businessSourceObject(measure:FactMeasureId){
 const command=salesCommandSourceObject(measure);if(command)return command;
 if(measure==='invoiced_product_quantity')return 'business_invoice_quantity';
 if(measure.startsWith('period_cash'))return 'business_cash';
 if(measure.startsWith('period_'))return 'business_invoice';
 if(measure.startsWith('positive_')||['review_customer_balance','receivable_unknown_due','receivables_due_next_month'].includes(measure))return 'business_receivable';
 if(measure.includes('stock_'))return 'business_stock';
 if(measure==='physical_return_quantity'||measure==='internal_transfer_quantity'||measure==='delivered_customer_quantity')return 'business_movement';
 if(measure==='delivered_unbilled_quantity')return 'business_sale_exception';
 if(measure==='received_unbilled_quantity')return 'business_purchase_exception';
 if(measure==='book_cash_balance')return 'business_cash_ledger';
 if(measure.startsWith('supplier_'))return 'business_payable';
 return 'business_customer';
}
export function businessMapping(scope:{tenantId:string;sourceId:string;currency:string;timeZone:string;datasetId:string;current:boolean}):SourceMapping {
 if(scope.currency!=='IQD')throw new Error('Business-purpose source contracts require IQD');
 const metrics=businessMetricIds.filter(metric=>scope.current||!currentBusinessMetrics.includes(metric));
 const measures=[...new Set(metrics.flatMap(requiredMeasures))];
 const mapping:SourceMapping={tenantId:scope.tenantId,sourceId:scope.sourceId,datasetId:scope.datasetId,mappingId:'business-purpose-v1',mappingVersion:'1',businessBasis:'Source-native business purposes; unknown classifications retained; technical exposure before Finance review',businessOwner:'Finance post-exposure review',reportingCurrency:scope.currency,approval:{status:'pending'},
 measures:measures.map(measure=>({measureId:measure,sourceObject:businessSourceObject(measure),grain:'Stable source component; customer aggregates only where explicitly defined',eligibleStates:['posted','sale','done','purchase'],recognitionRule:'Event business date or explicit cutoff; current-only recipes excluded from past months; shared lots allowed only with matching product and company-scoped quant',timeZone:scope.timeZone,amountBasis:'Exact company-currency numerics; compatible product base UOM; dates encoded as UTC epoch days',taxTreatment:'Invoice sales untaxed; settlement and ledger balances include accounting tax',signConvention:'Signed net sales/balances; positive cash/credit-note magnitudes; stock negatives retained',identityRule:'source/object/component/measure; snapshot entity per component',correctionRule:'New immutable business partition; preserve every other serving family',currencyPolicy:`native-${scope.currency}`,dimensionMappings:Object.fromEntries(businessMetricIds.filter(metric=>requiredMeasures(metric).includes(measure)).map(metric=>businessCatalog[metric].dimensions).reduce((shared,next)=>shared.filter(dimension=>next.includes(dimension))).filter(dimension=>!timeDimensions.includes(dimension)).map(dimension=>[dimension,businessDimensionRule(dimension,businessSourceObject(measure))]))})),
 capabilities:metrics.map(metric=>({metric,dimensions:businessCatalog[metric].dimensions.filter(dimension=>timeDimensions.includes(dimension)||requiredMeasures(metric).every(measure=>Object.hasOwn(mappingRuleDimensions(measure),dimension)))}))};
 function mappingRuleDimensions(measure:FactMeasureId){return Object.fromEntries(businessMetricIds.filter(metric=>requiredMeasures(metric).includes(measure)).map(metric=>businessCatalog[metric].dimensions).reduce((shared,next)=>shared.filter(dimension=>next.includes(dimension))).map(dimension=>[dimension,true]));}
 validateSourceMapping(mapping);return mapping;
}
export function businessCapabilities(mapping:SourceMapping,scope:{month:string;cutoff:string;reference:string}):PublishedAnalyticsCapabilities {
 const monthEnd=new Date(Date.UTC(Number(scope.month.slice(0,4)),Number(scope.month.slice(5)),0)).toISOString().slice(0,10);
 const cutoff=new Intl.DateTimeFormat('en-CA',{timeZone:mapping.measures[0]!.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(scope.cutoff));
 return {tenantId:mapping.tenantId,mode:'certified',releases:[{datasetId:mapping.datasetId,sourceId:mapping.sourceId,mappingId:mapping.mappingId,mappingVersion:mapping.mappingVersion,certificationReference:scope.reference,financeReview:'pending',period:{from:scope.month+'-01',to:cutoff<monthEnd?cutoff:monthEnd},capabilities:mapping.capabilities.map(capability=>({...capability,summary:!compatibleQuantityMetrics.includes(capability.metric as BusinessMetricId),analyses:semanticCatalog[capability.metric].type==='date'||compatibleQuantityMetrics.includes(capability.metric as BusinessMetricId)?[]:['ranking','topN',...(semanticCatalog[capability.metric].semantics.kind==='additive'?['percentageContribution' as const,'pareto' as const]:[])]}))}]};
}

function businessDimensionRule(dimension:string,object:string){
 const rules:Record<string,string>={customer_segment:'Provisional native customer-tag families at extraction; Unknown/Ambiguous retained; not official departments',customer_class:'Calendar YTD customer class at selected cutoff; January elapsed months including zero months; partial months Unknown',brand:'Current product brand identity; not a legal agency',product_category:'Current product category identity; not a legal agency',uom:'Product base UOM at extraction; six-decimal quantity conversion; different base UOMs never added',warehouse:'Unique Company-scoped warehouse ancestor of location; unknown/ambiguous remains unassigned',supplier:'Actual order or liability partner identity; never a guessed product vendor'};
 if(dimension==='state')return object==='business_invoice'||object==='business_invoice_quantity'?'Stored invoice governorate; unknown retained':'Current partner governorate at extraction; not historical address';
 return rules[dimension]??'Stable source identity; missing assignment remains unassigned';
}
