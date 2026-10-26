import {createHash,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {OdooOrmClient} from './client.ts';
import type {OdooOrmConfig} from './config.ts';
import {readOdooOrmPages} from './pages.ts';
import {ormRecordHash} from './records.ts';
import {stageModels,stageModel,validateStockStageProjection} from './stage-manifest.ts';
import type {StageModel} from './stage-manifest.ts';
import {assertStageWriter,createStageSchema,writeStagePage,finishStageTables,sealStage} from './stage-store.ts';
import type {OwnedStageConfig,ObservedCopyDescriptor} from './stage-config.ts';

export interface StageCaptureScope {tenantId:string;sourceId:string;api:OdooOrmConfig;stage:OwnedStageConfig;observe?:(event:{phase:string;model?:string;rows?:number})=>void}
interface ModelEvidence {model:string;rows:number;hash:string}
export class OwnedStageCaptureError extends Error {
 constructor(readonly phase:string,readonly code:string){super(`Owned API staging capture failed at ${phase} (${code})`);}
}
async function modelPlan(client:OdooOrmClient):Promise<StageModel[]> {
 const result:StageModel[]=[];
 for(const descriptor of stageModels){
  result.push(stageModel(descriptor,await client.fields(descriptor.model)));
 }
 validateStockStageProjection(result);return result;
}
async function captureModelRows(client:OdooOrmClient,scope:{model:StageModel;deadline:number;write:(rows:import('./client.ts').OrmRow[])=>Promise<void>}):Promise<ModelEvidence> {
 const hash=createHash('sha256');let rows=0,bytes=0;
 for await(const page of readOdooOrmPages(client,{...scope.model,deadline:scope.deadline,rawRelations:true})){
  bytes+=Buffer.byteLength(JSON.stringify(page));rows+=page.length;
  if(bytes>2147483648)throw new Error('Owned API staging byte bound exceeded');
  hash.update(ormRecordHash(page));
  await scope.write(page);
 }
 return {model:scope.model.model,rows,hash:hash.digest('hex')};
}

async function boundedModels<T>(models:readonly StageModel[],operation:(model:StageModel)=>Promise<T>):Promise<T[]> {
 const result:T[]=new Array(models.length);let next=0;let failure:unknown;
 await Promise.all(Array.from({length:3},async()=>{
  for(;;){const index=next++;if(failure||index>=models.length)return;try{result[index]=await operation(models[index]!);}catch(error){failure??=error;return;}}
 }));
 if(failure)throw failure;
 return result;
}
async function captureModel(writer:Pool,client:OdooOrmClient,scope:StageCaptureScope,request:{schema:string;model:StageModel;deadline:number}):Promise<ModelEvidence>{
 const {schema,model,deadline}=request;
 scope.observe?.({phase:'capture',model:model.model});
 const connection=await writer.connect();
 try{
  const evidence=await captureModelRows(client,{model,deadline,write:rows=>writeStagePage(connection,{schema,model},rows)});
  scope.observe?.({phase:'captured',model:model.model,rows:evidence.rows});return evidence;
 }catch{throw new OwnedStageCaptureError(`capture:${model.model}`,'CAPTURE_UNAVAILABLE');}
 finally{connection.release();}
}
/** API data never leaves the Analytics host. A sealed input copy is not called an ERP MVCC snapshot. */
export async function captureOwnedOdooStage(scope:StageCaptureScope):Promise<ObservedCopyDescriptor> {
 if(scope.api.companyIds.join(',')!=='1'||!scope.tenantId||!scope.sourceId)throw new Error('Approved company-1 owned staging scope required');
 const client=new OdooOrmClient({...scope.api,batchSize:1000,maxRows:5000000});
 const writer=new Pool(scope.stage.writer);const schema=`api_${randomUUID().replaceAll('-','')}`;
 const startedAt=new Date().toISOString(),deadline=Date.now()+1800000;
 let phase='authenticate';
 try{
  await assertStageWriter(writer);await client.authenticate();
  phase='schema';const models=await modelPlan(client);await createStageSchema(writer,schema,models);
  phase='capture';
  const evidence=await boundedModels(models,model=>captureModel(writer,client,scope,{schema,model,deadline}));
  phase='index';await finishStageTables(writer,schema,models);
  const sourceEndpointFingerprint=createHash('sha256').update(JSON.stringify([scope.api.url,scope.api.database])).digest('hex');
  const descriptor:ObservedCopyDescriptor={schema,tenantId:scope.tenantId,sourceId:scope.sourceId,companyIds:['1'],sourceAsOf:new Date().toISOString(),captureStartedAt:startedAt,
   fingerprint:createHash('sha256').update(JSON.stringify([sourceEndpointFingerprint,models,evidence])).digest('hex'),sourceEndpointFingerprint};
  phase='seal';await sealStage(writer,descriptor,{startedAt,models,evidence,consistency:'api_observed'});
  scope.observe?.({phase:'sealed'});return descriptor;
 }catch(error){
  if(error instanceof OwnedStageCaptureError)throw error;
  const code=error&&typeof error==='object'&&'code'in error&&typeof error.code==='string'&&/^[A-Z0-9_]{2,30}$/.test(error.code)?error.code:'CAPTURE_UNAVAILABLE';
  throw new OwnedStageCaptureError(phase,code);
 }finally{await writer.end();}
}
