import {createHash} from 'node:crypto';
import type {PoolClient} from 'pg';
import type {PreparedBuildScope,PreparedCell,PreparedConfiguration} from './contracts.ts';

const expectedSelect=`SELECT time_grain,grain_id,business_date::text,measure_id,dimensions,
 trim_scale(value)::text value,fact_count::text,trim_scale(minimum)::text minimum,trim_scale(maximum)::text maximum,
 data_through::text,labels,conflicting_labels FROM mart.prepared_work_read($1,$2,$3::jsonb)
 ORDER BY time_grain,grain_id COLLATE "C",business_date,measure_id COLLATE "C",dimensions::text COLLATE "C"`;

/** Bounded server cursor; neither source rows nor the complete cell population enters memory. */
async function scanExpected(client:PoolClient,scope:PreparedBuildScope,config:PreparedConfiguration,consume:(page:PreparedCell[])=>Promise<void>){
 await client.query('DECLARE prepared_materialization NO SCROLL CURSOR FOR '+expectedSelect,[scope.tenantId,scope.revisionId,JSON.stringify(config)]);
 try{
  while(true){const page=(await client.query<PreparedCell>('FETCH FORWARD 500 FROM prepared_materialization')).rows;if(!page.length)break;await consume(page);}
 }catch(error){await client.query('CLOSE prepared_materialization').catch(()=>{});throw error;}
 await client.query('CLOSE prepared_materialization');
}
function contentFingerprint(config:PreparedConfiguration){return createHash('sha256').update(JSON.stringify(config)+'\n');}
function countCells(stats:Record<string,number>,page:readonly PreparedCell[]){for(const row of page){const key=row.time_grain+':'+row.grain_id;stats[key]=(stats[key]??0)+1;}}
/** Identity ignores extraction lease/timestamp changes; exact bindings carry fresh source evidence. */
export async function fingerprintPreparedCells(client:PoolClient,scope:PreparedBuildScope,config:PreparedConfiguration,maxCells:number){
 const hash=contentFingerprint(config),statistics:Record<string,number>={};let rows=0;
 await scanExpected(client,scope,config,async page=>{
  rows+=page.length;if(rows>maxCells)throw new Error('Prepared cell storage bound exceeded');
  countCells(statistics,page);for(const row of page)hash.update(JSON.stringify(row)+'\n');
 });
 return {dataId:hash.digest('hex'),statistics,rows};
}
/** Content is inserted once, then database validation freezes the dataset. */
export async function persistPreparedCells(client:PoolClient,scope:PreparedBuildScope,config:PreparedConfiguration,expected:{dataId:string;rows:number}){
 const hash=contentFingerprint(config);let rows=0;
 await client.query('INSERT INTO mart.prepared_datasets VALUES($1,$2,$3)',[scope.tenantId,expected.dataId,JSON.stringify(config)]);
 await scanExpected(client,scope,config,async page=>{
  rows+=page.length;if(rows>expected.rows)throw new Error('Prepared population changed');
  for(const row of page)hash.update(JSON.stringify(row)+'\n');
  await client.query(`INSERT INTO mart.prepared_cells
   SELECT $1,$2,cell.time_grain,cell.grain_id,cell.business_date,cell.measure_id,cell.dimensions,
    encode(sha256(convert_to(cell.dimensions::text,'UTF8')),'hex'),cell.value,cell.fact_count,cell.minimum,cell.maximum,
    cell.data_through,cell.labels,cell.conflicting_labels FROM jsonb_to_recordset($3::jsonb) cell(
    time_grain text,grain_id text,business_date date,measure_id text,dimensions jsonb,value numeric,fact_count bigint,
    minimum numeric,maximum numeric,data_through date,labels jsonb,conflicting_labels text[])`,[scope.tenantId,expected.dataId,JSON.stringify(page)]);
 });
 if(rows!==expected.rows||hash.digest('hex')!==expected.dataId)throw new Error('Prepared population changed');
}
