import type {AnalyticsContext,AnalyticsFilter,DimensionId} from './contracts.ts';

export const coverageFilterDimensions:readonly DimensionId[]=['customer','customer_salesperson','customer_state','customer_tag','product','product_category','brand','uom'];
export interface CustomerProductCoverageInput {year?:number;status?:'all'|'sold'|'unsold';filters?:AnalyticsFilter[];cursor?:string;limit?:number}
export interface CoverageCaption {id:string;label:string}
export interface CustomerProductCoverageRow {
 customer:CoverageCaption;salesperson:CoverageCaption;state:CoverageCaption;tags:CoverageCaption[];
 product:CoverageCaption;category:CoverageCaption;brand:CoverageCaption;uom:CoverageCaption;
 forecast:string;netQuantity:string;status:'sold'|'unsold';recorded:boolean;
}
export interface CustomerProductCoverageResult {
 rows:CustomerProductCoverageRow[];years:number[];year:number;through:string;sourceAsOf?:string;revision:string;
 total:number;sold:number;unsold:number;excludedProducts:number;nextCursor?:string;
 sourceConsistency?:'api_observed';
}
export interface CustomerProductCoverageRepository {readCoverage(input:CustomerProductCoverageInput,context:AnalyticsContext):Promise<CustomerProductCoverageResult>}
export class CustomerProductCoverageUnavailable extends Error {constructor(){super('Customer product coverage is not published for this scope');}}
export function validateCoverageInput(value:unknown):asserts value is CustomerProductCoverageInput {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid coverage input');
 if(Object.keys(value).some(key=>!['year','status','filters','cursor','limit'].includes(key)))throw new Error('Unsupported coverage input');
 const input=value as CustomerProductCoverageInput;
 if(input.year!==undefined&&(!Number.isInteger(input.year)||input.year<1900||input.year>9999))throw new Error('Invalid coverage year');
 if(input.status!==undefined&&!['all','sold','unsold'].includes(input.status))throw new Error('Invalid coverage status');
 validateCoveragePagination(input);
 validateCoverageFilters(input.filters);
}
function validateCoveragePagination(input:CustomerProductCoverageInput){
 if(input.limit!==undefined&&(!Number.isInteger(input.limit)||input.limit<1||input.limit>200))throw new Error('Invalid coverage page size');
 if(input.cursor!==undefined&&(typeof input.cursor!=='string'||input.cursor.length>2000))throw new Error('Invalid coverage continuation');
}
export function validateCoverageFilters(filters:readonly AnalyticsFilter[]|undefined){
 if(filters===undefined)return;
 if(!Array.isArray(filters)||filters.length>32)throw new Error('Invalid coverage filters');
 for(const filter of filters)validateCoverageFilter(filter);
}
function validateCoverageFilter(filter:AnalyticsFilter){
 if(!filter||typeof filter!=='object'||Object.keys(filter).some(key=>!['dimension','values'].includes(key)))throw new Error('Invalid coverage filter');
 if(!coverageFilterDimensions.includes(filter.dimension)||!Array.isArray(filter.values)||!filter.values.length||filter.values.length>200)throw new Error('Unsupported coverage filter');
 if(filter.values.some(value=>typeof value!=='string'||!value.trim()||value.length>200))throw new Error('Invalid coverage identity');
}
