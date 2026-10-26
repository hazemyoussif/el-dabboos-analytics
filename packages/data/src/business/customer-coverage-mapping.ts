import {customerCoverageCatalog,customerCoverageMetricIds,timeDimensions,validateSourceMapping,validateCustomerProductPopulationBasis} from '@el-dabboos/domain';
import type {CustomerProductPopulationBasis,FactMeasureId,SourceMapping} from '@el-dabboos/domain';
export const customerCoverageObject='business_customer_product_coverage_v1';
export function customerCoverageSourceObject(measure:FactMeasureId){return customerCoverageMetricIds.some(metric=>metric===measure)?customerCoverageObject:undefined;}
export function withCustomerCoverageMapping(mapping:SourceMapping,population:CustomerProductPopulationBasis):SourceMapping{
 validateSourceMapping(mapping);validateCustomerProductPopulationBasis(population);
 population=normalizedBasis(population);
 if(mapping.mappingId!=='business-purpose-v1-sales-command'||population.excludedProductCategories.some(id=>!(/^[1-9]\d*$/).test(id)))throw new Error('Registered company Business population basis required');
 if(mapping.measures.some(rule=>customerCoverageMetricIds.some(metric=>metric===rule.measureId)))throw new Error('Customer coverage recipe already present');
 const next:SourceMapping={...mapping,measures:[...mapping.measures,...customerCoverageMetricIds.map(metric=>({
  measureId:metric,sourceObject:customerCoverageObject,population,grain:'Complete current customer/year, eligible product, sparse customer/product/year, or distinct tag membership',
  eligibleStates:['posted customer invoices and credits','active non-service products; forecast > 0'],recognitionRule:'Selected calendar years through frozen source day; current partner attribution; configured display-category descendants excluded',
  timeZone:mapping.measures[0]!.timeZone,amountBasis:'Signed invoice quantity converted to product base UOM; pending-move forecast rounded by Odoo UOM; counts retain stable identities',
  taxTreatment:'Quantities, product counts and membership; no tax amount',signConvention:'Credit quantities subtract before per-customer/product classification; nonpositive net is unsold',
  identityRule:'Stable customer/product/year or partner/tag IDs; never join names',correctionRule:'Complete recipe observation; shared immutable prepared publication and separately validated population completion',
  currencyPolicy:`native-${mapping.reportingCurrency}`,dimensionMappings:Object.fromEntries(customerCoverageCatalog[metric].dimensions.filter(dimension=>!timeDimensions.includes(dimension)).map(dimension=>[dimension,'Stable source identity; current attribution at the frozen observation; unknown retained'])),
 }))],capabilities:[...mapping.capabilities,...customerCoverageMetricIds.map(metric=>({metric,dimensions:customerCoverageCatalog[metric].dimensions}))]};
 validateSourceMapping(next);return next;
}
export function customerCoverageBasis(mapping:SourceMapping):CustomerProductPopulationBasis{
 const rules=mapping.measures.filter(rule=>rule.sourceObject===customerCoverageObject),basis=rules[0]?.population;
 validateCustomerProductPopulationBasis(basis);
 if(rules.length!==customerCoverageMetricIds.length||rules.some(rule=>!rule.population||JSON.stringify(normalizedBasis(rule.population))!==JSON.stringify(normalizedBasis(basis))))throw new Error('One complete customer coverage basis required');
 return basis;
}
function normalizedBasis(basis:CustomerProductPopulationBasis):CustomerProductPopulationBasis {
 return {version:1,years:[...basis.years].sort((first,second)=>first-second),excludedProductCategories:[...basis.excludedProductCategories].sort(),forecast:'positive'};
}
