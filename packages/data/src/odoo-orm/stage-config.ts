import type { PoolConfig } from 'pg';
export const ownedStageDatabase='el_dabboos_api_stage';
export const stageWriterRole='odoo_api_stage_writer';
export const stageReaderRole='odoo_api_stage_reader';
export interface OwnedStageConfig {writer:PoolConfig;reader:PoolConfig;schema?:string}
function connection(raw:string|undefined,role:string):PoolConfig {
 if(!raw)throw new Error('Protected owned API staging configuration required');
 const url=new URL(raw);
 if(!['postgres:','postgresql:'].includes(url.protocol)||url.pathname!==`/${ownedStageDatabase}`||decodeURIComponent(url.username)!==role)throw new Error('Dedicated owned API staging database and role required');
 return {connectionString:raw,max:3,connectionTimeoutMillis:5000,idleTimeoutMillis:30000};
}
function selectedSchema(environment:Readonly<Record<string,string|undefined>>):string|undefined {
 const schema=environment.ODOO_API_STAGE_SCHEMA;
 if(schema&&!/^api_[a-f0-9]{32}$/.test(schema))throw new Error('Invalid owned API staging reference');
 return schema;
}
export function ownedStageReaderConfig(environment:Readonly<Record<string,string|undefined>>):Pick<OwnedStageConfig,'reader'|'schema'> {
 const reader=connection(environment.ODOO_API_STAGE_READER_URL,stageReaderRole);
 const mart=environment.MART_INGESTOR_URL?new URL(environment.MART_INGESTOR_URL):undefined;
 if(mart&&mart.host!==new URL(reader.connectionString!).host)throw new Error('Owned API staging must stay on the approved Analytics database endpoint');
 const schema=selectedSchema(environment);
 return {reader,...(schema?{schema}:{})};
}
/** Never points at the ERP or mart. The capture writer is absent from reader composition. */
export function ownedStageConfig(environment:Readonly<Record<string,string|undefined>>):OwnedStageConfig {
 const writer=connection(environment.ODOO_API_STAGE_WRITER_URL,stageWriterRole);
 const read=ownedStageReaderConfig(environment);
 if(new URL(writer.connectionString!).host!==new URL(read.reader.connectionString!).host)throw new Error('Owned staging roles must use the same database endpoint');
 return {writer,...read};
}
export interface ObservedCopyDescriptor {
 schema:string;tenantId:string;sourceId:string;companyIds:readonly string[];sourceAsOf:string;
 fingerprint:string;sourceEndpointFingerprint:string;
}
