import type {FactMeasureId,ProductionFact} from '@el-dabboos/domain';
import type {ReviewControl} from '../../src/review/source.ts';
import {fixture,pages} from './business-fixture.ts';

export interface SnapshotInput {measure:FactMeasureId;entity:string;customer:string;value:string}
export async function snapshotSource(month:string,family:'review'|'business',inputs:SnapshotInput[],cutoff='2026-11-02T09:00:00.000Z',options:{emptyMeasures?:readonly FactMeasureId[];current?:boolean}={}){
 const source=fixture(month,options.current??false,family),original:ProductionFact[]=[];
 for await(const page of source.facts)original.push(...page);
 const replaced=new Set([...inputs.map(input=>input.measure),...(options.emptyMeasures??[])]);
 const facts=original.filter(fact=>!replaced.has(fact.measureId)).map(fact=>({...fact,sourceAsOf:cutoff,sourceVersion:cutoff}));
 for(const input of inputs){
  const base=original.find(fact=>fact.measureId===input.measure)!;
  facts.push({...base,sourceRecordId:input.entity,entityId:`SYNTHETIC:${input.entity}`,value:input.value,sourceAsOf:cutoff,sourceVersion:cutoff,
   dimensions:{...base.dimensions,customer:`fixture:${input.customer}`},displayLabels:{customer:`Synthetic ${input.customer}`},
   ...(base.currency?{currency:{...base.currency,transactionValue:input.value}}:{})});
 }
 return {...source,cutoff,facts:pages(facts),controls:async()=>[...snapshotControls(facts),...(options.emptyMeasures??[]).map(measure=>({measure,dimensions:null,value:'0.000000',count:'0'}))]};
}
function snapshotControls(facts:ProductionFact[]):ReviewControl[]{
 const grouped=new Map<string,{measure:FactMeasureId;dimensions:ProductionFact['dimensions']|null;value:bigint;count:bigint}>();
 for(const fact of facts)for(const dimensions of [null,fact.dimensions]){
  const key=JSON.stringify([fact.measureId,dimensions]),prior=grouped.get(key);
  grouped.set(key,{measure:fact.measureId,dimensions,value:(prior?.value??0n)+BigInt(fact.value.replace('.','')),count:(prior?.count??0n)+1n});
 }
 return [...grouped.values()].map(group=>({measure:group.measure,dimensions:group.dimensions,value:decimal(group.value),count:String(group.count)}));
}
function decimal(value:bigint){const sign=value<0n?'-':'',absolute=value<0n?-value:value;return `${sign}${absolute/1000000n}.${String(absolute%1000000n).padStart(6,'0')}`;}
