import type {Pool} from 'pg';
import type {AnalyticsCursor} from '@el-dabboos/domain';
import type {OdooSourceConfig} from './config.ts';
import {odooIncrementalWindow} from './incremental-watermark.ts';
import {stageIdentifier} from '../odoo-orm/stage-manifest.ts';

const observationStarts=new WeakMap<Pool,Map<string,Promise<string|null>>>();
/** API receipts follow collection. Resume discovery before the previous collection
 * started so writes between an earlier model read and its receipt remain visible.
 * Canonical sourceAsOf and durable cursor receipts retain their original meaning.
 */
export async function odooSourceIncrementalWindow(pool:Pool,config:OdooSourceConfig,scope:{cursor:AnalyticsCursor|null;cutoff:string}){
 const ordinary=odooIncrementalWindow(scope.cursor,scope.cutoff);
 if(!scope.cursor||!config.observedCopy)return ordinary;
 const startedAt=await observedCollectionStart(pool,config,scope.cursor.cutoff);
 return startedAt?odooIncrementalWindow({...scope.cursor,cutoff:startedAt},scope.cutoff):ordinary;
}
function observedCollectionStart(pool:Pool,config:OdooSourceConfig,receipt:string){
 let observations=observationStarts.get(pool);
 if(!observations){observations=new Map();observationStarts.set(pool,observations);}
 const key=JSON.stringify([config.tenantId,config.sourceId,receipt,config.observedCopy!.sourceEndpointFingerprint]);
 let observation=observations.get(key);
 if(!observation){
  observation=readCollectionStart(pool,config,receipt);observations.set(key,observation);
  void observation.catch(()=>observations!.delete(key));
 }
 return observation;
}
async function readCollectionStart(pool:Pool,config:OdooSourceConfig,receipt:string):Promise<string|null>{
 const row=(await pool.query(`SELECT schema_name,manifest->>'captureStartedAt' AS started_at FROM api_catalog.captures
  WHERE tenant_id=$1 AND source_id=$2 AND source_as_of=$3::timestamptz AND manifest->>'sourceEndpointFingerprint'=$4`,
 [config.tenantId,config.sourceId,receipt,config.observedCopy!.sourceEndpointFingerprint])).rows[0];
 // Cursors from the former direct source have no API capture receipt.
 if(!row)return null;
 if(!/^api_[a-f0-9]{32}$/.test(row.schema_name))throw new Error('Invalid API observation schema');
 const startedAt=row.started_at??(await pool.query(`SELECT manifest->'evidence'->>'startedAt' AS started_at FROM ${stageIdentifier(row.schema_name)}.__capture WHERE id=1 AND sealed`)).rows[0]?.started_at;
 if(typeof startedAt!=='string'||!Number.isFinite(Date.parse(startedAt))||Date.parse(startedAt)>Date.parse(receipt))throw new Error('Invalid API collection interval');
 return startedAt;
}
