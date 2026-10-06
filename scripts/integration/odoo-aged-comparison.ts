/** Exact decimal evidence comparison; no runtime/mart dependencies or name-based identity. */
export const agedBuckets = ['current','1_30','31_60','61_90','91_120','older','total'] as const;
export type AgedBucket = typeof agedBuckets[number];
export type AgedAmounts = Record<AgedBucket,string>;
export interface ExcelCustomer { rowNumber: number; rawLabel: string; comparisonKey: string; values: AgedAmounts }
export interface SourceCustomer extends AgedAmounts { partner_reference: string; raw_label: string | null }
export function decimalUnits(value: string): bigint {
 if (!/^-?\d+(?:\.\d{1,6})?$/u.test(value)) throw new Error('Exact decimal with at most six fractional digits required');
 const [whole,fraction='']=value.split('.');
 return BigInt(whole+fraction.padEnd(6,'0'));
}
export function decimalText(value: bigint): string {
 const magnitude=value<0n ? -value : value;
 return `${value<0n ? '-' : ''}${magnitude/1000000n}.${String(magnitude%1000000n).padStart(6,'0')}`;
}
export const comparisonLabel = (value: string | null): string => value?.trim().replace(/\s+/gu,' ')??'';
export function compareAgedCustomers(reference: {customers: ExcelCustomer[]; totals: AgedAmounts},customers: SourceCustomer[]) {
 const labels=new Map<string,SourceCustomer[]>();
 for (const customer of customers) {
  const key=comparisonLabel(customer.raw_label);
  labels.set(key,[...labels.get(key)??[],customer]);
 }
 const expectedLabels=new Map<string,number>();
 for (const customer of reference.customers) expectedLabels.set(customer.comparisonKey,(expectedLabels.get(customer.comparisonKey)??0)+1);
 const matchedPartners=new Set<string>();
 const cases: {rowNumber:number;partnerId:string;bucket:AgedBucket;expected:string;actual:string;delta:string;status:string}[]=[];
 const unresolved: {rowNumber:number;rawLabel:string;reason:string;candidatePartnerIds:string[]}[]=[];
 for (const expected of reference.customers) {
  const matches=labels.get(expected.comparisonKey)??[];
  if (!expected.comparisonKey || expectedLabels.get(expected.comparisonKey)!==1 || matches.length!==1) {
   unresolved.push({rowNumber:expected.rowNumber,rawLabel:expected.rawLabel,reason:matches.length===0 ? 'missing' : 'ambiguous',candidatePartnerIds:matches.map(customer=>customer.partner_reference)});
   continue;
  }
  const actual=matches[0];
  if (!actual) throw new Error("Unique source partner required");
  matchedPartners.add(actual.partner_reference);
  for (const bucket of agedBuckets) {
   const delta=decimalUnits(actual[bucket])-decimalUnits(expected.values[bucket]);
   cases.push({rowNumber:expected.rowNumber,partnerId:actual.partner_reference,bucket,expected:expected.values[bucket],actual:actual[bucket],delta:decimalText(delta),status:delta===0n ? 'exact' : 'mismatch'});
  }
 }
 const unexpectedCustomers=customers.filter(customer=>!matchedPartners.has(customer.partner_reference));
 const totals=Object.fromEntries(agedBuckets.map(bucket=>[bucket,decimalText(customers.reduce((sum,customer)=>sum+decimalUnits(customer[bucket]),0n))])) as AgedAmounts;
 const deltas=Object.fromEntries(agedBuckets.map(bucket=>[bucket,decimalText(decimalUnits(totals[bucket])-decimalUnits(reference.totals[bucket]))])) as AgedAmounts;
 const exactCases=cases.filter(control=>control.status==='exact').length;
 const mismatchedCases=cases.length-exactCases;
 return {totals,deltas,cases,unmatchedLabels:unresolved.filter(row=>row.reason==='missing'),ambiguousLabels:unresolved.filter(row=>row.reason==='ambiguous'),unexpectedCustomers,exactCases,mismatchedCases,missingCases:unresolved.length*agedBuckets.length,unexpectedCases:unexpectedCustomers.length*agedBuckets.length,
  passed:!unresolved.length && !unexpectedCustomers.length && !mismatchedCases && Object.values(deltas).every(delta=>decimalUnits(delta)===0n)};
}
