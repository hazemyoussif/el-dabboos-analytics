/** Supporting replay of a preserved independent source control, never identity certification. */
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { agedBuckets,decimalUnits,decimalText } from './odoo-aged-comparison.ts';
const [controlPath,referencePath,requestedDirectory]=process.argv.slice(2);
if(!controlPath || !referencePath || !requestedDirectory)throw new Error('Preserved source control, parsed Excel reference and new private output directory required');
const directory=resolve(requestedDirectory);
if(!directory.startsWith('/tmp/'))throw new Error('Private evidence must remain outside Git');
const content=await readFile(controlPath);
const controlHash=createHash('sha256').update(content).digest('hex');
if(controlHash!=='a8f6a00eab4fef2b1b9ff8924ba1a4dd89847c3c86ed83a57aa651d799751848')throw new Error('Unchanged original source control required');
const control=JSON.parse(content);const reference=JSON.parse(await readFile(referencePath,'utf8'));
if(control.companyId!==1 || control.reportingCutoff!=='2026-09-30' || !reference.integrity.passed || reference.reportDate!==control.reportingCutoff)throw new Error('Approved scope and internally reconciled Excel required');
const customers=new Map();const bridge=new Map();
for(const component of control.components){
 const agingDate=component.due_date??component.accounting_date;
 const overdueDays=Math.round((Date.parse(control.reportingCutoff)-Date.parse(agingDate))/86400000);
 const bucket=overdueDays<=0 ? 'current' : overdueDays<=30 ? '1_30' : overdueDays<=60 ? '31_60' : overdueDays<=90 ? '61_90' : overdueDays<=120 ? '91_120' : 'older';
 const residual=decimalUnits(component.residual);
 const customer=customers.get(component.customer_id)??Object.fromEntries(agedBuckets.map(key=>[key,0n]));
 customer[bucket]+=residual;customer.total+=residual;customers.set(component.customer_id,customer);
 const maturityPolicy=component.due_date===null ? 'missing_maturity_accounting_date_fallback' : 'explicit_maturity';
 const sign=residual>0n ? 'positive_open' : 'negative_open';
 const key=`${bucket}/${maturityPolicy}/${sign}`;const entry=bridge.get(key)??{bucket,maturityPolicy,sign,components:0,amount:0n};
 entry.components++;entry.amount+=residual;bridge.set(key,entry);
}
const totals=Object.fromEntries(agedBuckets.map(bucket=>[bucket,decimalText([...customers.values()].reduce((sum,customer)=>sum+customer[bucket],0n))]));
const deltas=Object.fromEntries(agedBuckets.map(bucket=>[bucket,decimalText(decimalUnits(totals[bucket])-decimalUnits(reference.totals[bucket]))]));
const signature=values=>agedBuckets.map(bucket=>decimalUnits(values[bucket]).toString()).join('/');
const excelMatrix=new Map();for(const row of reference.customers){const key=signature(row.values);excelMatrix.set(key,(excelMatrix.get(key)??0)+1);}
const sourceMatrix=new Map();for(const row of customers.values()){const key=signature(Object.fromEntries(agedBuckets.map(bucket=>[bucket,decimalText(row[bucket])])));sourceMatrix.set(key,(sourceMatrix.get(key)??0)+1);}
const differingSignatures=[...new Set([...excelMatrix.keys(),...sourceMatrix.keys()])].filter(key=>(excelMatrix.get(key)??0)!==(sourceMatrix.get(key)??0));
const evidence={status:'NUMERIC_REPLAY_ONLY_IDENTITY_AND_LIVE_METADATA_PENDING',controlVersion:'odoo-aged-report-reconstruction-v1',workbookSha256:reference.workbookSha256,preservedControlSha256:controlHash,companyId:1,reportDate:control.reportingCutoff,reportingCurrency:'IQD',sourceAsOf:control.sourceAsOf,snapshotDescriptor:control.snapshotDescriptor,extractedAt:new Date().toISOString(),excelTotals:reference.totals,sourceTotals:totals,deltas,excelCharacteristics:reference.characteristics,
 numericMatrix:{sourceCustomerGroups:customers.size,excelCustomerRows:reference.customers.length,differingSignatures:differingSignatures.length,identicalMultiset:differingSignatures.length===0,identityVerified:false,warning:'Equal numeric vectors are supporting evidence only. They cannot identify partners, resolve names or count as customer identity reconciliation.'},
 bridge:[...bridge.values()].map(entry=>({...entry,amount:decimalText(entry.amount)})),customers:[...customers].map(([partnerId,values])=>({partnerId,...Object.fromEntries(agedBuckets.map(bucket=>[bucket,decimalText(values[bucket])]))})),
 customerBucketReconciliation:{supportedCases:reference.customers.length*agedBuckets.length,checkedIdentityCases:0,exactIdentityCases:0,mismatchedIdentityCases:null,missingIdentityCases:null,unexpectedIdentityCases:null,status:'NOT_RUN_SOURCE_TUNNEL_UNAVAILABLE'},
 blockers:['Approved source tunnel unavailable: no fresh PostgreSQL extraction or installed/custom report metadata checks','Preserved control intentionally has no partner labels: Excel label-to-res_partner.id matching cannot be verified','Finance definition approval remains pending'],certified:false,published:false};
await mkdir(directory,{mode:0o700});await writeFile(`${directory}/numeric-replay.json`,JSON.stringify(evidence,null,2)+'\n',{mode:0o600,flag:'wx'});
console.log(JSON.stringify({directory,status:evidence.status,totals,deltas,numericMatrix:evidence.numericMatrix,bridge:evidence.bridge}));
