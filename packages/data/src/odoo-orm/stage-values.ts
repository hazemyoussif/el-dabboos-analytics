import type {StageColumn,StageModel} from './stage-manifest.ts';
import type {OrmRow} from './client.ts';
import {ormId} from './json.ts';
import {ormTimestamp} from './records.ts';

function decimal(value:unknown):string {
 if(typeof value!=='string'||value.length>128||!/^(-?)(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d{1,3})?$/.test(value))throw new Error('Invalid owned staging decimal');
 const exponent=value.match(/[eE]([+-]?\d+)$/)?.[1];
 if(exponent&&Math.abs(Number(exponent))>100)throw new Error('Owned staging numeric exponent exceeds bounds');
 return value;
}
function integer(value:unknown):string {
 if(typeof value!=='string'||!/^-[1-9]\d*$|^(0|[1-9]\d*)$/.test(value))throw new Error('Invalid owned staging integer');
 return value;
}
function day(value:unknown):string {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value)))throw new Error('Invalid owned staging date');
 return value;
}
function scalar(column:StageColumn,value:unknown):unknown {
 if(column.ormType==='boolean'){
  if(typeof value!=='boolean')throw new Error('Invalid owned staging boolean');
  return value;
 }
 if(value===false||value===null)return null;
 if(column.ormType==='many2one')return ormId(Array.isArray(value)?value[0]:value);
 if(column.ormType==='integer')return integer(value);
 if(column.ormType==='float'||column.ormType==='monetary')return decimal(value);
 if(column.ormType==='datetime')return ormTimestamp(value);
 if(column.ormType==='date')return day(value);
 if(column.ormType==='json')return value;
 if(typeof value!=='string')throw new Error('Invalid owned staging text');
 return value;
}
export function stageRow(model:StageModel,row:OrmRow):Record<string,unknown> {
 ormId(row.id);
 return Object.fromEntries(model.columns.map(column=>{
  if(!Object.hasOwn(row,column.name))throw new Error('Missing owned staging field');
  const value=scalar(column,row[column.name]);
  return [column.name,value===null?null:column.translated?{en_US:value}:column.companyDependent?{'1':value}:value];
 }));
}
export function stageRelationIds(value:unknown):string[] {
 if(!Array.isArray(value))throw new Error('Invalid owned staging relationship');
 const ids=value.map(ormId);
 if(new Set(ids).size!==ids.length)throw new Error('Duplicate owned staging relationship');
 return ids;
}
